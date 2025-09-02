import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const { eventId, roomId } = await req.json();
  if (!eventId || !roomId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const ev = await supabase.from("ical_unassigned_events").select("*").eq("id", eventId).maybeSingle();
  if (ev.error || !ev.data) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // creează booking
  const ins = await supabase.from("bookings").insert({
    property_id: ev.data.property_id,
    room_id: roomId,
    start_date: ev.data.start_date, end_date: ev.data.end_date,
    start_time: ev.data.start_time ?? null, end_time: ev.data.end_time ?? null,
    status: "confirmed"
  }).select().maybeSingle();

  if (ins.error || !ins.data) return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });

  // marchează resolved + adaugă în uid_map dacă avem uid
  await supabase.from("ical_unassigned_events").update({ resolved: true }).eq("id", eventId);
  if (ev.data.uid) {
    await supabase.from("ical_uid_map").upsert({
      property_id: ev.data.property_id,
      room_type_id: ev.data.room_type_id,
      room_id: roomId,
      booking_id: ins.data.id,
      uid: ev.data.uid,
      source: "ManualAssign",
      start_date: ev.data.start_date, end_date: ev.data.end_date,
      start_time: ev.data.start_time ?? null, end_time: ev.data.end_time ?? null
    });
  }

  return NextResponse.json({ ok: true, booking_id: ins.data.id });
}
