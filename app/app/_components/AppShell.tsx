"use client";
import React, { useEffect, useState } from "react";
import AppHeader from "../ui/AppHeader";
import { HeaderProvider } from "./HeaderContext";

type Props = {
  title?: React.ReactNode;
  currentPath?: string;
  children: React.ReactNode;
};

export default function AppShell({ title, currentPath, children }: Props) {
  // Theme-aware background per-route (calendar full-bleed background)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark") return true;
    if (attr === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    try { m?.addEventListener("change", onChange); } catch { m?.addListener?.(onChange); }
    const root = document.documentElement;
    const ob = new MutationObserver(() => {
      const t = root.getAttribute("data-theme");
      if (t === "dark") setIsDark(true);
      if (t === "light") setIsDark(false);
    });
    ob.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { try { m?.removeEventListener("change", onChange); } catch { m?.removeListener?.(onChange); } ob.disconnect(); };
  }, []);

  const useCalendarBg = currentPath === "/app/calendar";
  const bgSrc = isDark ? "/background_fordark.png" : "/background_forlight.png";
  return (
    <HeaderProvider initialTitle={title ?? ""}>
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          background: "var(--bg)",
          backgroundImage: useCalendarBg ? `url(${bgSrc})` : undefined,
          backgroundSize: useCalendarBg ? "cover" : undefined,
          backgroundPosition: useCalendarBg ? "center" : undefined,
          backgroundRepeat: useCalendarBg ? "no-repeat" : undefined,
          color: "var(--text)",
        }}
      >
        <AppHeader currentPath={currentPath} />
        <main style={{ padding: 16, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          {children}
        </main>
      </div>
    </HeaderProvider>
  );
}
