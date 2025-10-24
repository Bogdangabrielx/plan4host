"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";

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
  const [showPwd, setShowPwd] = useState(false);
  const [isDark, setIsDark] = useState(false);
  // Nou: default role = "editor" (nu mai folosim "member")
  const [role, setRole] = useState<Role | "">("");
  const [roleError, setRoleError] = useState<boolean>(false);
  const [scopes, setScopes] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/team/user/list");
    const j = await res.json().catch(() => ({}));
    if (j?.ok && Array.isArray(j.members)) setMembers(j.members as Member[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Detect theme to choose proper icon for show/hide password
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = document.documentElement;
    const detect = () => {
      const t = el.getAttribute('data-theme');
      if (t === 'dark') setIsDark(true);
      else if (t === 'light') setIsDark(false);
      else setIsDark(window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false);
    };
    detect();
    const mo = new MutationObserver(detect);
    mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onMq = () => detect();
    try { mq?.addEventListener('change', onMq); } catch { mq?.addListener?.(onMq as any); }
    return () => { try { mq?.removeEventListener('change', onMq); } catch { mq?.removeListener?.(onMq as any); } mo.disconnect(); };
  }, []);

  function toggleScope(key: string) {
    setScopes((prev) => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  }

  async function createUser() {
    if (!email || !password) return;
    if (!role) { setRoleError(true); alert('Please select a Role.'); return; }
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
    setRole("");
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
      <PlanHeaderBadge title="Team" slot="header-right" />
      <section className="sb-cardglow" style={card}>
        <h3 style={{ margin: 0 }}>Add user</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <input
            placeholder="email"
            value={email}
            onChange={(e)=>setEmail((e.target as HTMLInputElement).value)}
            style={input}
            disabled={loading}
          />
          <div style={{ position: 'relative' }}>
            <input
              placeholder="password"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e)=>setPassword((e.target as HTMLInputElement).value)}
              style={{ ...input, paddingRight: 42, width: '100%' }}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              aria-label={showPwd ? 'Hide password' : 'Show password'}
              title={showPwd ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 24,
                height: 24,
                borderRadius: 6,
                border: 0,
                background: 'transparent',
                color: 'var(--text)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <img
                src={isDark ? '/show_hide_pwd_fordark.png' : '/show_hide_pwd_forlight.png'}
                alt=""
                width={14}
                height={14}
                style={{ display: 'block', opacity: .95 }}
              />
            </button>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ ...label, fontWeight: 800, color: roleError ? 'var(--danger)' : 'var(--muted)' }}>Role</label>
            <select
              value={role}
              onChange={(e)=>{ setRole(e.currentTarget.value as any); setRoleError(false); }}
              style={{ ...select, width:'100%', borderColor: roleError ? 'var(--danger)' : 'var(--border)' }}
              disabled={loading}
            >
              <option value="">- select -</option>
              <option value="editor">editor</option>
              <option value="viewer">viewer</option>
            </select>
          </div>
          <div className="scopesWrap">
            {allScopes.map(({ key, title }) => (
              <label key={key} className="scopeItem">
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
              <li key={u.user_id} style={row} className="memberRow">
                <div style={{ display: "grid", gap: 4 }}>
                  <strong>{u.email || u.user_id}</strong>
                  <small style={{ color: "var(--muted)" }}>
                    role: {u.role}{isAdmin ? " (base account)" : ""} • {u.disabled ? "disabled" : "active"}
                  </small>
                  <small style={{ color: "var(--muted)" }}>
                    {formatScopes(u.scopes)}
                  </small>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="memberActions">
                  <button
                    style={{ ...ghostBtn, opacity: isAdmin ? 0.5 : 1, cursor: isAdmin ? "not-allowed" : "pointer" }}
                    onClick={()=>!isAdmin && setPasswordFor(u)}
                    disabled={loading || isAdmin}
                    title={isAdmin ? "Not allowed for admin" : "Set password"}
                  >
                    Set password
                  </button>
                  {false && (
                    <button
                      style={{ ...ghostBtn, opacity: isAdmin ? 0.5 : 1, cursor: isAdmin ? "not-allowed" : "pointer" }}
                      onClick={()=>!isAdmin && updateUser(u, { role: u.role === "editor" ? "viewer" : "editor" })}
                      disabled={loading || isAdmin}
                      title={isAdmin ? "Not allowed for admin" : "Toggle role"}
                    >
                      Toggle role
                    </button>
                  )}
                  {false && (
                    <button
                      style={{ ...ghostBtn, opacity: isAdmin ? 0.5 : 1, cursor: isAdmin ? "not-allowed" : "pointer" }}
                      onClick={()=>!isAdmin && updateUser(u, { disabled: !u.disabled })}
                      disabled={loading || isAdmin}
                      title={isAdmin ? "Not allowed for admin" : (u.disabled ? "Enable" : "Disable")}
                    >
                      {u.disabled ? "Enable" : "Disable"}
                    </button>
                  )}
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
      {/* ⬇️ CSS responsive pentru acțiuni pe mobil */}
      <style jsx>{`
        @media (max-width: 720px) {
          .memberRow { align-items: stretch; }
          .memberActions {
            grid-column: 1 / -1;
            display: grid !important;
            grid-template-columns: 1fr; /* butoane unul sub altul */
            gap: 8px;
            width: 100%;
            margin-top: 4px;
          }
          .memberActions > button {
            width: 100%;
            border-radius: 29px !important;
            min-height: 44px; /* touch friendly */
          }
          .scopesWrap {
            display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
          }
          .scopeItem {
            display: flex; gap: 6px; align-items: center;
            border: 1px solid var(--border);  padding: 6px 8px; border-radius: 8px;
          }
        }
        @media (min-width: 721px) {
          .scopesWrap { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; }
          .scopeItem { display: flex; gap: 6px;  align-items: center; border: 1px solid var(--border); padding: 6px 8px; border-radius: 8px; }
        }
      `}</style>
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 };
const input: React.CSSProperties = { padding: "8px 10px", background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: 'inherit', width: '100%' };
const select: React.CSSProperties = { background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", padding: "6px 10px", borderRadius: 8, fontFamily: 'inherit' };
const label: React.CSSProperties = { fontSize: 12, color: "var(--muted)" };
const row: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, flexWrap: "wrap" };
const primaryBtn: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--primary)", color: "#0c111b", fontWeight: 800, cursor: "pointer" };
const ghostBtn: React.CSSProperties = { padding: "6px 10px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontWeight: 800, cursor: "pointer" };
const dangerBtn: React.CSSProperties = { padding: "6px 10px", borderRadius: 10, border: "1px solid var(--danger)", background: "transparent", color: "var(--text)", fontWeight: 800, cursor: "pointer" };
