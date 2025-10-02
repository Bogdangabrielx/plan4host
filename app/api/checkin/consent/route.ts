// app/api/checkin/consent/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const property_id: string | undefined = body?.property_id;
    const booking_id: string | undefined = body?.booking_id;
    const email: string | undefined = body?.email;
    const purpose: 'privacy_ack' | 'house_rules_ack' = (body?.purpose || 'privacy_ack');
    const text_version: string | undefined = body?.text_version;
    const text_hash: string | undefined = body?.text_hash;
    if (!property_id) return bad(400, { error: 'property_id required' });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, service, { auth: { persistSession: false } });

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || null;
    const ua = req.headers.get('user-agent') || null;

    const ins = await admin
      .from('checkin_consents')
      .insert({ property_id, booking_id: booking_id || null, email: email || null, purpose, granted: true, text_version: text_version || null, text_hash: text_hash || null, ip, ua })
      .select('id')
      .single();
    if (ins.error) return bad(400, { error: ins.error.message });
    return NextResponse.json({ ok: true, id: (ins.data as any)?.id || null });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}

