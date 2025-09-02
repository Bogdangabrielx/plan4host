import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
function asICSDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}
function addDaysUTC(d: Date, n: number) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function* eachDateUTCInclusiveExclusive(startISO: string, endISO: string) {
  const s = new Date(`${startISO}T00:00:00Z`);
  const e = new Date(`${endISO}T00:00:00Z`);
  for (let d = s; d < e; d = addDaysUTC(d, 1)) yield new Date(d);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  // Acceptă și /types/<id>.ics
  const typeId = params.id.replace(/\.ics$/i, "");

  // 1) tipul
  const rt = await admin
    .from("room_types")
    .select("id,name,property_id")
    .eq("id", typeId)
    .single();

  if (rt.error || !rt.data) return new NextResponse("Not found", { status: 404 });
  const typeName = rt.data.name as string;

  // 2) camere din acest tip
  const rRooms = await admin.from("rooms").select("id").eq("room_type_id", typeId);
  if (rRooms.error) return new NextResponse("Failed to load rooms", { status: 500 });
  const roomIds = (rRooms.data ?? []).map(r => r.id as string);
  const totalRooms = roomIds.length;

  // 3) rezervări non-cancelled pe camerele tipului
  const rBookings = await admin
    .from("bookings")
    .select("room_id,start_date,end_date,status")
    .in("room_id", roomIds.length ? roomIds : ["00000000-0000-0000-0000-000000000000"])
    .neq("status", "cancelled")
    .order("start_date", { ascending: true });
  if (rBookings.error) return new NextResponse("Failed to load bookings", { status: 500 });

  // 4) ocupare pe zile
  const occ: Record<string, number> = {};
  for (const b of (rBookings.data ?? []) as any[]) {
    for (const d of eachDateUTCInclusiveExclusive(b.start_date, b.end_date)) {
      const key = d.toISOString().slice(0, 10);
      occ[key] = (occ[key] ?? 0) + 1;
    }
  }

  // 5) zile fully-booked (sold-out logic) -> rămânem la aceleași intervale,
  // doar că nu mai prefixăm cu "SOLD OUT".
  const soldDays = Object.keys(occ).filter(k => totalRooms > 0 && occ[k] === totalRooms).sort();

  type Interval = { start: string; endExclusive: string };
  const intervals: Interval[] = [];
  if (soldDays.length) {
    let runStart = soldDays[0];
    let prev = soldDays[0];
    for (let i = 1; i < soldDays.length; i++) {
      const cur = soldDays[i];
      const prevNext = addDaysUTC(new Date(`${prev}T00:00:00Z`), 1).toISOString().slice(0, 10);
      if (cur !== prevNext) {
        const endEx = addDaysUTC(new Date(`${prev}T00:00:00Z`), 1).toISOString().slice(0, 10);
        intervals.push({ start: runStart, endExclusive: endEx });
        runStart = cur;
      }
      prev = cur;
    }
    const endEx = addDaysUTC(new Date(`${prev}T00:00:00Z`), 1).toISOString().slice(0, 10);
    intervals.push({ start: runStart, endExclusive: endEx });
  }

  // 6) ICS
  let ics =
    "BEGIN:VCALENDAR\r\n" +
    "VERSION:2.0\r\n" +
    "PRODID:-//Plan4Host//Type Export//EN\r\n" +
    "CALSCALE:GREGORIAN\r\n" +
    "METHOD:PUBLISH\r\n" +
    `X-WR-CALNAME:${icsEscape(typeName)} (Type)\r\n`;

  for (const it of intervals) {
    const dtStart = asICSDate(new Date(`${it.start}T00:00:00Z`));
    const dtEnd = asICSDate(new Date(`${it.endExclusive}T00:00:00Z`));
    const uid = `${typeId}-${it.start}-${it.endExclusive}@plan4host`;
    const summary = `${typeName}`; // ← fără "SOLD OUT — "
    ics +=
      "BEGIN:VEVENT\r\n" +
      `UID:${uid}\r\n` +
      `SUMMARY:${icsEscape(summary)}\r\n` +
      `DTSTART;VALUE=DATE:${dtStart}\r\n` +
      `DTEND;VALUE=DATE:${dtEnd}\r\n` +
      "TRANSP:OPAQUE\r\n" +
      "END:VEVENT\r\n";
  }

  ics += "END:VCALENDAR\r\n";

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
