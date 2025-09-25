// /components/consent/AutoOpenOnLanding.tsx
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useConsent } from "@/components/consent/ConsentManager";

/**
 * Deschide CookieModal automat pe landing ("/") dacă nu există consimțământ.
 * - force: deschide oricum (utile pentru test)
 * - delay: întârzie deschiderea în ms
 */
export default function AutoOpenOnLanding({
  force = false,
  delay = 0,
}: { force?: boolean; delay?: number }) {
  const { consent, openModal } = useConsent();
  const pathname = usePathname();
  const openedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // 1) Auto-open pe landing dacă nu avem consimțământ (sau dacă e force)
  useEffect(() => {
    const isLanding = pathname === "/" || pathname?.startsWith("/?");
    if (openedRef.current) return;
    if (!isLanding) return;
    if (!force && consent) return;

    openedRef.current = true;
    timerRef.current = window.setTimeout(() => openModal(), Math.max(0, delay));
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [pathname, consent, force, delay, openModal]);

  // 2) Fallback: deschidere la evenimentul global (folosit de OpenCookieSettingsButton)
  useEffect(() => {
    const onOpen = () => openModal();
    window.addEventListener("p4h:open-cookie-settings", onOpen);
    return () => window.removeEventListener("p4h:open-cookie-settings", onOpen);
  }, [openModal]);

  // 3) Sincronizează atributul pt. gating CSS (dacă îl folosești)
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-consent-preferences",
      consent ? String(!!consent.preferences) : "false"
    );
  }, [consent]);

  return null;
}