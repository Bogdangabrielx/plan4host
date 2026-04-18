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
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    setIsPwa(isPwaMode());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/app")) return;

    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    if (!isAndroid) return;

    function onBeforeInstallPrompt(e: any) {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstall(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    try {
      if (!installPrompt) return;
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch {
      // ignore
    } finally {
      setShowInstall(false);
      setInstallPrompt(null);
    }
  };

  const isRo = typeof window !== "undefined" && window.location.pathname.startsWith("/ro");

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

      {showInstall && installPrompt && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(var(--safe-bottom, 0px) + 16px)",
            right: 16,
            left: 16,
            zIndex: 120,
            maxWidth: 420,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "16px 16px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.65)",
            background: "color-mix(in srgb, var(--card) 80%, #020617 20%)",
            boxShadow: "0 14px 40px rgba(15,23,42,0.6)",
          }}
        >
          <span style={{ fontSize: "var(--fs-s)" }}>
            {isRo ? "Instaleaza" : "Install"} <strong>Plan4Host</strong> {isRo ? "pe telefon" : "on your phone"}
          </span>
          <button
            type="button"
            onClick={handleInstall}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(15,23,42,0.7)",
              background: "linear-gradient(135deg, #0ea5e9, #6366f1, #a855f7)",
              color: "#f9fafb",
              padding: "8px 16px",
              fontSize: "var(--fs-s)",
              fontWeight: "var(--fw-bold)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {isRo ? "Instaleaza aplicatia" : "Install app"}
          </button>
        </div>
      )}
    </>
  );
}
