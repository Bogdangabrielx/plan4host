"use client";

import { useEffect, useMemo, useState } from "react";

/** ——— Tip & storage ——— */
type ConsentV1 = {
  v: 1;
  necessary: true;
  preferences: boolean;   // doar tema
  updatedAt: string;
};

const CK_NAME = "cookie_consent";
const CK_MAX_AGE = 60 * 60 * 24 * 365; // 12 luni

function resolveCookieDomain(hostname: string): string | undefined {
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return undefined;
  const root = "plan4host.com";
  return (hostname === root || hostname.endsWith("." + root)) ? "." + root : undefined;
}

function readConsentFromCookie(): ConsentV1 | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie.split("; ").find((r) => r.startsWith(CK_NAME + "="));
  if (!hit) return null;
  try {
    const obj = JSON.parse(decodeURIComponent(hit.split("=")[1]));
    if (obj?.v === 1 && obj?.necessary === true && typeof obj?.preferences === "boolean") {
      return obj as ConsentV1;
    }
  } catch {}
  return null;
}

function writeConsentCookie(c: ConsentV1) {
  if (typeof document === "undefined") return;
  const parts = [
    `${CK_NAME}=${encodeURIComponent(JSON.stringify(c))}`,
    "Path=/",
    `Max-Age=${CK_MAX_AGE}`,
    "SameSite=Lax",
  ];
  const dom = resolveCookieDomain(window.location.hostname);
  if (dom) parts.push(`Domain=${dom}`);
  if (window.location.protocol === "https:") parts.push("Secure");
  document.cookie = parts.join("; ");

  // expune flag pentru CSS / alte componente
  document.documentElement.setAttribute("data-consent-preferences", String(!!c.preferences));
}

/** ——— Componenta ——— */
export default function ModernCookieModal() {
  const existing = useMemo(() => (typeof window !== "undefined" ? readConsentFromCookie() : null), []);
  const [open, setOpen] = useState<boolean>(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<boolean>(existing?.preferences ?? false);

  // 1) Deschidere automată DOAR pe landing dacă nu există consimțământ
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname || "/";
    const hasConsent = !!readConsentFromCookie();
    if (!hasConsent && path === "/") setOpen(true);
  }, []);

  // 2) Hook global pentru butoanele „Cookie settings” oriunde în site
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const btn =
        t.closest("#open-cookie-settings") ||
        t.closest('[data-cookie-settings]') ||
        null;
      if (btn) {
        e.preventDefault();
        setShowPrefs(true);
        setOpen(true);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // 3) Blocare scroll când modalul e deschis
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // helper: salvează și închide
  function save(preferences: boolean) {
    const payload: ConsentV1 = {
      v: 1,
      necessary: true,
      preferences,
      updatedAt: new Date().toISOString(),
    };
    writeConsentCookie(payload);
    setOpen(false);
    setShowPrefs(false);
    setPrefs(preferences);
  }

  if (!open) return null;

  return (
    <div
      className="modalFlipWrapper"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-title"
      onClick={() => setOpen(false)}
    >
      {/* Panel */}
      <div
        className="modalFlip modalCard"
        style={{ width: "min(720px, calc(100vw - 32px))" }}
        onClick={(e) => e.stopPropagation()}
        data-animate="true"
      >
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "center" }}>
          <div
            aria-hidden
            style={{
              width: 48, height: 48, borderRadius: 14,
              display: "grid", placeItems: "center",
              background:
                "radial-gradient(60% 60% at 30% 20%, rgba(255,255,255,.18), transparent), " +
                "color-mix(in srgb, var(--primary) 18%, var(--card))",
              boxShadow: "0 10px 30px rgba(0,0,0,.25), inset 0 0 0 1px color-mix(in srgb, var(--border) 60%, transparent)",
            }}
          >
            <span style={{ fontSize: 24 }} role="img" aria-label="Cookie">🍪</span>
          </div>
          <div>
            <h3 id="cookie-title" style={{ margin: 0 }}>We use cookies</h3>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>
              Essential cookies keep the site working. Optionally, we can remember your <strong>theme</strong> (light/dark).
            </div>
          </div>
        </div>

        {/* Body + Actions */}
        {!showPrefs ? (
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="sb-btn sb-btn--primary"
                style={{ padding: "10px 14px", borderRadius: 12, fontWeight: 900 }}
                onClick={() => save(true)}
                title="Accept preferences"
              >
                Accept preferences
              </button>
              <button
                className="sb-btn"
                style={{ padding: "10px 14px", borderRadius: 12, background: "transparent", border: "1px solid var(--border)", fontWeight: 900 }}
                onClick={() => save(false)}
                title="Only necessary"
              >
                Only necessary
              </button>
              <button
                className="sb-btn"
                style={{ padding: "10px 14px", borderRadius: 12, background: "var(--card)", fontWeight: 900 }}
                onClick={() => setShowPrefs(true)}
                title="Customize"
              >
                Customize
              </button>
            </div>
            <small style={{ color: "var(--muted)" }}>
              Read more in our{" "}
              <a href="/legal/cookies" style={{ color: "var(--primary)", textDecoration: "none" }}>
                Cookie Policy
              </a>.
            </small>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
            <div
              style={{
                border: "1px solid var(--border)",
                background: "var(--panel)",
                borderRadius: 12,
                padding: 12,
                display: "grid",
                gap: 10,
              }}
            >
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>Essential</strong>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>Required for security, session, and consent</div>
                </div>
                <input type="checkbox" checked readOnly aria-label="Essential cookies required"/>
              </label>

              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>Preferences</strong>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>Remember your theme (light/dark)</div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs}
                  onChange={(e) => setPrefs(e.currentTarget.checked)}
                  aria-label="Preferences (theme)"
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button className="sb-btn" style={{ padding: "10px 14px", borderRadius: 12 }} onClick={() => setShowPrefs(false)}>Back</button>
              <button className="sb-btn sb-btn--primary" style={{ padding: "10px 14px", borderRadius: 12, fontWeight: 900 }} onClick={() => save(prefs)}>Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}