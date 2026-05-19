// /components/consent/consentStorage.ts
export type Consent = { v: 1; necessary: true; preferences: boolean; ts: number };

const COOKIE = "p4h_consent";
const VERSION = 1;
const TTL_DAYS = 365;
const DAY_MS = 86400000;
const PREFERENCE_COOKIES = ["app_theme", "app_lang", "p4h_guest_lang"];
const PREFERENCE_STORAGE_KEYS = ["theme_v1", "app_lang", "p4h:rm:lang", "p4h:selectedPropertyId"];
const PREFERENCE_STORAGE_PREFIXES = ["p4h:otaColors:", "p4h:otaLogos:"];

type ConsentEnvelopeV2 = {
  v?: number;
  ts?: string;
  exp?: string;
  consent?: { necessary?: boolean; preferences?: boolean };
};

function parseStoredConsent(raw: string | null): Consent | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Consent | ConsentEnvelopeV2;
    if (!obj || typeof obj !== "object") return null;

    if ("consent" in obj && obj.consent && typeof obj.consent === "object") {
      const expMs = Date.parse(String(obj.exp || ""));
      if (!Number.isFinite(expMs) || expMs <= Date.now()) return null;
      return {
        v: VERSION,
        necessary: true,
        preferences: !!obj.consent.preferences,
        ts: Date.parse(String(obj.ts || "")) || Date.now(),
      };
    }

    const consent = obj as Consent;
    if (consent.v !== VERSION) return null;
    const ageDays = (Date.now() - (consent.ts || 0)) / DAY_MS;
    if (ageDays > TTL_DAYS) return null;
    return consent;
  } catch {
    return null;
  }
}

function readConsentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function removeCookie(name: string) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}

export function clearPreferencePersistence() {
  if (typeof document === "undefined") return;
  for (const name of PREFERENCE_COOKIES) removeCookie(name);
  try {
    for (const key of PREFERENCE_STORAGE_KEYS) localStorage.removeItem(key);
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (PREFERENCE_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
  } catch {}
}

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const fromCookie = parseStoredConsent(readConsentCookie());
  if (fromCookie) return fromCookie;
  try {
    return parseStoredConsent(localStorage.getItem(COOKIE));
  } catch {
    return null;
  }
}

export function hasPreferenceConsent(): boolean {
  return !!readConsent()?.preferences;
}

export function writePreferenceCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return false;
  if (!hasPreferenceConsent()) return false;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
  return true;
}

export function writePreferenceStorage(key: string, value: string) {
  if (typeof window === "undefined") return false;
  if (!hasPreferenceConsent()) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function writeConsent(preferences: boolean) {
  if (typeof document === "undefined") return;
  const c: Consent = { v: VERSION, necessary: true, preferences, ts: Date.now() };
  const value = encodeURIComponent(JSON.stringify(c));
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${value}; Max-Age=${TTL_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;
  try { localStorage.setItem(COOKIE, JSON.stringify(c)); } catch {}
  if (!preferences) clearPreferencePersistence();
  document.documentElement.setAttribute("data-consent-preferences", String(preferences));
}

export function ensureHtmlFlagFromStored() {
  const c = readConsent();
  document.documentElement.setAttribute("data-consent-preferences", String(!!c?.preferences));
}

export function hasConsent(): boolean {
  return !!readConsent();
}
