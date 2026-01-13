// app/app/_components/AppShell.tsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import AppHeader from "../ui/AppHeader";
import BottomNav from "../ui/BottomNav";
import PullToRefresh from "./PullToRefresh";
import { HeaderProvider } from "./HeaderContext";
import AppLoadingOverlay from "./AppLoadingOverlay";

type Props = {
  title?: React.ReactNode;
  currentPath?: string;
  children: React.ReactNode;
};

type OnboardingStep = {
  id: string;
  label: string;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: "property", label: "Add property" },
  { id: "picture", label: "Add photo" },
  { id: "room", label: "Add room" },
  { id: "calendars", label: "Calendar sync" },
  { id: "links_contact", label: "Links and contact" },
  { id: "house_rules", label: "House rules" },
  { id: "message_template", label: "Message template" },
];

function ActivityTracker() {
  const pathname = usePathname();
  const lastSentAtMsRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem("p4h:lastActivityPingAtMs");
    lastSentAtMsRef.current = saved ? Number(saved) || 0 : 0;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (inFlightRef.current) return;
    const now = Date.now();
    const minIntervalMs = 60_000;
    if (now - lastSentAtMsRef.current < minIntervalMs) return;
    inFlightRef.current = true;
    void fetch("/api/activity/ping", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      keepalive: true,
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) return;
        lastSentAtMsRef.current = now;
        try {
          window.sessionStorage.setItem("p4h:lastActivityPingAtMs", String(now));
        } catch {
          // ignore storage failures
        }
      })
      .catch(() => {})
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [pathname]);

  return null;
}

