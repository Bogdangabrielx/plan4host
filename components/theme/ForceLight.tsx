"use client";

import { useEffect, useRef } from "react";

export default function ForceLight() {
  const prevRef = useRef<string | null>(null);
  useEffect(() => {
    const el = document.documentElement;
    prevRef.current = el.getAttribute("data-theme");
    el.setAttribute("data-theme", "light");
    el.dataset.forceLight = "1";
    return () => {
      if (prevRef.current) el.setAttribute("data-theme", prevRef.current);
      else el.removeAttribute("data-theme");
      delete (el.dataset as any).forceLight;
    };
  }, []);
  return null;
}

