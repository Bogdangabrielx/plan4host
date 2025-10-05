"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Role = "admin" | "editor" | "viewer";
type Member = {
  user_id: string;
  email?: string | null;
  role: Role;
  scopes: string[] | null;
  disabled: boolean | null;
};

export default function TeamClient() {
  const supa = useMemo(() => createClient(), []); // (îl păstrăm dacă îl vei folosi)
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Nou: default role = "editor" (nu mai folosim "member")
  const [role, setRole] = useState<Role>("editor");
  const [scopes, setScopes] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/team/user/list");
    const j = await res.json().catch(() => ({}));
    if (j?.ok && Array.isArray(j.members)) setMembers(j.members as Member[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function toggleScope(key: string) {
    setScopes((prev) => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
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
    setEmail("");
    setPassword("");
    setRole("editor");
    setScopes([]);
    await load();
  }

  async function updateUser(u: Member, patch: Partial<Member>) {
    // Protecție: nu permitem acțiuni pe admin din UI
    if (u.role === "admin") return;
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

  async function setPasswordFor(u: Member) {
    if (u.role === "admin") return; // nu setăm parole pt admin din UI-ul de team
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

  async function removeUser(u: Member) {
    if (u.role === "admin") return;
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

  const allScopes: { key: string; title: string }[] = [
    { key: "calendar",        title: "Calendar" },
    { key: "guest_overview",  title: "Guest Overview" },
    { key: "property_setup",  title: "Property Setup" },
    { key: "cleaning",        title: "Cleaning Board" },
    // keep key 'channels' (scope id) but show friendly label matching the page name
    { key: "channels",        title: "Sync Calendars" },
  ];

  // Pretty-print scopes in Members list (handles legacy tokens too)
  const ORDER = ["calendar","guest_overview","property_setup","cleaning","channels"] as const;
  const TITLE_BY: Record<string, string> = Object.fromEntries(allScopes.map(s => [s.key, s.title]));
  const ALIASES: Record<string, string> = { inbox: "guest_overview", reservations: "calendar", propertySetup: "property_setup" };
  const normalize = (s: string) => ALIASES[s] ?? s;
  function formatScopes(scopes: string[] | null | undefined): string {
    if (!Array.isArray(scopes) || scopes.length === 0) return "—";
    const norm = Array.from(new Set(scopes.map(normalize)));
    norm.sort((a, b) => (ORDER.indexOf(a as any) - ORDER.indexOf(b as any)) || a.localeCompare(b));
    const titles = norm.map((k) => TITLE_BY[k] ?? k);
    return titles.join(", ");
  }

  return (
    <div style={{ display: "grid", gap: 16, fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      <section style={card}>
        <h3 style={{ margin: 0 }}>Add user</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <input
            placeholder="email"
            value={email}
            onChange={(e)=>setEmail((e.target as HTMLInputElement).value)}
            style={input}
            disabled={loading}
          />
          <input
            placeholder="password"
            type="password"
            value={password}
            onChange={(e)=>setPassword((e.target as HTMLInputElement).value)}
            style={input}
            disabled={loading}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label style={label}>Role</label>
            <select
              value={role}
              onChange={(e)=>setRole((e.target as HTMLSelectElement).value as Role)}
              style={select}
              disabled={loading}
            >
              <option value="editor">editor</option>
              <option value="viewer">viewer</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {allScopes.map(({ key, title }) => (
              <label key={key} style={{ display: "flex", gap: 6, alignItems: "center", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: 8 }}>
                <input type="checkbox" checked={scopes.includes(key)} onChange={()=>toggleScope(key)} disabled={loading} /> {title}
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
          {members.map((u) => {
            const isAdmin = u.role === "admin";
            return (
              <li key={u.user_id} style={row}>
                <div style={{ display: "grid", gap: 4 }}>
                  <strong>{u.email || u.user_id}</strong>
                  <small style={{ color: "var(--muted)" }}>
                    role: {u.role}{isAdmin ? " (base account)" : ""} • {u.disabled ? "disabled" : "active"}
                  </small>
                  <small style={{ color: "var(--muted)" }}>
                    {formatScopes(u.scopes)}
                  </small>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    style={{ ...ghostBtn, opacity: isAdmin ? 0.5 : 1, cursor: isAdmin ? "not-allowed" : "pointer" }}
                    onClick={()=>!isAdmin && setPasswordFor(u)}
                    disabled={loading || isAdmin}
                    title={isAdmin ? "Not allowed for admin" : "Set password"}
                  >
                    Set password
                  </button>
                  <button
                    style={{ ...ghostBtn, opacity: isAdmin ? 0.5 : 1, cursor: isAdmin ? "not-allowed" : "pointer" }}
                    onClick={()=>!isAdmin && updateUser(u, { role: u.role === "editor" ? "viewer" : "editor" })}
                    disabled={loading || isAdmin}
                    title={isAdmin ? "Not allowed for admin" : "Toggle role"}
                  >
                    Toggle role
                  </button>
                  <button
                    style={{ ...ghostBtn, opacity: isAdmin ? 0.5 : 1, cursor: isAdmin ? "not-allowed" : "pointer" }}
                    onClick={()=>!isAdmin && updateUser(u, { disabled: !u.disabled })}
                    disabled={loading || isAdmin}
                    title={isAdmin ? "Not allowed for admin" : (u.disabled ? "Enable" : "Disable")}
                  >
                    {u.disabled ? "Enable" : "Disable"}
                  </button>
                  <button
                    style={{ ...dangerBtn, opacity: isAdmin ? 0.5 : 1, cursor: isAdmin ? "not-allowed" : "pointer" }}
                    onClick={()=>!isAdmin && removeUser(u)}
                    disabled={loading || isAdmin}
                    title={isAdmin ? "Not allowed for admin" : "Remove"}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 };
const input: React.CSSProperties = { padding: "8px 10px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: 'inherit' };
const select: React.CSSProperties = { background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", padding: "6px 10px", borderRadius: 8, fontFamily: 'inherit' };
const label: React.CSSProperties = { fontSize: 12, color: "var(--muted)" };
const row: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, flexWrap: "wrap" };
const primaryBtn: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--primary)", color: "#0c111b", fontWeight: 800, cursor: "pointer" };
const ghostBtn: React.CSSProperties = { padding: "6px 10px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontWeight: 800, cursor: "pointer" };
const dangerBtn: React.CSSProperties = { padding: "6px 10px", borderRadius: 10, border: "1px solid var(--danger)", background: "transparent", color: "var(--text)", fontWeight: 800, cursor: "pointer" };
