// app/api/bookings/[id]/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

type Contact = {
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const r = await admin
      .from("booking_contacts")
      .select("email,phone,address,city,country")
      .eq("booking_id", id)
      .maybeSingle();

    if (r.error) {
      return NextResponse.json({ error: r.error.message }, { status: 500 });
    }

    return NextResponse.json(
      { contact: r.data ?? null },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = (await req.json().catch(() => ({}))) as Contact;

    // sanitize & trim
    const payload: Contact = {
      email:   typeof body.email   === "string" ? body.email.trim()   || null : null,
      phone:   typeof body.phone   === "string" ? body.phone.trim()   || null : null,
      address: typeof body.address === "string" ? body.address.trim() || null : null,
      city:    typeof body.city    === "string" ? body.city.trim()    || null : null,
      country: typeof body.country === "string" ? body.country.trim() || null : null,
    };

    const up = await admin
      .from("booking_contacts")
      .upsert({ booking_id: id, ...payload }, { onConflict: "booking_id" })
      .select("booking_id")
      .maybeSingle();

    if (up.error) {
      return NextResponse.json({ error: up.error.message }, { status: 500 });
    }

    // Mirror only email to linked form (booking -> form), with simple validation
    try {
      const email = (payload.email || '').trim();
      if (email && email.includes('@')) {
        const rBk = await admin.from('bookings').select('form_id').eq('id', id).maybeSingle();
        const formId = (rBk.data as any)?.form_id ? String((rBk.data as any).form_id) : null;
        if (formId) {
          await admin.from('form_bookings').update({ guest_email: email }).eq('id', formId);
        }
      }
    } catch { /* best-effort */ }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
