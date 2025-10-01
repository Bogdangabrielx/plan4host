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
    const property_id: string | null = (body?.property_id || null);
    const ua: string | null = body?.ua || null;
    const os: string | null = body?.os || null;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }
    const endpoint: string = subscription.endpoint;
    const p256dh: string = subscription.keys.p256dh;
    const authKey: string = subscription.keys.auth;

    // Upsert by endpoint (unique)
    const { error } = await admin
      .from('push_subscriptions')
      .upsert({
        endpoint,
        p256dh: p256dh,
        auth: authKey,
        user_id: user.id,
        property_id: property_id,
        ua,
        os,
      }, { onConflict: 'endpoint' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

