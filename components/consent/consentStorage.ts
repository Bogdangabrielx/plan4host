// /components/consent/consentStorage.ts
export type Consent = { v: 1; necessary: true; preferences: boolean; ts: number };
const COOKIE = "p4h_consent";
const VERSION = 1;
const TTL_DAYS = 365;

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
    const obj = m ? JSON.parse(decodeURIComponent(m[1])) : null;
    if (!obj || obj.v !== VERSION) return null;
    const ageDays = (Date.now() - (obj.ts || 0)) / 86400000;
    if (ageDays > TTL_DAYS) return null;
    return obj as Consent;
  } catch { return null; }
}

export function writeConsent(preferences: boolean) {
  if (typeof document === "undefined") return;
  const c: Consent = { v: VERSION, necessary: true, preferences, ts: Date.now() };
  const value = encodeURIComponent(JSON.stringify(c));
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${value}; Max-Age=${TTL_DAYS*86400}; Path=/; SameSite=Lax${secure}`;
  try { localStorage.setItem(COOKIE, JSON.stringify(c)); } catch {}
  document.documentElement.setAttribute("data-consent-preferences", String(!!preferences));
}

export function ensureHtmlFlagFromStored() {
  const c = readConsent();
  document.documentElement.setAttribute("data-consent-preferences", String(!!c?.preferences));
}

export function hasConsent(): boolean {
  return !!readConsent();
}