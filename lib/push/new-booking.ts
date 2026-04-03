import webpush from "web-push";
import {
  listActiveAccountUserIds,
  listSubscriptionsForUsers,
  resolvePropertyAccountId,
} from "@/lib/push/account-subscribers";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:office@plan4host.com";
  if (!pub || !priv) throw new Error("Missing VAPID keys");
  webpush.setVapidDetails(subject, pub, priv);
  vapidConfigured = true;
}

export async function broadcastNewBookingPush(
  admin: any,
  opts: {
    propertyId: string;
    startDate: string;
    endDate: string;
    title?: string;
    body?: string;
    tag?: string;
    url?: string;
  },
): Promise<number> {
  ensureVapidConfigured();

  const propertyId = String(opts.propertyId || "");
  if (!propertyId) return 0;

  const accountId = await resolvePropertyAccountId(admin, propertyId);
  if (!accountId) return 0;

  const userIds = await listActiveAccountUserIds(admin, accountId);
  if (!userIds.length) return 0;

  const subs = await listSubscriptionsForUsers(admin, userIds, propertyId);
  if (!subs.length) return 0;

  const payload = JSON.stringify({
    title: opts.title || "New reservation",
    body: opts.body || `From ${opts.startDate} to ${opts.endDate}`,
    url: opts.url || `/app/guest?property=${encodeURIComponent(propertyId)}`,
    tag: opts.tag || `guest-${propertyId}-${opts.startDate}-${opts.endDate}-${Date.now()}`,
  });

  let sent = 0;
  const sentEndpoints = new Set<string>();
  for (const s of subs) {
    if (sentEndpoints.has(s.endpoint)) continue;
    const subscription = {
      endpoint: s.endpoint,
      keys: { p256dh: s.p256dh, auth: s.auth },
    } as any;

    try {
      await webpush.sendNotification(subscription, payload);
      sent++;
      sentEndpoints.add(s.endpoint);
    } catch (error: any) {
      if (error?.statusCode === 410 || error?.statusCode === 404) {
        try {
          await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        } catch {}
      }
    }
  }

  return sent;
}
