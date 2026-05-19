// /components/consent/ConsentOverlayHost.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { readConsent, writeConsent, ensureHtmlFlagFromStored } from "./consentStorage";

function resolveCookieModalTheme(pathname: string | null): "light" | "dark" {
  if (!pathname) return "light";
  if (pathname.startsWith("/legal")) return "dark";
  if (pathname === "/" || pathname === "/ro" || pathname.startsWith("/r/") || pathname.startsWith("/checkin")) {
    return "light";
  }
  return "light";
}

export default function ConsentOverlayHost() {
  const pathname = usePathname();
  const initial = useMemo(readConsent, []);
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [preferences, setPreferences] = useState<boolean>(initial?.preferences ?? true);
  const visualTheme = resolveCookieModalTheme(pathname);
  const isDark = visualTheme === "dark";

  const palette = isDark
    ? {
        overlay: "rgba(2, 6, 23, 0.72)",
        card: "rgba(15, 23, 42, 0.96)",
        cardSecondary: "rgba(19, 30, 52, 0.96)",
        text: "#e8eef5",
        muted: "rgba(232, 238, 245, 0.68)",
        border: "rgba(148, 163, 184, 0.22)",
        borderStrong: "rgba(148, 163, 184, 0.28)",
        primary: "#3ECF8E",
        buttonBg: "rgba(19, 30, 52, 0.96)",
        iconBg: "radial-gradient(60% 60% at 30% 20%, rgba(255,255,255,.12), transparent), rgba(62, 207, 142, 0.16)",
        toggleOff: "rgba(255,255,255,0.10)",
      }
    : {
        overlay: "rgba(15, 23, 42, 0.42)",
        card: "rgba(255, 255, 255, 0.96)",
        cardSecondary: "rgba(255, 255, 255, 0.86)",
        text: "#131313",
        muted: "rgba(19, 19, 19, 0.68)",
        border: "rgba(16, 24, 40, 0.10)",
        borderStrong: "rgba(16, 24, 40, 0.16)",
        primary: "#2f8f5b",
        buttonBg: "rgba(255, 255, 255, 0.92)",
        iconBg: "radial-gradient(60% 60% at 30% 20%, rgba(255,255,255,.18), transparent), rgba(47, 143, 91, 0.12)",
        toggleOff: "rgba(15, 23, 42, 0.10)",
      };

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
        background: palette.overlay,
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
          background: palette.card,
          color: palette.text,
          border: `1px solid ${palette.border}`,
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
              background: palette.iconBg,
              boxShadow: `0 8px 24px rgba(0,0,0,.35), inset 0 0 0 1px ${palette.border}`,
            }}
          >🍪</div>
          <div>
            <h3 id="cookie-title" style={{ margin: 0 }}>Cookies & Privacy</h3>
            <div style={{ color: palette.muted, fontSize: 13 }}>
              We use essential cookies and, optionally, preference storage for theme, language, and UI choices in the application area.
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
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontWeight: 900,
                  background: "transparent",
                  color: palette.text,
                  border: `1px solid ${palette.primary}`,
                  boxShadow: "none",
                }}
              >
                Accept all
              </button>
              <button
                onClick={() => { writeConsent(false); setOpen(false); }}
                className="sb-btn"
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: palette.buttonBg,
                  color: palette.text,
                  border: `1px solid ${palette.borderStrong}`,
                  fontWeight: 900,
                }}
              >
                Only necessary
              </button>
              <button
                onClick={() => setShowPrefs(true)}
                className="sb-btn"
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "transparent",
                  color: palette.text,
                  border: `1px solid ${palette.borderStrong}`,
                  fontWeight: 900,
                }}
              >
                Customize
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                border: `1px solid ${palette.border}`,
                background: palette.cardSecondary,
                borderRadius: 12, padding: 12, display: "grid", gap: 10,
              }}
            >
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>Essential</strong>
                  <div style={{ color: palette.muted, fontSize: 12 }}>Required for the site to function</div>
                </div>
                <input
                  type="checkbox"
                  checked
                  readOnly
                  aria-label="Essential cookies required"
                  style={{ accentColor: palette.primary }}
                />
              </label>

              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>Preferences</strong>
                  <div style={{ color: palette.muted, fontSize: 12 }}>Remember theme, language, and app UI preferences on this device</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences}
                  onChange={(e) => setPreferences(e.currentTarget.checked)}
                  aria-label="Preferences cookies"
                  style={{ accentColor: palette.primary }}
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                className="sb-btn"
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: palette.buttonBg,
                  color: palette.text,
                  border: `1px solid ${palette.borderStrong}`,
                }}
                onClick={() => setShowPrefs(false)}
              >
                Back
              </button>
              <button
                className="sb-btn sb-btn--primary"
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontWeight: 900,
                  background: "transparent",
                  color: palette.text,
                  border: `1px solid ${palette.primary}`,
                  boxShadow: "none",
                }}
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
