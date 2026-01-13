// app/api/push/broadcast/route.ts — broadcast to all subscribers for a property
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

let adminClient: ReturnType<typeof createClient> | null = null;
let vapidConfigured = false;

function getAdminClient() {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("Missing Supabase service credentials");
  adminClient = createClient(url, service, { auth: { persistSession: false } });
  return adminClient;
}

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:office@plan4host.com';
  if (!pub || !priv) throw new Error("Missing VAPID keys");
  webpush.setVapidDetails(subject, pub, priv);
  vapidConfigured = true;
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminClient();
    ensureVapidConfigured();
    const supa = createSSRClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user;
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const property_id: string | undefined = body?.property_id;
    const title: string = body?.title || 'New reservation';
    const bodyText: string = body?.body || 'A new reservation has appeared in Guest Overview.';
    if (!property_id) return NextResponse.json({ error: 'property_id required' }, { status: 400 });

    // Fetch account_id for this property
    const rProp = await admin.from('properties').select('account_id').eq('id', property_id).maybeSingle();
    if (rProp.error || !rProp.data) return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    const account_id = (rProp.data as any).account_id as string;

    // Fetch admin users for account
    const rUsers = await admin
      .from('account_users')
      .select('user_id,role,disabled')
      .eq('account_id', account_id)
      .eq('disabled', false)
      .eq('role', 'admin');
    if (rUsers.error) return NextResponse.json({ error: rUsers.error.message }, { status: 500 });
    const userIds = (rUsers.data || []).map((u: any) => String(u.user_id));
    if (userIds.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    // Select subscriptions for these users (all devices)
    const { data, error } = await admin
      .from('push_subscriptions')
      .select('endpoint,p256dh,auth,user_id')
      .in('user_id', userIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const subs = (data || []) as Array<{ endpoint: string; p256dh: string; auth: string; user_id: string }>;
    if (subs.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    const payload = JSON.stringify({
      title,
      body: bodyText,
      url: `/app/guest?property=${encodeURIComponent(property_id)}`,
      tag: `guest-${property_id}`,
    });

    let sent = 0;
    for (const s of subs) {
      const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any;
      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 410 || e?.statusCode === 404) {
          try { await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint); } catch {}
        }
      }
    }

    return NextResponse.json({ ok: true, sent });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
