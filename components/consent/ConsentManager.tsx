"use client";

/**
 * ConsentManager.tsx
 * One-file Cookie Consent: Provider + Banner + Modal + Gate + Utils
 *
 * Categories:
 *  - Essential (always on)
 *  - Preferences (optional: theme `app_theme`)
 *
 * Cookie:
 *  - name: cookie_consent
 *  - value: JSON string { v:1, essential:true, preferences:boolean, updatedAt: ISO }
 *  - retention: 12 months
 *
 * Integration helpers:
 *  - <ConsentProvider> ... <CookieBanner/><CookieModal/> </ConsentProvider>
 *  - <ConsentGate category="preferences"> ... </ConsentGate>
 *  - Trigger modal from anywhere (e.g. Cookie Policy page) with elements having id:
 *      #open-cookie-settings or #open-cookie-settings-2
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  PropsWithChildren,
} from "react";

type ConsentState = {
  essential: true; // always true
  preferences: boolean; // toggle by user
  updatedAt: string; // ISO timestamp
  v: 1;
};

type ConsentContextType = {
  consent: ConsentState | null; // null = undecided (show banner)
  setPreferences: (value: boolean) => void;
  acceptAll: () => void;
  acceptEssentialOnly: () => void;
  rejectAllNonEssential: () => void;
  save: () => void; // persist current toggles
  openModal: () => void;
  closeModal: () => void;
  isModalOpen: boolean;
};

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

const CONSENT_COOKIE = "cookie_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 12 months

// ---- Cookie helpers (client) ----
function getApexDomain(hostname: string): string | undefined {
  // Share cookie between apex and www (e.g. plan4host.com & www.plan4host.com)
  // Avoid domain attr for localhost or IPs
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return undefined;
  const parts = hostname.split(".");
  if (parts.length >= 2) return `.${parts.slice(-2).join(".")}`;
  return undefined;
}

function readConsentFromCookie(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((row) => row.startsWith(CONSENT_COOKIE + "="));
  if (!match) return null;
  try {
    const value = decodeURIComponent(match.split("=")[1]);
    const parsed = JSON.parse(value);
    if (parsed && parsed.v === 1 && parsed.essential === true && typeof parsed.preferences === "boolean") {
      return parsed as ConsentState;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function writeConsentCookie(consent: ConsentState) {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(consent));
  const domain = getApexDomain(window.location.hostname);
  const attrs = [
    `${CONSENT_COOKIE}=${value}`,
    "Path=/",
    `Max-Age=${CONSENT_MAX_AGE}`,
    "SameSite=Lax",
    "Secure",
  ];
  if (domain) attrs.push(`Domain=${domain}`);
  document.cookie = attrs.join("; ");
}

// ---- Provider ----
export function ConsentProvider({ children }: PropsWithChildren) {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [pendingPrefs, setPendingPrefs] = useState<boolean>(false); // modal toggle live state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // On mount: read cookie
  useEffect(() => {
    const existing = readConsentFromCookie();
    if (existing) {
      setConsent(existing);
      setPendingPrefs(existing.preferences);
    } else {
      setConsent(null); // undecided -> show banner
      setPendingPrefs(false); // default off for non-essentials
    }
  }, []);

  // Listen for clicks on "#open-cookie-settings" buttons (Cookie Policy page, footer link, etc.)
  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const match =
        target.closest("#open-cookie-settings") || target.closest("#open-cookie-settings-2");
      if (match) {
        e.preventDefault();
        setIsModalOpen(true);
      }
    };
    document.addEventListener("click", clickHandler, true);
    return () => document.removeEventListener("click", clickHandler, true);
  }, []);

  const acceptAll = useCallback(() => {
    const newConsent: ConsentState = {
      v: 1,
      essential: true,
      preferences: true,
      updatedAt: new Date().toISOString(),
    };
    writeConsentCookie(newConsent);
    setConsent(newConsent);
    setPendingPrefs(true);
    setIsModalOpen(false);
  }, []);

  const acceptEssentialOnly = useCallback(() => {
    const newConsent: ConsentState = {
      v: 1,
      essential: true,
      preferences: false,
      updatedAt: new Date().toISOString(),
    };
    writeConsentCookie(newConsent);
    setConsent(newConsent);
    setPendingPrefs(false);
    setIsModalOpen(false);
  }, []);

  const rejectAllNonEssential = useCallback(() => {
    // same as "Only necessary"
    acceptEssentialOnly();
  }, [acceptEssentialOnly]);

  const setPreferences = useCallback((value: boolean) => {
    setPendingPrefs(value);
  }, []);

  const save = useCallback(() => {
    const base: ConsentState = {
      v: 1,
      essential: true,
      preferences: pendingPrefs,
      updatedAt: new Date().toISOString(),
    };
    writeConsentCookie(base);
    setConsent(base);
    setIsModalOpen(false);
  }, [pendingPrefs]);

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
    [consent, setPreferences, acceptAll, acceptEssentialOnly, rejectAllNonEssential, save, openModal, closeModal, isModalOpen]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

// ---- Hook ----
export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used within <ConsentProvider>");
  return ctx;
}

// ---- Gate (for non-essential stuff like theme preferences, future analytics, etc.) ----
export function ConsentGate({
  category,
  children,
  fallback = null,
}: PropsWithChildren<{ category: "essential" | "preferences"; fallback?: React.ReactNode }>) {
  const { consent } = useConsent();

  if (category === "essential") return <>{children}</>;
  if (category === "preferences") {
    if (consent?.preferences) return <>{children}</>;
    return <>{fallback}</>;
  }
  return <>{fallback}</>;
}

// ---- Banner ----
export function CookieBanner() {
  const { consent, acceptAll, acceptEssentialOnly, openModal } = useConsent();

  if (consent !== null) return null; // already decided -> hide banner

  return (
    <div
      role="region"
      aria-label="Cookie banner"
      className="fixed inset-x-0 bottom-0 z-[1000] px-4 py-3"
      style={{
        background: "var(--panel)",
        color: "var(--text)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <p className="text-sm" style={{ color: "var(--text)" }}>
          We use cookies to run essential features and remember your preferences. You can change
          your choices anytime.
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

// ---- Modal ----
export function CookieModal() {
  const {
    isModalOpen,
    closeModal,
    setPreferences,
    acceptAll,
    rejectAllNonEssential,
    acceptEssentialOnly,
    save,
  } = useConsent();

  if (!isModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-modal-title"
      className="fixed inset-0 z-[1100] flex items-center justify-center px-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={closeModal}
      />
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
          <RowToggle
            label="Essential"
            description="Required for security, session, and consent."
            checked
            disabled
          />
          <PreferencesToggle onChange={setPreferences} />
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

// ---- UI bits ----

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
    <div
      className="flex items-center justify-between rounded-xl p-3"
      style={{ border: "1px solid var(--border)", background: "var(--panel)" }}
    >
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

function PreferencesToggle({ onChange }: { onChange: (v: boolean) => void }) {
  const { consent } = useConsent();
  const [local, setLocal] = useState<boolean>(!!consent?.preferences);

  useEffect(() => {
    setLocal(!!consent?.preferences);
  }, [consent?.preferences]);

  const toggle = () => {
    setLocal((v) => {
      const nv = !v;
      onChange(nv);
      return nv;
    });
  };

  return (
    <RowToggle
      label="Preferences"
      description="Remember your theme (light/dark)."
      checked={local}
      onChange={() => toggle()}
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