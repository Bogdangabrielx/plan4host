"use client";
import { useEffect, useState } from "react";
import { useHeader } from "@/app/app/_components/HeaderContext";

type Lang = "en" | "ro";

export default function NotificationsClient() {
  const { setPill } = useHeader();
  const [loading, setLoading] = useState<boolean>(true);
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
  const [fallbackActive, setFallbackActive] = useState<boolean>(false);
  const [fallbackFeed, setFallbackFeed] = useState<Array<{ ts: string; text: string }>>([]);
  const tr = {
    en: {
      notifications: "Notifications",
      pushNotSupported:
        "Push API not supported in this browser. You can enable an in-app fallback that only works while this tab is open.",
      turnOn: "Turn On",
      turnOff: "Turn Off",
      getInstantOne: "Get instant one",
      loading: "Loading...",
      fallbackOnly: "Fallback: in-app only while this tab is open",
      fallbackActive: "Fallback active: in-app only while this tab is open.",
      notificationsOn: "Your notifications are currently ON.",
      notificationsOff: "Your notifications are currently OFF.",
      fallbackListTitle: "In-app notifications (only while this tab is open):",
      testNotification: "Test notification (in-app only while open)",
    },
    ro: {
      notifications: "Notificari",
      pushNotSupported:
        "Push API nu este suportat in acest browser. Poti activa un fallback in aplicatie care functioneaza doar cat timp acest tab este deschis.",
      turnOn: "Activeaza",
      turnOff: "Dezactiveaza",
      getInstantOne: "Trimite una instant",
      loading: "Se incarca...",
      fallbackOnly: "Fallback: doar in aplicatie cat timp acest tab este deschis",
      fallbackActive: "Fallback activ: doar in aplicatie cat timp acest tab este deschis.",
      notificationsOn: "Notificarile tale sunt in prezent ACTIVE.",
      notificationsOff: "Notificarile tale sunt in prezent OPRITE.",
      fallbackListTitle: "Notificari in aplicatie (doar cat timp acest tab este deschis):",
      testNotification: "Notificare test (doar in aplicatie cat timp este deschis)",
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

  useEffect(() => {
    refreshActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger the global loading overlay while this page is busy.
  useEffect(() => {
    setPill(loading ? "Loading…" : null);
    return () => setPill(null);
  }, [loading, setPill]);

  async function refreshActive() {
    setLoading(true);
    try {
      const cap = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
      setPushCapable(cap);
      if (!cap) {
        setActive(false);
        setEndpoint(null);
        setStatus("idle");
        return;
      }
      if (!pushCapable) {
        setActive(false);
        setEndpoint(null);
        setStatus("idle");
        return;
      }
      let ep: string | null = null;
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        ep = sub?.endpoint || null;
      } catch {}
      setEndpoint(ep);
      try { if (ep) localStorage.setItem('p4h:push:endpoint', ep); } catch {}

      if (ep) {
        // Check DB state for this device endpoint
        const url = `/api/push/status?endpoint=${encodeURIComponent(ep)}`;
        const res = await fetch(url, { method: 'GET' });
        const j = await res.json().catch(() => ({}));
        setActive(!!j?.active);
      } else {
        setActive(false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
    // Prefer a non-blocking registration; avoid waiting for full activation on first load
    let reg = await navigator.serviceWorker.getRegistration();
    if (reg) return reg;
    try {
      return await navigator.serviceWorker.register('/sw.js');
    } catch {
      // fallback: try to fetch existing or, as last resort, wait for ready
      reg = (await navigator.serviceWorker.getRegistration()) as ServiceWorkerRegistration | undefined;
      if (reg) return reg;
      return await navigator.serviceWorker.ready;
    }
  }

  async function subscribeInDB(sub: PushSubscription, property_id: string | null, ua: string, os: string) {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), property_id, ua, os }),
      });
    } catch {
      // Retry once after a short delay without blocking UI
      try { setTimeout(() => { fetch('/api/push/subscribe', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ subscription: sub.toJSON(), property_id, ua, os }) }).catch(() => {}); }, 3000); } catch {}
    }
  }

  async function turnOn() {
    setStatus("loading");
    setLoading(true);
    try {
      if (!pushCapable) {
        setFallbackActive(true);
        setActive(false);
        setLoading(false);
        setStatus("done");
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

      // Fire-and-forget DB sync to avoid blocking UI
      const ua = navigator.userAgent || '';
      const os = (document.documentElement.getAttribute('data-os') || '');
      let property_id: string | null = null; try { property_id = localStorage.getItem('p4h:selectedPropertyId'); } catch {}
      subscribeInDB(sub, property_id, ua, os);
      // Re-check DB status shortly after subscribing (non-blocking)
      try { setTimeout(() => { refreshActive().catch(()=>{}); }, 500); } catch {}
    } finally {
      finalize();
    }
  }

  async function turnOff() {
    setStatus("loading");
    setLoading(true);
    try {
      if (!pushCapable) {
        setFallbackActive(false);
        setStatus("done");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
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
      await refreshActive();
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
      if (pushCapable && active) {
        await fetch('/api/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      } else {
        const now = new Date().toISOString();
        setFallbackFeed((prev) => [{ ts: now, text: t.testNotification }, ...prev].slice(0, 5));
      }
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
            {!pushCapable && (
              <small style={{ color:'var(--muted)' }}>
                {t.pushNotSupported}
              </small>
            )}
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
            {(active || fallbackActive) && (
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
                : fallbackActive
                  ? t.fallbackActive
                  : active
                    ? t.notificationsOn
                    : t.notificationsOff}
            </small>
            {fallbackActive && fallbackFeed.length > 0 && (
              <div style={{ display:'grid', gap:6, padding:10, border:'1px dashed var(--border)', borderRadius:10, background:'color-mix(in srgb, var(--panel) 70%, transparent)' }}>
                <small style={{ color:'var(--muted)' }}>{t.fallbackListTitle}</small>
                <ul style={{ margin:0, paddingLeft:16, display:'grid', gap:4 }}>
                  {fallbackFeed.map((m, i) => (
                    <li key={`${m.ts}-${i}`} style={{ color:'var(--text)', fontSize:13 }}>
                      {new Date(m.ts).toLocaleString()} - {m.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
