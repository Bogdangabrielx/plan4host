// app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

export async function POST(req: NextRequest) {
  try {
    const supa = createSSRClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user;
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const subscription = body?.subscription;
    const requestedPropertyId: string | null =
      typeof body?.property_id === "string" && body.property_id.trim()
        ? body.property_id.trim()
        : null;
    const ua: string | null = body?.ua || null;
    const os: string | null = body?.os || null;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }
    const endpoint: string = subscription.endpoint;
    const p256dh: string = subscription.keys.p256dh;
    const authKey: string = subscription.keys.auth;
    const property_id: string | null = requestedPropertyId;
    let account_id: string | null = null;

    if (property_id) {
      const rProp = await admin
        .from("properties")
        .select("account_id,admin_id")
        .eq("id", property_id)
        .maybeSingle();
      if (rProp.error || !rProp.data) {
        return NextResponse.json({ error: "Invalid property" }, { status: 400 });
      }
      account_id = ((rProp.data as any).account_id || (rProp.data as any).admin_id || null) as string | null;
    }

    const existingLookup = admin
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);
    const existing = property_id
      ? await existingLookup.eq("property_id", property_id).maybeSingle()
      : await existingLookup.is("property_id", null).maybeSingle();
    if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });

    if (existing.data?.id) {
      const upd = await admin
        .from("push_subscriptions")
        .update({
          p256dh,
          auth: authKey,
          account_id,
          property_id,
          ua,
          os,
        })
        .eq("id", (existing.data as any).id);
      if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });
    } else {
      const ins = await admin
        .from("push_subscriptions")
        .insert({
          endpoint,
          p256dh,
          auth: authKey,
          user_id: user.id,
          account_id,
          property_id,
          ua,
          os,
        });
      if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, property_id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
