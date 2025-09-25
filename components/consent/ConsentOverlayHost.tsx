// /components/consent/ConsentOverlayHost.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { openCookieConsent } from "./openCookieConsent";
import { readConsent, writeConsent, ensureHtmlFlagFromStored } from "./consentStorage";

export default function ConsentOverlayHost() {
  const initial = useMemo(readConsent, []);
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [preferences, setPreferences] = useState<boolean>(initial?.preferences ?? true);

  // sincronizează flag-ul pe <html> (ptr CSS gating)
  useEffect(() => { ensureHtmlFlagFromStored(); }, []);

  // evenimente globale
  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    window.addEventListener("p4h:open-consent" as any, onOpen);
    window.addEventListener("p4h:close-consent" as any, onClose);
    return () => {
      window.removeEventListener("p4h:open-consent" as any, onOpen);
      window.removeEventListener("p4h:close-consent" as any, onClose);
    };
  }, []);

  // lock scroll când overlay-ul e deschis
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-title"
      onClick={() => setShowPrefs(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "color-mix(in srgb, var(--bg, #0b1117) 55%, transparent)",
        backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
        display: "grid", placeItems: "center", padding: 12
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modalCard"
        data-animate="true"
        style={{
          width: "min(560px, 100%)",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 22,
          padding: 20,
          display: "grid",
          gap: 12,
          boxShadow: "0 14px 40px rgba(0,0,0,.35)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            aria-hidden
            style={{
              fontSize: 28, lineHeight: 1, width: 44, height: 44,
              display: "grid", placeItems: "center", borderRadius: 12,
              background: "radial-gradient(60% 60% at 30% 20%, rgba(255,255,255,.16), transparent), color-mix(in srgb, var(--primary) 18%, var(--card))",
              boxShadow: "0 8px 24px rgba(0,0,0,.35), inset 0 0 0 1px color-mix(in srgb, var(--border) 60%, transparent)",
            }}
          >🍪</div>
          <div>
            <h3 id="cookie-title" style={{ margin: 0 }}>Cookies & Privacy</h3>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              We use essential cookies and, optionally, preferences (theme).
            </div>
          </div>
        </div>

        {/* Body & actions */}
        {!showPrefs ? (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                onClick={() => { writeConsent(true); setOpen(false); }}
                className="sb-btn sb-btn--primary"
                style={{ padding: "10px 14px", borderRadius: 12, fontWeight: 900 }}
              >
                Accept all
              </button>
              <button
                onClick={() => { writeConsent(false); setOpen(false); }}
                className="sb-btn"
                style={{ padding: "10px 14px", borderRadius: 12, background: "var(--card)", fontWeight: 900 }}
              >
                Only necessary
              </button>
              <button
                onClick={() => setShowPrefs(true)}
                className="sb-btn"
                style={{ padding: "10px 14px", borderRadius: 12, background: "transparent", border: "1px solid var(--border)", fontWeight: 900 }}
              >
                Customize
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                border: "1px solid var(--border)", background: "var(--panel)",
                borderRadius: 12, padding: 12, display: "grid", gap: 10,
              }}
            >
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>Essential</strong>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>Required for the site to function</div>
                </div>
                <input type="checkbox" checked readOnly aria-label="Essential cookies required" />
              </label>

              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>Preferences (theme)</strong>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>Remember your theme choice</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences}
                  onChange={(e) => setPreferences(e.currentTarget.checked)}
                  aria-label="Preferences cookies"
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button className="sb-btn" style={{ padding: "10px 14px", borderRadius: 12 }} onClick={() => setShowPrefs(false)}>
                Back
              </button>
              <button
                className="sb-btn sb-btn--primary"
                style={{ padding: "10px 14px", borderRadius: 12, fontWeight: 900 }}
                onClick={() => { writeConsent(preferences); setOpen(false); }}
              >
                Save preferences
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}