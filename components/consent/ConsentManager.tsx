"use client";

/**
 * ConsentManager.tsx — v3
 * FIX:
 *  1) Banner se închide imediat după click (pe state), chiar dacă cookie-ul nu se poate seta.
 *  2) Setăm `Domain=` DOAR pentru rădăcina ta reală (plan4host.com). Pentru localhost/vercel/etc NU setăm `Domain`.
 *  3) `Secure` doar pe HTTPS (ca să funcționeze pe localhost).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  PropsWithChildren,
} from "react";

type ConsentState = {
  v: 1;
  essential: true;
  preferences: boolean;
  updatedAt: string;
};

type ConsentContextType = {
  consent: ConsentState | null;
  setPreferences: (value: boolean) => void;
  acceptAll: () => void;
  acceptEssentialOnly: () => void;
  rejectAllNonEssential: () => void;
  save: () => void;
  openModal: () => void;
  closeModal: () => void;
  isModalOpen: boolean;
};

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

const CONSENT_COOKIE = "cookie_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 12 months

/* ───────────────── Cookie helpers ───────────────── */

function readConsentFromCookie(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const part = document.cookie.split("; ").find((r) => r.startsWith(CONSENT_COOKIE + "="));
  if (!part) return null;
  try {
    const value = decodeURIComponent(part.split("=")[1]);
    const parsed = JSON.parse(value);
    if (parsed?.v === 1 && parsed?.essential === true && typeof parsed?.preferences === "boolean") {
      return parsed as ConsentState;
    }
  } catch {}
  return null;
}

/** Returnează domeniul pentru care e sigur să setăm `Domain=`. */
function resolveCookieDomain(hostname: string): string | undefined {
  // Nu setăm Domain pe localhost sau IP
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return undefined;

  // ✅ Permit doar domeniul de brand (plan4host.com) și subdomeniile lui
  const root = "plan4host.com";
  if (hostname === root || hostname.endsWith("." + root)) return "." + root;

  // ❌ NU setăm Domain pe domenii de tip *.vercel.app / staging / etc. Browserul ar ignora oricum cookie-ul.
  return undefined;
}

function writeConsentCookie(consent: ConsentState) {
  if (typeof document === "undefined") return;

  const value = encodeURIComponent(JSON.stringify(consent));
  const isSecure = window.location.protocol === "https:";
  const domain = resolveCookieDomain(window.location.hostname);

  const attrs = [
    `${CONSENT_COOKIE}=${value}`,
    "Path=/",
    `Max-Age=${CONSENT_MAX_AGE}`,
    "SameSite=Lax",
  ];
  if (domain) attrs.push(`Domain=${domain}`);
  if (isSecure) attrs.push("Secure");

  document.cookie = attrs.join("; ");
}

/* ───────────────── Provider ───────────────── */

