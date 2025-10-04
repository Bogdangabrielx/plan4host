// app/api/cron/ical/autosync/route.ts
import { NextResponse } from "next/server";
import { createClient as createSb } from "@supabase/supabase-js";
import { parseIcsToEvents, toLocalDateTime, type ParsedEvent } from "@/lib/ical/parse";

// Ensure Node runtime and no caching for cron
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------- helpers ----------
function j(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

// Hash util (kept only for rare uid-less diagnostics)
import crypto from "crypto";
function digest(s: string) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function fmtDate(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return f.format(d); // YYYY-MM-DD
}
function fmtTime(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  return f.format(d); // HH:MM
}

function isFormish(b: any) {
  const src = (b?.source || "").toString().toLowerCase();
  // fără is_soft_hold / hold_status (au dispărut din DB)
  return src === "form" || !!b?.form_submitted_at || b?.status === "hold" || b?.status === "pending";
}

// small net helper
async function fetchWithRetry(
  url: string,
  opts?: { timeoutMs?: number; retries?: number }
) {
  const timeoutMs = opts?.timeoutMs ?? 15000;
  const retries = opts?.retries ?? 1;
  let attempt = 0;
  let lastErr: any = null;
  while (attempt <= retries) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { "User-Agent": "plan4host-ical-fetch/1.0" },
        signal: ac.signal,
      } as RequestInit);
      clearTimeout(t);
      return res;
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (attempt < retries)
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
    attempt++;
  }
  throw lastErr || new Error("fetch failed");
}

async function logSync(
  supabase: any,
  params: {
    integration_id: string;
    status: string;
    imported?: number;
    error_message?: string;
    started_at?: string;
    finished_at?: string;
  }
) {
  const { integration_id, status } = params;
  const started_at = params.started_at ?? new Date().toISOString();
  const finished_at = params.finished_at ?? new Date().toISOString();
  const imported = params.imported ?? 0;
  const error_message = params.error_message ?? null;
  try {
    await supabase.from("ical_type_sync_logs").insert({
      id: (globalThis as any).crypto?.randomUUID?.() ?? undefined,
      integration_id,
      started_at,
      finished_at,
      status,
      added_count: imported,
      updated_count: 0,
      conflicts: 0,
      error_message,
    });
  } catch {}
}

// ---------- capacity helper ----------
async function findFreeRoomForType(
  supa: any,
  opts: {
    property_id: string;
    room_type_id: string;
    start_date: string;
    end_date: string;
  }
): Promise<string | null> {
  const { property_id, room_type_id, start_date, end_date } = opts;

  const rRooms = await supa
    .from("rooms")
    .select("id,name")
    .eq("property_id", property_id)
    .eq("room_type_id", room_type_id)
    .order("name", { ascending: true });

  if (rRooms.error || !rRooms.data || rRooms.data.length === 0) return null;
  const candIds: string[] = rRooms.data.map((r: any) => String(r.id));

  const rBusy = await supa
    .from("bookings")
    .select("room_id,start_date,end_date,status")
    .in("room_id", candIds)
    .neq("status", "cancelled")
    .lt("start_date", end_date)
    .gt("end_date", start_date);

  const busy = new Set<string>();
  if (!rBusy.error) {
    for (const b of rBusy.data ?? []) if (b.room_id) busy.add(String(b.room_id));
  }

  const free: string | undefined = candIds.find((id: string) => !busy.has(id));
  return free ?? null;
}

// ---------- event normalization ----------
type Norm = {
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
};
function normalizeEvent(ev: ParsedEvent, propTZ: string): Norm {
  let startDateStr = ev.start.date;
  let endDateStr = ev.end?.date ?? ev.start.date;
  let startTimeStr: string | null = ev.start.time ?? null;
  let endTimeStr: string | null = ev.end?.time ?? null;

  if (ev.start.absolute) {
    const dStart = toLocalDateTime(ev.start.absolute, propTZ);
    startDateStr = fmtDate(dStart, propTZ);
    startTimeStr = fmtTime(dStart, propTZ);
  }
  if (ev.end?.absolute) {
    const dEnd = toLocalDateTime(ev.end.absolute as Date, propTZ);
    endDateStr = fmtDate(dEnd, propTZ);
    endTimeStr = fmtTime(dEnd, propTZ);
  }
  if (endDateStr < startDateStr) endDateStr = startDateStr;

  return {
    start_date: startDateStr,
    end_date: endDateStr,
    start_time: startTimeStr,
    end_time: endTimeStr,
  };
}

