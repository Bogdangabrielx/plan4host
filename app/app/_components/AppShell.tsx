// app/app/_components/AppShell.tsx
"use client";
import React, { useEffect, useState } from "react";
import AppHeader from "../ui/AppHeader";
import BottomNav from "../ui/BottomNav";
import PullToRefresh from "./PullToRefresh";
import { HeaderProvider } from "./HeaderContext";

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
  { id: "property", label: "Add one property" },
  { id: "room", label: "Add one room" },
  { id: "links_contact", label: "Add property links and contact" },
  { id: "picture", label: "Add property picture" },
  { id: "message_template", label: "Add a message template" },
  { id: "house_rules", label: "Add House Rules" },
  { id: "calendars", label: "Sync calendars" },
];

function OnboardingChecklistFab() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [dismissedSteps, setDismissedSteps] = useState<string[]>([]);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

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

  useEffect(() => {
    if (loading) return;
    if (completedAt) return;
    const done = completedSteps.length + dismissedSteps.length;
    if (done >= total && !showCelebration) {
      const nowIso = new Date().toISOString();
      setShowCelebration(true);
      setCompletedAt(nowIso);
      fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_all" }),
      }).catch(() => {});
    }
  }, [completedSteps, dismissedSteps, completedAt, loading, total, showCelebration]);

  const fabStyle: React.CSSProperties = {
    position: "fixed",
    left: 16,
    bottom: "calc(var(--nav-h) + var(--safe-bottom, 0px) + 16px)",
    width: 56,
    height: 56,
    borderRadius: "50%",
    border: "1px solid rgba(15,23,42,0.45)",
    background: "linear-gradient(135deg, #00d1ff, #4f46e5)",
    color: "#f9fafb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 30px rgba(15,23,42,0.5)",
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
    background: "linear-gradient(135deg, #00d1ff, #4f46e5)",
    color: "#f9fafb",
  };

  const bodyStyle: React.CSSProperties = {
    padding: 10,
    background: "var(--panel)",
    overflowY: "auto",
    display: "grid",
    gap: 6,
  };

  // If onboarding is already completed and celebration was dismissed, hide widget.
  if (!loading && completedAt && !showCelebration) {
    return null;
  }

  return (
    <>
      {showCelebration && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 260,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15,23,42,0.55)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              width: "min(360px, 90vw)",
              borderRadius: 16,
              border: "1px solid rgba(148,163,184,0.8)",
              background:
                "radial-gradient(circle at top, rgba(0,209,255,0.12), transparent 55%), var(--panel)",
              boxShadow: "0 20px 45px rgba(15,23,42,0.7)",
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background:
                    "conic-gradient(from 140deg, #22c55e, #3b82f6, #8b5cf6, #22c55e)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 20,
                }}
              >
                🎉
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  Onboarding completed
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Your first property is fully configured. You’re ready to use Plan4Host.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCelebration(false);
              }}
              style={{
                marginTop: 4,
                alignSelf: "flex-end",
                borderRadius: 999,
                border: "1px solid var(--border)",
                padding: "6px 14px",
                background: "var(--panel)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {open && (
        <div style={panelStyle}>
          <div style={headerStyle}>
            <div style={{ display: "grid", gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                Setup checklist
              </span>
              <span style={{ fontSize: 11, opacity: 0.9 }}>
                {completed}/{total} steps completed
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                borderRadius: "999px",
                width: 26,
                height: 26,
                border: "1px solid rgba(15,23,42,0.3)",
                background: "rgba(15,23,42,0.6)",
                color: "#f9fafb",
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
                    fontSize: 11,
                    color: completedSteps.includes(step.id)
                      ? "#22c55e"
                      : "rgba(148,163,184,0.9)",
                  }}
                >
                  {completedSteps.includes(step.id) ? "✓" : "○"}
                </span>
                <span style={{ fontSize: 12 }}>{step.label}</span>
                <button
                  type="button"
                  style={{
                    marginLeft: "auto",
                    border: "none",
                    background: "transparent",
                    color: dismissedSteps.includes(step.id)
                      ? "#ef4444"
                      : "var(--muted)",
                    fontSize: 14,
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
            fontSize: 11,
            lineHeight: 1.2,
          }}
        >
          <span style={{ fontSize: 10, opacity: 0.85 }}>Setup</span>
          <span style={{ fontWeight: 700 }}>
            {completed}/{total}
          </span>
        </div>
      </button>
    </>
  );
}

export default function AppShell({ title, currentPath, children }: Props) {
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
              }
              input, textarea, select, button { font-size: 16px; }
              html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
              @media (max-width: 640px) {
                #app-main { padding-top: calc(64px + var(--safe-top, 0px)) !important; }
              }
            `,
          }}
        />

        <AppHeader currentPath={currentPath} />
        <PullToRefresh />

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
      </div>
    </HeaderProvider>
  );
}
