// /components/consent/openCookieConsent.ts
export function openCookieConsent() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("p4h:open-consent"));
}

export function closeCookieConsent() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("p4h:close-consent"));
}