function OnboardingChecklistFab() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [dismissedSteps, setDismissedSteps] = useState<string[]>([]);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  const total = ONBOARDING_STEPS.length;
  const completed = completedSteps.length + dismissedSteps.length;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/onboarding", { method: "GET" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setCompletedSteps(Array.isArray(data.completed) ? data.completed : []);
        setDismissedSteps(Array.isArray(data.dismissed) ? data.dismissed : []);
        setCompletedAt(data.completedAt || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reîncarcă progresul când alte componente anunță schimbări relevante (ex: adăugare cameră).
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const handler = async () => {
      try {
        const res = await fetch("/api/onboarding", { method: "GET" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setCompletedSteps(Array.isArray(data.completed) ? data.completed : []);
        setDismissedSteps(Array.isArray(data.dismissed) ? data.dismissed : []);
        setCompletedAt(data.completedAt || null);
      } catch {
        // ignore
      }
    };
    window.addEventListener("p4h:onboardingDirty", handler as any);
    return () => {
      cancelled = true;
      window.removeEventListener("p4h:onboardingDirty", handler as any);
    };
  }, []);

  const handleDismissStep = async (stepId: string) => {
    try {
      // optimistic update
      setDismissedSteps((prev) =>
        prev.includes(stepId) ? prev : [...prev, stepId],
      );
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss_step", step_id: stepId }),
      });
    } catch {
      // ignore; next reload will sync
    }
  };

  const handleStepClick = (stepId: string) => {
    if (typeof window === "undefined") return;
    let target = "/app/dashboard";
    let highlight: string | null = null;
    switch (stepId) {
      case "property":
        target = "/app/dashboard"; // Dashboard → New Property card
        break;
      case "room":
        target = "/app/propertySetup?tab=rooms";
        break;
      case "links_contact":
        target = "/app/checkinEditor";
        highlight = "contacts";
        break;
      case "picture":
        target = "/app/checkinEditor";
        highlight = "picture";
        break;
      case "house_rules":
        target = "/app/checkinEditor";
        highlight = "house_rules";
        break;
      case "message_template":
        target = "/app/reservationMessage";
        break;
      case "calendars":
        target = "/app/channels";
        break;
      default:
        target = "/app/dashboard";
    }
    try {
      if (highlight) {
        const url = new URL(target, window.location.origin);
        url.searchParams.set("highlight", highlight);
        window.location.href = url.toString();
      } else {
        window.location.href = target;
      }
    } catch {
      // ignore navigation errors
    }
  };

  useEffect(() => {
    if (loading) return;
    if (completedAt) return;
    const done = completedSteps.length + dismissedSteps.length;
    if (done >= total) {
      const nowIso = new Date().toISOString();
      setCompletedAt(nowIso);
      fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_all" }),
      }).catch(() => {});
    }
  }, [completedSteps, dismissedSteps, completedAt, loading, total]);

  const fabStyle: React.CSSProperties = {
    position: "fixed",
    left: 16,
    bottom: "calc(var(--nav-h) + var(--safe-bottom, 0px) + 16px)",
    width: 56,
    height: 56,
    borderRadius: "50%",
    border: "1px solid rgba(148,163,184,0.45)",
    background: "var(--card)",
    backdropFilter: "blur(14px) saturate(140%)",
    WebkitBackdropFilter: "blur(14px) saturate(140%)",
    color: "#e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 14px 40px rgba(15,23,42,0.6)",
    cursor: "pointer",
    zIndex: 240,
  };

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    left: 16,
    bottom: `calc(var(--nav-h) + var(--safe-bottom, 0px) + 80px)`,
    width: "min(320px, calc(100vw - 32px))",
    maxHeight: "min(420px, calc(100vh - 140px))",
    background: "var(--panel)",
    borderRadius: 16,
    border: "1px solid var(--border)",
    boxShadow: "0 18px 40px rgba(15,23,42,0.55)",
    display: "grid",
    gridTemplateRows: "auto 1fr",
    overflow: "hidden",
    zIndex: 241,
  };

  const headerStyle: React.CSSProperties = {
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    // WhatsApp-style green gradient (always, regardless of theme)
    background: "linear-gradient(135deg, #25D366, #128C7E)",
    color: "#ffffff",
  };

  const bodyStyle: React.CSSProperties = {
    padding: 10,
    background: "var(--panel)",
    overflowY: "auto",
    display: "grid",
    gap: 6,
  };

  // Nu afișăm nimic cât timp încă încărcăm starea, ca să evităm flicker.
  if (loading) {
    return null;
  }

  // Dacă onboarding-ul este deja completat, ascundem complet widget-ul.
  if (completedAt) {
    return null;
  }

  return (
    <>
      {open && (
        <div style={panelStyle}>
	          <div style={headerStyle}>
	            <div style={{ display: "grid", gap: 2 }}>
	              <span style={{ fontSize: "var(--fs-b)", fontWeight: "var(--fw-bold)" }}>
	                Setup
	              </span>
	              <span style={{ fontSize: "var(--fs-s)", opacity: 0.9 }}>
	                {completed}/{total} done
	              </span>
	            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                borderRadius: "999px",
                width: 26,
                height: 26,
                border: "1px solid rgba(255,255,255,0.35)",
                background: "rgba(255,255,255,0.16)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              aria-label="Close checklist"
            >
              ×
            </button>
          </div>
          <div style={bodyStyle}>
            {ONBOARDING_STEPS.map((step) => (
              <div
                key={step.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "rgba(15,23,42,0.02)",
                  cursor: "pointer",
                }}
                onClick={(e) => {
                  const targetEl = e.target as HTMLElement | null;
                  if (targetEl && targetEl.closest("button")) return;
                  handleStepClick(step.id);
                }}
              >
	                <span
	                  aria-hidden
	                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "1px solid rgba(148,163,184,0.9)",
	                    display: "flex",
	                    alignItems: "center",
	                    justifyContent: "center",
	                    fontSize: "var(--fs-s)",
	                    color: completedSteps.includes(step.id)
	                      ? "#22c55e"
	                      : "rgba(148,163,184,0.9)",
	                  }}
	                >
	                  {completedSteps.includes(step.id) ? "✓" : "○"}
	                </span>
	                <span style={{ fontSize: "var(--fs-s)" }}>{step.label}</span>
	                <button
	                  type="button"
	                  style={{
                    marginLeft: "auto",
                    border: "none",
                    background: "transparent",
                    color: dismissedSteps.includes(step.id)
	                      ? "#ef4444"
	                      : "var(--muted)",
	                    fontSize: "var(--fs-b)",
	                    cursor: "pointer",
	                  }}
	                  title="Mark as not needed"
	                  onClick={() => handleDismissStep(step.id)}
	                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        style={fabStyle}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open setup checklist"
      >
	        <div
	          style={{
	            display: "grid",
	            placeItems: "center",
	            textAlign: "center",
	            fontSize: "var(--fs-s)",
	            lineHeight: 1.2,
	          }}
	        >
	          <span
	            style={{
	              fontSize: "var(--fs-s)",
	              opacity: 0.95,
	              backgroundImage:
	                "linear-gradient(135deg, #0ea5e9, #6366f1, #a855f7)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Setup
          </span>
	          <span
	            style={{
	              fontWeight: "var(--fw-bold)",
	              letterSpacing: 0.3,
	              backgroundImage:
	                "linear-gradient(135deg, #0ea5e9, #6366f1, #a855f7)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {completed}/{total}
          </span>
        </div>
      </button>
    </>
  );
}

export default function AppShell({ title, currentPath, children }: Props) {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  // Capture Android PWA install prompt so we can show a custom "Install app" button
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    if (!isAndroid) return;

    function onBeforeInstallPrompt(e: any) {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstall(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  async function handleInstallClick() {
    try {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
    } catch {
      // ignore
    } finally {
      setInstallPrompt(null);
      setShowInstall(false);
    }
  }

  // Global one-time push prompt on first user gesture across /app
  useEffect(() => {
    if (typeof window === "undefined") return;
    let asked = false;
    try {
      asked = localStorage.getItem("p4h:push:asked") === "1";
    } catch {}
    if (asked) return;

    const handler = () => {
      try {
        if (!("Notification" in window)) return;
        Notification.requestPermission().then(async (perm) => {
          try {
            if (perm === "granted") {
              if (!("serviceWorker" in navigator)) return;
              const reg = await navigator.serviceWorker.register("/sw.js");
              const keyB64 = (
                process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
                (window as any).NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
                ""
              ).toString();

              const urlBase64ToUint8Array = (base64: string) => {
                const padding = "=".repeat((4 - (base64.length % 4)) % 4);
                const safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
                const raw = atob(safe);
                const out = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
                return out;
              };

              const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(keyB64),
              });

              const ua = navigator.userAgent || "";
              const os = document.documentElement.getAttribute("data-os") || "";
              let property_id: string | null = null;
              try {
                property_id = localStorage.getItem("p4h:selectedPropertyId");
              } catch {}

              await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscription: sub.toJSON(), property_id, ua, os }),
              });
            }
          } finally {
            if (perm !== "default") {
              try {
                localStorage.setItem("p4h:push:asked", "1");
              } catch {}
            }
          }
        });
      } catch {}
    };

    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler as any);
      window.removeEventListener("keydown", handler as any);
    };
  }, []);

  return (
    <HeaderProvider initialTitle={title ?? ""}>
      <ActivityTracker />
		      <div
		        // root: nu scroll-ează; doar definește rama dintre header și main
		        style={{
		          height: "100dvh",
	          minHeight: "100dvh",
	          display: "grid",
	          gridTemplateRows: "auto 1fr",
	          background: "var(--bground)",
	          color: "var(--text)",
	          overflow: "hidden",
	        }}
	      >
	        {/* anti-zoom iOS + padding top doar pe mobil (dacă header e fix) */}
	        <style
	          dangerouslySetInnerHTML={{
	            __html: `
	              :root{
	                --nav-h: 88px;          /* fallback — e rescris dinamic de BottomNav */
	                --scroll-extra: 40px;   /* spațiu suplimentar la finalul zonei scrollabile */
	                --p4h-fixed-header-h: 0px;
	              }
	              input, textarea, select { font-size: 16px; }
		              html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
		              @media (max-width: 480px) {
		                :root { --p4h-fixed-header-h: var(--app-header-h, 64px); }
		                #app-main { padding-top: calc(var(--app-header-h, 64px) + var(--safe-top, 0px)) !important; }
		              }
		            `,
		          }}
		        />

        <AppHeader currentPath={currentPath} />
        <PullToRefresh />
        <AppLoadingOverlay />

        {/* singurul container scrollabil */}
        <main
          id="app-main"
          style={{
            position: "relative",
            height: "100%",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorY: "contain",
            overflowAnchor: "auto",

            padding: 16,
            // spațiu real pentru bottom-nav + safe-area + o mică zonă de "respirație"
            paddingBottom:
              "calc(var(--nav-h) + var(--safe-bottom, 0px) + var(--scroll-extra, 40px))",

            // ancorele/scrollIntoView nu vor mai ancora ultimul element chiar la margine
            scrollPaddingBottom: "var(--scroll-extra, 40px)",

            // Lățime maximă: unele pagini au nevoie de canvas mai lat pe desktop
            maxWidth: currentPath === "/app/propertySetup" ? 1400 : 1200,
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
            background: "transparent",
          }}
        >
          {children}

          {/* Spacer suplimentar (fallback la padding). Poți elimina dacă preferi doar padding. */}
          <div
            aria-hidden
            style={{
              height: "calc(var(--safe-bottom, 0px) + var(--scroll-extra, 40px))",
              pointerEvents: "none",
            }}
          />
        </main>

        {/* Stă fix în body (portal), deci nu afectează grid-ul */}
        <BottomNav />

        {/* Onboarding checklist – vizibil în toate paginile din /app */}
        <OnboardingChecklistFab />

        {/* Android-only PWA install button (appears when browser fires beforeinstallprompt) */}
        {showInstall && (
          <button
            type="button"
            onClick={handleInstallClick}
            style={{
              position: "fixed",
              right: 16,
              bottom: "calc(var(--nav-h) + var(--safe-bottom, 0px) + 16px)",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.6)",
              background:
                "linear-gradient(135deg, #0ea5e9, #6366f1, #a855f7)",
	              color: "#f9fafb",
	              padding: "8px 14px",
	              fontSize: "var(--fs-s)",
	              fontWeight: "var(--fw-bold)",
	              boxShadow: "0 14px 40px rgba(15,23,42,0.6)",
	              cursor: "pointer",
	              zIndex: 245,
	            }}
          >
            Install Plan4Host app
          </button>
        )}
      </div>
    </HeaderProvider>
  );
}
