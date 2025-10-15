import { NextResponse } from "next/server";
import { createClient as createSb } from "@supabase/supabase-js";
import { parseIcsToEvents, toLocalDateTime, type ParsedEvent } from "@/lib/ical/parse";

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

function fmtDate(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  return f.format(d); // YYYY-MM-DD
}
function fmtTime(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit" });
  return f.format(d); // HH:MM
}

// small net helper
async function fetchWithRetry(url: string, opts?: { timeoutMs?: number; retries?: number }) {
  const timeoutMs = opts?.timeoutMs ?? 15000;
  const retries = opts?.retries ?? 1;
  let attempt = 0;
  let lastErr: any = null;
  while (attempt <= retries) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method: "GET", headers: { "User-Agent": "plan4host-ical-fetch/1.0" }, signal: ac.signal } as RequestInit);
      clearTimeout(t);
      return res;
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (attempt < retries) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
    attempt++;
  }
  throw lastErr || new Error("fetch failed");
}

async function logSync(supabase: any, params: {
  integration_id: string; status: string; imported?: number; error_message?: string; started_at?: string; finished_at?: string;
}) {
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

// ---------- capacity helper (NUMAI rezervări reale blochează) ----------
async function findFreeRoomForType(
  supa: any,
  opts: { property_id: string; room_type_id: string; start_date: string; end_date: string; }
): Promise<string | null> {
  const { property_id, room_type_id, start_date, end_date } = opts;

  const rRooms = await supa
    .from("rooms")
    .select("id,name")
    .eq("property_id", property_id)
    .eq("room_type_id", room_type_id)
    .order("name", { ascending: true });

  if (rRooms.error || !rRooms.data?.length) return null;
  const candIds: string[] = rRooms.data.map((r: any) => String(r.id));

  const rBusy = await supa
    .from("bookings")
    .select("room_id,start_date,end_date,status")
    .in("room_id", candIds)
    .in("status", ["confirmed", "checked_in"])
    .lt("start_date", end_date)
    .gt("end_date", start_date);

  const busy = new Set<string>((rBusy.data || []).map((b: any) => String(b.room_id)).filter(Boolean));
  const free = candIds.find((id: string) => !busy.has(id));
  return free ?? null;
}

// ---------- event normalization ----------
type Norm = { start_date: string; end_date: string; start_time: string | null; end_time: string | null; };
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

  return { start_date: startDateStr, end_date: endDateStr, start_time: startTimeStr, end_time: endTimeStr };
}

// ---------- merge form → iCal (fără delete; fără soft-hold) ----------
function isFormish(b: any) {
  const src = (b?.source || "").toString().toLowerCase();
  // Doar sursa 'form' sau status temporar hold/pending definesc un FORM booking
  return src === "form" || b?.status === "hold" || b?.status === "pending";
}
async function mergeFormIntoIcal(
  supa: any,
  params: { property_id: string; icalBookingId: string; icalRoomId: string | null; icalRoomTypeId: string | null; start_date: string; end_date: string; }
) {
  const { property_id, icalBookingId, icalRoomId, icalRoomTypeId, start_date, end_date } = params;

  // Nu modificăm iCal booking dacă este deja "verde" (paired/locked)
  try {
    const rLock = await supa
      .from("bookings")
      .select("id, guest_first_name, guest_last_name, guest_name, form_submitted_at")
      .eq("id", icalBookingId)
      .maybeSingle();
    if (!rLock.error && rLock.data) {
      const anyName = ((rLock.data.guest_first_name || '').trim().length + (rLock.data.guest_last_name || '').trim().length) > 0 || (rLock.data.guest_name || '').trim().length > 0;
      const locked = !!rLock.data.form_submitted_at || anyName;
      if (locked) return { merged: false };
    }
  } catch {}

  const rCands = await supa
    .from("bookings")
    .select("id,room_id,room_type_id,guest_first_name,guest_last_name,guest_email,guest_phone,guest_address,form_submitted_at,source,status")
    .eq("property_id", property_id)
    .eq("start_date", start_date)
    .eq("end_date", end_date)
    .neq("status", "cancelled");

  if (rCands.error) return { merged: false };
  const forms: any[] = (rCands.data || [])
    .filter(isFormish as (b: any) => boolean)
    .sort((a: any, b: any) => ((a.form_submitted_at || a.created_at || '') as string).localeCompare((b.form_submitted_at || b.created_at || '') as string));
  if (!forms.length) return { merged: false };

  let pick: any | null = null;
  if (icalRoomId) pick = forms.find((f: any) => String(f.room_id || "") === String(icalRoomId)) || null;
  if (!pick && icalRoomTypeId) pick = forms.find((f: any) => String(f.room_type_id || "") === String(icalRoomTypeId)) || null;
  if (!pick && forms.length === 1) pick = forms[0];
  if (!pick) return { merged: false };

  const formId = String(pick.id);

  await supa.from("bookings").update({
    source: "ical",
    guest_first_name: pick.guest_first_name ?? null,
    guest_last_name:  pick.guest_last_name  ?? null,
    guest_email:      pick.guest_email      ?? null,
    guest_phone:      pick.guest_phone      ?? null,
    guest_address:    pick.guest_address    ?? null,
    form_submitted_at: pick.form_submitted_at ?? new Date().toISOString(),
  }).eq("id", icalBookingId);

  try {
    const rBC = await supa.from("booking_contacts").select("email,phone,address,city,country").eq("booking_id", formId).maybeSingle();
    if (!rBC.error && rBC.data) {
      await supa.from("booking_contacts").upsert({ booking_id: icalBookingId, ...rBC.data }, { onConflict: "booking_id" });
    }
  } catch {}
  try {
    await supa.from("booking_documents").update({ booking_id: icalBookingId }).eq("booking_id", formId);
  } catch {}

  return { merged: true, mergedFormId: formId };
}

