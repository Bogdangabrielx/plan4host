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
              const keyB64 =
                (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
                  (window as any).NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
                  ""
                ).toString();

              const urlBase64ToUint8Array = (base64: string) => {
                const padding = "=".repeat((4 - (base64.length % 4)) % 4);
                const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
                const rawData = atob(base64Safe);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
                return outputArray;
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
        // NOTE: keep root clean — no transform/filter/perspective here
        style={{
          minHeight: "100dvh",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          background: "var(--bg)",
          color: "var(--text)",
        }}
      >
        {/* Global anti-zoom for inputs (iOS), once for all pages under AppShell */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
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
        <main
          id="app-main"
          style={{
            padding: 16,
            // leave space for the fixed bottom nav on mobile
            paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
            maxWidth: 1200,
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {children}
        </main>

        {/* Rendered via portal into document.body, stays fixed regardless of ancestors */}
        <BottomNav />
      </div>
    </HeaderProvider>
  );
}