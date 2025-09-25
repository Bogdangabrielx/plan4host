// /components/consent/OpenCookieSettingsButton.tsx
"use client";

import { openCookieConsent } from "./openCookieConsent";

export default function OpenCookieSettingsButton({
  children = "Cookie settings",
  className = "",
  id,
}: { children?: React.ReactNode; className?: string; id?: string }) {
  return (
    <button
      type="button"
      id={id}
      aria-haspopup="dialog"
      onClick={() => openCookieConsent()}
      className={className}
    >
      {children}
    </button>
  );
}