// app/app/_components/AppShell.tsx
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
  // Global one-time push prompt on first user gesture across /app
  useEffect(() => {
    if (typeof window === "undefined") return;
    let asked = false;
    try {
      asked = localStorage.getItem("p4h:push:asked") === "1";
    } catch {}
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
              try {
                property_id = localStorage.getItem("p4h:selectedPropertyId");
              } catch {}

              await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscription: sub.toJSON(), property_id, ua, os }),
              });
            }
          } finally {
            if (perm !== "default") {
              try {
                localStorage.setItem("p4h:push:asked", "1");
              } catch {}
            }
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

  return (
    <HeaderProvider initialTitle={title ?? ""}>
      <div
        // root: nu scroll-ează; doar definește rama dintre header și main
        style={{
          height: "100dvh",
          minHeight: "100dvh",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          background: "var(--bground, var(--bg))",
          color: "var(--text)",
          overflow: "hidden",
        }}
      >
        {/* anti-zoom iOS + padding top doar pe mobil (dacă header e fix) */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root{
                --nav-h: 88px;          /* fallback — e rescris dinamic de BottomNav */
                --scroll-extra: 40px;   /* spațiu suplimentar la finalul zonei scrollabile */
              }
              input, textarea, select, button { font-size: 16px; }
              html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
              @media (max-width: 640px) {
                #app-main { padding-top: calc(64px + var(--safe-top, 0px)) !important; }
              }
            `,
          }}
        />

        <AppHeader currentPath={currentPath} />
        <PullToRefresh />

        {/* singurul container scrollabil */}
        <main
          id="app-main"
          style={{
            position: "relative",
            height: "100%",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorY: "contain",
            overflowAnchor: "auto",

            padding: 16,
            // spațiu real pentru bottom-nav + safe-area + o mică zonă de "respirație"
            paddingBottom:
              "calc(var(--nav-h) + var(--safe-bottom, 0px) + var(--scroll-extra, 40px))",

            // ancorele/scrollIntoView nu vor mai ancora ultimul element chiar la margine
            scrollPaddingBottom: "var(--scroll-extra, 40px)",

            // Lățime maximă: unele pagini au nevoie de canvas mai lat pe desktop
            maxWidth: currentPath === "/app/propertySetup" ? 1400 : 1200,
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
            background: "transparent",
          }}
        >
          {children}

          {/* Spacer suplimentar (fallback la padding). Poți elimina dacă preferi doar padding. */}
          <div
            aria-hidden
            style={{
              height: "calc(var(--safe-bottom, 0px) + var(--scroll-extra, 40px))",
              pointerEvents: "none",
            }}
          />
        </main>

        {/* Stă fix în body (portal), deci nu afectează grid-ul */}
        <BottomNav />
      </div>
    </HeaderProvider>
  );
}
