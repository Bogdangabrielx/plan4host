"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export default function BottomNav() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [path, setPath] = useState<string>("");
  const [kbOpen, setKbOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // doar mobil (<= 640px)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener ? mq.addEventListener("change", update) : mq.addListener(update);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", update) : mq.removeListener(update);
    };
  }, []);

  useEffect(() => {
    try { setTheme((document.documentElement.getAttribute("data-theme") as any) || "light"); } catch {}
    const onTheme = (e: any) => { if (e?.detail?.theme) setTheme(e.detail.theme); };
    window.addEventListener("themechange" as any, onTheme);

    setPath(window.location.pathname);
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);

    setIsStandalone(document.documentElement.getAttribute("data-standalone") === "true");

    return () => {
      window.removeEventListener("themechange" as any, onTheme);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  // ascunde bara când tastatura e deschisă
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const apply = () => {
      const keyboardHeight = Math.max(0, (window.innerHeight - vv.height - vv.offsetTop));
      setKbOpen(keyboardHeight > 120);
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
    { href: "/app/calendar", label: "Calendar", icon: theme==="light" ? "/calendar_forlight.png" : "/calendar_fordark.png" },
    { href: "/app/cleaning", label: "Cleaning Board", icon: theme==="light" ? "/cleaning_forlight.png" : "/cleaning_fordark.png" },
    { href: "/app/guest", label: "Guest Overview", icon: theme==="light" ? "/guest_forlight.png" : "/guest_fordark.png" },
  ]), [theme]);

  if (!mounted || !isMobile || kbOpen) return null;

  const nav = (
    <nav
      aria-label="Bottom navigation"
      className="p4h-bottom-nav"
      style={{
        position: "fixed",
        left: 0,
        right: 0,

        // browser mobil: flush la muchie; PWA iOS: respectă safe-area
        bottom: isStandalone ? 0 : "calc(-1 * env(safe-area-inset-bottom, 0px))",

        background: "var(--panel)",
        borderTop: "1px solid var(--border)",
        padding: "8px 10px",
        // paddingBottom: isStandalone ? "calc(8px + env(safe-area-inset-bottom, 0px))" : undefined,

        zIndex: 99999,          // foarte sus, nimic din content nu o mai acoperă
        overflowAnchor: "none",
      }}
    >
      <div style={{  display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
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
          <img src={theme==="light" ? "/configurator_forlight.png" : "/configurator_fordark.png"} alt="" width={22} height={22} style={{ display: "block" }} />
          <small style={{  fontSize: 10, fontWeight: 800, letterSpacing: 0.2 }}>Management</small>
        </button>
      </div>
    </nav>
  );

  return createPortal(nav, document.body);
}