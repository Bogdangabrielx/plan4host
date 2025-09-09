// app/api/bookings/route.ts
import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// (opțional, ca să fim siguri că nu rulează pe Edge)
export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createAdmin(url, service, { auth: { persistSession: false } });

function toTs(date: string, time: string | null | undefined, fallback: string) {
  const t = time && /^\d\d:\d\d$/.test(time) ? time : fallback;
  return new Date(`${date}T${t}:00`);
}
function overlapsHalfOpen(aS: Date, aE: Date, bS: Date, bE: Date) {
  return aS < bE && aE > bS;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));

  const property_id = String(body.property_id || "");
  const room_id     = String(body.room_id || "");
  const start_date  = String(body.start_date || "");
  const end_date    = String(body.end_date   || "");
  const start_time  = String(body.start_time || "");
  const end_time    = String(body.end_time   || "");

  if (
    !property_id ||
    !room_id ||
    !start_date ||
    !end_date ||
    !/^\d\d:\d\d$/.test(start_time) ||
    !/^\d\d:\d\d$/.test(end_time)
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  // Citește orele implicite din proprietate (fallback pentru rezervări vechi)
  const rProp = await admin
    .from("properties")
    .select("check_in_time,check_out_time")
    .eq("id", property_id)
    .maybeSingle();

  if (rProp.error) {
    return NextResponse.json({ error: rProp.error.message }, { status: 400 });
  }

  const fallbackIn  = rProp.data?.check_in_time  || "14:00";
  const fallbackOut = rProp.data?.check_out_time || "11:00";

  const newStart = toTs(start_date, start_time, fallbackIn);
  const newEnd   = toTs(end_date,   end_time,   fallbackOut);
  if (!(newStart < newEnd)) {
    return NextResponse.json({ error: "Start must be before end" }, { status: 400 });
  }

  // Verifică suprapuneri pe cameră
  const rExisting = await admin
    .from("bookings")
    .select("id,start_date,end_date,start_time,end_time")
    .eq("room_id", room_id)
    .neq("status", "cancelled");

  if (rExisting.error) {
    return NextResponse.json({ error: rExisting.error.message }, { status: 400 });
  }

  const clash = (rExisting.data ?? []).some((b: any) => {
    const bS = toTs(b.start_date, b.start_time, fallbackIn);
    const bE = toTs(b.end_date,   b.end_time,   fallbackOut);
    return overlapsHalfOpen(newStart, newEnd, bS, bE);
  });

  if (clash) {
    return NextResponse.json({ error: "Interval overlaps another booking" }, { status: 409 });
  }

  const ins = await admin
    .from("bookings")
    .insert({ property_id, room_id, start_date, end_date, start_time, end_time, status: "confirmed" })
    .select()
    .single();

  if (ins.error) {
    return NextResponse.json({ error: ins.error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, booking: ins.data });
}