import webpush from "web-push";
import {
  listActiveAccountUserIds,
  listSubscriptionsForUsers,
  resolvePropertyAccountId,
} from "@/lib/push/account-subscribers";

let vapidConfigured = false;

function formatDateDMY(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!m) return String(value || "");
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function normalizeSourceLabel(source?: string | null): string | null {
  const s = String(source || "").trim();
  if (!s) return null;
  const low = s.toLowerCase();
  if (low === "manual") return "Manual";
  if (low === "ical") return "iCal";
  if (low.includes("booking")) return "Booking.com";
  if (low.includes("airbnb")) return "Airbnb";
  if (low.includes("expedia")) return "Expedia";
  if (low.includes("trivago")) return "Trivago";
  if (low.includes("lastminute")) return "Lastminute";
  if (low.includes("travelminit")) return "Travelminit";
  return s;
}

async function resolvePropertyName(admin: any, propertyId: string): Promise<string | null> {
  try {
    const { data, error } = await admin
      .from("properties")
      .select("name")
      .eq("id", propertyId)
      .maybeSingle();
    if (error || !data) return null;
    const name = String((data as any)?.name || "").trim();
    return name || null;
  } catch {
    return null;
  }
}

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
    source?: string | null;
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

  const propertyName = await resolvePropertyName(admin, propertyId);
  const sourceLabel = normalizeSourceLabel(opts.source);
  const title = opts.title || "New reservation on calendar";
  const body =
    opts.body ||
    [propertyName, sourceLabel, `${formatDateDMY(opts.startDate)} - ${formatDateDMY(opts.endDate)}`]
      .filter(Boolean)
      .join("\n");

  const payload = JSON.stringify({
    title,
    body,
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
