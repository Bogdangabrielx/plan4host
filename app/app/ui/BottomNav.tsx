"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export default function BottomNav() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [path, setPath] = useState<string>("");

  useEffect(() => { setMounted(true); }, []);

  // Theme + path tracking
  useEffect(() => {
    try { setTheme((document.documentElement.getAttribute("data-theme") as any) || "light"); } catch {}
    const onTheme = (e: any) => { if (e?.detail?.theme) setTheme(e.detail.theme); };
    window.addEventListener("themechange" as any, onTheme);

    setPath(window.location.pathname);
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("themechange" as any, onTheme);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  // Anti-drift la apariția tastaturii: nu ridicăm bara, doar anulăm urcarea vizuală
  useEffect(() => {
    const vv = (typeof window !== "undefined") ? window.visualViewport : null;
    if (!vv) return;

    const applyShift = () => {
      // offsetTop > 0 când browserul mută vizual viewportul în jos (tastatura sus)
      const shift = Math.max(0, vv.offsetTop || 0);
      // Setăm variabila CSS globală; bara o va traduce în jos cu exact acest offset
      document.documentElement.style.setProperty("--vv-shift", `${shift}px`);
    };

    vv.addEventListener("resize", applyShift);
    vv.addEventListener("scroll", applyShift);
    window.addEventListener("orientationchange", applyShift);
    applyShift();

    return () => {
      vv.removeEventListener("resize", applyShift);
      vv.removeEventListener("scroll", applyShift);
      window.removeEventListener("orientationchange", applyShift);
      // opțional: curățăm variabila
      // document.documentElement.style.removeProperty("--vv-shift");
    };
  }, []);

  const items = useMemo(() => ([
    { href: "/app/calendar", label: "Calendar", icon: theme === "light" ? "/calendar_forlight.png" : "/calendar_fordark.png" },
    { href: "/app/cleaning", label: "Cleaning Board", icon: theme === "light" ? "/cleaning_forlight.png" : "/cleaning_fordark.png" },
    { href: "/app/guest", label: "Guest Overview", icon: theme === "light" ? "/guest_forlight.png" : "/guest_fordark.png" },
  ]), [theme]);

  const nav = (
    <nav
      aria-label="Bottom navigation"
      className="p4h-bottom-nav"
      style={{
        position: "fixed",
        left: 0, right: 0, bottom: 0,
        background: "var(--panel)",
        borderTop: "1px solid var(--border)",
        padding: "8px 10px",
        paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
        zIndex: 9999,
        // Contra-translăm doar offsetTop; NU compensăm înălțimea tastaturii
        transform: "translateY(calc(var(--vv-shift, 0px) * -1))",
        willChange: "transform",
        // evităm ca bara să devină ancoră de scroll
        overflowAnchor: "none",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {items.map((it) => {
          const active = path === it.href || path.startsWith(it.href + "/");
          return (
            <a
              key={it.href}
              href={it.href}
              style={{
                textDecoration: "none",
                color: active ? "var(--primary)" : "var(--muted)",
                display: "grid",
                placeItems: "center",
                gap: 4,
                touchAction: "manipulation",
              }}
            >
              <img src={it.icon} alt="" width={22} height={22} style={{ display: "block", opacity: active ? 1 : 0.9 }} />
              <small style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.2 }}>{it.label}</small>
            </a>
          );
        })}
        <button
          type="button"
          onClick={() => { try { window.dispatchEvent(new CustomEvent("p4h:openManagement")); } catch {} }}
          style={{
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--text)",
            borderRadius: 10,
            display: "grid", placeItems: "center", gap: 4,
            padding: "6px 4px",
            touchAction: "manipulation",
          }}
          aria-label="Open management"
        >
          <img src={theme === "light" ? "/configurator_forlight.png" : "/configurator_fordark.png"} alt="" width={22} height={22} style={{ display: "block" }} />
          <small style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.2 }}>Management</small>
        </button>
      </div>

      <style>{`
        /* Ascundem pe ecrane mari exclusiv din CSS, ca să nu depindem de innerWidth (care variază la zoom) */
        @media (min-width: 641px) { .p4h-bottom-nav { display: none; } }
      `}</style>
    </nav>
  );

  if (!mounted) return null;
  return createPortal(nav, document.body);
}