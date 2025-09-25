"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type Consent = {
  necessary: true;       // mereu true
  preferences: boolean;  // doar asta mai rămâne
  ts: number;            // epoch ms
  v: number;             // versiune schema
};

const COOKIE_NAME = "p4h_consent";
const CONSENT_VERSION = 2;   // ↑ bump ca să forțeze re-consent dacă exista vechiul format
const TTL_DAYS = 180;        // 6 luni

function parseConsent(): Consent | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    const raw = m ? decodeURIComponent(m[1]) : (localStorage.getItem(COOKIE_NAME) ?? null);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    if (obj.v !== CONSENT_VERSION) return null; // re-consent dacă schimbăm schema
    const ageDays = (Date.now() - (obj.ts || 0)) / (1000 * 60 * 60 * 24);
    if (ageDays > TTL_DAYS) return null;
    return obj as Consent;
  } catch {
    return null;
  }
}

function writeConsent(c: Consent) {
  const maxAge = TTL_DAYS * 24 * 60 * 60;
  const value = encodeURIComponent(JSON.stringify(c));
  // cookie
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  // localStorage (fallback)
  try { localStorage.setItem(COOKIE_NAME, JSON.stringify(c)); } catch {}
  // flag util pentru CSS/JS
  document.documentElement.setAttribute("data-consent-preferences", String(!!c.preferences));
}

export default function CookieGate() {
  const pathname = usePathname();
  const isLanding = pathname === "/" || pathname?.startsWith("/?");

  const existing = useMemo(() => (typeof window === "undefined" ? null : parseConsent()), []);
  const [open, setOpen] = useState<boolean>(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [preferences, setPreferences] = useState(false);

  // arată DOAR pe landing și DOAR dacă nu avem consimțământ valid
  useEffect(() => {
    if (!isLanding) { setOpen(false); return; }
    const c = parseConsent();
    setOpen(!c);
    if (c) setPreferences(!!c.preferences);
  }, [isLanding]);

  // blochează scroll cât timp modalul e deschis
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  function acceptOnlyNecessary() {
    const c: Consent = { necessary: true, preferences: false, ts: Date.now(), v: CONSENT_VERSION };
    writeConsent(c);
    setOpen(false);
  }
  function acceptPreferences() {
    const c: Consent = { necessary: true, preferences: true, ts: Date.now(), v: CONSENT_VERSION };
    writeConsent(c);
    setOpen(false);
  }
  function saveChoices() {
    const c: Consent = { necessary: true, preferences, ts: Date.now(), v: CONSENT_VERSION };
    writeConsent(c);
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
        position: "fixed", inset: 0, zIndex: 10000,
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
        data-animate="true"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden="true" style={{ fontSize: 28 }}>🍪</span>
          <h3 id="cookie-title" style={{ margin: 0 }}>Cookies &amp; Privacy</h3>
        </div>

        {!showPrefs ? (
          <>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Folosim cookie-uri necesare pentru funcționare și, opțional, un cookie de <strong>preferințe</strong> pentru a-ți reține tema (light/dark).
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button className="sb-btn" onClick={() => setShowPrefs(true)}>Customize</button>
              <button className="sb-btn" onClick={acceptOnlyNecessary}>Only necessary</button>
              <button className="sb-btn sb-btn--primary" onClick={acceptPreferences}>Accept preferences</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "grid", gap: 10 }}>
              <label style={rowStyle()}>
                <div>
                  <strong>Necessary</strong>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>mereu active (autentificare, securitate, consimțământ)</div>
                </div>
                <input type="checkbox" checked readOnly aria-label="Necessary cookies always on"/>
              </label>

              <label style={rowStyle()}>
                <div>
                  <strong>Preferences</strong>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>reține tema (light/dark)</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences}
                  onChange={(e)=>setPreferences(e.currentTarget.checked)}
                  aria-label="Preferences cookie"
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button className="sb-btn" onClick={() => setShowPrefs(false)}>Back</button>
              <button className="sb-btn sb-btn--primary" onClick={saveChoices}>Save choices</button>
            </div>
          </>
        )}

        <div style={{ marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--muted)" }}>
          <a href="/legal/cookies" style={{ color: "var(--primary)", textDecoration: "none" }}>Cookie Policy</a>
          <span>•</span>
          <a href="/legal/privacy" style={{ color: "var(--primary)", textDecoration: "none" }}>Privacy</a>
        </div>
      </div>
    </div>
  );
}

function rowStyle(): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 10,
    border: "1px solid var(--border)",
    borderRadius: 12,
    background: "var(--card)"
  };
}