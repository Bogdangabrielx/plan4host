// app/api/push/broadcast/route.ts — broadcast to all subscribers for a property
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import {
  listActiveAccountUserIds,
  listSubscriptionsForUsers,
  resolvePropertyAccountId,
} from "@/lib/push/account-subscribers";

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

    const account_id = await resolvePropertyAccountId(admin, property_id);
    if (!account_id) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

    const membership = await admin
      .from("account_users")
      .select("user_id")
      .eq("account_id", account_id)
      .eq("user_id", user.id)
      .eq("disabled", false)
      .eq("disabled_by_billing", false)
      .maybeSingle();

    if (membership.error || !membership.data) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userIds = await listActiveAccountUserIds(admin, account_id);
    if (userIds.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    const subs = await listSubscriptionsForUsers(admin, userIds, property_id);
    if (subs.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    const payload = JSON.stringify({
      title,
      body: bodyText,
      url: `/app/guest?property=${encodeURIComponent(property_id)}`,
      tag: `guest-${property_id}`,
    });

    let sent = 0;
    const sentEndpoints = new Set<string>();
    for (const s of subs) {
      if (sentEndpoints.has(s.endpoint)) continue;
      const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any;
      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
        sentEndpoints.add(s.endpoint);
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
