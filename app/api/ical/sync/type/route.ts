// /app/api/ical/sync/type/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Helpers
 */

type Integration = {
  id: string;
  property_id: string;
  room_type_id: string;
  provider: string | null;
  url: string;
  is_active: boolean | null;
};

type Property = {
  id: string;
  timezone: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
};

type Room = { id: string; name: string; property_id: string; room_type_id: string | null };

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function admin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// Unfold iCal lines (RFC 5545 line folding)
function unfoldIcs(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (line.startsWith(" ") || line.startsWith("\t")) {
      // continuation of previous
      if (out.length) out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

type ICalEvent = {
  uid: string | null;
  status: string | null; // e.g. CANCELLED
  summary: string | null;
  dtstartRaw: string | null;
  dtstartTzid: string | null;
  dtendRaw: string | null;
  dtendTzid: string | null;
};

// crude VEVENT parser for UID/STATUS/SUMMARY/DTSTART/DTEND (+ TZID param)
function parseIcs(text: string): ICalEvent[] {
  const lines = unfoldIcs(text);
  const events: ICalEvent[] = [];

  let inEvent = false;
  let cur: ICalEvent | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      cur = {
        uid: null,
        status: null,
        summary: null,
        dtstartRaw: null,
        dtstartTzid: null,
        dtendRaw: null,
        dtendTzid: null,
      };
      continue;
    }
    if (line === "END:VEVENT") {
      if (inEvent && cur) events.push(cur);
      inEvent = false;
      cur = null;
      continue;
    }
    if (!inEvent || !cur) continue;

    // Simple key[:|;]value split with params
    const m = line.match(/^([^:;]+)(;[^:]+)?:([\s\S]*)$/);
    if (!m) continue;
    const key = m[1].toUpperCase();
    const params = (m[2] || "").toUpperCase(); // e.g. ";TZID=EUROPE/BUCHAREST;VALUE=DATE"
    const value = m[3];

    if (key === "UID") cur.uid = value.trim();
    else if (key === "STATUS") cur.status = value.trim();
    else if (key === "SUMMARY") cur.summary = value.trim();
    else if (key === "DTSTART") {
      cur.dtstartRaw = value.trim();
      const tz = params.match(/TZID=([^;]+)/);
      cur.dtstartTzid = tz ? tz[1] : null;
    } else if (key === "DTEND") {
      cur.dtendRaw = value.trim();
      const tz = params.match(/TZID=([^;]+)/);
      cur.dtendTzid = tz ? tz[1] : null;
    }
  }

  return events;
}

type LocalDateTime = { date: string; time: string | null };