// ---------- create/update booking from event ----------
async function createOrUpdateFromEvent(
  supa: any,
  feed: { id: string; property_id: string; room_type_id: string | null; room_id: string | null; provider: string | null; properties: { timezone: string | null } },
  ev: ParsedEvent
) {
  const propTZ = feed.properties.timezone || "UTC";
  const { start_date, end_date, start_time, end_time } = normalizeEvent(ev, propTZ);
  // Force times to property defaults (check-in/out) regardless of ICS
  let CI = "14:00"; let CO = "11:00";
  try {
    const rProp = await supa.from('properties').select('check_in_time,check_out_time').eq('id', feed.property_id).maybeSingle();
    if (!rProp.error && rProp.data) {
      CI = (rProp.data as any).check_in_time || CI;
      CO = (rProp.data as any).check_out_time || CO;
    }
  } catch {}
  const effStartTime = CI;
  const effEndTime = CO;

  // 0) ICS STATUS=CANCELLED? doar marchează booking-ul ca 'cancelled' și ieșim
  const icsStatus = String((ev as any).status || "").toUpperCase();
  if (icsStatus === "CANCELLED" && ev.uid) {
    try {
      const rMap = await supa.from("ical_uid_map").select("booking_id").eq("property_id", feed.property_id).eq("uid", ev.uid).maybeSingle();
      const bookingId = rMap?.data?.booking_id;
      if (bookingId) await supa.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
      await supa.from("ical_uid_map").upsert({
        property_id: feed.property_id, uid: ev.uid, integration_id: feed.id, last_seen: new Date().toISOString(),
      }, { onConflict: "property_id,uid" });
    } catch {}
    return { ok: true, cancelled: true };
  }

  // suppression by UID (dacă a fost șters manual)
  if (ev.uid) {
    try {
      const { data: suppr } = await supa.from("ical_suppressions")
        .select("id").eq("property_id", feed.property_id).eq("ical_uid", ev.uid).limit(1);
      if ((suppr?.length || 0) > 0) return { skipped: true, reason: "suppressed" };
    } catch {}
  }

  // 1) match by UID
  let icalBooking: any | null = null;
  if (ev.uid) {
    const rMap = await supa.from("ical_uid_map").select("booking_id").eq("property_id", feed.property_id).eq("uid", ev.uid).maybeSingle();
    if (!rMap.error && rMap.data?.booking_id) {
      const rBk = await supa.from("bookings").select("id,room_id,room_type_id,source,ical_uid,ota_integration_id").eq("id", rMap.data.booking_id).maybeSingle();
      if (!rBk.error && rBk.data) icalBooking = rBk.data;
    }
    if (!icalBooking) {
      const rBk = await supa.from("bookings")
        .select("id,room_id,room_type_id,source,ical_uid,ota_integration_id")
        .eq("property_id", feed.property_id).eq("ical_uid", ev.uid).maybeSingle();
      if (!rBk.error && rBk.data) icalBooking = rBk.data;
    }
  }

  // 2) fallback: aceleași date + (room_id|room_type_id) și source=ical
  if (!icalBooking) {
    const orConds: string[] = [];
    if (feed.room_id) orConds.push(`room_id.eq.${feed.room_id}`);
    if (feed.room_type_id) orConds.push(`room_type_id.eq.${feed.room_type_id}`);
    if (orConds.length > 0) {
      const rBk = await supa.from("bookings")
        .select("id,room_id,room_type_id,source,ical_uid,ota_integration_id")
        .eq("property_id", feed.property_id)
        .eq("start_date", start_date).eq("end_date", end_date)
        .eq("source", "ical")
        .or(orConds.join(","))
        .maybeSingle();
      if (!rBk.error && rBk.data) icalBooking = rBk.data;
    }
  }

  // 3) create/update
  let bookingId: string;
  let room_id_final: string | null = null;
  let room_type_id_final: string | null = null;

  if (icalBooking) {
    bookingId = String(icalBooking.id);
    room_id_final = icalBooking.room_id ?? (feed.room_id || null);
    room_type_id_final = icalBooking.room_type_id ?? (feed.room_type_id || null);

    if (feed.room_id && !icalBooking.room_id) { await supa.from("bookings").update({ room_id: feed.room_id }).eq("id", bookingId); room_id_final = feed.room_id; }
    if (!icalBooking.room_type_id && feed.room_type_id) { await supa.from("bookings").update({ room_type_id: feed.room_type_id }).eq("id", bookingId); room_type_id_final = feed.room_type_id; }

    // Dacă există room types și booking-ul nu are încă room_id, cere DB să aloce atomic o cameră liberă
    if (!room_id_final) {
      const typeForAuto = room_type_id_final ?? feed.room_type_id ?? null;
      if (typeForAuto) {
        try {
          const rAssign = await supa.rpc('assign_room_for_type', {
            p_property_id: feed.property_id,
            p_room_type_id: String(typeForAuto),
            p_start_date: start_date,
            p_end_date: end_date,
            p_booking_id: bookingId,
          });
          if (!rAssign.error) room_id_final = (rAssign.data as any) || null;
        } catch {}
      }
    }

    // la autosync alegem să NU forțăm start/end_time (evităm drift-uri). Dacă vrei să le updatăm, de-comentează linia următoare.
    await supa.from("bookings").update({
      source: "ical",
      ical_uid: ev.uid ?? icalBooking.ical_uid ?? null,
      ota_integration_id: feed.id,
      ota_provider: feed.provider ?? null,
      start_date, end_date, start_time: effStartTime, end_time: effEndTime,
      status: "hold",
    }).eq("id", bookingId);

  } else {
    if (feed.room_id) {
      room_id_final = feed.room_id; room_type_id_final = feed.room_type_id ?? null;
    } else if (feed.room_type_id) {
      room_type_id_final = feed.room_type_id;
      // alocarea efectivă se face după INSERT prin RPC (assign_room_for_type)
      room_id_final = null;
    } else {
      room_id_final = null; room_type_id_final = null;
    }

    const ins = await supa.from("bookings").insert({
      property_id: feed.property_id,
      room_id: room_id_final,
      room_type_id: room_type_id_final,
      start_date, end_date, start_time: effStartTime, end_time: effEndTime,
      status: "hold",
      source: "ical",
      ical_uid: ev.uid ?? null,
      ota_integration_id: feed.id,
      ota_provider: feed.provider ?? null,
    }).select("id").single();

    if (ins.error || !ins.data) throw new Error(ins.error?.message || "create_booking_failed");
    bookingId = String(ins.data.id);

    // dacă e pe room_type, încearcă alocare atomică prin RPC după insert
    if (!room_id_final && room_type_id_final) {
      try {
        const rAssign = await supa.rpc('assign_room_for_type', {
          p_property_id: feed.property_id,
          p_room_type_id: String(room_type_id_final),
          p_start_date: start_date,
          p_end_date: end_date,
          p_booking_id: bookingId,
        });
        if (!rAssign.error) room_id_final = (rAssign.data as any) || null;
      } catch {}
    }
  }

  // 4) Upsert UID map
  if (ev.uid) {
    try {
      await supa.from("ical_uid_map").upsert({
        property_id: feed.property_id,
        room_type_id: room_type_id_final ?? null,
        room_id: room_id_final ?? null,
        booking_id: bookingId,
        uid: ev.uid,
        source: feed.provider || "ical",
        start_date, end_date, start_time: start_time ?? null, end_time: end_time ?? null,
        integration_id: feed.id,
        last_seen: new Date().toISOString(),
      }, { onConflict: "property_id,uid" });
    } catch {}
  }

  // 5) rezolvăm unassigned (best-effort)
  try {
    if (ev.uid) {
      await supa.from("ical_unassigned_events").update({ resolved: true }).eq("property_id", feed.property_id).eq("uid", ev.uid);
    } else {
      const eqCol = feed.room_id ? "room_id" : "room_type_id";
      await supa.from("ical_unassigned_events").update({ resolved: true })
        .eq("property_id", feed.property_id)
        .eq(eqCol as any, (feed.room_id || feed.room_type_id))
        .eq("start_date", start_date)
        .eq("end_date", end_date);
    }
  } catch {}

  // 6) merge form → iCal
  // Auto merge disabled: manual matching only

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
type FeedRowRaw = Omit<FeedRow, "properties"> & {
  properties: { id: string; admin_id: string; timezone: string | null } | Array<{ id: string; admin_id: string; timezone: string | null }>;
};

async function runAutosync(req: Request) {
  try {
    // security
    const headerKey = req.headers.get("x-cron-key") || "";
    const isVercelCron = !!req.headers.get("x-vercel-cron");
    const queryKey = (() => { try { return new URL(req.url).searchParams.get("key") || ""; } catch { return ""; } })();
    const expected = process.env.CRON_ICAL_KEY || "";
    const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const tokenQ = (() => { try { return new URL(req.url).searchParams.get("token") || ""; } catch { return ""; } })();
    const keyOk = expected && [headerKey, queryKey, bearer, tokenQ].some((v) => v && v === expected);
    if (!isVercelCron && !keyOk) return j(401, { error: "Unauthorized" });

    // supabase service-role
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createSb(url, serviceKey, { auth: { persistSession: false } });

    // active feeds
    const { data: feeds, error: fErr } = await supabase
      .from("ical_type_integrations")
      .select(`
        id, property_id, room_type_id, room_id, provider, url, is_active, last_sync, color, logo_url,
        properties:properties!inner(id, admin_id, timezone)
      `)
      .eq("is_active", true);

    if (fErr) return j(400, { error: "Load feeds failed", details: fErr.message });
    if (!feeds?.length) return j(200, { ok: true, message: "No active feeds." });

    // normalize properties (array -> first)
    const feedsNorm: FeedRow[] = (feeds as any as FeedRowRaw[])
      .map((r) => {
        const props = Array.isArray(r.properties) ? r.properties[0] : r.properties;
        return props ? ({ ...r, properties: props } as FeedRow) : null;
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
      // policy
      const can = await supabase.rpc("account_can_sync_now_v2", { p_account_id: accountId, p_event_type: "autosync" });
      if (can.error) {
        summary.push({ accountId, ok: false, reason: "policy_rpc_failed", details: can.error.message, processedFeeds: 0, importedEvents: 0 });
        continue;
      }
      if (!can.data?.allowed) {
        summary.push({ accountId, ok: false, reason: can.data?.reason ?? "not_allowed", cooldown_remaining_sec: can.data?.cooldown_remaining_sec ?? 0, processedFeeds: 0, importedEvents: 0 });
        for (const f of rows) await logSync(supabase, { integration_id: f.id, status: "cooldown" });
        continue;
      }

      // allowed
      let processed = 0;
      let importedTotal = 0;

      for (const feed of rows) {
        try {
          const startedAt = new Date();
          const res = await fetchWithRetry(feed.url, { timeoutMs: 15000, retries: 1 });
          if (!res.ok) {
            summary.push({ accountId, feedId: feed.id, ok: false, reason: "fetch_failed", status: res.status });
            await logSync(supabase, { integration_id: feed.id, status: "error", error_message: `http_${res.status}`, started_at: startedAt.toISOString(), finished_at: new Date().toISOString() });
            processed++;
            continue;
          }
          const ics = await res.text();
          const events: ParsedEvent[] = parseIcsToEvents(ics);

          let imported = 0;
          for (const ev of events) {
            if (!ev.start) continue;
            await createOrUpdateFromEvent(supabase, feed, ev);
            imported++;
          }

          await supabase.from("ical_type_integrations").update({ last_sync: new Date().toISOString() }).eq("id", feed.id);
          await logSync(supabase, { integration_id: feed.id, status: "ok", imported, started_at: startedAt.toISOString(), finished_at: new Date().toISOString() });

          importedTotal += imported;
          processed++;
          summary.push({ accountId, feedId: feed.id, ok: true, imported });
        } catch (e: any) {
          processed++;
          summary.push({ accountId, feedId: feed.id, ok: false, reason: "exception", error: e?.message ?? String(e) });
          await logSync(supabase, { integration_id: feed.id, status: "error", error_message: e?.message ?? String(e) });
        }
      }

      await supabase.rpc("account_register_sync_usage_v2", { p_account_id: accountId, p_event_type: "autosync" });
      summary.push({ accountId, ok: true, processedFeeds: processed, importedEvents: importedTotal });
    }

    return j(200, { ok: true, summary });
  } catch (e: any) {
    return j(500, { error: "Server error", details: e?.message ?? String(e) });
  }
}

export async function POST(req: Request) { return runAutosync(req); }
export async function GET(req: Request)  { return runAutosync(req); }
export async function HEAD(req: Request) {
  const headerKey = req.headers.get("x-cron-key") || "";
  const expected = process.env.CRON_ICAL_KEY || "";
  if (!expected || headerKey !== expected) return new NextResponse(null, { status: 401 });
  return new NextResponse(null, { status: 200 });
}
