"use client";
import { useCallback, useEffect, useState } from "react";
import { useHeader } from "@/app/app/_components/HeaderContext";

type Lang = "en" | "ro";

export default function NotificationsClient() {
  const { setPill } = useHeader();
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [lang, setLang] = useState<Lang>("en");
  const [active, setActive] = useState<boolean>(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [isSmall, setIsSmall] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(max-width: 480px)")?.matches ?? false;
  });
  const [pushCapable, setPushCapable] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  );
  const tr = {
    en: {
      notifications: "Notifications",
      turnOn: "Turn On",
      turnOff: "Turn Off",
      getInstantOne: "Get instant one",
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
    return () => { try { mq?.removeEventListener("change", on); } catch { mq?.removeListener?.(on as any); } };
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

  // Trigger the global loading overlay while this page is busy.
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

  async function waitForActiveRegistration(
    reg: ServiceWorkerRegistration,
    timeoutMs = 5000,
  ): Promise<ServiceWorkerRegistration> {
    if (reg.active) return reg;

    const candidate = reg.installing || reg.waiting;
    if (candidate) {
      const activated = await new Promise<boolean>((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve(false);
          }
        }, timeoutMs);

        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(ok);
        };

        const onStateChange = () => {
          if (candidate.state === "activated") finish(true);
          if (candidate.state === "redundant") finish(false);
        };

        candidate.addEventListener("statechange", onStateChange);
        onStateChange();
      });

      if (activated && reg.active) return reg;
    }

    const readyReg = await withTimeout<ServiceWorkerRegistration | null>(
      navigator.serviceWorker.ready,
      timeoutMs,
      null,
    );

    if (readyReg?.active) return readyReg;
    throw new Error("service_worker_not_active");
  }

  const getCurrentSubscription = useCallback(async (): Promise<PushSubscription | null> => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

    try {
      const direct = await navigator.serviceWorker.getRegistration();
      const directSub = await direct?.pushManager.getSubscription();
      if (directSub) return directSub;
    } catch {}

    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) return sub;
      }
    } catch {}

    try {
      const ready = await withTimeout<ServiceWorkerRegistration | null>(
        navigator.serviceWorker.ready,
        2000,
        null,
      );
      if (ready) return (await ready.pushManager.getSubscription()) || null;
    } catch {}

    return null;
  }, []);

  const refreshActive = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const cap = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
      setPushCapable(cap);
      if (!cap) {
        setActive(false);
        setEndpoint(null);
        setStatus("idle");
        return;
      }
      const sub = await getCurrentSubscription();
      const ep = sub?.endpoint || null;
      setEndpoint(ep);
      try { if (ep) localStorage.setItem('p4h:push:endpoint', ep); } catch {}

      if (ep) {
        // Check DB state for this device endpoint
        const url = `/api/push/status?endpoint=${encodeURIComponent(ep)}`;
        const res = await withTimeout(fetch(url, { method: 'GET' }), 4000, null as Response | null);
        if (!res) {
          setActive(false);
          return;
        }
        const j = await res.json().catch(() => ({}));
        setActive(!!j?.active);
      } else {
        setActive(false);
      }
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [getCurrentSubscription]);

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

  async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        reg = regs[0];
      } catch {}
    }
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js');
    }
    return await waitForActiveRegistration(reg);
  }

  async function subscribeInDB(sub: PushSubscription, ua: string, os: string) {
    const res = await withTimeout(
      fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), ua, os }),
      }),
      6000,
      null as Response | null,
    );
    if (!res) {
      throw new Error("subscribe_timeout");
    }
    if (!res.ok) {
      throw new Error("subscribe_failed");
    }
  }

  async function turnOn() {
    setStatus("loading");
    setLoading(true);
    try {
      if (!pushCapable) {
        setActive(false);
        return;
      }
      if (!('Notification' in window)) return finalize();
      const perm = Notification.permission;
      if (perm !== 'granted') {
        const p = await Notification.requestPermission();
        if (p !== 'granted') return finalize();
      }

      const reg = await getReadyRegistration();

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const keyB64 = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || (window as any).NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').toString();
        const urlBase64ToUint8Array = (base64: string) => {
          const padding = '='.repeat((4 - (base64.length % 4)) % 4);
          const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
          const raw = atob(base64Safe);
          const out = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
          return out;
        };
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(keyB64) });
      }

      // Immediately reflect device state
      setEndpoint(sub.endpoint || null);
      try { if (sub?.endpoint) localStorage.setItem('p4h:push:endpoint', sub.endpoint); } catch {}
      setActive(true);

      const ua = navigator.userAgent || '';
      const os = (document.documentElement.getAttribute('data-os') || '');
      await subscribeInDB(sub, ua, os);
      await refreshActive(false);
    } catch {
      setActive(false);
    } finally {
      finalize();
    }
  }

  async function turnOff() {
    setStatus("loading");
    setLoading(true);
    try {
      if (!pushCapable) {
        return;
      }
      const sub = await getCurrentSubscription();
      let epToRemove: string | null = null;
      if (sub) {
        epToRemove = sub.endpoint || null;
        try { await sub.unsubscribe(); } catch {}
      } else {
        try { epToRemove = localStorage.getItem('p4h:push:endpoint'); } catch {}
      }
      if (epToRemove) {
        try { await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: epToRemove }) }); } catch {}
      }
      try { localStorage.removeItem('p4h:push:endpoint'); } catch {}
      setEndpoint(null);
      // Re-check DB status to be precise
      await refreshActive(false);
    } finally {
      finalize();
    }
  }

  function finalize() {
    setStatus("done");
    setLoading(false);
  }

  async function sendTest() {
    setStatus("loading");
    setLoading(true);
    try {
      if (!pushCapable || !active) return;
      const reg = await getReadyRegistration();
      await reg.showNotification(t.testTitle, {
        body: t.testNotification,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'p4h-test',
        data: { url: '/app/notifications' },
      });
    } finally {
      finalize();
    }
  }

  const onClass = `sb-btn sb-cardglow ${active ? 'sb-btn--primary' : ''}`.trim();
  const offClass = `sb-btn sb-cardglow ${!active ? 'sb-btn--primary' : ''}`.trim();

  return (
    <div style={{ fontFamily: "inherit", color: "var(--text)" }}>
      <div style={{ padding: isSmall ? "10px 12px 16px" : "16px" }}>
        <div className="sb-cardglow" style={{ padding: 16, display: 'grid', gap: 12, borderRadius: 13 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <strong>{t.notifications}</strong>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button
              className={onClass}
              onClick={turnOn}
              disabled={loading}
              style={{ color: 'var(--muted)', border: active ? '1px solid var(--primary)' as const : undefined }}
            >
              {t.turnOn}
            </button>
            <button
              className={offClass}
              onClick={turnOff}
              disabled={loading}
              style={{ color: 'var(--muted)', border: !active ? '1px solid var(--danger)' as const : undefined }}
            >
              {t.turnOff}
            </button>
            {active && (
              <button
                className="sb-btn"
                onClick={sendTest}
                disabled={loading}
                style={{ color: 'var(--muted)', background: "var(--panel)", border: 'var(--muted)' }}
              >
                {t.getInstantOne}
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <small style={{ color:'var(--muted)' }}>
              {status === "loading"
                ? t.loading
                : active
                  ? t.notificationsOn
                  : t.notificationsOff}
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
