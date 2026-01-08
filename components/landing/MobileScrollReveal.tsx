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
    }

    root.dataset.p4hLandingReveal = "1";

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      const triggerY = Math.round(vh * 0.85); // fixed point in viewport (85%)
      for (const el of targets) {
        const rect = el.getBoundingClientRect();
        const out = rect.bottom < -16 || rect.top > vh + 16;
        if (out) {
          delete el.dataset.revealIn;
          continue;
        }
        if (rect.top <= triggerY) el.dataset.revealIn = "1";
        else delete el.dataset.revealIn;
      }
    };

    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    // Initial paint
    update();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);

    return () => {
      if (raf) {
        try {
          window.cancelAnimationFrame(raf);
        } catch {
          // ignore
        }
      }
      window.removeEventListener("scroll", schedule as any);
      window.removeEventListener("resize", schedule as any);
      window.removeEventListener("orientationchange", schedule as any);
      delete root.dataset.p4hLandingReveal;
    };
  }, []);

  return null;
}
