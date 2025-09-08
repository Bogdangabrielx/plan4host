import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !service) throw new Error("Missing Supabase env vars.");

const admin = createClient(url, service, { auth: { persistSession: false } });

type Body = {
  property_id: string;
  booking_id?: string | null;

  start_date: string; // "YYYY-MM-DD"
  end_date: string;   // "YYYY-MM-DD"

  guest_first_name: string;
  guest_last_name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;

  // preferință de alocare (unul dintre ele, nu ambele)
  requested_room_type_id?: string | null;
  requested_room_id?: string | null;
};

function isYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    // ——— validări rapide în edge ———
    if (!body?.property_id) {
      return NextResponse.json({ error: "Missing property_id" }, { status: 400 });
    }
    if (!body?.start_date || !body?.end_date || !isYMD(body.start_date) || !isYMD(body.end_date)) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    }
    if (body.end_date <= body.start_date) {
      return NextResponse.json({ error: "end_date must be after start_date" }, { status: 400 });
    }

    const first = (body.guest_first_name || "").trim();
    const last  = (body.guest_last_name  || "").trim();
    const email = (body.email || "").trim();
    const phone = (body.phone || "").trim();

    if (!first || !last)   return NextResponse.json({ error: "Missing guest name" }, { status: 400 });
    if (!/\S+@\S+\.\S+/.test(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    if (phone.length < 5)  return NextResponse.json({ error: "Invalid phone" }, { status: 400 });

    // nu permitem simultan room_id și room_type_id (clientul deja evită, aici doar protecție)
    const wantType = !!body.requested_room_type_id && !body.requested_room_id;
    const wantRoom = !!body.requested_room_id && !body.requested_room_type_id;

    // ——— apelăm RPC-ul care face toată treaba în DB ———
    const { data, error } = await admin.rpc("checkin_submit_soft_hold", {
      p_property_id: body.property_id,
      p_booking_id: body.booking_id ?? null,

      p_start_date: body.start_date,
      p_end_date: body.end_date,

      p_first_name: first,
      p_last_name: last,
      p_email: email,
      p_phone: phone,
      p_address: body.address ?? null,
      p_city: body.city ?? null,
      p_country: body.country ?? null,

      // preferință de alocare
      p_requested_room_type_id: wantType ? body.requested_room_type_id : null,
      p_requested_room_id:     wantRoom ? body.requested_room_id : null,
    });

    if (error) {
      // mesaj prietenos spre client
      return NextResponse.json({ error: error.message || "Submit failed" }, { status: 500 });
    }

    // RPC returnează meta despre hold + form (vezi pasul următor pt. SQL)
    return NextResponse.json({ ok: true, result: data ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Submit failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}