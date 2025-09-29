"use client";

import { useState } from "react";

type Result = { status?: number; ok?: boolean; data?: any; endpoint?: string; mode?: string } | null;

async function call(task: string, mode: "auth"|"get"|"post" = "auth"): Promise<Result> {
  try {
    const res = await fetch(`/api/admin/cron-check/run?task=${encodeURIComponent(task)}&mode=${encodeURIComponent(mode)}`, { cache: "no-store" });
    const j = await res.json();
    return j as any;
  } catch (e: any) {
    return { ok: false, status: 0, data: e?.message || String(e) };
  }
}

function Pill({ r }: { r: Result }) {
  if (!r) return null;
  const color = r.ok ? "#16a34a" : "#ef4444";
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderRadius: 999, border: `1px solid ${color}`, background: color, color: '#0c111b', fontWeight: 800, fontSize: 12 }}>
      {r.ok ? 'OK' : 'ERR'}
      <small style={{ color: '#0c111b', opacity: .85 }}>({r.status})</small>
    </span>
  );
}

export default function CronCheckClient() {
  const [autoAuth, setAutoAuth] = useState<Result>(null);
  const [autoRun, setAutoRun]   = useState<Result>(null);
  const [cleanRun, setCleanRun] = useState<Result>(null);
  const [holdsRun, setHoldsRun] = useState<Result>(null);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--panel)' }}>
        <h3 style={{ marginTop: 0 }}>Autosync</h3>
        <div style={{ display:'flex', gap: 8, alignItems:'center', flexWrap:'wrap' }}>
          <button className="sb-btn" onClick={async () => setAutoAuth(await call('autosync', 'auth'))}>Auth check (HEAD)</button>
          <button className="sb-btn" onClick={async () => setAutoRun(await call('autosync', 'get'))}>Run now</button>
          <div style={{ display:'flex', gap: 8 }}>
            <Pill r={autoAuth} />
            <Pill r={autoRun} />
          </div>
        </div>
        {autoAuth?.endpoint && (
          <small style={{ color:'var(--muted)' }}>Endpoint: {autoAuth.endpoint}{autoAuth.mode ? ` [${autoAuth.mode}]` : ''}</small>
        )}
        {autoRun?.data && (
          <pre style={{ marginTop: 8, fontSize: 12, background:'var(--card)', padding: 8, borderRadius: 8, overflow:'auto' }}>{typeof autoRun.data === 'string' ? autoRun.data : JSON.stringify(autoRun.data, null, 2)}</pre>
        )}
      </section>

      <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--panel)' }}>
        <h3 style={{ marginTop: 0 }}>Cleanup (unassigned events)</h3>
        <div style={{ display:'flex', gap: 8, alignItems:'center', flexWrap:'wrap' }}>
          <button className="sb-btn" onClick={async () => setCleanRun(await call('cleanup', 'get'))}>Run now</button>
          <Pill r={cleanRun} />
        </div>
        {cleanRun?.endpoint && (
          <small style={{ color:'var(--muted)' }}>Endpoint: {cleanRun.endpoint}{cleanRun.mode ? ` [${cleanRun.mode}]` : ''}</small>
        )}
        {cleanRun?.data && (
          <pre style={{ marginTop: 8, fontSize: 12, background:'var(--card)', padding: 8, borderRadius: 8, overflow:'auto' }}>{typeof cleanRun.data === 'string' ? cleanRun.data : JSON.stringify(cleanRun.data, null, 2)}</pre>
        )}
      </section>

      <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--panel)' }}>
        <h3 style={{ marginTop: 0 }}>Cancel expired holds</h3>
        <div style={{ display:'flex', gap: 8, alignItems:'center', flexWrap:'wrap' }}>
          <button className="sb-btn" onClick={async () => setHoldsRun(await call('holds', 'get'))}>Run now</button>
          <Pill r={holdsRun} />
        </div>
        {holdsRun?.endpoint && (
          <small style={{ color:'var(--muted)' }}>Endpoint: {holdsRun.endpoint}{holdsRun.mode ? ` [${holdsRun.mode}]` : ''}</small>
        )}
        {holdsRun?.data && (
          <pre style={{ marginTop: 8, fontSize: 12, background:'var(--card)', padding: 8, borderRadius: 8, overflow:'auto' }}>{typeof holdsRun.data === 'string' ? holdsRun.data : JSON.stringify(holdsRun.data, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}

