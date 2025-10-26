"use client";

import { useEffect, useRef, useState } from "react";

export default function ResetRequestClient() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"Idle"|"Sending"|"Sent"|"Error">("Idle");
  const [err, setErr] = useState("");
  const [cooldown, setCooldown] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const endAtRef = useRef<number | null>(null);

  function isEmail(s: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s||"").trim()); }

  // Persisted cooldown helpers
  const LS_KEY = "p4h:reset:until";
  function clearTimer(){ if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; } }
  function startCountdown(seconds: number){
    const until = Date.now() + Math.max(0, seconds) * 1000;
    endAtRef.current = until;
    try { localStorage.setItem(LS_KEY, String(until)); } catch {}
    clearTimer();
    const tick = () => {
      const leftMs = (endAtRef.current ?? 0) - Date.now();
      const left = Math.max(0, Math.ceil(leftMs / 1000));
      setCooldown(left);
      if (left <= 0) {
        clearTimer();
        try { localStorage.removeItem(LS_KEY); } catch {}
      }
    };
    tick();
    timerRef.current = window.setInterval(tick, 1000);
  }

  useEffect(() => {
    // On mount, resume any persisted cooldown
    try {
      const raw = localStorage.getItem(LS_KEY);
      const until = raw ? parseInt(raw || "0", 10) : 0;
      if (until && until > Date.now()) {
        endAtRef.current = until;
        startCountdown(Math.ceil((until - Date.now()) / 1000));
      } else {
        try { localStorage.removeItem(LS_KEY); } catch {}
      }
    } catch {}
    return () => { clearTimer(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (!isEmail(email)) { setErr("Please enter a valid email."); setStatus("Error"); return; }
    setErr(""); setStatus("Sending");
    try {
      const res = await fetch('/api/auth/reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) {
        // If backend provides retry-after or cooldown seconds, honor it
        const retry = (j?.retry_after ?? j?.retryAfter ?? j?.cooldown ?? 0) as number;
        if (retry && retry > 0) startCountdown(retry);
        setErr(j?.error || 'Could not send reset email.'); setStatus("Error"); return;
      }
      setStatus("Sent");
      // 30s cooldown (persist + live countdown)
      startCountdown(30);
    } catch (e:any) {
      setErr(e?.message || 'Network error.'); setStatus("Error");
    }
  }

  return (
    <div style={{ width: 380, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:18 }}>
      <h1 style={{ marginTop: 0, fontSize: 18 }}>Forgot your password?</h1>
      <p style={{ color:'var(--muted)', marginTop: 0 }}>Enter your email to reset your password.</p>
      <div style={{ display:'grid', gap:10 }}>
        <div style={{ display:'grid', gap:6 }}>
          <label style={{ fontSize:12, color:'var(--muted)' }}>Email</label>
          <input type="email" value={email} onChange={(e)=>setEmail(e.currentTarget.value)} placeholder="you@example.com" style={input} />
        </div>
        {err && <div style={{ color:'var(--text)', fontSize: 13 }}>{err}</div>}
        <button onClick={submit} disabled={status==="Sending" || cooldown>0} style={primaryBtn}>
          {status==="Sending" ? 'Sending…' : cooldown>0 ? `Resend in ${cooldown}s` : (status==="Sent" ? 'Send again' : 'Send reset link')}
        </button>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <a href="/auth/login" style={{ color:'var(--primary)', fontWeight:800, textDecoration:'none' }}>Back to Sign in</a>
        </div>
      </div>
    </div>
  );
}

const input: React.CSSProperties = { padding: '10px 12px', background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:8 };
const primaryBtn: React.CSSProperties = { padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--primary)', color:'#0c111b', fontWeight:800, cursor:'pointer' };
