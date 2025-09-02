import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function toTs(date: string, time: string | null | undefined, fallback: string) {
  const t = time && /^\d\d:\d\d$/.test(time) ? time : fallback;
  return new Date(`${date}T${t}:00`);
}

// [start, end) overlap
function overlapsHalfOpen(aS: Date, aE: Date, bS: Date, bE: Date) {
  return aS < bE && aE > bS;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const property_id = String(body.property_id || "");
  const room_id = String(body.room_id || "");
  const start_date = String(body.start_date || "");
  const end_date   = String(body.end_date   || "");
  const start_time = String(body.start_time || "");
  const end_time   = String(body.end_time   || "");

  if (!property_id || !room_id || !start_date || !end_date || !/^\d\d:\d\d$/.test(start_time) || !/^\d\d:\d\d$/.test(end_time)) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  // citește orele implicite ale proprietății (fallback pentru rezervări vechi)
  const { data: prop, error: propErr } = await supabase
    .from("properties")
    .select("check_in_time,check_out_time")
    .eq("id", property_id)
    .single();
  if (propErr) return NextResponse.json({ error: propErr.message }, { status: 400 });
  const fallbackIn  = prop?.check_in_time  || "14:00";
  const fallbackOut = prop?.check_out_time || "11:00";

  const newStart = toTs(start_date, start_time, fallbackIn);
  const newEnd   = toTs(end_date,   end_time,   fallbackOut);
  if (!(newStart < newEnd)) {
    return NextResponse.json({ error: "Start must be before end" }, { status: 400 });
  }

  // suprapuneri pe cameră (la nivel dată+oră)
  const { data: existing, error: e1 } = await supabase
    .from("bookings")
    .select("id,start_date,end_date,start_time,end_time")
    .eq("room_id", room_id)
    .neq("status", "cancelled");

  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

  const clash = (existing ?? []).some(b => {
    const bS = toTs(b.start_date, b.start_time, fallbackIn);
    const bE = toTs(b.end_date,   b.end_time,   fallbackOut);
    return overlapsHalfOpen(newStart, newEnd, bS, bE);
  });
  if (clash) return NextResponse.json({ error: "Interval overlaps another booking" }, { status: 409 });

  const { data, error } = await supabase
    .from("bookings")
    .insert({ property_id, room_id, start_date, end_date, start_time, end_time, status: "confirmed" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, booking: data });
}
