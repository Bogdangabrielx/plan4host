"use client";
import { useEffect, useState } from "react";

export default function NotificationsClient() {
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string>(""); // "Loading..." | "Done"
  const [active, setActive] = useState<boolean>(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);

  useEffect(() => {
    refreshActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshActive() {
    setLoading(true);
    try {
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

  async function turnOn() {
    setStatus('Loading...');
    setLoading(true);
    try {
      if (!('Notification' in window)) return finalize();
      const p = await Notification.requestPermission();
      if (p !== 'granted') return finalize();
      const reg = await navigator.serviceWorker.register('/sw.js');
      const keyB64 = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || (window as any).NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').toString();
      const urlBase64ToUint8Array = (base64: string) => {
        const padding = '='.repeat((4 - (base64.length % 4)) % 4);
        const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(base64Safe);
        const out = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
        return out;
      };
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(keyB64) });
      const ua = navigator.userAgent || '';
      const os = (document.documentElement.getAttribute('data-os') || '');
      let property_id: string | null = null; try { property_id = localStorage.getItem('p4h:selectedPropertyId'); } catch {}
      await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), property_id, ua, os })
      });
      setEndpoint(sub.endpoint || null);
      try { if (sub?.endpoint) localStorage.setItem('p4h:push:endpoint', sub.endpoint); } catch {}
      setActive(true);
    } finally {
      finalize();
    }
  }

  async function turnOff() {
    setStatus('Loading...');
    setLoading(true);
    try {
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
    setStatus('Done');
    setLoading(false);
  }

  const onClass = `sb-btn ${active ? 'sb-btn--primary' : ''}`.trim();
  const offClass = `sb-btn ${!active ? 'sb-btn--primary' : ''}`.trim();

  return (
    <div className="sb-card" style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <strong>Notifications</strong>
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button className={onClass} onClick={turnOn} disabled={loading}>Turn On</button>
        <button className={offClass} onClick={turnOff} disabled={loading}>Turn Off</button>
      </div>
      <div>
        <small style={{ color:'var(--muted)' }}>{status}</small>
      </div>
    </div>
  );
}
