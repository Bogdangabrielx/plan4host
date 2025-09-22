"use client";

import { useState, useRef } from "react";

export default function ResetRequestClient() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"Idle"|"Sending"|"Sent"|"Error">("Idle");
  const [err, setErr] = useState("");
  const [cooldown, setCooldown] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  function isEmail(s: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s||"").trim()); }

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
      if (!res.ok) { setErr(j?.error || 'Could not send reset email.'); setStatus("Error"); return; }
      setStatus("Sent");
      // 30s cooldown
      setCooldown(30);
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setCooldown((v)=>{
          if (v <= 1) { if (timerRef.current) window.clearInterval(timerRef.current); return 0; }
          return v - 1;
        });
      }, 1000);
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