// ---------- merge form → ical booking ----------
async function mergeFormIntoIcal(
  supa: any,
  params: {
    property_id: string;
    icalBookingId: string;
    icalRoomId: string | null;
    icalRoomTypeId: string | null;
    start_date: string;
    end_date: string;
  }
) {
  const {
    property_id,
    icalBookingId,
    icalRoomId,
    icalRoomTypeId,
    start_date,
    end_date,
  } = params;

  // load candidate form-ish bookings on same interval
  const rCands = await supa
    .from("bookings")
    .select(
      "id,room_id,room_type_id,guest_first_name,guest_last_name,guest_email,guest_phone,guest_address,form_submitted_at,source,is_soft_hold,status"
    )
    .eq("property_id", property_id)
    .eq("start_date", start_date)
    .eq("end_date", end_date)
    .neq("status", "cancelled");

  if (rCands.error) return { merged: false };

  const forms: any[] = (rCands.data || []).filter(
    isFormish as (b: any) => boolean
  );
  if (forms.length === 0) return { merged: false };

  // scoring: prefer same room_id, otherwise same room_type_id, otherwise single remaining
  let pick: any | null = null;
  if (icalRoomId) {
    pick =
      forms.find(
        (f: any) => String(f.room_id || "") === String(icalRoomId)
      ) || null;
  }
  if (!pick && icalRoomTypeId) {
    pick =
      forms.find(
        (f: any) => String(f.room_type_id || "") === String(icalRoomTypeId)
      ) || null;
  }
  if (!pick && forms.length === 1) pick = forms[0];
  if (!pick) return { merged: false };

  const formId = String(pick.id);

  // copy guest & form markers on ical (do NOT change source away from 'ical')
  await supa
    .from("bookings")
    .update({
      source: "ical",
      guest_first_name: pick.guest_first_name ?? null,
      guest_last_name: pick.guest_last_name ?? null,
      guest_email: pick.guest_email ?? null,
      guest_phone: pick.guest_phone ?? null,
      guest_address: pick.guest_address ?? null,
      form_submitted_at:
        pick.form_submitted_at ?? new Date().toISOString(),
    })
    .eq("id", icalBookingId);

  // move booking_contacts
  try {
    const rBC = await supa
      .from("booking_contacts")
      .select("email,phone,address,city,country")
      .eq("booking_id", formId)
      .maybeSingle();
    if (!rBC.error && rBC.data) {
      await supa.from("booking_contacts").upsert(
        { booking_id: icalBookingId, ...rBC.data },
        { onConflict: "booking_id" }
      );
    }
  } catch {}

  // move documents
  try {
    await supa
      .from("booking_documents")
      .update({ booking_id: icalBookingId })
      .eq("booking_id", formId);
  } catch {}

  // delete the form hold to avoid double counting capacity
  try {
    await supa.from("bookings").delete().eq("id", formId);
  } catch {}

  return { merged: true, mergedFormId: formId };
}

