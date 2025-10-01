"use client";
import { useEffect, useState } from "react";

export default function NotificationsClient() {
  const [status, setStatus] = useState<string>("");
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [endpoint, setEndpoint] = useState<string | null>(null);

  useEffect(() => {
    setPerm((typeof Notification !== 'undefined' ? Notification.permission : 'default') as any);
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setEndpoint(sub?.endpoint || null);
      } catch {}
    })();
  }, []);

  async function enable() {
    try {
      setStatus('Requesting permission…');
      const p = await Notification.requestPermission();
      setPerm(p);
      if (p !== 'granted') { setStatus('Permission denied'); return; }
      setStatus('Registering…');
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
      setStatus('Subscribing…');
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(keyB64) });
      const ua = navigator.userAgent || '';
      const os = (document.documentElement.getAttribute('data-os') || '');
      let property_id: string | null = null; try { property_id = localStorage.getItem('p4h:selectedPropertyId'); } catch {}
      await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), property_id, ua, os })
      });
      setEndpoint(sub.endpoint || null);
      setStatus('Enabled');
    } catch (e:any) {
      setStatus(`Error: ${e?.message || e}`);
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) { setStatus('No subscription'); return; }
      const ep = sub.endpoint;
      await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: ep }) });
      await sub.unsubscribe();
      setEndpoint(null);
      setStatus('Unsubscribed');
    } catch (e:any) {
      setStatus(`Error: ${e?.message || e}`);
    }
  }

  async function testMe() {
    try {
      const res = await fetch('/api/push/send', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({}) });
      const j = await res.json().catch(()=>({}));
      setStatus(`Test sent: ${j?.sent ?? 0}`);
    } catch (e:any) { setStatus(`Error: ${e?.message || e}`); }
  }

  return (
    <div className="sb-card" style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 4 }}>
        <strong>Notifications</strong>
      </div>
      <div style={{ display:'grid', gap:6 }}>
        <small style={{ color:'var(--muted)' }}>Status: {status || '—'}</small>
        <small style={{ color:'var(--muted)' }}>Permission: {perm}</small>
        <small style={{ color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis' }}>Endpoint: {endpoint || '—'}</small>
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button className="sb-btn sb-btn--primary" onClick={enable}>Enable</button>
        <button className="sb-btn" onClick={unsubscribe}>Unsubscribe</button>
        <button className="sb-btn" onClick={testMe}>Send test</button>
      </div>
      <small style={{ color:'var(--muted)' }}>
        On iPhone, install via “Add to Home Screen” to enable notifications.
      </small>
    </div>
  );
}

