"use client";

import { useConsent } from "@/components/consent/ConsentManager";

export default function OpenCookieSettingsButton({
  className,
  children = "Cookie settings",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { openModal } = useConsent();
  return (
    <button
      type="button"
      id="open-cookie-settings"
      className={className}
      aria-haspopup="dialog"
      onClick={openModal}
    >
      {children}
    </button>
  );
}