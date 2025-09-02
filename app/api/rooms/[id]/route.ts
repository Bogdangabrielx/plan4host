import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ---------- helpers ---------- */
function fmtStampUTC(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}
function fmtDateTimeLocal(dateStr: string, timeStr: string | null) {
  // YYYY-MM-DD + HH:MM -> YYYYMMDDTHHMMSS (local, fără Z)
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = (timeStr ?? "00:00").split(":").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
}
function icsEscape(text: string) {
  return (text || "")
    .replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function okIcs(body: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
function bad(msg: string, code = 400) {
  return new NextResponse(msg, { status: code });
}
function buildVTZ(tzid: string) {
  if (tzid === "Europe/Bucharest") {
    return [
      "BEGIN:VTIMEZONE",
      "TZID:Europe/Bucharest",
      "X-LIC-LOCATION:Europe/Bucharest",
      "BEGIN:DAYLIGHT",
      "TZOFFSETFROM:+0200",
      "TZOFFSETTO:+0300",
      "TZNAME:EEST",
      "DTSTART:19700329T030000",
      "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
      "END:DAYLIGHT",
      "BEGIN:STANDARD",
      "TZOFFSETFROM:+0300",
      "TZOFFSETTO:+0200",
      "TZNAME:EET",
      "DTSTART:19701025T040000",
      "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
      "END:STANDARD",
      "END:VTIMEZONE",
    ].join("\r\n");
  }
  return `BEGIN:VTIMEZONE\r\nTZID:${tzid}\r\nEND:VTIMEZONE`;
}

/* ---------- route ---------- */
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const supabase = createClient();

    // Suport și pentru sufix .ics
    const raw = ctx.params.id || "";
    const roomId = raw.endsWith(".ics") ? raw.slice(0, -4) : raw;

    // Orizont implicit: -1y .. +2y (override cu ?from=YYYY-MM-DD&to=YYYY-MM-DD)
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const today = new Date();
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const fromDefault = new Date(today); fromDefault.setFullYear(today.getFullYear() - 1);
    const toDefault   = new Date(today); toDefault.setFullYear(today.getFullYear() + 2);
    const fromStr = from || iso(fromDefault);
    const toStr   = to   || iso(toDefault);

    // Room + property
    const { data: room, error: eRoom } = await supabase
      .from("rooms").select("id,name,property_id").eq("id", roomId).single();
    if (eRoom || !room) return bad("Room not found", 404);

    const { data: prop, error: eProp } = await supabase
      .from("properties")
      .select("id,name,check_in_time,check_out_time,timezone")
      .eq("id", room.property_id).single();
    if (eProp || !prop) return bad("Property not found", 404);

    // ❗ Enforce timezone
    if (!prop.timezone) {
      return bad("Timezone not set for this property. Please set Country (timezone) in Dashboard and retry.", 400);
    }

    const CI = prop.check_in_time || "14:00";
    const CO = prop.check_out_time || "11:00";
    const TZID = prop.timezone;

    const { data: bookings, error: eBk } = await supabase
      .from("bookings")
      .select("id,room_id,start_date,end_date,start_time,end_time,status")
      .eq("room_id", room.id)
      .neq("status", "cancelled")
      .lte("start_date", toStr)
      .gte("end_date", fromStr)
      .order("start_date", { ascending: true });
    if (eBk) return bad("Failed to load bookings", 500);

    const lines: string[] = [];
    lines.push("BEGIN:VCALENDAR");
    lines.push("VERSION:2.0");
    lines.push("PRODID:-//plan4host//ical//EN");
    lines.push("CALSCALE:GREGORIAN");
    lines.push("METHOD:PUBLISH");
    lines.push(`X-WR-CALNAME:${icsEscape(`${room.name} (Plan4Host)`)}`);
    lines.push(`X-WR-TIMEZONE:${TZID}`);
    lines.push(buildVTZ(TZID));

    const dtstamp = fmtStampUTC();

    for (const b of bookings || []) {
      const dtStart = fmtDateTimeLocal(b.start_date, b.start_time || CI);
      const dtEnd   = fmtDateTimeLocal(b.end_date,   b.end_time   || CO);

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${b.id}@plan4host`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`SUMMARY:${icsEscape("Busy")}`);
      lines.push(`STATUS:CONFIRMED`);
      lines.push(`DTSTART;TZID=${TZID}:${dtStart}`);
      lines.push(`DTEND;TZID=${TZID}:${dtEnd}`);
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");
    return okIcs(lines.join("\r\n"));
  } catch {
    return bad("Unexpected error", 500);
  }
}
