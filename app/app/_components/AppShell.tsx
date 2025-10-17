"use client";
import React, { useEffect } from "react";
import AppHeader from "../ui/AppHeader";
import BottomNav from "../ui/BottomNav";
import PullToRefresh from "./PullToRefresh";
import { HeaderProvider } from "./HeaderContext";

type Props = {
  title?: React.ReactNode;
  currentPath?: string;
  children: React.ReactNode;
};

export default function AppShell({ title, currentPath, children }: Props) {
  // (logica existentă rămâne)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let asked = false;
    try { asked = localStorage.getItem("p4h:push:asked") === "1"; } catch {}
    if (asked) return;
    const handler = () => {
      try {
        if (!("Notification" in window)) return;
        Notification.requestPermission().then(async (perm) => {
          try {
            if (perm === "granted") {
              if (!("serviceWorker" in navigator)) return;
              const reg = await navigator.serviceWorker.register("/sw.js");
              const keyB64 = (
                process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
                (window as any).NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
                ""
              ).toString();
              const urlBase64ToUint8Array = (base64: string) => {
                const padding = "=".repeat((4 - (base64.length % 4)) % 4);
                const safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
                const raw = atob(safe);
                const out = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
                return out;
              };
              const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(keyB64),
              });
              const ua = navigator.userAgent || "";
              const os = document.documentElement.getAttribute("data-os") || "";
              let property_id: string | null = null;
              try { property_id = localStorage.getItem("p4h:selectedPropertyId"); } catch {}
              await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscription: sub.toJSON(), property_id, ua, os }),
              });
            }
          } finally {
            if (perm !== "default") { try { localStorage.setItem("p4h:push:asked", "1"); } catch {} }
          }
        });
      } catch {}
    };
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler as any);
      window.removeEventListener("keydown", handler as any);
    };
  }, []);

  useEffect(() => {
    const preventGesture = (e: Event) => { e.preventDefault(); };
    document.addEventListener("gesturestart", preventGesture as EventListener, { passive: false });
    document.addEventListener("gesturechange", preventGesture as EventListener, { passive: false });
    document.addEventListener("gestureend", preventGesture as EventListener, { passive: false });

    let lastTouchEnd = 0;
    const onTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    };
    document.addEventListener("touchend", onTouchEnd as EventListener, { passive: false });

    const onWheel = (e: WheelEvent) => { if ((e as any).ctrlKey) e.preventDefault(); };
    window.addEventListener("wheel", onWheel as EventListener, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventGesture as EventListener);
      document.removeEventListener("gesturechange", preventGesture as EventListener);
      document.removeEventListener("gestureend", preventGesture as EventListener);
      document.removeEventListener("touchend", onTouchEnd as EventListener);
      window.removeEventListener("wheel", onWheel as EventListener);
    };
  }, []);

  // guard rubber-band
  useEffect(() => {
    const main = document.getElementById("app-main");
    if (!main) return;
    const shouldBlock = () => main.scrollHeight <= main.clientHeight + 1;
    const stopIfNoScroll = (e: TouchEvent) => { if (!shouldBlock()) return; e.preventDefault(); };
    document.addEventListener("touchmove", stopIfNoScroll as EventListener, { passive: false });
    return () => { document.removeEventListener("touchmove", stopIfNoScroll as EventListener); };
  }, []);

  return (
    <HeaderProvider initialTitle={title ?? ""}>
      <>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root{
                --app-h: 100dvh;
                --nav-h: 88px;          /* fallback — e rescris dinamic de BottomNav */
                --extra-bottom: 120px;
                --extra-top: 0px;
              }
              @supports (height: 100svh) { :root{ --app-h: 100svh; } }

              input, textarea, select, button { font-size: 16px; }
              html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
              @media (max-width: 640px) {
                #app-main { padding-top: calc(64px + var(--safe-top, 0px) + var(--extra-top)) !important; }
              }
            `,
          }}
        />

        <div
          style={{
            height: "var(--app-h)",
            minHeight: "var(--app-h)",
            display: "grid",
            gridTemplateRows: "auto 1fr",
            background: "var(--bg)",
            color: "var(--text)",
            overflow: "hidden",
            overscrollBehavior: "none",
          }}
        >
          <AppHeader currentPath={currentPath} />
          <PullToRefresh />

          <main
            id="app-main"
            style={{
              padding: 16,
              paddingBottom: "var(--nav-h)",
              maxWidth: 1200,
              margin: "0 auto",
              width: "100%",
              boxSizing: "border-box",

              height: "100%",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehaviorY: "contain",
              overflowAnchor: "auto",

              // să nu coloreze spatele barei
              background: "transparent",
              position: "relative",
              zIndex: 0,

              // iOS PWA compositing fix
              transform: "translateZ(0)",
              WebkitTransform: "translateZ(0)" as any,
              willChange: "transform",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden" as any,
              contain: "layout paint",
            }}
          >
            {children}
            <div aria-hidden="true" style={{ height: "var(--extra-bottom)" }} />
          </main>

          <BottomNav />
        </div>
      </>
    </HeaderProvider>
  );
}