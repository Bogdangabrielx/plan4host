"use client";

import { useEffect } from "react";

function scrollToHash() {
  try {
    const hash = window.location.hash || "";
    const id = hash.replace(/^#/, "");
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  } catch {
    // ignore
  }
}

export default function HashScroll() {
  useEffect(() => {
    const run = () => scrollToHash();
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(run);
      return raf2;
    });

    window.addEventListener("hashchange", run);
    return () => {
      try {
        cancelAnimationFrame(raf1);
      } catch {}
      window.removeEventListener("hashchange", run);
    };
  }, []);

  return null;
}
