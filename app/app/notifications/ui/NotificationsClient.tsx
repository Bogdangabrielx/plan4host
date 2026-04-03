"use client";
import { useCallback, useEffect, useState } from "react";
import { useHeader } from "@/app/app/_components/HeaderContext";
import {
  ensurePushSubscription,
  getCurrentPushSubscription,
  isPushCapable,
  syncPushSubscriptionToServer,
} from "@/lib/push/client";

type Lang = "en" | "ro";
type Property = { id: string; name: string };

export default function NotificationsClient({ properties }: { properties: Property[] }) {
  const { setPill } = useHeader();
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [lang, setLang] = useState<Lang>("en");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [activePropertyIds, setActivePropertyIds] = useState<string[]>([]);
  const [isSmall, setIsSmall] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(max-width: 480px)")?.matches ?? false;
  });
  const [pushCapable, setPushCapable] = useState<boolean>(isPushCapable());

  const tr = {
    en: {
      notifications: "Notifications",
      notificationsFor: "Notifications for",
      turnOn: "Turn On",
      turnOff: "Turn Off",
      noProperty: "No property available.",
      loading: "Loading...",
      notificationsOn: "Your notifications are currently ON.",
      notificationsOff: "Your notifications are currently OFF.",
    },
    ro: {
      notifications: "Notificari",
      notificationsFor: "Notificari pentru",
      turnOn: "Activeaza",
      turnOff: "Dezactiveaza",
      noProperty: "Nu exista proprietati disponibile.",
      loading: "Se incarca...",
      notificationsOn: "Notificarile tale sunt in prezent ACTIVE.",
      notificationsOff: "Notificarile tale sunt in prezent OPRITE.",
    },
  } as const;
  const t = tr[lang];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(max-width: 480px)");
    const on = (e: MediaQueryListEvent) => setIsSmall(e.matches);
    try { mq?.addEventListener("change", on); } catch { mq?.addListener?.(on as any); }
    setIsSmall(mq?.matches ?? false);
    return () => {
      try { mq?.removeEventListener("change", on); } catch { mq?.removeListener?.(on as any); }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const readLang = (): Lang => {
      try {
        const ls = localStorage.getItem("app_lang");
        if (ls === "ro" || ls === "en") return ls;
      } catch {}
      try {
        const ck = document.cookie
          .split("; ")
          .find((x) => x.startsWith("app_lang="))
          ?.split("=")[1];
        if (ck === "ro" || ck === "en") return ck;
      } catch {}
      return "en";
    };
    setLang(readLang());
    const onStorage = () => setLang(readLang());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setPill(loading ? "Loading…" : null);
    return () => setPill(null);
  }, [loading, setPill]);

  function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(fallback);
        }
      }, ms);

      promise
        .then((value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(value);
        })
        .catch(() => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        });
    });
  }

  const refreshActive = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const cap = isPushCapable();
      setPushCapable(cap);
      if (!cap) {
        setEndpoint(null);
        setActivePropertyIds([]);
        setStatus("idle");
        return;
      }

      const sub = await getCurrentPushSubscription();
      const ep = sub?.endpoint || null;
      setEndpoint(ep);
      try {
        if (ep) localStorage.setItem("p4h:push:endpoint", ep);
      } catch {}

      if (!ep) {
        setActivePropertyIds([]);
        return;
      }

      const url = `/api/push/status?endpoint=${encodeURIComponent(ep)}`;
      const res = await withTimeout(fetch(url, { method: "GET" }), 4000, null as Response | null);
      if (!res) {
        setActivePropertyIds([]);
        return;
      }

      const j = await res.json().catch(() => ({}));
      setActivePropertyIds(
        Array.isArray(j?.property_ids)
          ? j.property_ids.filter((value: unknown): value is string => typeof value === "string")
          : [],
      );
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshActive(false).catch(() => {});
  }, [refreshActive]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFocus = () => { refreshActive(false).catch(() => {}); };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshActive(false).catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshActive]);

  async function turnOnForProperty(propertyId: string) {
    setStatus("loading");
    setLoading(true);
    try {
      if (!pushCapable) {
        setActivePropertyIds([]);
        return;
      }
      if (!("Notification" in window)) return finalize();
      const perm = Notification.permission;
      if (perm !== "granted") {
        const p = await Notification.requestPermission();
        if (p !== "granted") return finalize();
      }

      const sub = await ensurePushSubscription();
      setEndpoint(sub.endpoint || null);
      try {
        if (sub?.endpoint) localStorage.setItem("p4h:push:endpoint", sub.endpoint);
      } catch {}

      await syncPushSubscriptionToServer(sub, { propertyId });
      await refreshActive(false);
    } catch (error) {
      console.error("[push] turnOn failed", error);
      setActivePropertyIds([]);
    } finally {
      finalize();
    }
  }

  async function turnOffForProperty(propertyId: string) {
    setStatus("loading");
    setLoading(true);
    try {
      if (!endpoint) return;
      try {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint, property_id: propertyId }),
        });
      } catch (error) {
        console.error("[push] turnOff unsubscribe failed", error);
      }
      await refreshActive(false);
    } finally {
      finalize();
    }
  }

  function finalize() {
    setStatus("done");
    setLoading(false);
  }

  function renderNotifIcon(src: string, isCurrent: boolean) {
    return (
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          display: "inline-block",
          flex: "0 0 18px",
          backgroundColor: isCurrent ? "var(--primary)" : "var(--muted)",
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
      />
    );
  }

  function buttonTone(isCurrent: boolean) {
    return {
      color: isCurrent ? "var(--primary)" : "var(--muted)",
      border: `1px solid ${isCurrent ? "color-mix(in srgb, var(--primary) 42%, var(--border))" : "var(--border)"}`,
      background: "var(--panel)",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    } as const;
  }

  return (
    <div style={{ fontFamily: "inherit", color: "var(--text)" }}>
      <div style={{ padding: isSmall ? "10px 12px 16px" : "16px" }}>
        {properties.length === 0 && (
          <div
            className="sb-cardglow"
            style={{
              padding: 16,
              display: "grid",
              gap: 8,
              borderRadius: 13,
            }}
          >
            <strong>{t.notifications}</strong>
            <small style={{ color: "var(--muted)" }}>{t.noProperty}</small>
          </div>
        )}

        {properties.map((property) => {
          const propertyActive = activePropertyIds.includes(property.id);
          const onLabel = propertyActive ? "On" : t.turnOn;
          const offLabel = !propertyActive ? "Off" : t.turnOff;

          return (
            <div
              key={property.id}
              className="sb-cardglow"
              style={{
                marginTop: 14,
                padding: 16,
                display: "grid",
                gap: 14,
                borderRadius: 13,
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <strong>{t.notificationsFor}</strong>
                <div
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    fontWeight: 800,
                    fontSize: isSmall ? 16 : 18,
                  }}
                >
                  {property.name}
                </div>
                <small style={{ color: "var(--muted)" }}>
                  {status === "loading"
                    ? t.loading
                    : propertyActive
                      ? t.notificationsOn
                      : t.notificationsOff}
                </small>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="sb-btn sb-cardglow"
                  onClick={() => void turnOnForProperty(property.id)}
                  disabled={loading}
                  style={buttonTone(propertyActive)}
                >
                  {renderNotifIcon("/svg_notifications_page.svg", propertyActive)}
                  <span>{onLabel}</span>
                </button>
                <button
                  className="sb-btn sb-cardglow"
                  onClick={() => void turnOffForProperty(property.id)}
                  disabled={loading || !propertyActive}
                  style={buttonTone(!propertyActive)}
                >
                  {renderNotifIcon("/svg_notifications_off_page.svg", !propertyActive)}
                  <span>{offLabel}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
