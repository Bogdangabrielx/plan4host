// app/api/ical/sync/type/route.ts
import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient as createRls } from "@/lib/supabase/server";
import { parseIcsToEvents, toLocalDateTime, type ParsedEvent } from "@/lib/ical/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** ---------- tiny helpers ---------- */
function j(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fetchWithRetry(url: string, opts?: { timeoutMs?: number; retries?: number }) {
  const timeoutMs = opts?.timeoutMs ?? 15000;
  const retries = opts?.retries ?? 1;
  let attempt = 0;
  let lastErr: any = null;
  while (attempt <= retries) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method: "GET", signal: ac.signal } as RequestInit);
      clearTimeout(t);
      return res;
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (attempt < retries) await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
    }
    attempt++;
  }
  throw lastErr || new Error("fetch failed");
}

function fmtDate(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function fmtTime(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit" }).format(d);
}
type Norm = { start_date: string; end_date: string; start_time: string | null; end_time: string | null; };
function normalizeEvent(ev: ParsedEvent, propTZ: string): Norm {
  let start_date = ev.start.date;
  let end_date = ev.end?.date ?? ev.start.date;
  let start_time: string | null = ev.start.time ?? null;
  let end_time: string | null = ev.end?.time ?? null;

  if (ev.start.absolute) {
    const d = toLocalDateTime(ev.start.absolute, propTZ);
    start_date = fmtDate(d, propTZ);
    start_time = fmtTime(d, propTZ);
  }
  if (ev.end?.absolute) {
    const d = toLocalDateTime(ev.end.absolute as Date, propTZ);
    end_date = fmtDate(d, propTZ);
    end_time = fmtTime(d, propTZ);
  }
  if (end_date < start_date) end_date = start_date;
  return { start_date, end_date, start_time, end_time };
}

/** ---------- capacity helper ---------- */
async function findFreeRoomForType(
  supa: any,
  opts: { property_id: string; room_type_id: string; start_date: string; end_date: string; }
): Promise<string | null> {
  const { property_id, room_type_id, start_date, end_date } = opts;
  const rRooms = await supa.from("rooms").select("id,name").eq("property_id", property_id).eq("room_type_id", room_type_id).order("name", { ascending: true });
  if (rRooms.error || !rRooms.data || rRooms.data.length === 0) return null;
  const candIds: string[] = rRooms.data.map((r: any) => String(r.id));
  const rBusy = await supa.from("bookings")
    .select("room_id,start_date,end_date,status")
    .in("room_id", candIds)
    .neq("status", "cancelled")
    .lt("start_date", end_date)
    .gt("end_date", start_date);
  const busy = new Set<string>();
  if (!rBusy.error) for (const b of rBusy.data ?? []) if (b.room_id) busy.add(String(b.room_id));
  const free: string | undefined = candIds.find((id: string) => !busy.has(id));
  return free ?? null;
}

/** ---------- merge form → iCal (SAFE ARCHIVE; nu ștergem formularul) ---------- */
function isFormish(b: any) {
  const src = (b?.source || "").toString().toLowerCase();
  // fără is_soft_hold / hold_status (au dispărut din DB)
  return src === "form" || !!b?.form_submitted_at || b?.status === "hold" || b?.status === "pending";
}
async function mergeFormIntoIcal(supa: any, params: {
  property_id: string; icalBookingId: string; icalRoomId: string | null; icalRoomTypeId: string | null; start_date: string; end_date: string;
}) {
  const { property_id, icalBookingId, icalRoomId, icalRoomTypeId, start_date, end_date } = params;

  const rCands = await supa
    .from("bookings")
    .select("id,room_id,room_type_id,guest_first_name,guest_last_name,guest_email,guest_phone,guest_address,form_submitted_at,source,is_soft_hold,status")
    .eq("property_id", property_id).eq("start_date", start_date).eq("end_date", end_date).neq("status", "cancelled");
  if (rCands.error) return { merged: false };

  const forms: any[] = (rCands.data || []).filter(isFormish as (b: any) => boolean);
  if (forms.length === 0) return { merged: false };

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
  try { await supa.from("booking_documents").update({ booking_id: icalBookingId }).eq("booking_id", formId); } catch {}

  // SAFE-ARCHIVE: nu ștergem form-ul; îl marcăm „converted” ca să nu fie anulat de RPC-ul de hold-uri.
  try {
    await supa.from("bookings").update({
      is_soft_hold: false,
      hold_status: "converted",
      source: "form",
    })
    .eq("id", formId)
    .eq("is_soft_hold", true)
    .in("status", ["hold", "pending"]);
  } catch {}

  return { merged: true, mergedFormId: formId };
}

/** ---------- create/update from iCal (fără stale-cancel) ---------- */
async function createOrUpdateFromEvent(
  supa: any,
  feed: { id: string; property_id: string; room_type_id: string | null; room_id: string | null; provider: string | null; properties: { timezone: string | null } },
  ev: ParsedEvent
) {
  const propTZ = feed.properties.timezone || "UTC";
  const { start_date, end_date, start_time, end_time } = normalizeEvent(ev, propTZ);

  // dacă a fost suprimat manual (delete), nu-l readucem
  if (ev.uid) {
    const { data: suppr } = await supa.from("ical_suppressions").select("id").eq("property_id", feed.property_id).eq("ical_uid", ev.uid).limit(1);
    if ((suppr?.length || 0) > 0) return { skipped: true, reason: "suppressed" };
  }

  // match by UID (map sau direct în bookings)
  let icalBooking: any | null = null;
  if (ev.uid) {
    const rMap = await supa.from("ical_uid_map").select("booking_id").eq("property_id", feed.property_id).eq("uid", ev.uid).maybeSingle();
    if (!rMap.error && rMap.data?.booking_id) {
      const rBk = await supa.from("bookings").select("id,room_id,room_type_id,source,ical_uid,ota_integration_id").eq("id", rMap.data.booking_id).maybeSingle();
      if (!rBk.error && rBk.data) icalBooking = rBk.data;
    }
    if (!icalBooking) {
      const rBk = await supa.from("bookings").select("id,room_id,room_type_id,source,ical_uid,ota_integration_id")
        .eq("property_id", feed.property_id).eq("ical_uid", ev.uid).maybeSingle();
      if (!rBk.error && rBk.data) icalBooking = rBk.data;
    }
  }

  // fallback: aceleași date + (room_id|room_type_id) și source=ical
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

  // create/update
  let bookingId: string;
  let room_id_final: string | null = null;
  let room_type_id_final: string | null = null;

  if (icalBooking) {
    bookingId = String(icalBooking.id);
    room_id_final = icalBooking.room_id ?? (feed.room_id || null);
    room_type_id_final = icalBooking.room_type_id ?? (feed.room_type_id || null);

    if (feed.room_id && !icalBooking.room_id) { await supa.from("bookings").update({ room_id: feed.room_id }).eq("id", bookingId); room_id_final = feed.room_id; }
    if (!icalBooking.room_type_id && feed.room_type_id) { await supa.from("bookings").update({ room_type_id: feed.room_type_id }).eq("id", bookingId); room_type_id_final = feed.room_type_id; }

    await supa.from("bookings").update({
      source: "ical",
      ical_uid: ev.uid ?? icalBooking.ical_uid ?? null,
      ota_integration_id: feed.id,
      ota_provider: feed.provider ?? null,
      start_date, end_date, start_time, end_time,
      status: "confirmed",
    }).eq("id", bookingId);

  } else {
    if (feed.room_id) {
      room_id_final = feed.room_id; room_type_id_final = feed.room_type_id ?? null;
    } else if (feed.room_type_id) {
      room_type_id_final = feed.room_type_id;
      room_id_final = await findFreeRoomForType(supa, { property_id: feed.property_id, room_type_id: feed.room_type_id, start_date, end_date });
    } else {
      room_id_final = null; room_type_id_final = null;
    }

    const ins = await supa.from("bookings").insert({
      property_id: feed.property_id,
      room_id: room_id_final,
      room_type_id: room_type_id_final,
      start_date, end_date, start_time, end_time,
      status: "confirmed",
      source: "ical",
      ical_uid: ev.uid ?? null,
      ota_integration_id: feed.id,
      ota_provider: feed.provider ?? null,
    }).select("id").single();
    if (ins.error || !ins.data) throw new Error(ins.error?.message || "create_booking_failed");
    bookingId = String(ins.data.id);
  }

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

  // best-effort: rezolvăm unassigned
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

  // merge (safe archive)
  await mergeFormIntoIcal(supa, {
    property_id: feed.property_id,
    icalBookingId: bookingId,
    icalRoomId: room_id_final,
    icalRoomTypeId: room_type_id_final,
    start_date, end_date,
  });

  return { ok: true, bookingId };
}

/** ---------- POST: Sync Now (ONE integration / type feed) ---------- */
export async function POST(req: Request) {
  try {
    const rls = createRls(); // RLS & auth
    const { data: auth } = await rls.auth.getUser();
    if (!auth?.user) return j(401, { error: "Not authenticated" });

    const body = await req.json().catch(() => ({}));
    const integrationId = String(body?.integrationId || "").trim();
    if (!integrationId) return j(400, { error: "integrationId missing" });

    // load integration + property (RLS face access check)
    const { data: integ, error: eInteg } = await rls
      .from("ical_type_integrations")
      .select("id,property_id,room_type_id,room_id,provider,url,is_active,properties:properties!inner(id,admin_id,timezone)")
      .eq("id", integrationId)
      .single();
    if (eInteg || !integ) return j(404, { error: "Integration not found" });
    if (integ.is_active === false) return j(409, { error: "Integration inactive" });

    const accountId = (integ.properties as any).admin_id as string;

    // gating: premium + cooldown pentru sync_now
    const can = await rls.rpc("account_can_sync_now_v2", { p_account_id: accountId, p_event_type: "sync_now" });
    if (can.error) return j(400, { error: "Policy check failed", details: can.error.message });
    if (!can.data?.allowed) {
      return j(429, {
        error: "Rate limited",
        reason: can.data?.reason,
        cooldown_remaining_sec: can.data?.cooldown_remaining_sec ?? 0,
        remaining_in_window: can.data?.remaining_in_window ?? 0,
        retry_after_sec: can.data?.cooldown_remaining_sec ?? 0,
      });
    }

    // admin client pentru write
    const admin = createAdmin(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // fetch ICS + parse
    const res = await fetchWithRetry(integ.url, { timeoutMs: 15000, retries: 1 });
    if (!res.ok) return j(400, { error: `Fetch failed (${res.status})` });
    const icsText = await res.text();
    const events = parseIcsToEvents(icsText);

    // iterate events
    let imported = 0;
    for (const ev of events) {
      if (!ev.start) continue;
      await createOrUpdateFromEvent(admin, {
        id: integ.id,
        property_id: integ.property_id,
        room_type_id: integ.room_type_id,
        room_id: integ.room_id,
        provider: integ.provider,
        properties: { timezone: (integ.properties as any).timezone || "UTC" },
      }, ev);
      imported++;
    }

    // mark last_sync + register usage
    await admin.from("ical_type_integrations").update({ last_sync: new Date().toISOString() }).eq("id", integrationId);
    await rls.rpc("account_register_sync_usage_v2", { p_account_id: accountId, p_event_type: "sync_now" });

    return j(200, { ok: true, integrationId, imported });
  } catch (e: any) {
    return j(500, { error: "Server error", details: e?.message || String(e) });
  }
}