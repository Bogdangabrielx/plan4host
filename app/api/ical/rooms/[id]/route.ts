// app/api/ical/rooms/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

function icsEscape(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function asICSDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  // Acceptă și /rooms/<id>.ics
  const roomId = params.id.replace(/\.ics$/i, "");

  // 1) Camera
  const rRoom = await admin
    .from("rooms")
    .select("id,name")
    .eq("id", roomId)
    .single();

  if (rRoom.error || !rRoom.data) {
    return new NextResponse("Not found", { status: 404 });
  }
  const roomName = rRoom.data.name as string;

  // 2) Rezervări reale (exclude: cancelled + form)
  const rBookings = await admin
    .from("bookings")
    .select("id,start_date,end_date,status,source,guest_first_name,guest_last_name")
    .eq("room_id", roomId)
    .neq("status", "cancelled")
    .neq("source", "form") // ⬅️ exclude formularele
    .order("start_date", { ascending: true });

  if (rBookings.error) {
    return new NextResponse("Failed to load bookings", { status: 500 });
  }

  // 3) ICS (all-day) — DTEND este exclusiv și rămâne = end_date
  let ics =
    "BEGIN:VCALENDAR\r\n" +
    "VERSION:2.0\r\n" +
    "PRODID:-//Plan4Host//Room Export//EN\r\n" +
    "CALSCALE:GREGORIAN\r\n" +
    "METHOD:PUBLISH\r\n" +
    `X-WR-CALNAME:${icsEscape(roomName)} (Room)\r\n`;

  for (const b of rBookings.data ?? []) {
    const dtStart = asICSDate(new Date(`${b.start_date}T00:00:00Z`));
    const dtEnd   = asICSDate(new Date(`${b.end_date}T00:00:00Z`)); // end exclusiv

    const uid = `${roomId}-${b.start_date}-${b.end_date}@plan4host`;
    const guest = [b.guest_first_name ?? "", b.guest_last_name ?? ""]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");
    const summary = guest ? `${guest} — #${roomName}` : `Reserved — #${roomName}`;

    ics +=
      "BEGIN:VEVENT\r\n" +
      `UID:${uid}\r\n` +
      `SUMMARY:${icsEscape(summary)}\r\n` +
      `DTSTART;VALUE=DATE:${dtStart}\r\n` +
      `DTEND;VALUE=DATE:${dtEnd}\r\n` +
      "TRANSP:OPAQUE\r\n" +
      `DESCRIPTION:${icsEscape(`Booking ${b.id}`)}\r\n` +
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