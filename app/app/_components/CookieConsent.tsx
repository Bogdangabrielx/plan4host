"use client";

import { useEffect, useMemo, useState } from "react";

type ConsentState = {
  necessary: true;            // mereu true
  analytics: boolean;
  marketing: boolean;
};

const LS_KEY = "p4h:consent:v1";
const CK_NAME = "p4h_consent";
const CK_MAX_AGE_DAYS = 180;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const maxAge = Math.floor(days * 24 * 60 * 60);
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
function readStored(): ConsentState | null {
  try {
    const ck = getCookie(CK_NAME);
    if (ck) return JSON.parse(ck);
  } catch {}
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
function persist(state: ConsentState) {
  const str = JSON.stringify(state);
  try { localStorage.setItem(LS_KEY, str); } catch {}
  setCookie(CK_NAME, str, CK_MAX_AGE_DAYS);
  // opțional: expune un flag pe <html> pt. CSS/JS care au nevoie
  if (typeof document !== "undefined") {
    document.documentElement.dataset.consent = [
      "necessary",
      state.analytics && "analytics",
      state.marketing && "marketing",
    ].filter(Boolean).join(",");
  }
}

export default function CookieConsent() {
  const existing = useMemo(readStored, []);
  const [open, setOpen] = useState(!existing); // apare doar dacă nu există consimțământ
  const [showCustomize, setShowCustomize] = useState(false);
  const [state, setState] = useState<ConsentState>(
    existing || { necessary: true, analytics: false, marketing: false }
  );

  // lock scroll când e deschis
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const saveAndClose = (s: ConsentState) => {
    persist(s);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-title"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "grid", placeItems: "center",
        padding: 12,
        background: "color-mix(in srgb, var(--bg) 55%, transparent)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    >
      <div
        className="modalCard"
        style={{
          width: "min(680px, 100%)",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 22,
          padding: 20,
        }}
        data-animate="true"
      >
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "center" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            display: "grid", placeItems: "center",
            border: "1px solid color-mix(in srgb, var(--border) 50%, transparent)",
            background: "linear-gradient(180deg, color-mix(in srgb, var(--card) 80%, transparent), transparent)",
            boxShadow: "0 10px 30px rgba(0,0,0,.25)"
          }}>
            <span aria-hidden>🍪</span>
          </div>
          <div>
            <h2 id="cookie-title" style={{ margin: 0 }}>Cookies & Privacy</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
              We use cookies to improve your experience. Choose what’s OK for you.
            </p>
          </div>
        </div>

        {/* Body */}
        {!showCustomize ? (
          <div style={{ marginTop: 16, color: "var(--muted)" }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li><strong>Necessary</strong> – required for basic site functionality.</li>
              <li><strong>Analytics</strong> – helps us understand usage.</li>
              <li><strong>Marketing</strong> – personalized offers.</li>
            </ul>
          </div>
        ) : (
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            <label style={rowStyle()}>
              <input type="checkbox" checked readOnly aria-readonly />
              <span style={{ fontWeight: 800 }}>Necessary</span>
              <small style={{ color: "var(--muted)" }}>Always on</small>
            </label>
            <label style={rowStyle()}>
              <input
                type="checkbox"
                checked={state.analytics}
                onChange={(e) => setState(s => ({ ...s, analytics: e.currentTarget.checked }))}
              />
              <span style={{ fontWeight: 800 }}>Analytics</span>
              <small style={{ color: "var(--muted)" }}>Helps us improve</small>
            </label>
            <label style={rowStyle()}>
              <input
                type="checkbox"
                checked={state.marketing}
                onChange={(e) => setState(s => ({ ...s, marketing: e.currentTarget.checked }))}
              />
              <span style={{ fontWeight: 800 }}>Marketing</span>
              <small style={{ color: "var(--muted)" }}>More relevant messages</small>
            </label>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 16 }}>
          {!showCustomize && (
            <>
              <button
                className="sb-btn"
                onClick={() => saveAndClose({ necessary: true, analytics: false, marketing: false })}
                title="Only necessary"
              >
                Only necessary
              </button>
              <button
                className="sb-btn"
                onClick={() => setShowCustomize(true)}
                title="Customize"
              >
                Customize
              </button>
              <button
                className="sb-btn sb-btn--primary"
                onClick={() => saveAndClose({ necessary: true, analytics: true, marketing: true })}
                title="Accept all"
              >
                Accept all
              </button>
            </>
          )}
          {showCustomize && (
            <>
              <button className="sb-btn" onClick={() => setShowCustomize(false)}>Back</button>
              <button className="sb-btn sb-btn--primary" onClick={() => saveAndClose(state)}>Save preferences</button>
            </>
          )}
        </div>

        {/* Legal links */}
        <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--muted)" }}>
          <a href="/legal/cookie-policy" style={{ color: "var(--primary)", textDecoration: "none" }}>Cookie Policy</a>
          <span>•</span>
          <a href="/legal/privacy" style={{ color: "var(--primary)", textDecoration: "none" }}>Privacy</a>
        </div>
      </div>
    </div>
  );
}

function rowStyle(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: 12,
    background: "var(--card)"
  };
}