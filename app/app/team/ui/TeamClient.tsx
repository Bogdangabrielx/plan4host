"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  const [q, setQ] = useState<string>("");
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
      search: "Search member…",
      roleLabel: "role",
      baseAccount: "(base account)",
      disabled: "Disabled",
      active: "Active",
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
      search: "Cauta membru…",
      roleLabel: "rol",
      baseAccount: "(cont de baza)",
      disabled: "Dezactivat",
      active: "Activ",
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

  function MaskIcon({ src, size = 18, color = "var(--text)", opacity = 0.92 }: { src: string; size?: number; color?: string; opacity?: number }) {
    return (
      <span
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          display: "inline-block",
          backgroundColor: color,
          opacity,
          WebkitMaskImage: `url(${src})`,
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          WebkitMaskSize: "contain",
          maskImage: `url(${src})`,
          maskRepeat: "no-repeat",
          maskPosition: "center",
          maskSize: "contain",
          flex: "0 0 auto",
        }}
      />
    );
  }

  function SectionHeader({
    icon,
    title,
    right,
  }: {
    icon: string;
    title: string;
    right?: ReactNode;
  }) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <MaskIcon src={icon} size={20} color="var(--text)" />
          <h3 style={{ margin: 0, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h3>
        </div>
        {right ? <div style={{ flex: "0 0 auto" }}>{right}</div> : null}
      </div>
    );
  }

  function initialsFromEmail(e?: string | null) {
    const s = (e || "").split("@")[0] || "";
    const clean = s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return (clean.slice(0, 2) || "U").padEnd(2, "U");
  }

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
  const SCOPE_ICON: Record<string, string> = {
    calendar: "/svg_calendar.svg",
    guest_overview: "/svg_guests.svg",
    property_setup: "/svg_amenities.svg",
    cleaning: "/svg_cleaning.svg",
    channels: "/svg_channels.svg",
  };
  function normalizeScopes(scopes: string[] | null | undefined): string[] {
    if (!Array.isArray(scopes) || scopes.length === 0) return [];
    const norm = Array.from(new Set(scopes.map(normalize)));
    norm.sort((a, b) => (ORDER.indexOf(a as any) - ORDER.indexOf(b as any)) || a.localeCompare(b));
    return norm;
  }
  function ScopesChips({ scopes }: { scopes: string[] | null | undefined }) {
    const keys = normalizeScopes(scopes);
    if (keys.length === 0) {
      return <span style={{ color: "var(--muted)" }}>—</span>;
    }
    return (
      <div className="memberScopesGrid">
        {keys.map((k) => (
          <span
            key={k}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--panel) 86%, transparent)",
              color: "var(--text)",
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
              width: "100%",
              justifyContent: "flex-start",
            }}
            title={TITLE_BY[k] ?? k}
          >
            <MaskIcon src={SCOPE_ICON[k] || "/svg_dashboard.svg"} size={14} color="var(--text)" opacity={0.9} />
            <span
              style={{
                color: "var(--muted)",
                fontWeight: 800,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {TITLE_BY[k] ?? k}
            </span>
          </span>
        ))}
      </div>
    );
  }

  const filteredMembers = members.filter((m) => {
    const qq = q.trim().toLowerCase();
    if (!qq) return true;
    return (
      String(m.email || "").toLowerCase().includes(qq) ||
      String(m.user_id || "").toLowerCase().includes(qq) ||
      String(m.role || "").toLowerCase().includes(qq)
    );
  });

  return (
    <div style={{ fontFamily: "inherit", color: "var(--text)" }}>
      <PlanHeaderBadge title={i18n.team} slot="under-title" />
      <div
        style={{
          padding: isSmall ? "10px 12px 16px" : "16px",
          display: "grid",
          gap: 16,
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div className="teamGrid">
          <section className="sb-cardglow" style={card}>
            <SectionHeader
              icon="/svg_team.svg"
              title={i18n.addUser}
              right={
                <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
                  {members.length} {lang === "ro" ? "membri" : "members"}
                </span>
              }
            />
            <div style={{ display: "grid", gap: 10 }}>
              <div className="addFormGrid">
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={label}>{i18n.email}</label>
                  <input
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e)=>setEmail((e.target as HTMLInputElement).value)}
                    style={input}
                    disabled={loading}
                  />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={label}>{i18n.password}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      placeholder="••••••••"
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
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        border: "1px solid transparent",
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
                        width={16}
                        height={16}
                        style={{ display: 'block', opacity: .9 }}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ ...label, fontWeight: 900, color: roleError ? "var(--danger)" : "var(--muted)" }}>{i18n.role}</label>
                <div className="roleGrid">
                  <button
                    type="button"
                    className="sb-btn"
                    onClick={() => { setRole("editor"); setRoleError(false); }}
                    disabled={loading}
                    style={{
                      borderRadius: 999,
                      padding: "10px 12px",
                      border: "1px solid var(--border)",
                      background: role === "editor" ? "color-mix(in srgb, var(--primary) 75%, var(--card))" : "var(--card)",
                      color: role === "editor" ? "#0c111b" : "var(--muted)",
                      fontWeight: 900,
                      minHeight: 40,
                      width: "100%",
                      justifyContent: "center",
                    }}
                  >
                    {i18n.editor}
                  </button>
                  <button
                    type="button"
                    className="sb-btn"
                    onClick={() => { setRole("viewer"); setRoleError(false); }}
                    disabled={loading}
                    style={{
                      borderRadius: 999,
                      padding: "10px 12px",
                      border: "1px solid var(--border)",
                      background: role === "viewer" ? "color-mix(in srgb, var(--primary) 75%, var(--card))" : "var(--card)",
                      color: role === "viewer" ? "#0c111b" : "var(--muted)",
                      fontWeight: 900,
                      minHeight: 40,
                      width: "100%",
                      justifyContent: "center",
                    }}
                  >
                    {i18n.viewer}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ ...label, fontWeight: 900 }}>{lang === "ro" ? "Acces" : "Access"}</label>
                <div className="scopesWrap">
                  {allScopes.map(({ key, title }) => {
                    const checked = scopes.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        className="scopeChip"
                        onClick={() => toggleScope(key)}
                        disabled={loading}
                        aria-pressed={checked}
                        title={title}
                      >
                        <MaskIcon
                          src={SCOPE_ICON[key] || "/svg_dashboard.svg"}
                          size={16}
                          color={checked ? "#0c111b" : "var(--muted)"}
                          opacity={checked ? 0.95 : 0.85}
                        />
                        <span style={{ opacity: checked ? 1 : 0.9 }}>{title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {email.trim() ? (
                  <button
                    className="sb-btn sb-btn--primary sb-cardglow"
                    style={{ width: "100%", justifyContent: "center", minHeight: 44 }}
                    onClick={createUser}
                    disabled={loading || !email || !password}
                  >
                    {i18n.create}
                  </button>
                ) : null}
                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                  {lang === "ro"
                    ? "Utilizatorul va vedea doar paginile bifate mai sus."
                    : "The user will only see the pages you allow above."}
                </div>
              </div>
            </div>
          </section>

          <section className="sb-cardglow" style={card}>
            <SectionHeader
              icon="/svg_team.svg"
              title={i18n.members}
              right={
                <input
                  value={q}
                  onChange={(e) => setQ(e.currentTarget.value)}
                  placeholder={i18n.search}
                  style={{
                    ...input,
                    width: 260,
                    maxWidth: "50vw",
                    padding: "8px 10px",
                    borderRadius: 999,
                    background: "color-mix(in srgb, var(--card) 88%, transparent)",
                  }}
                />
              }
            />
            {loading && <div style={{ color: "var(--muted)" }}>{i18n.loading}</div>}
            <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10, margin: 0 }}>
              {filteredMembers.map((u) => {
                const isAdmin = u.role === "admin";
                const active = !u.disabled;
                return (
                  <li key={u.user_id} className="memberRow">
                    <div
                      aria-hidden
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 999,
                        background: "color-mix(in srgb, var(--primary) 26%, var(--card))",
                        border: "1px solid var(--border)",
                        display: "grid",
                        placeItems: "center",
                        alignSelf: "start",
                        fontWeight: 900,
                        color: "var(--text)",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {initialsFromEmail(u.email || u.user_id)}
                    </div>

                    <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minWidth: 0, maxWidth: "100%" }}>
                        <strong className="memberEmail">
                          {u.email || u.user_id}
                        </strong>
                        <span
                          className="memberStatusTop"
                          style={{
                            alignItems: "center",
                            gap: 8,
                            whiteSpace: "nowrap",
                            color: active ? "var(--success)" : "var(--muted)",
                            fontSize: 12,
                            fontWeight: 900,
                          }}
                        >
                          <span
                            aria-hidden
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 999,
                              border: active
                                ? "1px solid color-mix(in srgb, var(--success) 80%, transparent)"
                                : "1px solid color-mix(in srgb, var(--muted) 55%, transparent)",
                              background: active
                                ? "color-mix(in srgb, var(--success) 18%, transparent)"
                                : "color-mix(in srgb, var(--muted) 14%, transparent)",
                              display: "grid",
                              placeItems: "center",
                              color: active ? "var(--success)" : "var(--muted)",
                              fontWeight: 900,
                              fontSize: 11,
                              lineHeight: 1,
                              flex: "0 0 auto",
                            }}
                          >
                            ✓
                          </span>
                          {active ? i18n.active : i18n.disabled}
                        </span>
                      </div>

                      <div className="roleStatusRow">
                        <span
                          className="memberRolePill"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: "1px solid var(--border)",
                            background: isAdmin ? "color-mix(in srgb, var(--primary) 65%, var(--card))" : "var(--card)",
                            color: isAdmin ? "#0c111b" : "var(--text)",
                            fontSize: 12,
                            fontWeight: 900,
                            flex: "0 1 auto",
                            minWidth: 0,
                            maxWidth: "100%",
                          }}
                          title={isAdmin ? i18n.baseAccount : undefined}
                        >
                          {u.role}
                          {isAdmin ? <span style={{ opacity: 0.85 }}>{i18n.baseAccount}</span> : null}
                        </span>

                        <span
                          className="memberStatusInline"
                          style={{
                            alignItems: "center",
                            gap: 8,
                            whiteSpace: "nowrap",
                            color: active ? "var(--success)" : "var(--muted)",
                            fontSize: 12,
                            fontWeight: 900,
                            flex: "0 0 auto",
                          }}
                        >
                          <span
                            aria-hidden
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 999,
                              border: active
                                ? "1px solid color-mix(in srgb, var(--success) 80%, transparent)"
                                : "1px solid color-mix(in srgb, var(--muted) 55%, transparent)",
                              background: active
                                ? "color-mix(in srgb, var(--success) 18%, transparent)"
                                : "color-mix(in srgb, var(--muted) 14%, transparent)",
                              display: "grid",
                              placeItems: "center",
                              color: active ? "var(--success)" : "var(--muted)",
                              fontWeight: 900,
                              fontSize: 11,
                              lineHeight: 1,
                              flex: "0 0 auto",
                            }}
                          >
                            ✓
                          </span>
                          {active ? i18n.active : i18n.disabled}
                        </span>
                      </div>

                      <ScopesChips scopes={u.scopes} />
                    </div>

                    <div className="memberActions">
                      <button
                        className="sb-btn sb-btn--icon"
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          opacity: isAdmin ? 0.45 : 1,
                          cursor: isAdmin ? "not-allowed" : "pointer",
                        }}
                        onClick={() => !isAdmin && setPasswordFor(u)}
                        disabled={loading || isAdmin}
                        title={isAdmin ? i18n.notAllowedForAdmin : i18n.setPassword}
                        aria-label={i18n.setPassword}
                      >
                        <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>🔑</span>
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
                        className="sb-btn sb-btn--icon"
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          opacity: isAdmin ? 0.45 : 1,
                          cursor: isAdmin ? "not-allowed" : "pointer",
                          color: "var(--danger)",
                        }}
                        onClick={() => !isAdmin && removeUser(u)}
                        disabled={loading || isAdmin}
                        title={isAdmin ? i18n.notAllowedForAdmin : i18n.remove}
                        aria-label={i18n.remove}
                      >
                        <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>🗑</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* ⬇️ CSS responsive */}
        <style jsx>{`
          .teamGrid { display: grid; gap: 16px; align-items: start; }
          @media (min-width: 1024px) {
            .teamGrid { grid-template-columns: 420px 1fr; }
          }
          .addFormGrid { display: grid; gap: 10px; }
          @media (min-width: 720px) {
            .addFormGrid { grid-template-columns: 1fr 1fr; }
          }
          .roleGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .scopesWrap { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .scopeChip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            border-radius: 999px;
            border: 1px solid var(--border);
            background: var(--card);
            color: var(--muted);
            font-weight: 900;
            min-height: 40px;
            cursor: pointer;
            width: 100%;
            justify-content: flex-start;
          }
          .scopeChip[aria-pressed="true"] {
            background: var(--primary);
            border-color: color-mix(in srgb, var(--primary) 55%, var(--border));
            color: #0c111b;
          }
          .memberRow {
            display: grid;
            grid-template-columns: 44px minmax(0, 1fr) auto;
            gap: 12px;
            align-items: center;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 12px;
            overflow: hidden; /* keep long text/chips inside card */
            width: 100%;
            box-sizing: border-box;
          }
          /* Grid children default min-width:auto can cause overflow in narrow layouts. */
          .memberRow > :nth-child(2) { min-width: 0; }
          .memberEmail {
            display: block;
            min-width: 0;
            max-width: 100%;
            flex: 1 1 auto;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .memberActions { display: flex; gap: 8px; align-items: center; align-self: end; }
          .roleStatusRow { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
          .memberStatusInline { display: none; }
          .memberScopesGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; min-width: 0; width: 100%; }
          .memberScopesGrid > span { min-width: 0; }
          @media (max-width: 360px) {
            .memberScopesGrid { grid-template-columns: 1fr; }
          }
          @media (max-width: 720px) {
            .memberRow {
              grid-template-columns: 44px minmax(0, 1fr);
            }
            .memberActions {
              grid-column: 1 / -1;
              justify-content: flex-end;
              padding-top: 4px;
            }
            .memberStatusTop { display: none !important; }
            .memberStatusInline { display: inline-flex !important; }
            .roleStatusRow { flex-wrap: nowrap; min-width: 0; }
            .memberRolePill {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              /* Leave space for the inline status (Active/Disabled) */
              max-width: calc(100% - 92px);
            }
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
// legacy style constants kept for minimal diff, but most UI now uses sb-* classes.
const row: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, flexWrap: "wrap" };
const primaryBtn: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--primary)", color: "#0c111b", fontWeight: 800, cursor: "pointer" };
const ghostBtn: React.CSSProperties = { padding: "6px 10px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontWeight: 800, cursor: "pointer" };
const dangerBtn: React.CSSProperties = { padding: "6px 10px", borderRadius: 10, border: "1px solid var(--danger)", background: "transparent", color: "var(--text)", fontWeight: 800, cursor: "pointer" };
