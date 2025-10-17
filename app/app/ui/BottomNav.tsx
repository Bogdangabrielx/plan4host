"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export default function BottomNav() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [path, setPath] = useState<string>("");
  const [kbOpen, setKbOpen] = useState(false); // ✅ ascundem bara când tastatura e deschisă

  useEffect(() => { setMounted(true); }, []);

  // Theme + path tracking
  useEffect(() => {
    try {
      setTheme(
        (document.documentElement.getAttribute("data-theme") as any) || "light"
      );
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

  // Detectăm tastatura și ascundem bara (logica ta, neschimbată)
  useEffect(() => {
    const vv = (typeof window !== "undefined") ? window.visualViewport : null;
    if (!vv) return;

    const apply = () => {
      const keyboardHeight = Math.max(0, (window.innerHeight - vv.height - vv.offsetTop));
      const isOpen = keyboardHeight > 120; // prag safe iOS/Android
      setKbOpen(isOpen);
      document.documentElement.style.setProperty("--vv-shift", `${Math.max(0, vv.offsetTop || 0)}px`);
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

  const items = useMemo(
    () => [
      { href: "/app/calendar", label: "Calendar", icon: theme === "light" ? "/calendar_forlight.png" : "/calendar_fordark.png" },
      { href: "/app/cleaning", label: "Cleaning Board", icon: theme === "light" ? "/cleaning_forlight.png" : "/cleaning_fordark.png" },
      { href: "/app/guest", label: "Guest Overview", icon: theme === "light" ? "/guest_forlight.png" : "/guest_fordark.png" },
    ],
    [theme]
  );

  const nav = (
    <nav
      aria-label="Bottom navigation"
      className="p4h-bottom-nav"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        // ⬇️ „edge-hug”: coborâm bara peste safe-area (fără spațiu vizibil jos)
        bottom: "calc(-1 * env(safe-area-inset-bottom, 0px))",
        background: "var(--panel)",
        borderTop: "1px solid var(--border)",
        // padding intern normal (fără env)
        padding: "8px 10px",
        zIndex: 9999,
        display: kbOpen ? "none" : "block", // ✅ ascunsă la tastatură (ca înainte)
        overflowAnchor: "none",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
        }}
      >
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
              <img
                src={it.icon}
                alt=""
                width={22}
                height={22}
                style={{ display: "block", opacity: active ? 1 : 0.9 }}
              />
              <small style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.2 }}>
                {it.label}
              </small>
            </a>
          );
        })}

        <button
          type="button"
          onClick={() => {
            try { window.dispatchEvent(new CustomEvent("p4h:openManagement")); } catch {}
          }}
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
          <img
            src={theme === "light" ? "/configurator_forlight.png" : "/configurator_fordark.png"}
            alt=""
            width={22}
            height={22}
            style={{ display: "block" }}
          />
          <small style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.2 }}>
            Management
          </small>
        </button>
      </div>

      {/* doar mobile */}
      <style>{`@media (min-width: 641px) { .p4h-bottom-nav { display: none !important; } }`}</style>
    </nav>
  );

  if (!mounted) return null;
  return createPortal(nav, document.body);
}