// ---------- create/update booking from event ----------
async function createOrUpdateFromEvent(
  supa: any,
  feed: {
    id: string;
    property_id: string;
    room_type_id: string | null;
    room_id: string | null;
    provider: string | null;
    properties: { timezone: string | null };
  },
  ev: ParsedEvent
) {
  const propTZ = feed.properties.timezone || "UTC";
  const { start_date, end_date, start_time, end_time } = normalizeEvent(
    ev,
    propTZ
  );

  // suppression by UID (if booking manually deleted earlier)
  if (ev.uid) {
    try {
      const { data: suppr } = await supa
        .from("ical_suppressions")
        .select("id")
        .eq("property_id", feed.property_id)
        .eq("ical_uid", ev.uid)
        .limit(1);
      if ((suppr?.length || 0) > 0)
        return { skipped: true, reason: "suppressed" };
    } catch {}
  }

  // 1) Try strict match by UID via map or bookings. If found → update metadata & try merge form.
  let icalBooking: any | null = null;

  if (ev.uid) {
    const rMap = await supa
      .from("ical_uid_map")
      .select("booking_id")
      .eq("property_id", feed.property_id)
      .eq("uid", ev.uid)
      .maybeSingle();
    if (!rMap.error && rMap.data && rMap.data.booking_id) {
      const rBk = await supa
        .from("bookings")
        .select(
          "id,room_id,room_type_id,source,ical_uid,ota_integration_id"
        )
        .eq("id", rMap.data.booking_id)
        .maybeSingle();
      if (!rBk.error && rBk.data) icalBooking = rBk.data;
    }

    if (!icalBooking) {
      const rBk = await supa
        .from("bookings")
        .select(
          "id,room_id,room_type_id,source,ical_uid,ota_integration_id"
        )
        .eq("property_id", feed.property_id)
        .eq("ical_uid", ev.uid)
        .maybeSingle();
      if (!rBk.error && rBk.data) icalBooking = rBk.data;
    }
  }

  // 2) Fallback match without UID by same dates + same room_id OR room_type_id and source ical
  if (!icalBooking) {
    const orConds: string[] = [];
    if (feed.room_id) orConds.push(`room_id.eq.${feed.room_id}`);
    if (feed.room_type_id) orConds.push(`room_type_id.eq.${feed.room_type_id}`);
    let rBk: any = null;

    if (orConds.length > 0) {
      rBk = await supa
        .from("bookings")
        .select(
          "id,room_id,room_type_id,source,ical_uid,ota_integration_id"
        )
        .eq("property_id", feed.property_id)
        .eq("start_date", start_date)
        .eq("end_date", end_date)
        .eq("source", "ical")
        .or(orConds.join(","))
        .maybeSingle();
      if (!rBk.error && rBk.data) icalBooking = rBk.data;
    }
  }

  // 3) Create or update booking (always keep `source='ical'`)
  let bookingId: string;
  let room_id_final: string | null = null;
  let room_type_id_final: string | null = null;

  if (icalBooking) {
    bookingId = String(icalBooking.id);
    room_id_final = icalBooking.room_id ?? (feed.room_id || null);
    room_type_id_final = icalBooking.room_type_id ?? (feed.room_type_id || null);

    // if feed has explicit room_id and booking lacks one → set it
    if (feed.room_id && !icalBooking.room_id) {
      await supa.from("bookings").update({ room_id: feed.room_id }).eq("id", bookingId);
      room_id_final = feed.room_id;
    }
    // if booking lacks type but feed has → set type
    if (!icalBooking.room_type_id && feed.room_type_id) {
      await supa.from("bookings").update({ room_type_id: feed.room_type_id }).eq("id", bookingId);
      room_type_id_final = feed.room_type_id;
    }

    // set source, integration metadata, ical_uid (do not overwrite user form data)
    await supa
      .from("bookings")
      .update({
        source: "ical",
        ical_uid: ev.uid ?? icalBooking.ical_uid ?? null,
        ota_integration_id: feed.id,
        ota_provider: feed.provider ?? null,
      })
      .eq("id", bookingId);
  } else {
    // choose room_id (camera) if feed is per-type
    if (feed.room_id) {
      room_id_final = feed.room_id;
      room_type_id_final = feed.room_type_id ?? null;
    } else if (feed.room_type_id) {
      room_type_id_final = feed.room_type_id;
      const free = await findFreeRoomForType(supa, {
        property_id: feed.property_id,
        room_type_id: feed.room_type_id,
        start_date,
        end_date,
      });
      room_id_final = free ?? null; // dacă nu e liber, salvăm fără cameră
    } else {
      room_type_id_final = null;
      room_id_final = null;
    }

    // create new iCal booking
    const ins = await supa
      .from("bookings")
      .insert({
        property_id: feed.property_id,
        room_id: room_id_final,
        room_type_id: room_type_id_final,
        start_date,
        end_date,
        start_time,
        end_time,
        status: "confirmed",
        source: "ical",
        ical_uid: ev.uid ?? null,
        ota_integration_id: feed.id,
        ota_provider: feed.provider ?? null,
      })
      .select("id")
      .single();

    if (ins.error || !ins.data)
      throw new Error(ins.error?.message || "create_booking_failed");
    bookingId = String(ins.data.id);
  }

  // 4) Upsert UID map (if UID present)
  if (ev.uid) {
    try {
      await supa.from("ical_uid_map").upsert(
        {
          property_id: feed.property_id,
          room_type_id: room_type_id_final ?? null,
          room_id: room_id_final ?? null,
          booking_id: bookingId,
          uid: ev.uid,
          source: feed.provider || "ical",
          start_date,
          end_date,
          start_time: start_time ?? null,
          end_time: end_time ?? null,
          integration_id: feed.id,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "property_id,uid" }
      );
    } catch {}
  }

  // 5) Best-effort: mark any matching unassigned as resolved (if still present)
  try {
    if (ev.uid) {
      await supa
        .from("ical_unassigned_events")
        .update({ resolved: true })
        .eq("property_id", feed.property_id)
        .eq("uid", ev.uid);
    } else {
      const eqCol = feed.room_id ? "room_id" : "room_type_id";
      await supa
        .from("ical_unassigned_events")
        .update({ resolved: true })
        .eq("property_id", feed.property_id)
        .eq(eqCol as any, feed.room_id || feed.room_type_id)
        .eq("start_date", start_date)
        .eq("end_date", end_date);
    }
  } catch {}

  // 6) Merge any existing form-hold onto this iCal booking (preserve source=ical)
  await mergeFormIntoIcal(supa, {
    property_id: feed.property_id,
    icalBookingId: bookingId,
    icalRoomId: room_id_final,
    icalRoomTypeId: room_type_id_final,
    start_date,
    end_date,
  });

  return { ok: true, bookingId };
}

