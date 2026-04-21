import type { SupabaseClient, User } from "@supabase/supabase-js";
import { resolveTeamAccountContext } from "@/lib/auth/team-account";
import { getServiceSupabase } from "@/lib/supabase/service";

export type LoginActivityEventType = "login" | "signup";

type LoginActivityPayload = {
  app_mode?: unknown;
  display_mode?: unknown;
  device_type?: unknown;
  os_name?: unknown;
  browser_name?: unknown;
  user_agent?: unknown;
  path?: unknown;
  metadata?: unknown;
};

const APP_MODES = new Set(["pwa", "browser", "unknown"]);
const DEVICE_TYPES = new Set(["mobile", "tablet", "desktop", "unknown"]);

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 1000) : null;
}

function detectDeviceType(ua: string): "mobile" | "tablet" | "desktop" | "unknown" {
  if (!ua) return "unknown";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/android/i.test(ua) && !/mobile/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile/i.test(ua)) return "mobile";
  return "desktop";
}

function detectOsName(ua: string): string | null {
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os x|macintosh|macintel/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return null;
}

function detectBrowserName(ua: string): string | null {
  if (/edg\//i.test(ua)) return "Edge";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/opr\//i.test(ua)) return "Opera";
  if (/crios/i.test(ua)) return "Chrome iOS";
  if (/fxios/i.test(ua)) return "Firefox iOS";
  if (/chrome|chromium/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return null;
}

function normalizeActivityPayload(payload: LoginActivityPayload | null | undefined, req?: Request) {
  const headerUa = req?.headers.get("user-agent") ?? "";
  const clientUa = asString(payload?.user_agent);
  const userAgent = clientUa || headerUa || null;

  const rawAppMode = asString(payload?.app_mode) ?? "unknown";
  const appMode = APP_MODES.has(rawAppMode) ? rawAppMode : "unknown";

  const rawDeviceType = asString(payload?.device_type);
  const deviceType =
    rawDeviceType && DEVICE_TYPES.has(rawDeviceType)
      ? rawDeviceType
      : detectDeviceType(userAgent ?? "");

  return {
    app_mode: appMode,
    display_mode: asString(payload?.display_mode),
    device_type: deviceType,
    os_name: asString(payload?.os_name) ?? detectOsName(userAgent ?? ""),
    browser_name: asString(payload?.browser_name) ?? detectBrowserName(userAgent ?? ""),
    user_agent: userAgent,
    path: asString(payload?.path),
    metadata:
      payload?.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
        ? payload.metadata
        : {},
  };
}

export async function logAccountLoginActivity({
  supabase,
  user,
  eventType,
  payload,
  req,
}: {
  supabase: SupabaseClient<any, any, any>;
  user: User;
  eventType: LoginActivityEventType;
  payload?: LoginActivityPayload | null;
  req?: Request;
}) {
  try {
    const admin = getServiceSupabase();
    const { accountId } = await resolveTeamAccountContext(admin, user.id);
    if (!accountId) return;

    const activity = normalizeActivityPayload(payload, req);
    const { error } = await admin.from("account_login_activity").insert({
      account_id: accountId,
      user_id: user.id,
      email: user.email ?? asString(payload?.metadata && (payload.metadata as any).email),
      event_type: eventType,
      ...activity,
    });

    if (error) {
      console.error("[login-activity] insert failed", error.message);
    }
  } catch (error) {
    console.error("[login-activity] unexpected failure", error);
  }
}