// Parse an iCal date/datetime into a local (property TZ) date+time.
// Handles:
//  - DATE (YYYYMMDD)  => all-day; returns time=null
//  - UTC (…Z)         => convert to TZ
//  - Floating / TZID  => best-effort: if TZID present use it, otherwise assume property TZ
function toLocal(value: string, tzProp: string): LocalDateTime {
  // DATE only
  if (/^\d{8}$/.test(value)) {
    const yyyy = value.slice(0, 4);
    const mm = value.slice(4, 6);
    const dd = value.slice(6, 8);
    return { date: `${yyyy}-${mm}-${dd}`, time: null };
  }

  // date-time with optional trailing Z
  // DT w/ Z -> UTC
  if (/Z$/.test(value)) {
    const d = new Date(value);
    // format into TZ
    const fmt = new Intl.DateTimeFormat("sv-SE", {
      timeZone: tzProp,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(d)
      .replace(" ", "T"); // "YYYY-MM-DDTHH:mm"
    const [date, timeFull] = fmt.split("T");
    const time = timeFull?.slice(0, 5) || null;
    return { date, time };
  }

  // floating local -> assume property TZ; we can't shift without a lib,
  // so we take the components and treat them as if already in that TZ.
  // Convert "YYYYMMDDTHHmmss" or "YYYYMMDDTHHmm"
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (m) {
    const yyyy = m[1],
      mm = m[2],
      dd = m[3],
      HH = m[4],
      MM = m[5];
    return { date: `${yyyy}-${mm}-${dd}`, time: `${HH}:${MM}` };
  }

  // Fallback: try Date parse (local) then format
  const d = new Date(value);
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: tzProp,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(" ", "T");
  const [date, timeFull] = fmt.split("T");
  const time = timeFull?.slice(0, 5) || null;
  return { date, time };
}

// Overlap check on date ranges [start, end) with optional times ignored here.
// We only need date precision for picking a free room.
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}

// Time-aware overlap using property check-in/out defaults
function overlapsWithTimes(
  aS: string, aSt: string | null, aE: string, aEt: string | null,
  bS: string, bSt: string | null, bE: string, bEt: string | null,
  ci: string, co: string
) {
  const as = new Date(`${aS}T${(aSt ?? ci)}:00Z`).getTime();
  const ae = new Date(`${aE}T${(aEt ?? co)}:00Z`).getTime();
  const bs = new Date(`${bS}T${(bSt ?? ci)}:00Z`).getTime();
  const be = new Date(`${bE}T${(bEt ?? co)}:00Z`).getTime();
  return as < be && bs < ae;
}

/**
 * Route handler
 */
export async function POST(req: Request) {
  const startedAt = new Date();
  const supa = admin();

  try {
    const body = await req.json().catch(() => ({}));
    const integrationId = String(body?.integrationId || "").trim();
    if (!integrationId) {
      return NextResponse.json({ ok: false, error: "integrationId missing" }, { status: 400 });
    }

    // 1) Load integration + property + rooms in type
    const { data: integ, error: eInteg } = await supa
      .from("ical_type_integrations")
      .select("id,property_id,room_type_id,provider,url,is_active")
      .eq("id", integrationId)
      .single();
    if (eInteg || !integ) throw new Error("Integration not found");

    const I = integ as Integration;
    if (I.is_active === false) {
      return NextResponse.json({ ok: false, error: "integration inactive" }, { status: 400 });
    }

    const { data: prop, error: eProp } = await supa
      .from("properties")
      .select("id,timezone,check_in_time,check_out_time")
      .eq("id", I.property_id)
      .single();
    if (eProp || !prop) throw new Error("Property not found");

    const P = prop as Property;
    const tz = P.timezone || "UTC";
    const ci = P.check_in_time || "14:00";
    const co = P.check_out_time || "11:00";

    const { data: roomRows, error: eRooms } = await supa
      .from("rooms")
      .select("id,name,property_id,room_type_id")
      .eq("property_id", I.property_id)
      .eq("room_type_id", I.room_type_id);
    if (eRooms) throw eRooms;

    const rooms = (roomRows || []) as Room[];
    const roomIds = rooms.map((r) => r.id);

    // 2) Download ICS
    const res = await fetch(I.url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch ICS failed (${res.status})`);
    const icsText = await res.text();

    // 3) Parse ICS VEVENTs
    const events = parseIcs(icsText);

    // 4) Load existing UID map for this property & type
    const { data: mapRows } = await supa
      .from("ical_uid_map")
      .select("id,uid,booking_id,room_id,start_date,end_date,last_seen")
      .eq("property_id", I.property_id)
      .eq("room_type_id", I.room_type_id);

    const mapByUid = new Map<string, any>();
    for (const m of mapRows || []) mapByUid.set(m.uid, m);

    // 5) Prefetch bookings for overlap checks in the date envelope we see in feed
    //    We'll expand a little (±7 zile) ca siguranță
    const dates = events
      .flatMap((ev) => [ev.dtstartRaw, ev.dtendRaw])
      .filter(Boolean) as string[];
    const minRaw = dates.reduce((a, b) => (a < b ? a : b), "99999999");
    const maxRaw = dates.reduce((a, b) => (a > b ? a : b), "00000000");
    // convert to local dates best-effort
    const minLocal = toLocal(minRaw, tz).date;
    const maxLocal = toLocal(maxRaw, tz).date;

    const pad = (s: string, n: number) => {
      const d = new Date(s + "T00:00:00");
      d.setDate(d.getDate() + n);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };

    const envStart = pad(minLocal, -7);
    const envEnd = pad(maxLocal, 7);

    let bookedByRoom = new Map<string, Array<{ s: string; st: string | null; e: string; et: string | null }>>();
    if (roomIds.length) {
      const { data: bookRows } = await supa
        .from("bookings")
        .select("room_id,start_date,end_date,start_time,end_time,status")
        .eq("property_id", I.property_id)
        .in("room_id", roomIds)
        .neq("status", "cancelled")
        .lt("start_date", envEnd)
        .gt("end_date", envStart);
      bookedByRoom = new Map();
      for (const br of bookRows || []) {
        const arr = bookedByRoom.get(br.room_id) || [] as Array<{ s: string; st: string | null; e: string; et: string | null }>;
        arr.push({ s: br.start_date, st: (br as any).start_time ?? null, e: br.end_date, et: (br as any).end_time ?? null });
        bookedByRoom.set(br.room_id, arr);
      }
    }

    // 6) Walk events
    let added = 0;
    let updated = 0;
    let cancelled = 0;
    let unassigned = 0;
    const seenUID = new Set<string>();

    for (const ev of events) {
      const uid = (ev.uid || "").trim();
      if (!uid) continue;
      seenUID.add(uid);

      // cancelled?
      if (String(ev.status || "").toUpperCase() === "CANCELLED") {
        const mm = mapByUid.get(uid);
        if (mm?.booking_id) {
          await supa.from("bookings").update({ status: "cancelled" }).eq("id", mm.booking_id);
          cancelled++;
        }
        // still mark last_seen, keep mapping (helps idempotency)
        await supa
          .from("ical_uid_map")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", mm?.id || "00000000-0000-0000-0000-000000000000")
          .neq("id", "00000000-0000-0000-0000-000000000000"); // no-op if not exists
        continue;
      }

      // normalize dates
      if (!ev.dtstartRaw || !ev.dtendRaw) continue;
      const start = toLocal(ev.dtstartRaw, tz);
      const end = toLocal(ev.dtendRaw, tz);
      const start_date = start.date;
      const end_date = end.date;
      const start_time = start.time; // poate fi null
      const end_time = end.time;

      // Update existing mapping / booking
      const mm = mapByUid.get(uid);
      if (mm && mm.booking_id) {
        // Update booking if changed (dates/times)
        const { error: eUp } = await supa
          .from("bookings")
          .update({ start_date, end_date, start_time, end_time, status: "confirmed" })
          .eq("id", mm.booking_id);
        await supa
          .from("ical_uid_map")
          .update({ start_date, end_date, start_time, end_time, last_seen: new Date().toISOString() })
          .eq("id", mm.id);
        if (!eUp) updated++;
        continue;
      }

      // New event: try to assign a free room
      let pickedRoomId: string | null = null;
      for (const r of rooms) {
        const taken = (bookedByRoom.get(r.id) || []).some((b: any) => overlapsWithTimes(
          start_date, start_time, end_date, end_time,
          b.s, b.st ?? null, b.e, b.et ?? null,
          ci, co
        ));
        if (!taken) {
          pickedRoomId = r.id;
          // reserve locally (to avoid double-assign in same run)
          const arr = (bookedByRoom.get(r.id) || []) as Array<{ s: string; st: string | null; e: string; et: string | null }>;
          arr.push({ s: start_date, st: start_time, e: end_date, et: end_time });
          bookedByRoom.set(r.id, arr);
          break;
        }
      }

      if (!pickedRoomId) {
        // put to unassigned inbox
        await supa.from("ical_unassigned_events").insert({
          id: crypto.randomUUID(),
          property_id: I.property_id,
          room_type_id: I.room_type_id,
          uid,
          summary: ev.summary || null,
          start_date,
          end_date,
          start_time,
          end_time,
          payload: icsText ? ev.summary || "" : "",
          resolved: false,
        });
        // create/update mapping without booking
        const nowIso = new Date().toISOString();
        if (mm) {
          await supa
            .from("ical_uid_map")
            .update({ start_date, end_date, start_time, end_time, last_seen: nowIso })
            .eq("id", mm.id);
        } else {
          await supa.from("ical_uid_map").insert({
            id: crypto.randomUUID(),
            property_id: I.property_id,
            room_type_id: I.room_type_id,
            room_id: null,
            booking_id: null,
            uid,
            source: I.provider || "ical",
            start_date,
            end_date,
            start_time,
            end_time,
            last_seen: nowIso,
          });
        }
        unassigned++;
        continue;
      }

      // create booking
      const guest = (ev.summary || "").slice(0, 120) || null;
      const { data: newBooking, error: eIns } = await supa
        .from("bookings")
        .insert({
          id: crypto.randomUUID(),
          property_id: I.property_id,
          room_id: pickedRoomId,
          start_date,
          end_date,
          start_time,
          end_time,
          guest_name: guest,
          source: I.provider || "ical",
          status: "confirmed",
        })
        .select("id")
        .single();
      if (eIns) {
        // fallback to unassigned if booking insert failed
        await supa.from("ical_unassigned_events").insert({
          id: crypto.randomUUID(),
          property_id: I.property_id,
          room_type_id: I.room_type_id,
          uid,
          summary: ev.summary || null,
          start_date,
          end_date,
          start_time,
          end_time,
          payload: icsText ? ev.summary || "" : "",
          resolved: false,
        });
        unassigned++;
        continue;
      }

      // map UID
      const nowIso = new Date().toISOString();
      if (mm) {
        await supa
          .from("ical_uid_map")
          .update({
            room_id: pickedRoomId,
            booking_id: newBooking!.id,
            start_date,
            end_date,
            start_time,
            end_time,
            last_seen: nowIso,
          })
          .eq("id", mm.id);
      } else {
        await supa.from("ical_uid_map").insert({
          id: crypto.randomUUID(),
          property_id: I.property_id,
          room_type_id: I.room_type_id,
          room_id: pickedRoomId,
          booking_id: newBooking!.id,
          uid,
          source: I.provider || "ical",
          start_date,
          end_date,
          start_time,
          end_time,
          last_seen: nowIso,
        });
      }
      added++;
    }

    // 7) Any previously-seen mappings that are NOT in current feed → mark cancelled
    const stale = (mapRows || []).filter((m) => !seenUID.has(m.uid));
    for (const st of stale) {
      if (st.booking_id) {
        await supa.from("bookings").update({ status: "cancelled" }).eq("id", st.booking_id);
        cancelled++;
      }
      await supa.from("ical_uid_map").update({ last_seen: new Date().toISOString() }).eq("id", st.id);
    }

    // 8) Log
    const finishedAt = new Date();
    await supa.from("ical_type_sync_logs").insert({
      id: crypto.randomUUID(),
      integration_id: I.id,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      status: "ok",
      added_count: added,
      updated_count: updated,
      conflicts: unassigned, // folosim "conflicts" pentru unassigned aici
      error_message: null,
    });

    return NextResponse.json({
      ok: true,
      added,
      updated,
      cancelled,
      unassigned,
    });
  } catch (err: any) {
    // best-effort log
    try {
      const supa = admin();
      const body = await req.json().catch(() => ({}));
      const integrationId = String(body?.integrationId || "").trim();
      if (integrationId) {
        await supa.from("ical_type_sync_logs").insert({
          id: crypto.randomUUID(),
          integration_id: integrationId,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          status: "error",
          added_count: 0,
          updated_count: 0,
          conflicts: 0,
          error_message: String(err?.message || err),
        });
      }
    } catch {}
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
