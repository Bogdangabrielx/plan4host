// components/landing/MobileScrollReveal.tsx
"use client";

import { useEffect } from "react";

export default function MobileScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (prefersReducedMotion) return;

    const mq = window.matchMedia?.("(max-width: 900px), (hover: none)") ?? null;
    if (!mq?.matches) return;

    const root = document.documentElement;
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-p4h-reveal]")
    );
    if (targets.length === 0) return;

    // Stagger + initial state BEFORE enabling CSS (avoid flash-to-hidden).
    for (let i = 0; i < targets.length; i++) {
      const el = targets[i]!;
      el.style.setProperty("--reveal-delay", `${Math.min(i * 60, 240)}ms`);
      const rect = el.getBoundingClientRect();
      const inView =
        rect.top < window.innerHeight * 0.92 && rect.bottom > window.innerHeight * 0.08;
      if (inView) el.dataset.revealIn = "1";
    }

    root.dataset.p4hLandingReveal = "1";

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.dataset.revealIn = "1";
          io.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -12% 0px" }
    );

    for (const el of targets) {
      if (el.dataset.revealIn === "1") continue;
      io.observe(el);
    }

    return () => {
      try {
        io.disconnect();
      } catch {
        // ignore
      }
      delete root.dataset.p4hLandingReveal;
    };
  }, []);

  return null;
}

