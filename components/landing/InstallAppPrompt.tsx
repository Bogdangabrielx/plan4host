"use client";

import { useEffect, useMemo, useState } from "react";

type Lang = "en" | "ro";
type PromptKind = "android" | "ios";

function isPwaMode() {
  if (typeof window === "undefined") return false;
  const navAny = navigator as any;
  return (
    navAny?.standalone === true ||
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches)
  );
}

function isIosDevice(ua: string) {
  const navAny = navigator as any;
  return /iPad|iPhone|iPod/i.test(ua) || (navAny?.platform === "MacIntel" && navAny?.maxTouchPoints > 1);
}

function isSafariBrowser(ua: string) {
  return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
}

export default function InstallAppPrompt({ lang }: { lang?: Lang }) {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [kind, setKind] = useState<PromptKind | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isSafari, setIsSafari] = useState(true);

  const isRo = useMemo(() => {
    if (lang) return lang === "ro";
    if (typeof window === "undefined") return false;
    return window.location.pathname.startsWith("/ro");
  }, [lang]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/app")) return;
    if (isPwaMode()) return;

    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isIos = isIosDevice(ua);
    setIsSafari(isSafariBrowser(ua));

    if (isIos) {
      setKind("ios");
      return;
    }

    if (!isAndroid) return;

    function onBeforeInstallPrompt(e: any) {
      e.preventDefault();
      setInstallPrompt(e);
      setKind("android");
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (kind === "ios") {
      setShowInstructions(true);
      return;
    }

    try {
      if (!installPrompt) return;
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch {
      // ignore
    } finally {
      setKind(null);
      setInstallPrompt(null);
    }
  };

  if (!kind || (kind === "android" && !installPrompt)) return null;

  const title = isRo ? "Instaleaza" : "Install";
  const suffix =
    kind === "ios"
      ? isRo
        ? "pe iPhone/iPad"
        : "on your iPhone/iPad"
      : isRo
        ? "pe telefon"
        : "on your phone";

  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: "calc(var(--safe-bottom, 0px) + 16px)",
          right: 16,
          left: 16,
          zIndex: 120,
          maxWidth: 420,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "16px 16px",
          borderRadius: 999,
          border: "1px solid rgba(148,163,184,0.65)",
          background: "color-mix(in srgb, var(--card) 80%, #020617 20%)",
          boxShadow: "0 14px 40px rgba(15,23,42,0.6)",
        }}
      >
        <span style={{ fontSize: "var(--fs-s)" }}>
          {title} <strong>Plan4Host</strong> {suffix}
        </span>
        <button
          type="button"
          onClick={handleInstall}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(15,23,42,0.7)",
            background: "linear-gradient(135deg, #0ea5e9, #6366f1, #a855f7)",
            color: "#f9fafb",
            padding: "8px 16px",
            fontSize: "var(--fs-s)",
            fontWeight: "var(--fw-bold)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {isRo ? "Instaleaza aplicatia" : "Install app"}
        </button>
      </div>

      {showInstructions && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 140,
            display: "grid",
            placeItems: "center",
            padding: "24px 16px",
            background: "rgba(2,6,23,0.62)",
            backdropFilter: "blur(10px)",
          }}
          onClick={() => setShowInstructions(false)}
        >
          <div
            style={{
              width: "min(420px, 100%)",
              borderRadius: 24,
              border: "1px solid rgba(148,163,184,0.45)",
              background: "var(--panel)",
              color: "var(--text)",
              boxShadow: "0 24px 70px rgba(0,0,0,0.42)",
              padding: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div>
                <div style={{ fontSize: "var(--fs-b)", fontWeight: "var(--fw-bold)", marginBottom: 6 }}>
                  {isRo ? "Instaleaza Plan4Host pe iPhone/iPad" : "Install Plan4Host on iPhone/iPad"}
                </div>
                <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)" }}>
                  {isRo
                    ? "iOS nu permite instalarea automata, dar dureaza cateva secunde din Safari."
                    : "iOS does not allow automatic install, but Safari can add it in a few seconds."}
                </div>
              </div>
              <button
                type="button"
                aria-label={isRo ? "Inchide" : "Close"}
                onClick={() => setShowInstructions(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                ×
              </button>
            </div>

            {!isSafari && (
              <div
                style={{
                  marginTop: 16,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid color-mix(in srgb, var(--primary) 38%, var(--border))",
                  background: "color-mix(in srgb, var(--primary) 12%, var(--card))",
                  fontSize: "var(--fs-s)",
                  lineHeight: "var(--lh-s)",
                }}
              >
                {isRo
                  ? "Pentru cel mai sigur rezultat, deschide pagina in Safari mai intai."
                  : "For the most reliable result, open this page in Safari first."}
              </div>
            )}

            <ol
              style={{
                margin: "18px 0 0",
                paddingLeft: 22,
                display: "grid",
                gap: 10,
                color: "var(--text)",
                fontSize: "var(--fs-s)",
                lineHeight: "var(--lh-s)",
              }}
            >
              <li>{isRo ? "Apasa butonul Share din Safari." : "Tap the Share button in Safari."}</li>
              <li>{isRo ? "Alege Add to Home Screen." : "Choose Add to Home Screen."}</li>
              <li>{isRo ? "Apasa Add. Plan4Host va aparea pe ecranul principal." : "Tap Add. Plan4Host will appear on your Home Screen."}</li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
