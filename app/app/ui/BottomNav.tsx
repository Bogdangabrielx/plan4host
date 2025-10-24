"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function BottomNav() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [path, setPath] = useState<string>("");
  const [kbOpen, setKbOpen] = useState(false);
  const [forceHide, setForceHide] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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
      // Safari < 14 fallback
      // @ts-ignore
      mq.addListener(update);
      return () => {
        // @ts-ignore
        mq.removeListener(update);
      };
    }
  }, []);

  // Allow pages (e.g., search inputs) to explicitly hide/show nav on focus/blur
  useEffect(() => {
    const onHide = () => setForceHide(true);
    const onShow = () => setForceHide(false);
    window.addEventListener('p4h:nav:hide' as any, onHide);
    window.addEventListener('p4h:nav:show' as any, onShow);
    return () => {
      window.removeEventListener('p4h:nav:hide' as any, onHide);
      window.removeEventListener('p4h:nav:show' as any, onShow);
    };
  }, []);

  // theme & path
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

  // detectează tastatura (iOS/Android) prin VisualViewport
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
useEffect(() => {
  const el = navRef.current;
  if (!el) return;

  // blochează „pan/scroll” în interiorul barei (iOS + Android)
  const stop = (e: Event) => e.preventDefault();

  // pe touch + wheel (pasive:false ca să putem preveni)
  el.addEventListener("touchmove", stop, { passive: false });
  el.addEventListener("wheel", stop, { passive: false });

  return () => {
    el.removeEventListener("touchmove", stop as any);
    el.removeEventListener("wheel", stop as any);
  };
}, []);
  // scrie înălțimea reală a barei în :root ca --nav-h
  // IMPORTANT: nu o schimbăm când tastatura e deschisă, ca să nu „sară” layout-ul.
  useEffect(() => {
    if (!mounted || kbOpen) return;
    const el = navRef.current;
    if (!el) return;

    const write = () => {
      const h = el.offsetHeight || 88;
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
  }, [mounted, kbOpen]);

  const items = useMemo(() => ([
    { href: "/app/calendar", label: "Calendar", icon: theme==="light" ? "/calendar_forlight.png" : "/calendar_fordark.png" },
    { href: "/app/cleaning", label: "Cleaning Board", icon: theme==="light" ? "/cleaning_forlight.png" : "/cleaning_fordark.png" },
    { href: "/app/guest", label: "Guest Overview", icon: theme==="light" ? "/guest_forlight.png" : "/guest_fordark.png" },
  ]), [theme]);

  if (!mounted || !isMobile) return null;

  const nav = (
    <nav
      ref={(n) => { navRef.current = n; }}
      aria-label="Bottom navigation"
      className="sb-cardglow"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,                 // ancorat de muchia fizică
        background: "var(--panel)",
        borderTop: "1px solid var(--border)",
        borderTopLeftRadius: 23,
        borderTopRightRadius: 23,
        padding: "8px 8px",
        overflow: "hidden",

        // când tastatura e deschisă, NU mai urcă: îl scot în jos din viewport
        transform: (kbOpen || forceHide) ? "translateY(100%)" : "translateY(0)",
        transition: "transform .18s ease",

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
                color: "var(--text)",
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                gap: 4,
                padding: "6px 4px",
                touchAction: "manipulation",
              }}
            >
              <img src={it.icon} alt="" width={22} height={22} style={{ display: "block", opacity: active ? 1 : 0.95 }} />
              <small style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.2 }}>{it.label}</small>
            </a>
          );
        })}

        <button
          type="button"
          onClick={() => { try { window.dispatchEvent(new CustomEvent("p4h:openManagement")); } catch {} }}
          style={{
            textDecoration: "none",
            color: "var(--text)",
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            background: "var(--panel)",
            border: "var(--border)",
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

  return createPortal(nav, document.body);
}
