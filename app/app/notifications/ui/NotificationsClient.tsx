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
  const [pickerMode, setPickerMode] = useState<"on" | "off" | null>(null);
  const [isSmall, setIsSmall] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(max-width: 480px)")?.matches ?? false;
  });
  const [pushCapable, setPushCapable] = useState<boolean>(isPushCapable());

  const tr = {
    en: {
      notifications: "Notifications",
      turnOn: "Turn On",
      turnOff: "Turn Off",
      getInstantOne: "Get instant one",
      chooseProperty: "Choose property",
      choosePropertyHint: "Select the property for this device.",
      choosePropertyOffHint: "Select the property you want to disable.",
      noProperty: "No property available.",
      activeFor: "Active for",
      loading: "Loading...",
      notificationsOn: "Your notifications are currently ON.",
      notificationsOff: "Your notifications are currently OFF.",
      testTitle: "Plan4Host",
      testNotification: "This is a test notification.",
    },
    ro: {
      notifications: "Notificari",
      turnOn: "Activeaza",
      turnOff: "Dezactiveaza",
      getInstantOne: "Trimite una instant",
      chooseProperty: "Alege proprietatea",
      choosePropertyHint: "Selecteaza proprietatea pentru acest device.",
      choosePropertyOffHint: "Selecteaza proprietatea pentru care opresti notificarile.",
      noProperty: "Nu exista proprietati disponibile.",
      activeFor: "Active pentru",
      loading: "Se incarca...",
      notificationsOn: "Notificarile tale sunt in prezent ACTIVE.",
      notificationsOff: "Notificarile tale sunt in prezent OPRITE.",
      testTitle: "Plan4Host",
      testNotification: "Aceasta este o notificare de test.",
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
    setPickerMode(null);
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

  function turnOn() {
    const inactiveProperties = properties.filter((property) => !activePropertyIds.includes(property.id));
    if (inactiveProperties.length === 0) {
      console.error("[push] no property available for subscription");
      return;
    }
    if (inactiveProperties.length === 1) {
      void turnOnForProperty(inactiveProperties[0].id);
      return;
    }
    setPickerMode("on");
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
      setPickerMode(null);
      await refreshActive(false);
    } finally {
      finalize();
    }
  }

  function turnOff() {
    if (activePropertyIds.length === 0) return;
    if (activePropertyIds.length === 1) {
      void turnOffForProperty(activePropertyIds[0]);
      return;
    }
    setPickerMode("off");
  }

  function finalize() {
    setStatus("done");
    setLoading(false);
  }

  async function sendTest() {
    setStatus("loading");
    setLoading(true);
    try {
      if (!pushCapable || activePropertyIds.length === 0) return;
      const reg = await navigator.serviceWorker.ready;
      const testPropertyId = activePropertyIds[0] || null;
      await reg.showNotification(t.testTitle, {
        body: t.testNotification,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "p4h-test",
        data: { url: testPropertyId ? `/app/guest?property=${encodeURIComponent(testPropertyId)}` : "/app/notifications" },
      });
    } finally {
      finalize();
    }
  }

  const active = activePropertyIds.length > 0;
  const activeProperties = properties.filter((property) => activePropertyIds.includes(property.id));
  const pickerProperties = pickerMode === "on"
    ? properties.filter((property) => !activePropertyIds.includes(property.id))
    : activeProperties;
  const onActive = active;
  const offActive = !active;
  const onLabel = onActive ? "On" : t.turnOn;
  const offLabel = offActive ? "Off" : t.turnOff;

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
        <div className="sb-cardglow" style={{ padding: 16, display: "grid", gap: 12, borderRadius: 13 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <strong>{t.notifications}</strong>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="sb-btn sb-cardglow"
              onClick={turnOn}
              disabled={loading}
              style={buttonTone(onActive)}
            >
              {renderNotifIcon("/svg_notifications_page.svg", onActive)}
              <span>{onLabel}</span>
            </button>
            <button
              className="sb-btn sb-cardglow"
              onClick={turnOff}
              disabled={loading || activePropertyIds.length === 0}
              style={buttonTone(offActive)}
            >
              {renderNotifIcon("/svg_notifications_off_page.svg", offActive)}
              <span>{offLabel}</span>
            </button>
            {active && (
              <button
                className="sb-btn"
                onClick={sendTest}
                disabled={loading}
                style={{ color: "var(--muted)", background: "var(--panel)", border: "var(--muted)" }}
              >
                {t.getInstantOne}
              </button>
            )}
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            <small style={{ color: "var(--muted)" }}>
              {status === "loading"
                ? t.loading
                : active
                  ? t.notificationsOn
                  : t.notificationsOff}
            </small>
          </div>
        </div>

        {activeProperties.map((property) => (
          <div
            key={property.id}
            className="sb-cardglow"
            style={{
              marginTop: 14,
              padding: isSmall ? 16 : 18,
              borderRadius: 18,
              border: "1px solid color-mix(in srgb, var(--primary) 28%, var(--border))",
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--primary) 14%, var(--panel)) 0%, color-mix(in srgb, var(--primary) 8%, var(--card)) 100%)",
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--muted)",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.22em",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 16,
                    height: 16,
                    display: "inline-block",
                    flex: "0 0 16px",
                    backgroundColor: "var(--primary)",
                    WebkitMaskImage: "url(/svg_notifications_page.svg)",
                    maskImage: "url(/svg_notifications_page.svg)",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                  }}
                />
                <span>{t.activeFor}</span>
              </div>
              <strong style={{ fontSize: isSmall ? 18 : 20, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                {property.name}
              </strong>
            </div>
          </div>
        ))}

        {pickerMode && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.chooseProperty}
            onClick={() => !loading && setPickerMode(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 240,
              background: "color-mix(in srgb, var(--bg) 62%, transparent)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              display: "grid",
              placeItems: "center",
              padding: 16,
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="sb-cardglow"
              style={{
                width: "min(460px, 100%)",
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: 18,
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <strong>{t.chooseProperty}</strong>
                <small style={{ color: "var(--muted)" }}>
                  {pickerMode === "on" ? t.choosePropertyHint : t.choosePropertyOffHint}
                </small>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {pickerProperties.length === 0 && (
                  <div style={{ color: "var(--muted)" }}>{t.noProperty}</div>
                )}
                {pickerProperties.map((property) => (
                  <button
                    key={property.id}
                    className="sb-btn sb-cardglow"
                    disabled={loading}
                    onClick={() =>
                      pickerMode === "on"
                        ? void turnOnForProperty(property.id)
                        : void turnOffForProperty(property.id)
                    }
                    style={{
                      width: "100%",
                      minHeight: 48,
                      justifyContent: "space-between",
                      background: "var(--card)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 800 }}>
                      {property.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
