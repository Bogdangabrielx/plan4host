"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export default function BottomNav() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [path, setPath] = useState<string>("");
  const [kbOpen, setKbOpen] = useState(false); // ascundem bara când tastatura e deschisă

  useEffect(() => { setMounted(true); }, []);

  // Theme + path tracking (nativ, ca la tine)
  useEffect(() => {
    try {
      setTheme((document.documentElement.getAttribute("data-theme") as any) || "light");
    } catch {}
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

  // Detectăm tastatura și ascundem bara (fără transform/anti-drift vizual)
  useEffect(() => {
    const vv = (typeof window !== "undefined") ? window.visualViewport : null;
    if (!vv) return;
    const apply = () => {
      const keyboardHeight = Math.max(0, (window.innerHeight - vv.height - vv.offsetTop));
      setKbOpen(keyboardHeight > 120); // prag iOS/Android
    };
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    window.addEventListener("orientationchange", apply);
    apply();
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);

  const items = useMemo(() => ([
    { href: "/app/calendar", label: "Calendar", icon: theme === "light" ? "/calendar_forlight.png" : "/calendar_fordark.png" },
    { href: "/app/cleaning", label: "Cleaning Board", icon: theme === "light" ? "/cleaning_forlight.png" : "/cleaning_fordark.png" },
    { href: "/app/guest", label: "Guest Overview", icon: theme === "light" ? "/guest_forlight.png" : "/guest_fordark.png" },
  ]), [theme]);

  // ✨ Tail-ul din spate (umple doar safe-area, NICIODATĂ peste bară)
  const tailBehind = (
    <div
      aria-hidden="true"
      className="p4h-bottom-tail"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: "env(safe-area-inset-bottom, 0px)", // doar safe area
        background: "var(--panel)",                 // aceeași culoare ca bara
        zIndex: 9998,                               // sub bară
        pointerEvents: "none",
      }}
    />
  );

  // Bara propriu-zisă (edge-hug, fără safe padding intern, ascunsă la tastatură)
  const nav = (
    <nav
      aria-label="Bottom navigation"
      className="p4h-bottom-nav"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        // Coborâm peste safe-area ca să fie lipită perfect jos
        bottom: "calc(-1 * env(safe-area-inset-bottom, 0px))",
        background: "var(--panel)",
        borderTop: "1px solid var(--border)",
        padding: "8px 10px",          // fără padding cu env()
        zIndex: 10000,                 // peste orice tail/overlay din spate
        display: kbOpen ? "none" : "block",
        overflowAnchor: "none",
        // optional: evită stacking ciudat dacă un ancestor ar avea transform
        willChange: "auto",
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
            display: "grid",
            placeItems: "center",
            gap: 4,
            padding: "6px 4px",
            touchAction: "manipulation",
          }}
          aria-label="Open management"
        >
          <img src={theme === "light" ? "/configurator_forlight.png" : "/configurator_fordark.png"} alt="" width={22} height={22} style={{ display: "block" }} />
          <small style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.2 }}>Management</small>
        </button>
      </div>

      {/* doar mobil */}
      <style>{`@media (min-width: 641px) { .p4h-bottom-nav { display: none !important; } }`}</style>
    </nav>
  );

  if (!mounted) return null;
  return createPortal(
    <>
      {tailBehind}
      {nav}
    </>,
    document.body
  );
}