// ---------- handler ----------
type FeedRow = {
  id: string;
  property_id: string;
  room_type_id: string | null;
  room_id: string | null;
  provider: string | null;
  url: string;
  is_active: boolean | null;
  last_sync: string | null;
  color?: string | null;
  logo_url?: string | null;
  properties: { id: string; admin_id: string; timezone: string | null };
};

// raw type from supabase (properties can be object OR array)
type FeedRowRaw = Omit<FeedRow, "properties"> & {
  properties:
    | { id: string; admin_id: string; timezone: string | null }
    | Array<{ id: string; admin_id: string; timezone: string | null }>;
};

async function runAutosync(req: Request) {
  try {
    // security
    const headerKey = req.headers.get("x-cron-key") || "";
    const isVercelCron = !!req.headers.get("x-vercel-cron");
    const queryKey = (() => {
      try {
        const u = new URL(req.url);
        return u.searchParams.get("key") || "";
      } catch {
        return "";
      }
    })();
    const expected = process.env.CRON_ICAL_KEY || "";
    const auth = req.headers.get("authorization") || "";
    const bearer = auth.replace(/^Bearer\s+/i, "");
    const tokenQ = (() => {
      try {
        const u = new URL(req.url);
        return u.searchParams.get("token") || "";
      } catch {
        return "";
      }
    })();
    const keyOk =
      expected &&
      [headerKey, queryKey, bearer, tokenQ].some((v) => v && v === expected);
    if (!isVercelCron && !keyOk) {
      return j(401, { error: "Unauthorized" });
    }

    // supabase service-role
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createSb(url, serviceKey, {
      auth: { persistSession: false },
    });

    // active feeds
    const { data: feeds, error: fErr } = await supabase
      .from("ical_type_integrations")
      .select(
        `
        id,
        property_id,
        room_type_id,
        room_id,
        provider,
        url,
        is_active,
        last_sync,
        color,
        logo_url,
        properties:properties!inner(
          id,
          admin_id,
          timezone
        )
      `
      )
      .eq("is_active", true);

    if (fErr)
      return j(400, { error: "Load feeds failed", details: fErr.message });
    if (!feeds || (feeds as any[]).length === 0)
      return j(200, { ok: true, message: "No active feeds." });

    // normalize properties (array -> first element)
    const feedsRaw = (feeds ?? []) as unknown as FeedRowRaw[];
    const feedsNorm: FeedRow[] = feedsRaw
      .map((r: FeedRowRaw) => {
        const props = Array.isArray(r.properties)
          ? r.properties[0]
          : r.properties;
        if (!props) return null as unknown as FeedRow;
        return { ...r, properties: props };
      })
      .filter(Boolean) as FeedRow[];

    // group by account
    const byAccount = new Map<string, FeedRow[]>();
    for (const f of feedsNorm) {
      const acc = f.properties.admin_id;
      if (!byAccount.has(acc)) byAccount.set(acc, []);
      byAccount.get(acc)!.push(f);
    }

    const summary: any[] = [];
    for (const [accountId, rows] of byAccount.entries()) {
      // policy: autosync quota/cooldown
      const can = await supabase.rpc("account_can_sync_now_v2", {
        p_account_id: accountId,
        p_event_type: "autosync",
      });

      if (can.error) {
        summary.push({
          accountId,
          ok: false,
          reason: "policy_rpc_failed",
          details: can.error.message,
          processedFeeds: 0,
          importedEvents: 0,
        });
        continue;
      }
      if (!can.data?.allowed) {
        summary.push({
          accountId,
          ok: false,
          reason: can.data?.reason ?? "not_allowed",
          cooldown_remaining_sec: can.data?.cooldown_remaining_sec ?? 0,
          processedFeeds: 0,
          importedEvents: 0,
        });
        for (const f of rows)
          await logSync(supabase, { integration_id: f.id, status: "cooldown" });
        continue;
      }

      // allowed
      let processed = 0;
      let importedTotal = 0;

      for (const feed of rows) {
        try {
          const startedAt = new Date();
          const propTZ = feed.properties.timezone || "UTC";
          const res = await fetchWithRetry(feed.url, {
            timeoutMs: 15000,
            retries: 1,
          });
          if (!res.ok) {
            summary.push({
              accountId,
              feedId: feed.id,
              ok: false,
              reason: "fetch_failed",
              status: res.status,
            });
            await logSync(supabase, {
              integration_id: feed.id,
              status: "error",
              error_message: `http_${res.status}`,
              started_at: startedAt.toISOString(),
              finished_at: new Date().toISOString(),
            });
            processed++;
            continue;
          }
          const ics = await res.text();
          const events: ParsedEvent[] = parseIcsToEvents(ics);

          let imported = 0;
          for (const ev of events) {
            if (!ev.start) continue;

            // create/update booking directly from event (keeps source='ical')
            await createOrUpdateFromEvent(supabase, feed, ev);
            imported++;
          }

          // mark last_sync
          await supabase
            .from("ical_type_integrations")
            .update({ last_sync: new Date().toISOString() })
            .eq("id" as any, feed.id as any);

          await logSync(supabase, {
            integration_id: feed.id,
            status: "ok",
            imported,
            started_at: startedAt.toISOString(),
            finished_at: new Date().toISOString(),
          });

          importedTotal += imported;
          processed++;
          summary.push({ accountId, feedId: feed.id, ok: true, imported });
        } catch (e: any) {
          processed++;
          summary.push({
            accountId,
            feedId: feed.id,
            ok: false,
            reason: "exception",
            error: e?.message ?? String(e),
          });
          await logSync(supabase, {
            integration_id: feed.id,
            status: "error",
            error_message: e?.message ?? String(e),
          });
        }
      }

      // register usage per account for this run
      await supabase.rpc("account_register_sync_usage_v2", {
        p_account_id: accountId,
        p_event_type: "autosync",
      });

      summary.push({
        accountId,
        ok: true,
        processedFeeds: processed,
        importedEvents: importedTotal,
      });
    }

    return j(200, { ok: true, summary });
  } catch (e: any) {
    return j(500, { error: "Server error", details: e?.message ?? String(e) });
  }
}

export async function POST(req: Request) {
  return runAutosync(req);
}

export async function GET(req: Request) {
  return runAutosync(req);
}

export async function HEAD(req: Request) {
  const headerKey = req.headers.get("x-cron-key") || "";
  const expected = process.env.CRON_ICAL_KEY || "";
  if (!expected || headerKey !== expected)
    return new NextResponse(null, { status: 401 });
  return new NextResponse(null, { status: 200 });
}