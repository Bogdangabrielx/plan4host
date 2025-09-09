import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const booking_id = params.id;
    const r = await admin
      .from("booking_contacts")
      .select("email,phone,address,city,country")
      .eq("booking_id", booking_id)
      .maybeSingle();

    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });
    return NextResponse.json({ contact: r.data ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const booking_id = params.id;
    const body = await req.json().catch(() => ({}));
    const payload = {
      booking_id,
      email:   body?.email   ?? null,
      phone:   body?.phone   ?? null,
      address: body?.address ?? null,
      city:    body?.city    ?? null,
      country: body?.country ?? null,
    };

    const up = await admin
      .from("booking_contacts")
      .upsert(payload, { onConflict: "booking_id" })
      .select("booking_id")
      .maybeSingle();

    if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}