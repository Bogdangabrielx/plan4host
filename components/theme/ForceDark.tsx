"use client";

import { useEffect, useRef } from "react";

export default function ForceDark() {
  const prevRef = useRef<string | null>(null);
  useEffect(() => {
    const el = document.documentElement;
    prevRef.current = el.getAttribute("data-theme");
    el.setAttribute("data-theme", "dark");
    el.dataset.forceDark = "1";
    return () => {
      // Restore previous theme when leaving the page
      if (prevRef.current) el.setAttribute("data-theme", prevRef.current);
      else el.removeAttribute("data-theme");
      delete (el.dataset as any).forceDark;
    };
  }, []);
  return null;
}

