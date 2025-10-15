// app/api/inbox/assign/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Tipuri explicite pentru rândurile folosite */
type UnassignedEventRow = {
  id: string;
  property_id: string;
  room_type_id: string | null;
  uid: string | null;
  summary: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
};

type BookingRow = {
  id: string;
  room_id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
};

/** Overlap safe: dacă lipsesc datele-cheie, considerăm că nu e conflict */
function overlaps(
  aS?: string | null,
  aSt?: string | null,
  aE?: string | null,
  aEt?: string | null,
  bS?: string | null,
  bSt?: string | null,
  bE?: string | null,
  bEt?: string | null,
  ci?: string,
  co?: string
) {
  if (!aS || !aE || !bS || !bE) return false;

  const ciSafe = ci || "14:00";
  const coSafe = co || "11:00";

  const as = new Date(`${aS}T${(aSt ?? ciSafe)}:00Z`).getTime();
  const ae = new Date(`${aE}T${(aEt ?? coSafe)}:00Z`).getTime();
  const bs = new Date(`${bS}T${(bSt ?? ciSafe)}:00Z`).getTime();
  const be = new Date(`${bE}T${(bEt ?? coSafe)}:00Z`).getTime();

  if ([as, ae, bs, be].some((t) => Number.isNaN(t))) return false;
  return as < be && bs < ae;
}

export async function POST(req: Request) {
  const supabase = createClient();

  const { eventId, roomId } = (await req.json().catch(() => ({}))) as {
    eventId?: string;
    roomId?: string;
  };

  if (!eventId || !roomId) {
    return NextResponse.json({ error: "eventId and roomId required" }, { status: 400 });
  }

  // 1) load event din inbox
  const evRes = await supabase
    .from("ical_unassigned_events")
    .select(
      "id,property_id,room_type_id,uid,summary,start_date,end_date,start_time,end_time"
    )
    .eq("id", eventId)
    .maybeSingle();

  if (evRes.error || !evRes.data) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }
  // Tipăm explicit pentru TS
  const ev = evRes.data as unknown as UnassignedEventRow;

  // 2) proprietatea (pentru CI/CO)
  const prop = await supabase
    .from("properties")
    .select("id,check_in_time,check_out_time")
    .eq("id", ev.property_id)
    .maybeSingle();

  if (prop.error || !prop.data) {
    return NextResponse.json({ error: "property not found" }, { status: 404 });
  }

  // 3) camera și validări
  const room = await supabase
    .from("rooms")
    .select("id,property_id,room_type_id")
    .eq("id", roomId)
    .maybeSingle();

  if (room.error || !room.data) {
    return NextResponse.json({ error: "room not found" }, { status: 404 });
  }
  if (room.data.property_id !== ev.property_id) {
    return NextResponse.json({ error: "room not in same property" }, { status: 400 });
  }
  if (ev.room_type_id && room.data.room_type_id !== ev.room_type_id) {
    return NextResponse.json({ error: "room type mismatch" }, { status: 400 });
  }

  const CI = prop.data.check_in_time || "14:00";
  const CO = prop.data.check_out_time || "11:00";

  // 4) verificare conflict pe camera selectată
  const rBookings = await supabase
    .from("bookings")
    .select("id,room_id,start_date,end_date,start_time,end_time,status")
    .eq("room_id", roomId)
    .neq("status", "cancelled")
    .gte("start_date", ev.start_date)
    .lte("end_date", ev.end_date);

  if (rBookings.error) {
    return NextResponse.json({ error: rBookings.error.message }, { status: 500 });
  }

  const bookings = (rBookings.data ?? []) as unknown as BookingRow[];

  const hasConflict = bookings.some((b: BookingRow) =>
    overlaps(
      b.start_date,
      b.start_time,
      b.end_date,
      b.end_time,
      ev.start_date,
      ev.start_time,
      ev.end_date,
      ev.end_time,
      CI,
      CO
    )
  );

  if (hasConflict) {
    return NextResponse.json(
      { error: "conflict with existing booking" },
      { status: 409 }
    );
  }

  // 5) creăm booking
  const ins = await supabase
    .from("bookings")
    .insert({
      property_id: ev.property_id,
      room_id: roomId,
      start_date: ev.start_date,
      end_date: ev.end_date,
      start_time: ev.start_time,
      end_time: ev.end_time,
      status: "hold",
    })
    .select()
    .maybeSingle();

  if (ins.error || !ins.data) {
    return NextResponse.json(
      { error: ins.error?.message || "insert failed" },
      { status: 500 }
    );
  }

  // 6) map UID
  const uid = ev.uid || `${ins.data.id}@unassigned`;
  const mapIns = await supabase.from("ical_uid_map").insert({
    property_id: ev.property_id,
    room_type_id: ev.room_type_id,
    room_id: roomId,
    booking_id: ins.data.id,
    uid,
    source: "inbox",
    start_date: ev.start_date,
    end_date: ev.end_date,
    start_time: ev.start_time,
    end_time: ev.end_time,
  });

  if (mapIns.error) {
    return NextResponse.json({ error: mapIns.error.message }, { status: 500 });
  }

  // 7) ștergem evenimentul din inbox
  const del = await supabase
    .from("ical_unassigned_events")
    .delete()
    .eq("id", ev.id);

  if (del.error) {
    return NextResponse.json({ error: del.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, booking_id: ins.data.id });
}
