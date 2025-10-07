"use client";

import { useEffect } from "react";

/**
 * VisibilityManager
 * - Sets `data-page-visible` on <html> ("true" | "false")
 * - Dispatches window events: 'p4h:page-visible' / 'p4h:page-hidden'
 * - No side effects beyond attributes/events; safe to mount globally.
 */
export default function VisibilityManager() {
  useEffect(() => {
    const root = document.documentElement;
    const set = (visible: boolean) => {
      try { root.setAttribute("data-page-visible", String(visible)); } catch {}
      try {
        const ev = new Event(visible ? "p4h:page-visible" : "p4h:page-hidden");
        window.dispatchEvent(ev);
      } catch {}
    };

    const apply = () => set(!document.hidden);
    apply();

    const onVis = () => apply();
    const onShow = () => set(true);   // pageshow (BFCache restore)
    const onHide = () => set(false);  // pagehide (navigate away)

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onShow);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  return null;
}

