"use client";

import { useEffect, useMemo, useState } from "react";

function isPwaMode() {
  if (typeof window === "undefined") return false;
  const navAny = navigator as any;
  return (
    navAny?.standalone === true ||
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches)
  );
}

export default function LandingSafeArea() {
  const [isPwa, setIsPwa] = useState(false);

  useEffect(() => {
    setIsPwa(isPwaMode());
  }, []);

  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("[data-p4h-landing-nav]");
    if (!nav) return;

    const apply = () => {
      const h = Math.max(0, Math.round(nav.getBoundingClientRect().height));
      document.documentElement.style.setProperty("--landing-nav-h", `${h}px`);
    };

    apply();

    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => apply());
      ro.observe(nav);
    } catch {
      // ignore
    }

    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      try {
        ro?.disconnect();
      } catch {
        // ignore
      }
    };
  }, []);

  const common = useMemo(
    () => ({
      position: "fixed" as const,
      pointerEvents: "none" as const,
      background: "var(--bg)",
      zIndex: 3,
    }),
    [],
  );

  return (
    <>
      {/* Safe-area cover (iOS notch) */}
      <div
        aria-hidden
        style={{
          ...common,
          top: 0,
          left: 0,
          right: 0,
          height: "var(--safe-top)",
        }}
      />

      {/* Left/right safe-area covers to avoid see-through on iOS bounce/edges */}
      <div
        aria-hidden
        style={{
          ...common,
          top: 0,
          bottom: 0,
          left: 0,
          width: "var(--safe-left)",
        }}
      />
      <div
        aria-hidden
        style={{
          ...common,
          top: 0,
          bottom: 0,
          right: 0,
          width: "var(--safe-right)",
        }}
      />

      {/* Bottom safe-area cover (PWA only) */}
      {isPwa && (
        <div
          aria-hidden
          style={{
            ...common,
            bottom: 0,
            left: 0,
            right: 0,
            height: "var(--safe-bottom)",
          }}
        />
      )}
    </>
  );
}

