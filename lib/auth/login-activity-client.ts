export type LoginActivityClientPayload = {
  app_mode: "pwa" | "browser" | "unknown";
  display_mode: string | null;
  device_type: "mobile" | "tablet" | "desktop" | "unknown";
  os_name: string | null;
  browser_name: string | null;
  user_agent?: string | null;
  path: string | null;
};

function readDisplayMode(): string | null {
  if (typeof window === "undefined") return null;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return "standalone";

  const modes = ["fullscreen", "standalone", "minimal-ui", "browser"];
  for (const mode of modes) {
    try {
      if (window.matchMedia?.(`(display-mode: ${mode})`)?.matches) return mode;
    } catch {
      // Ignore unsupported display-mode checks.
    }
  }
  return null;
}

function detectDeviceType(ua: string): LoginActivityClientPayload["device_type"] {
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

export function collectLoginActivityPayload(options?: {
  includeUserAgent?: boolean;
}): LoginActivityClientPayload {
  if (typeof window === "undefined") {
    return {
      app_mode: "unknown",
      display_mode: null,
      device_type: "unknown",
      os_name: null,
      browser_name: null,
      path: null,
    };
  }

  const ua = window.navigator.userAgent || "";
  const displayMode = readDisplayMode();
  const isPwa = displayMode === "standalone" || displayMode === "fullscreen" || displayMode === "minimal-ui";

  return {
    app_mode: isPwa ? "pwa" : "browser",
    display_mode: displayMode ?? (isPwa ? "standalone" : "browser"),
    device_type: detectDeviceType(ua),
    os_name: detectOsName(ua),
    browser_name: detectBrowserName(ua),
    user_agent: options?.includeUserAgent === false ? undefined : ua,
    path: `${window.location.pathname}${window.location.search}`,
  };
}
