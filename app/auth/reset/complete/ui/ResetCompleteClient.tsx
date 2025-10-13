"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetCompleteClient() {
  const sb = useMemo(()=>createClient(), []);
  const [okToReset, setOkToReset] = useState<boolean>(false);
  const [pass, setPass] = useState("");
  const [conf, setConf] = useState("");
  const [status, setStatus] = useState<"Idle"|"Updating"|"Done"|"Error">("Idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await sb.auth.getSession();
        setOkToReset(!!data?.session);
      } catch { setOkToReset(false); }
    })();
  }, [sb]);

  function strongEnough(p: string): string | null {
    if (p.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(p)) return 'Password must include at least one uppercase letter.';
    if (!/[0-9]/.test(p)) return 'Password must include at least one number.';
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p)) return 'Password must include at least one symbol.';
    return null;
  }

  async function submit() {
    const policy = strongEnough(pass);
    if (policy) { setErr(policy); setStatus('Error'); return; }
    if (pass !== conf) { setErr('Passwords do not match.'); setStatus('Error'); return; }
    setErr(''); setStatus('Updating');
    try {
      const { error } = await sb.auth.updateUser({ password: pass });
      if (error) { setErr(error.message); setStatus('Error'); return; }
      setStatus('Done');
      window.location.href = '/auth/login?reset=success';
    } catch (e:any) {
      setErr(e?.message || 'Unexpected error'); setStatus('Error');
    }
  }

  if (!okToReset) {
    return (
      <div style={{ width: 380, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:18 }}>
        <h1 style={{ marginTop: 0, fontSize: 18 }}>Reset password</h1>
        <p style={{ color:'var(--muted)' }}>Invalid or expired link. Please request a new reset link.</p>
        <div><a href="/auth/reset" style={{ color:'var(--primary)', fontWeight:800, textDecoration:'none' }}>Request new link</a></div>
      </div>
    );
  }

  return (
    <div style={{ width: 380, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:18 }}>
      <h1 style={{ marginTop: 0, fontSize: 18 }}>Set a new password</h1>
      <div style={{ display:'grid', gap:10 }}>
        <div style={{ display:'grid', gap:6 }}>
          <label style={{ fontSize:12, color:'var(--muted)' }}>New password</label>
          <input type="password" value={pass} onChange={(e)=>setPass(e.currentTarget.value)} placeholder="••••••••" style={input} />
        </div>
        <div style={{ display:'grid', gap:6 }}>
          <label style={{ fontSize:12, color:'var(--muted)' }}>Confirm password</label>
          <input type="password" value={conf} onChange={(e)=>setConf(e.currentTarget.value)} placeholder="••••••••" style={input} />
        </div>
        {err && <div style={{ color:'var(--text)', fontSize: 13 }}>{err}</div>}
        <button onClick={submit} disabled={status==="Updating"} style={primaryBtn}>
          {status==="Updating" ? 'Updating…' : 'Update password'}
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
