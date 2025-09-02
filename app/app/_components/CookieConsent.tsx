"use client";

import { useEffect, useState } from "react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  // show banner only if no choice stored
  useEffect(() => {
    try {
      const v = localStorage.getItem("cookie_consent_v1");
      if (!v) setShow(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!show) return null;

  function accept(mode: "essential" | "all") {
    try {
      localStorage.setItem("cookie_consent_v1", mode);
      document.cookie = `cookie_consent_v1=${mode}; path=/; max-age=${60 * 60 * 24 * 365}`;
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie notice"
      style={wrap}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={badge} aria-hidden>🍪</div>
          <div style={{ display: "grid", gap: 2 }}>
            <strong style={{ fontSize: 14, lineHeight: 1.2 }}>Cookies</strong>
            <small style={{ color: "var(--muted)" }}>
              We use essential cookies for sign-in and core functionality. You can accept essentials only or all cookies.
            </small>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button onClick={() => accept("essential")} style={btnGhost}>
            Essential only
          </button>
          <button onClick={() => accept("all")} style={btnPrimary}>
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

/* ——— styles (theme-aware via CSS variables) ——— */

const wrap: React.CSSProperties = {
  position: "fixed",
  left: 16,
  right: 16,
  bottom: 16,
  zIndex: 1000,
  maxWidth: 520,
  margin: "0 auto",
  background: "var(--panel)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 12,
  boxShadow: "0 12px 28px rgba(2,6,23,.12)",
  backdropFilter: "saturate(120%) blur(4px)",
};

const badge: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background: "var(--card)",
  border: "1px solid var(--border)",
  fontSize: 14,
};

const btnBase: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  ...btnBase,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  border: "1px solid var(--border)",
  background: "var(--primary)",
  color: "#0c111b",
};
