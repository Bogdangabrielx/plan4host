"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TeamClient() {
  const supa = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");
  const [scopes, setScopes] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/team/user/list");
    const j = await res.json().catch(() => ({}));
    if (j?.ok) setMembers(j.members);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function toggleScope(s: string) {
    setScopes((prev) => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function createUser() {
    if (!email || !password) return;
    setLoading(true);
    const res = await fetch("/api/team/user/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role, scopes })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(j?.error || "Failed");
      setLoading(false);
      return;
    }
    // Optimistic add
    if (j?.userId) {
      setMembers((prev) => [
        { user_id: j.userId, email, role, scopes, disabled: false },
        ...prev,
      ]);
    }
    setEmail(""); setPassword(""); setRole("member"); setScopes([]);
    // Reconcile from server in background (without flipping UI back to Loading)
    load();
  }

  async function updateUser(u: any, patch: any) {
    setLoading(true);
    const res = await fetch("/api/team/user/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.user_id, ...patch })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) alert(j?.error || "Failed");
    await load();
  }

  async function setPasswordFor(u: any) {
    const np = prompt("New password for " + (u.email || u.user_id));
    if (!np) return;
    setLoading(true);
    const res = await fetch("/api/team/user/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.user_id, newPassword: np })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) alert(j?.error || "Failed");
    await load();
  }

  async function removeUser(u: any) {
    if (!confirm("Remove this user from account?")) return;
    setLoading(true);
    const res = await fetch("/api/team/user/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.user_id })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) alert(j?.error || "Failed");
    await load();
  }

  const allScopes = ["cleaning","reservations","channels","inbox","calendar","configurator"];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={card}>
        <h3 style={{ margin: 0 }}>Add user</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <input placeholder="email" value={email} onChange={(e)=>setEmail((e.target as HTMLInputElement).value)} style={input} />
          <input placeholder="password" type="password" value={password} onChange={(e)=>setPassword((e.target as HTMLInputElement).value)} style={input} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={label}>Role</label>
            <select value={role} onChange={(e)=>setRole((e.target as HTMLSelectElement).value)} style={select}>
              <option>member</option>
              <option>viewer</option>
              <option>manager</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label style={label}>Scopes</label>
            {allScopes.map(s => (
              <label key={s} style={{ display: "flex", gap: 6, alignItems: "center", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: 8 }}>
                <input type="checkbox" checked={scopes.includes(s)} onChange={()=>toggleScope(s)} /> {s}
              </label>
            ))}
          </div>
          <div>
            <button style={primaryBtn} onClick={createUser} disabled={loading || !email || !password}>Create</button>
          </div>
        </div>
      </section>

      <section style={card}>
        <h3 style={{ margin: 0 }}>Members</h3>
        {loading && <div style={{ color: "var(--muted)" }}>Loading…</div>}
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {members.map(u => (
            <li key={u.user_id} style={row}>
              <div style={{ display: "grid", gap: 4 }}>
                <strong>{u.email || u.user_id}</strong>
                <small style={{ color: "var(--muted)" }}>role: {u.role} • {u.disabled ? 'disabled' : 'active'}</small>
                <small style={{ color: "var(--muted)" }}>scopes: {(u.scopes || []).join(', ') || '—'}</small>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={ghostBtn} onClick={()=>setPasswordFor(u)}>Set password</button>
                <button style={ghostBtn} onClick={()=>updateUser(u, { role: u.role === 'member' ? 'viewer' : 'member' })}>Toggle role</button>
                <button style={ghostBtn} onClick={()=>updateUser(u, { disabled: !u.disabled })}>{u.disabled ? 'Enable' : 'Disable'}</button>
                <button style={dangerBtn} onClick={()=>removeUser(u)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 };
const input: React.CSSProperties = { padding: "8px 10px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8 };
const select: React.CSSProperties = { background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", padding: "6px 10px", borderRadius: 8 };
const label: React.CSSProperties = { fontSize: 12, color: "var(--muted)" };
const row: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, flexWrap: "wrap" };
const primaryBtn: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--primary)", color: "#0c111b", fontWeight: 800, cursor: "pointer" };
const ghostBtn: React.CSSProperties = { padding: "6px 10px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontWeight: 800, cursor: "pointer" };
const dangerBtn: React.CSSProperties = { padding: "6px 10px", borderRadius: 10, border: "1px solid var(--danger)", background: "transparent", color: "var(--text)", fontWeight: 800, cursor: "pointer" };
