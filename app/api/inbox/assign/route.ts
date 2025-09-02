import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** date+time overlap naive (folosește CI/CO implicite dacă lipsesc) */
function overlaps(aS: string, aSt: string | null, aE: string, aEt: string | null, bS: string, bSt: string | null, bE: string, bEt: string | null, ci: string, co: string) {
  const as = new Date(`${aS}T${(aSt ?? ci)}:00Z`).getTime();
  const ae = new Date(`${aE}T${(aEt ?? co)}:00Z`).getTime();
  const bs = new Date(`${bS}T${(bSt ?? ci)}:00Z`).getTime();
  const be = new Date(`${bE}T${(bEt ?? co)}:00Z`).getTime();
  return as < be && bs < ae;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { eventId, roomId } = await req.json().catch(() => ({}));
  if (!eventId || !roomId) return NextResponse.json({ error: "eventId and roomId required" }, { status: 400 });

  // 1) load event
  const ev = await supabase
    .from("ical_unassigned_events")
    .select("id,property_id,room_type_id,uid,summary,start_date,end_date,start_time,end_time")
    .eq("id", eventId)
    .maybeSingle();
  if (ev.error || !ev.data) return NextResponse.json({ error: "event not found" }, { status: 404 });

  // 2) check ownership (property belongs to auth.uid())
  const prop = await supabase.from("properties").select("id,account_id,check_in_time,check_out_time").eq("id", ev.data.property_id).maybeSingle();
  if (prop.error || !prop.data) return NextResponse.json({ error: "property not found" }, { status: 404 });

  // 3) load room and validate type+property
  const room = await supabase.from("rooms").select("id,property_id,room_type_id").eq("id", roomId).maybeSingle();
  if (room.error || !room.data) return NextResponse.json({ error: "room not found" }, { status: 404 });
  if (room.data.property_id !== ev.data.property_id) return NextResponse.json({ error: "room not in same property" }, { status: 400 });
  if (ev.data.room_type_id && room.data.room_type_id !== ev.data.room_type_id) return NextResponse.json({ error: "room type mismatch" }, { status: 400 });

  const CI = prop.data.check_in_time || "14:00";
  const CO = prop.data.check_out_time || "11:00";

  // 4) conflict check on that room
  const rBookings = await supabase
    .from("bookings")
    .select("id,room_id,start_date,end_date,start_time,end_time,status")
    .eq("room_id", roomId)
    .neq("status", "cancelled")
    .gte("start_date", ev.data.start_date)
    .lte("end_date", ev.data.end_date);
  if (rBookings.error) return NextResponse.json({ error: rBookings.error.message }, { status: 500 });

  const hasConflict = (rBookings.data ?? []).some(b =>
    overlaps(b.start_date, b.start_time, b.end_date, b.end_time,
             ev.data.start_date, ev.data.start_time, ev.data.end_date, ev.data.end_time, CI, CO)
  );
  if (hasConflict) return NextResponse.json({ error: "conflict with existing booking" }, { status: 409 });

  // 5) create booking
  const ins = await supabase.from("bookings").insert({
    property_id: ev.data.property_id,
    room_id: roomId,
    start_date: ev.data.start_date,
    end_date: ev.data.end_date,
    start_time: ev.data.start_time,
    end_time: ev.data.end_time,
    status: "confirmed"
  }).select().maybeSingle();
  if (ins.error || !ins.data) return NextResponse.json({ error: ins.error?.message || "insert failed" }, { status: 500 });

  // 6) map UID
  const uid = ev.data.uid || `${ins.data.id}@unassigned`;
  const mapIns = await supabase.from("ical_uid_map").insert({
    property_id: ev.data.property_id,
    room_type_id: ev.data.room_type_id,
    room_id: roomId,
    booking_id: ins.data.id,
    uid,
    source: "inbox",
    start_date: ev.data.start_date,
    end_date: ev.data.end_date,
    start_time: ev.data.start_time,
    end_time: ev.data.end_time
  });
  if (mapIns.error) return NextResponse.json({ error: mapIns.error.message }, { status: 500 });

  // 7) delete from inbox
  const del = await supabase.from("ical_unassigned_events").delete().eq("id", ev.data.id);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, booking_id: ins.data.id });
}
