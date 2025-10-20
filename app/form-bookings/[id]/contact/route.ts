// app/form-bookings/[id]/contact/route.ts
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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = (await req.json().catch(() => ({}))) as Contact;

    // sanitize & trim only provided keys
    const payload: Contact = {};
    if (typeof body.email === 'string')   payload.email   = body.email.trim()   || null;
    if (typeof body.phone === 'string')   payload.phone   = body.phone.trim()   || null;
    if (typeof body.address === 'string') payload.address = body.address.trim() || null;
    if (typeof body.city === 'string')    payload.city    = body.city.trim()    || null;
    if (typeof body.country === 'string') payload.country = body.country.trim() || null;

    // 1) Upsert booking_contacts row keyed by the form id
    if (Object.keys(payload).length > 0) {
      const up = await admin
        .from('booking_contacts')
        .upsert({ booking_id: id, ...payload }, { onConflict: 'booking_id' })
        .select('booking_id')
        .maybeSingle();
      if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
    }

    // 2) Also mirror commonly displayed fields on form_bookings (email/phone/address/city/country)
    const patch: any = {};
    if ('email' in payload)   patch.guest_email   = payload.email   ?? null;
    if ('phone' in payload)   patch.guest_phone   = payload.phone   ?? null;
    if ('address' in payload) patch.guest_address = payload.address ?? null;
    if ('city' in payload)    patch.guest_city    = payload.city    ?? null;
    if ('country' in payload) patch.guest_country = payload.country ?? null;
    if (Object.keys(patch).length > 0) {
      const up2 = await admin.from('form_bookings').update(patch).eq('id', id).select('id').maybeSingle();
      if (up2.error) return NextResponse.json({ error: up2.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