export function ConsentProvider({ children }: PropsWithChildren) {
  // Init sincron pe client
  const initial = typeof window !== "undefined" ? readConsentFromCookie() : null;

  const [consent, setConsent] = useState<ConsentState | null>(initial);
  const [pendingPrefs, setPendingPrefs] = useState<boolean>(initial?.preferences ?? false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dacă alt cod setează cookie-ul între timp, sincronizăm o singură dată după mount
  useEffect(() => {
    if (consent === null) {
      const current = readConsentFromCookie();
      if (current) {
        setConsent(current);
        setPendingPrefs(current.preferences);
      }
    }
  }, []); // o singură dată

  // Hook global pentru butoanele din pagini cu id #open-cookie-settings
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const btn = t.closest("#open-cookie-settings") || t.closest("#open-cookie-settings-2");
      if (btn) {
        e.preventDefault();
        setIsModalOpen(true);
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  const applyConsent = useCallback((prefs: boolean) => {
    const newConsent: ConsentState = {
      v: 1,
      essential: true,
      preferences: prefs,
      updatedAt: new Date().toISOString(),
    };
    // 1) salvăm cookie (dacă se poate)
    writeConsentCookie(newConsent);
    // 2) actualizăm imediat state-ul ca să se închidă bannerul fără întârziere
    setConsent(newConsent);
    setPendingPrefs(prefs);
    setIsModalOpen(false);
  }, []);

  const acceptAll = useCallback(() => applyConsent(true), [applyConsent]);
  const acceptEssentialOnly = useCallback(() => applyConsent(false), [applyConsent]);
  const rejectAllNonEssential = useCallback(() => applyConsent(false), [applyConsent]);

  const setPreferences = useCallback((v: boolean) => setPendingPrefs(v), []);
  const save = useCallback(() => applyConsent(pendingPrefs), [applyConsent, pendingPrefs]);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const value = useMemo<ConsentContextType>(
    () => ({
      consent,
      setPreferences,
      acceptAll,
      acceptEssentialOnly,
      rejectAllNonEssential,
      save,
      openModal,
      closeModal,
      isModalOpen,
    }),
    [
      consent,
      setPreferences,
      acceptAll,
      acceptEssentialOnly,
      rejectAllNonEssential,
      save,
      openModal,
      closeModal,
      isModalOpen,
    ]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

/* ───────────────── Hook & Gate ───────────────── */

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used within <ConsentProvider>");
  return ctx;
}

export function ConsentGate({
  category,
  children,
  fallback = null,
}: PropsWithChildren<{ category: "essential" | "preferences"; fallback?: React.ReactNode }>) {
  const { consent } = useConsent();
  if (category === "essential") return <>{children}</>;
  if (category === "preferences") return consent?.preferences ? <>{children}</> : <>{fallback}</>;
  return <>{fallback}</>;
}

/* ───────────────── Banner ───────────────── */

export function CookieBanner() {
  const { consent, acceptAll, acceptEssentialOnly, openModal } = useConsent();

  // dacă avem deja consimțământ în state, nu mai afișăm
  if (consent) return null;

  return (
    <div
      data-cookie-banner
      role="region"
      aria-label="Cookie banner"
      className="fixed inset-x-0 bottom-0 px-4 py-3"
      style={{
        zIndex: 10000,
        background: "var(--panel)",
        color: "var(--text)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <p className="text-sm" style={{ color: "var(--text)" }}>
          We use cookies to run essential features and remember your preferences. You can change your
          choices anytime.
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={acceptEssentialOnly}
            className="rounded-xl px-3 py-2 text-sm"
            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Accept essential
          </button>
          <button
            onClick={acceptAll}
            className="rounded-xl px-3 py-2 text-sm"
            style={{ background: "var(--primary)", color: "var(--bg)" }}
          >
            Accept all
          </button>
          <button
            onClick={openModal}
            className="rounded-xl px-3 py-2 text-sm underline"
            style={{ background: "transparent", color: "var(--text)" }}
            aria-haspopup="dialog"
          >
            Manage choices
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Modal ───────────────── */

export function CookieModal() {
  const {
    isModalOpen,
    closeModal,
    setPreferences,
    acceptAll,
    rejectAllNonEssential,
    acceptEssentialOnly,
    save,
    consent,
  } = useConsent();

  if (!isModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-modal-title"
      className="fixed inset-0 z-[11000] flex items-center justify-center px-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={closeModal} />
      {/* Panel */}
      <div
        className="relative w-full max-w-lg rounded-2xl p-6"
        style={{ background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)" }}
      >
        <div className="mb-4">
          <h2 id="cookie-modal-title" className="text-lg font-semibold">
            Cookie settings
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Choose which cookies you want to allow. Essential cookies are always on.
          </p>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <RowToggle label="Essential" description="Required for security, session, and consent." checked disabled />
          <PreferencesToggle defaultValue={!!consent?.preferences} onChange={setPreferences} />
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={rejectAllNonEssential}
            className="rounded-xl px-3 py-2 text-sm"
            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }}
            title="Reject all non-essential cookies"
          >
            Reject all
          </button>
          <button
            onClick={acceptEssentialOnly}
            className="rounded-xl px-3 py-2 text-sm"
            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }}
            title="Only necessary"
          >
            Only necessary
          </button>
          <button
            onClick={acceptAll}
            className="rounded-xl px-3 py-2 text-sm"
            style={{ background: "var(--primary)", color: "var(--bg)" }}
          >
            Accept all
          </button>
          <button
            onClick={save}
            className="rounded-xl px-3 py-2 text-sm"
            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── UI bits ───────────────── */

function RowToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl p-3" style={{ border: "1px solid var(--border)", background: "var(--panel)" }}>
      <div className="pr-3">
        <div className="text-sm font-medium">{label}</div>
        {description ? (
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {description}
          </div>
        ) : null}
      </div>
      <Switch checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}

function PreferencesToggle({
  defaultValue,
  onChange,
}: {
  defaultValue: boolean;
  onChange: (v: boolean) => void;
}) {
  const [local, setLocal] = useState<boolean>(defaultValue);

  useEffect(() => setLocal(defaultValue), [defaultValue]);

  return (
    <RowToggle
      label="Preferences"
      description="Remember your theme (light/dark)."
      checked={local}
      onChange={(v) => {
        setLocal(v);
        onChange(v);
      }}
    />
  );
}

function Switch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onChange?.(!checked)}
      className="relative h-6 w-11 rounded-full transition-all"
      style={{
        background: checked ? "var(--primary)" : "var(--border)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span
        className="absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all"
        style={{
          background: "var(--card)",
          transform: checked ? "translate(22px, -50%)" : "translate(0, -50%)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}
      />
    </button>
      );
     }
      // un buton simplu care deschide modalul nou
     export function OpenCookieSettingsButton(
      props: React.ButtonHTMLAttributes<HTMLButtonElement> 
     ) {
     const { openModal } = useConsent();
     return (
      <button
      type="button"
      aria-haspopup="dialog"
      onClick={(e) => { e.preventDefault(); openModal(); }}
      {...props}
      >
      {props.children ?? "Cookie settings"}
     </button>
     );
      }