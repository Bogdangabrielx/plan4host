// app/api/push/send/route.ts — test send endpoint
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:office@plan4host.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export async function POST(req: NextRequest) {
  try {
    const supa = createSSRClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user;
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const property_id: string | undefined = body?.property_id;

    // Load current user's subscriptions (optionally filter by property)
    const q = admin.from('push_subscriptions').select('endpoint,p256dh,auth').eq('user_id', user.id);
    if (property_id) (q as any).or(`property_id.is.null,property_id.eq.${property_id}`);
    const r = await q;
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });
    const subs = (r.data || []) as Array<{ endpoint: string; p256dh: string; auth: string }>;
    if (subs.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    const payload = JSON.stringify({
      title: 'New reservation',
      body: 'A new reservation has appeared in Guest Overview.',
      url: property_id ? `/app/guest?property=${encodeURIComponent(property_id)}` : '/app/guest',
      tag: property_id ? `guest-${property_id}` : 'guest',
    });

    let sent = 0;
    for (const s of subs) {
      const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any;
      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (e: any) {
        // Clean up invalid endpoint (410/404)
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

