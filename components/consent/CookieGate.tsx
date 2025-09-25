"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type Consent = {
  necessary: true;        // mereu true
  analytics: boolean;
  marketing: boolean;
  ts: number;             // epoch ms
  v: number;              // versiune schema
};

const COOKIE_NAME = "p4h_consent";
const CONSENT_VERSION = 1;
const TTL_DAYS = 180; // 6 luni

function parseConsentCookie(): Consent | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    if (!m) return null;
    const obj = JSON.parse(decodeURIComponent(m[1]));
    if (!obj || typeof obj !== "object") return null;
    if (obj.v !== CONSENT_VERSION) return null; // force re-consent când schimbăm schema
    const ageDays = (Date.now() - (obj.ts || 0)) / (1000 * 60 * 60 * 24);
    if (ageDays > TTL_DAYS) return null;
    return obj as Consent;
  } catch {
    return null;
  }
}

function writeConsentCookie(c: Consent) {
  const maxAge = TTL_DAYS * 24 * 60 * 60;
  const value = encodeURIComponent(JSON.stringify(c));
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  try { localStorage.setItem(COOKIE_NAME, JSON.stringify(c)); } catch {}
  // opțional: flag pe <html> pentru gating CSS/script
  document.documentElement.setAttribute("data-consent-analytics", String(!!c.analytics));
  document.documentElement.setAttribute("data-consent-marketing", String(!!c.marketing));
}

export default function CookieGate() {
  const pathname = usePathname();
  const isLanding = pathname === "/" || pathname?.startsWith("/?");

  const initial = useMemo(() => (typeof window === "undefined" ? null : parseConsentCookie()), []);
  const [open, setOpen] = useState<boolean>(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  // arată DOAR pe landing și DOAR dacă nu avem consimțământ valid
  useEffect(() => {
    if (!isLanding) { setOpen(false); return; }
    const c = parseConsentCookie();
    setOpen(!c);
    if (c) { setAnalytics(!!c.analytics); setMarketing(!!c.marketing); }
  }, [isLanding]);

  function acceptAll() {
    const c: Consent = { necessary: true, analytics: true, marketing: true, ts: Date.now(), v: CONSENT_VERSION };
    writeConsentCookie(c);
    setOpen(false);
  }
  function rejectNonEssential() {
    const c: Consent = { necessary: true, analytics: false, marketing: false, ts: Date.now(), v: CONSENT_VERSION };
    writeConsentCookie(c);
    setOpen(false);
  }
  function saveChoices() {
    const c: Consent = { necessary: true, analytics, marketing, ts: Date.now(), v: CONSENT_VERSION };
    writeConsentCookie(c);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-title"
      onClick={() => setShowPrefs(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "color-mix(in srgb, var(--bg, #0b1117) 55%, transparent)",
        backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
        display: "grid", placeItems: "center", padding: 12
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modalCard"
        style={{
          width: "min(720px, 100%)",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 22,
          padding: 20,
          boxShadow: "0 14px 40px rgba(0,0,0,.35)",
          display: "grid",
          gap: 12
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden="true" style={{ fontSize: 28 }}>🍪</span>
          <h3 id="cookie-title" style={{ margin: 0 }}>Cookies & Privacy</h3>
        </div>

        {!showPrefs ? (
          <>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Folosim cookie-uri pentru funcționare și, cu acordul tău, pentru analytics și marketing.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button className="sb-btn" onClick={() => setShowPrefs(true)}>Customize</button>
              <button className="sb-btn" onClick={rejectNonEssential}>Reject non-essential</button>
              <button className="sb-btn sb-btn--primary" onClick={acceptAll}>Accept all</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 10, border: "1px solid var(--border)", borderRadius: 12 }}>
                <div>
                  <strong>Necessary</strong>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>mereu active (autentificare, securitate)</div>
                </div>
                <input type="checkbox" checked readOnly aria-label="Necessary cookies always on"/>
              </label>

              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 10, border: "1px solid var(--border)", borderRadius: 12 }}>
                <div>
                  <strong>Analytics</strong>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>ajută să îmbunătățim produsul</div>
                </div>
                <input type="checkbox" checked={analytics} onChange={(e)=>setAnalytics(e.currentTarget.checked)} />
              </label>

              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 10, border: "1px solid var(--border)", borderRadius: 12 }}>
                <div>
                  <strong>Marketing</strong>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>promoții și remarketing</div>
                </div>
                <input type="checkbox" checked={marketing} onChange={(e)=>setMarketing(e.currentTarget.checked)} />
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button className="sb-btn" onClick={() => setShowPrefs(false)}>Back</button>
              <button className="sb-btn sb-btn--primary" onClick={saveChoices}>Save choices</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}