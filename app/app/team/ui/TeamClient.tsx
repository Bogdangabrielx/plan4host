"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
type Lang = "en" | "ro";

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
  const [lang, setLang] = useState<Lang>("en");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isSmall, setIsSmall] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(max-width: 480px)")?.matches ?? false;
  });
  // Nou: default role = "editor" (nu mai folosim "member")
  const [role, setRole] = useState<Role | "">("");
  const [roleError, setRoleError] = useState<boolean>(false);
  const [scopes, setScopes] = useState<string[]>([]);
  const t = {
    en: {
      pleaseSelectRole: "Please select a Role.",
      failed: "Failed",
      newPasswordFor: "New password for ",
      removeUserConfirm: "Remove this user from account?",
      team: "Team",
      addUser: "Add user",
      email: "email",
      password: "password",
      hidePassword: "Hide password",
      showPassword: "Show password",
      role: "Role",
      select: "- select -",
      editor: "editor",
      viewer: "viewer",
      create: "Create",
      members: "Members",
      loading: "Loading...",
      roleLabel: "role",
      baseAccount: "(base account)",
      disabled: "disabled",
      active: "active",
      notAllowedForAdmin: "Not allowed for admin",
      setPassword: "Set password",
      remove: "Remove",
      scopeTitles: {
        calendar: "Calendar",
        guest_overview: "Guest Overview",
        property_setup: "Property Setup",
        cleaning: "Cleaning Board",
        channels: "Sync Calendars",
      } as Record<string, string>,
    },
    ro: {
      pleaseSelectRole: "Te rog selecteaza un rol.",
      failed: "A esuat",
      newPasswordFor: "Parola noua pentru ",
      removeUserConfirm: "Elimini acest utilizator din cont?",
      team: "Echipa",
      addUser: "Adauga utilizator",
      email: "email",
      password: "parola",
      hidePassword: "Ascunde parola",
      showPassword: "Arata parola",
      role: "Rol",
      select: "- selecteaza -",
      editor: "editor",
      viewer: "viewer",
      create: "Creeaza",
      members: "Membri",
      loading: "Se incarca...",
      roleLabel: "rol",
      baseAccount: "(cont de baza)",
      disabled: "dezactivat",
      active: "activ",
      notAllowedForAdmin: "Nu este permis pentru admin",
      setPassword: "Seteaza parola",
      remove: "Elimina",
      scopeTitles: {
        calendar: "Calendar",
        guest_overview: "Oaspeti",
        property_setup: "Setari proprietate",
        cleaning: "Curatenie",
        channels: "Sincronizare calendare",
      } as Record<string, string>,
    },
  } as const;
  const i18n = t[lang];

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(max-width: 480px)");
    const on = (e: MediaQueryListEvent) => setIsSmall(e.matches);
    try { mq?.addEventListener("change", on); } catch { mq?.addListener?.(on as any); }
    setIsSmall(mq?.matches ?? false);
    return () => { try { mq?.removeEventListener("change", on); } catch { mq?.removeListener?.(on as any); } };
  }, []);

  function toggleScope(key: string) {
    setScopes((prev) => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  }

  async function createUser() {
    if (!email || !password) return;
    if (!role) { setRoleError(true); alert(i18n.pleaseSelectRole); return; }
    setLoading(true);
    const res = await fetch("/api/team/user/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role, scopes })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(j?.error || i18n.failed);
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
    if (!res.ok) alert(j?.error || i18n.failed);
    await load();
  }

  async function setPasswordFor(u: Member) {
    if (u.role === "admin") return; // nu setăm parole pt admin din UI-ul de team
    const np = prompt(i18n.newPasswordFor + (u.email || u.user_id));
    if (!np) return;
    setLoading(true);
    const res = await fetch("/api/team/user/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.user_id, newPassword: np })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) alert(j?.error || i18n.failed);
    await load();
  }

  async function removeUser(u: Member) {
    if (u.role === "admin") return;
    if (!confirm(i18n.removeUserConfirm)) return;
    setLoading(true);
    const res = await fetch("/api/team/user/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.user_id })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) alert(j?.error || i18n.failed);
    await load();
  }

  const allScopes: { key: string; title: string }[] = [
    { key: "calendar",        title: i18n.scopeTitles.calendar },
    { key: "guest_overview",  title: i18n.scopeTitles.guest_overview },
    { key: "property_setup",  title: i18n.scopeTitles.property_setup },
    { key: "cleaning",        title: i18n.scopeTitles.cleaning },
    // keep key 'channels' (scope id) but show friendly label matching the page name
    { key: "channels",        title: i18n.scopeTitles.channels },
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
    <div style={{ fontFamily: "inherit", color: "var(--text)" }}>
      <PlanHeaderBadge title={i18n.team} slot="under-title" />
      <div style={{ padding: isSmall ? "10px 12px 16px" : "16px", display: "grid", gap: 16 }}>
      <section className="sb-cardglow" style={card}>
        <h3 style={{ margin: 0 }}>{i18n.addUser}</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <input
            placeholder={i18n.email}
            value={email}
            onChange={(e)=>setEmail((e.target as HTMLInputElement).value)}
            style={input}
            disabled={loading}
          />
          <div style={{ position: 'relative' }}>
            <input
              placeholder={i18n.password}
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e)=>setPassword((e.target as HTMLInputElement).value)}
              style={{ ...input, paddingRight: 42, width: '100%' }}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              aria-label={showPwd ? i18n.hidePassword : i18n.showPassword}
              title={showPwd ? i18n.hidePassword : i18n.showPassword}
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
            <label style={{ ...label, fontWeight: 800, color: roleError ? 'var(--danger)' : 'var(--muted)' }}>{i18n.role}</label>
            <select
              value={role}
              onChange={(e)=>{ setRole(e.currentTarget.value as any); setRoleError(false); }}
              style={{ ...select, width:'100%', borderColor: roleError ? 'var(--danger)' : 'var(--border)' }}
              disabled={loading}
            >
              <option value="">{i18n.select}</option>
              <option value="editor">{i18n.editor}</option>
              <option value="viewer">{i18n.viewer}</option>
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
            <button style={primaryBtn} onClick={createUser} disabled={loading || !email || !password}>{i18n.create}</button>
          </div>
        </div>
      </section>

      <section className="sb-cardglow" style={card}>
        <h3 style={{ margin: 0 }}>{i18n.members}</h3>
        {loading && <div style={{ color: "var(--muted)" }}>{i18n.loading}</div>}
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {members.map((u) => {
            const isAdmin = u.role === "admin";
            return (
              <li key={u.user_id} style={row} className="memberRow">
                <div style={{ display: "grid", gap: 4 }}>
                  <strong>{u.email || u.user_id}</strong>
                  <small style={{ color: "var(--muted)" }}>
                    {i18n.roleLabel}: {u.role}{isAdmin ? ` ${i18n.baseAccount}` : ""} • {u.disabled ? i18n.disabled : i18n.active}
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
                    title={isAdmin ? i18n.notAllowedForAdmin : i18n.setPassword}
                  >
                    {i18n.setPassword}
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
                    title={isAdmin ? i18n.notAllowedForAdmin : i18n.remove}
                  >
                    {i18n.remove}
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
