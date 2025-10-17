"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function BottomNav() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [path, setPath] = useState<string>("");
  const [kbOpen, setKbOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [saBottom, setSaBottom] = useState(0); // safe-area bottom în px
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // doar mobil (<= 640px)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    } else {
      // Safari vechi
      // @ts-ignore
      mq.addListener(update);
      return () => {
        // @ts-ignore
        mq.removeListener(update);
      };
    }
  }, []);

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

  // detectăm keyboard + safe-area via VisualViewport și ținem bara ascunsă când apare tastatura
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    const measure = () => {
      // cât e "marginea" nefolosibilă jos (safe area + eventual UI)
      const bottomInset = Math.max(0, (window.innerHeight - vv.height - vv.offsetTop));
      setSaBottom(bottomInset);

      // keyboard deschis?
      setKbOpen(bottomInset > 120);
    };

    vv.addEventListener("resize", measure);
    vv.addEventListener("scroll", measure);
    window.addEventListener("orientationchange", measure);
    measure();

    return () => {
      vv.removeEventListener("resize", measure);
      vv.removeEventListener("scroll", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  // scrie înălțimea REALĂ a barei în :root ca --nav-h (include safe-area pentru spațierea din AppShell)
  useEffect(() => {
    if (!mounted) return;
    const el = navRef.current;
    if (!el) return;

    const write = () => {
      const h = (el.offsetHeight || 88) + (kbOpen ? 0 : saBottom);
      document.documentElement.style.setProperty("--nav-h", `${h}px`);
    };

    write();

    let ro: ResizeObserver | undefined;
    const RO = (window as any).ResizeObserver as typeof ResizeObserver | undefined;
    if (RO) {
      ro = new RO(() => write());
      ro.observe(el);
    }
    window.addEventListener("orientationchange", write);
    window.addEventListener("resize", write);

    return () => {
      ro?.disconnect();
      window.removeEventListener("orientationchange", write);
      window.removeEventListener("resize", write);
    };
  }, [mounted, saBottom, kbOpen]);

  const items = useMemo(() => ([
    { href: "/app/calendar", label: "Calendar", icon: theme==="light" ? "/calendar_forlight.png" : "/calendar_fordark.png" },
    { href: "/app/cleaning", label: "Cleaning Board", icon: theme==="light" ? "/cleaning_forlight.png" : "/cleaning_fordark.png" },
    { href: "/app/guest", label: "Guest Overview", icon: theme==="light" ? "/guest_forlight.png" : "/guest_fordark.png" },
  ]), [theme]);

  if (!mounted || !isMobile || kbOpen) return null;

  const nav = (
    <nav
      ref={(n) => { navRef.current = n; }}
      aria-label="Bottom navigation"
      className="p4h-bottom-nav"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,                            // ✅ lipit de marginea fizică
        background: "var(--panel)",
        borderTop: "1px solid var(--border)",
        padding: "8px 10px",                  // ✅ fără env() aici
        zIndex: 2147483000,
        overflowAnchor: "none",
        isolation: "isolate",
        contain: "layout paint",
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
          <img src={theme==="light" ? "/configurator_forlight.png" : "/configurator_fordark.png"} alt="" width={22} height={22} style={{ display: "block" }} />
          <small style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.2 }}>Management</small>
        </button>
      </div>

      {/* desktop off */}
      <style>{`@media (min-width: 641px) { .p4h-bottom-nav { display: none; } }`}</style>
    </nav>
  );

  // filler: colorează DOAR sub bară cât safe-area, fără să mute bara (nu "plutește")
  const filler = saBottom > 0 ? (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: saBottom,
        background: "var(--panel)",
        zIndex: 2147482999,
        pointerEvents: "none",
      }}
    />
  ) : null;

  return createPortal(<>{filler}{nav}</>, document.body);
}