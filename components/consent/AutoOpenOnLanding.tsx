"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useConsent } from "@/components/consent/ConsentManager";

/**
 * Deschide CookieModal automat pe landing ("/") dacă nu există consimțământ.
 * Poți forța deschiderea cu `force`, sau întârzia cu `delay` (ms).
 */
export default function AutoOpenOnLanding({
  force = false,
  delay = 0,
}: { force?: boolean; delay?: number }) {
  const { consent, openModal } = useConsent();
  const pathname = usePathname();
  const openedRef = useRef(false);

  useEffect(() => {
    const isLanding = pathname === "/" || pathname?.startsWith("/?");
    if (openedRef.current) return;
    if (!isLanding) return;
    if (!force && consent) return; // avem deja consimțământ -> nu mai deschidem

    openedRef.current = true;
    const t = window.setTimeout(() => openModal(), delay);
    return () => window.clearTimeout(t);
  }, [pathname, consent, force, delay, openModal]);

  return null;
}