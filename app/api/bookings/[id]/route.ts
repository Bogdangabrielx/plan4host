import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function toTs(date: string, time: string | null | undefined, fallback: string) {
  const t = time && /^\d\d:\d\d$/.test(time) ? time : fallback;
  return new Date(`${date}T${t}:00`);
}
function overlapsHalfOpen(aS: Date, aE: Date, bS: Date, bE: Date) {
  return aS < bE && aE > bS;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const id = params.id;
  const body = await req.json().catch(() => ({}));
  const end_date: string | undefined = body?.end_date;
  const end_time: string | undefined = body?.end_time;

  if (!end_date || !end_time || !/^\d\d:\d\d$/.test(end_time)) {
    return NextResponse.json({ error: "end_date and end_time required" }, { status: 400 });
  }

  // Booking curent + proprietate (pentru fallback)
  const { data: current, error: e1 } = await supabase
    .from("bookings")
    .select("id,room_id,property_id,start_date,start_time,end_date,end_time")
    .eq("id", id).single();

  if (e1 || !current) return NextResponse.json({ error: e1?.message || "Not found" }, { status: 404 });

  const { data: prop } = await supabase
    .from("properties")
    .select("check_in_time,check_out_time")
    .eq("id", current.property_id)
    .single();

  const fallbackIn  = prop?.check_in_time  || "14:00";
  const fallbackOut = prop?.check_out_time || "11:00";

  const currStart = toTs(current.start_date, current.start_time, fallbackIn);
  const currEnd   = toTs(current.end_date,   current.end_time,   fallbackOut);
  const newEnd    = toTs(end_date, end_time, fallbackOut);

  // doar extindere, nu scurtare
  if (newEnd < currEnd) {
    return NextResponse.json({ error: "Cannot shorten via Extend" }, { status: 400 });
  }

  // verifică suprapuneri cu altele
  const { data: others, error: e2 } = await supabase
    .from("bookings")
    .select("id,start_date,end_date,start_time,end_time")
    .eq("room_id", current.room_id)
    .neq("id", current.id)
    .neq("status", "cancelled");

  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

  const clash = (others ?? []).some(b => {
    const bS = toTs(b.start_date, b.start_time, fallbackIn);
    const bE = toTs(b.end_date,   b.end_time,   fallbackOut);
    return overlapsHalfOpen(currStart, newEnd, bS, bE);
  });
  if (clash) return NextResponse.json({ error: "Extend conflicts with another booking" }, { status: 409 });

  const { data, error } = await supabase
    .from("bookings")
    .update({ end_date, end_time })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, booking: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const id = params.id;
  // Use RPC guarded by membership (SECURITY DEFINER) to ensure consistent deletes
  const { error } = await supabase.rpc("booking_delete_self", { p_booking_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
