// /components/consent/AutoOpenOnLanding.tsx
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { openCookieConsent } from "./openCookieConsent";
import { readConsent } from "./consentStorage";

export default function AutoOpenOnLanding({ delay = 150 }: { delay?: number }) {
  const pathname = usePathname();
  const onceRef = useRef(false);

  useEffect(() => {
    if (onceRef.current) return;
    const isLanding = pathname === "/" || pathname?.startsWith("/?");
    if (!isLanding) return;
    const has = !!readConsent();
    if (has) return;
    onceRef.current = true;
    const t = window.setTimeout(() => openCookieConsent(), delay);
    return () => window.clearTimeout(t);
  }, [pathname, delay]);

  return null;
}