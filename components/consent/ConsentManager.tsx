"use client";

/**
 * ConsentManager.tsx — essential + preferences (theme)
 * - Cookie: cookie_consent (12 months)
 * - Domain only for plan4host.com (and subdomains)
 * - Secure only on HTTPS (works on localhost too)
 * - HTML data flag for CSS gating: data-consent-preferences="true|false"
 * - Global click handler for #open-cookie-settings
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

/* ── Types ───────────────────────────────────────────────────────────── */

type ConsentState = {
  v: 1;
  essential: true;
  preferences: boolean;       // theme remember
  updatedAt: string;          // ISO
};

type ConsentContextType = {
  consent: ConsentState | null;
  setPreferences: (value: boolean) => void;
  acceptAll: () => void;                // essential + preferences = true
  acceptEssentialOnly: () => void;      // essential + preferences = false
  rejectAllNonEssential: () => void;    // alias -> preferences = false
  save: () => void;                     // persist pending prefs
  openModal: () => void;
  closeModal: () => void;
  isModalOpen: boolean;
};

/* ── Constants ───────────────────────────────────────────────────────── */

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

const CONSENT_COOKIE = "cookie_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 12 months
const SCHEMA_VERSION = 1;

/* ── Cookie helpers ──────────────────────────────────────────────────── */

function readConsentFromCookie(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const part = document.cookie.split("; ").find((r) => r.startsWith(CONSENT_COOKIE + "="));
  if (!part) return null;
  try {
    const raw = decodeURIComponent(part.split("=")[1]);
    const parsed = JSON.parse(raw);
    if (
      parsed?.v === SCHEMA_VERSION &&
      parsed?.essential === true &&
      typeof parsed?.preferences === "boolean"
    ) {
      return parsed as ConsentState;
    }
  } catch {}
  return null;
}

/** Safe Domain= only for plan4host.com and its subdomains. */
function resolveCookieDomain(hostname: string): string | undefined {
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return undefined;
  const root = "plan4host.com";
  if (hostname === root || hostname.endsWith("." + root)) return "." + root;
  return undefined; // e.g. *.vercel.app -> no Domain attribute
}

function writeConsentCookie(consent: ConsentState) {
  if (typeof document === "undefined") return;

  const value = encodeURIComponent(JSON.stringify(consent));
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  const domain = typeof window !== "undefined" ? resolveCookieDomain(window.location.hostname) : undefined;

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

/** Reflectă consimțământul în atributul HTML pentru CSS/script-gating. */
function setHtmlConsentAttr(prefs: boolean) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-consent-preferences", String(!!prefs));
  }
}

/* ── Provider ────────────────────────────────────────────────────────── */

export function ConsentProvider({ children }: PropsWithChildren) {
  // Init sync (client-only)
  const initial = typeof window !== "undefined" ? readConsentFromCookie() : null;

  const [consent, setConsent] = useState<ConsentState | null>(initial);
  const [pendingPrefs, setPendingPrefs] = useState<boolean>(initial?.preferences ?? false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Reflect cookie on first mount if present
  useEffect(() => {
    if (consent === null) {
      const current = readConsentFromCookie();
      if (current) {
        setConsent(current);
        setPendingPrefs(current.preferences);
        setHtmlConsentAttr(current.preferences);
      } else {
        // no consent yet
        setHtmlConsentAttr(false);
      }
    } else {
      setHtmlConsentAttr(consent.preferences);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global click handler for #open-cookie-settings
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const btn = t.closest("#open-cookie-settings") || t.closest('[data-open-cookie-settings="true"]');
      if (btn) {
        e.preventDefault();
        setIsModalOpen(true);
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  // Body scroll lock when modal is open
  useEffect(() => {
    if (!isModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isModalOpen]);

  // Core persister
  const applyConsent = useCallback((prefs: boolean) => {
    const newConsent: ConsentState = {
      v: SCHEMA_VERSION,
      essential: true,
      preferences: prefs,
      updatedAt: new Date().toISOString(),
    };
    // 1) try write cookie
    writeConsentCookie(newConsent);
    // 2) update UI immediately
    setConsent(newConsent);
    setPendingPrefs(prefs);
    setHtmlConsentAttr(prefs);
    setIsModalOpen(false);
    // 3) broadcast (optional)
    try {
      window.dispatchEvent(new CustomEvent("p4h:consent:changed", { detail: newConsent }));
    } catch {}
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

/* ── Hook & Gate ─────────────────────────────────────────────────────── */

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

/* ── Banner (opțional – afișează-l doar dacă îl montezi tu) ─────────── */

export function CookieBanner() {
  const { consent, acceptAll, acceptEssentialOnly, openModal } = useConsent();
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
          We use cookies to run essential features and remember your preferences.
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

/* ── Modal (modern, mic) — montează-l în layout ca <CookieModal/> ───── */

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
    <div className="p4h-cookie-modal">
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
          className="relative w-full max-w-lg rounded-2xl p-6 modalCard"
          style={{ background: "var(--panel)", color: "var(--text)", border: "1px solid var(--border)" }}
          role="document"
        >
          {/* Header (accent, compat cu landing card style) */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "center", marginBottom: 8 }}>
            <div
              aria-hidden
              style={{
                width: 44, height: 44, borderRadius: 12,
                display: "grid", placeItems: "center",
                background:
                  "radial-gradient(60% 60% at 30% 20%, rgba(255,255,255,.12), transparent), color-mix(in srgb, var(--primary) 16%, var(--card))",
                boxShadow: "0 8px 24px rgba(0,0,0,.30), inset 0 0 0 1px color-mix(in srgb, var(--border) 60%, transparent)",
              }}
            >
              🍪
            </div>
            <div>
              <h2 id="cookie-modal-title" style={{ margin: 0 }}>Cookie settings</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)", margin: "6px 0 0" }}>
                Essential cookies are always on. You can allow preferences to remember your theme.
              </p>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3" style={{ display: "grid", gap: 8 }}>
            <RowToggle label="Essential" description="Required for security, session, and consent." checked disabled />
            <PreferencesToggle defaultValue={!!consent?.preferences} onChange={setPreferences} />
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2" style={{ marginTop: 12 }}>
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
              className="rounded-xl px-3 py-2 text-sm sb-btn--primary"
              style={{ background: "var(--primary)", color: "#0c111b", borderRadius: 12, fontWeight: 900 }}
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
    </div>
  );
}

/* ── Small UI bits ───────────────────────────────────────────────────── */

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
      style={{ border: "1px solid var(--border)", background: "var(--card)" }}
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
          background: "var(--panel)",
          transform: checked ? "translate(22px, -50%)" : "translate(0, -50%)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

/* ── Public helper: button care deschide modalul nou ─────────────────── */

export function OpenCookieSettingsButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const { openModal } = useConsent();
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={(e) => {
        props.onClick?.(e);
        if (!e.defaultPrevented) openModal();
      }}
      {...props}
    >
      {props.children ?? "Cookie settings"}
    </button>
  );
}