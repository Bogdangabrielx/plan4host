"use client";

import { useEffect, useMemo, useState } from "react";
import { useHeader } from "../_components/HeaderContext";

/* ---------------- Navigation model ---------------- */
const NAV_BASE = [
  { href: "/app", label: "Dashboard", emoji: "🏠", scope: "dashboard" },
  { href: "/app/calendar", label: "Calendar", emoji: "📅", scope: "calendar" },
  { href: "/app/propertySetup", label: "Property Setup", emoji: "⚙️", scope: "property_setup" },
  { href: "/app/cleaning", label: "Cleaning Board", emoji: "🧹", scope: "cleaning" },
  { href: "/app/channels", label: "Channels & iCal", emoji: "🔗", scope: "channels" },
  { href: "/app/reservationMessage", label: "Automatic Welcome Message", emoji: "✉️", scope: "reservation_message" },
  { href: "/app/guest", label: "Guest Overview", emoji: "📥", scope: "guest_overview" },
  { href: "/app/team", label: "Team", emoji: "👥", scope: "team" },
  { href: "/auth/logout", label: "Logout", emoji: "🚪", scope: "logout" },
];

type MeInfo = {
  role: "admin" | "editor" | "viewer";
  scopes: string[];
  disabled: boolean;
  plan?: string;
};

/* ---------------- Typography helpers ---------------- */
const TITLE_FAMILY =
  "'Switzer', ui-sans-serif, system-ui, -apple-system, Segoe UI, Inter, Roboto, Helvetica, Arial, sans-serif";

function titleStyle(isSmall: boolean): React.CSSProperties {
  return {
    margin: 0,
    fontFamily: TITLE_FAMILY,
    fontSize: isSmall ? 18 : 20,
    lineHeight: isSmall ? "26px" : "26px",
    fontWeight: 600,
    letterSpacing: "-0.01em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "min(60vw, 520px)",
  };
}

function drawerTitleStyle(): React.CSSProperties {
  return {
    fontFamily: TITLE_FAMILY,
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
  };
}

/* ---------------- Component ---------------- */
export default function AppHeader({ currentPath }: { currentPath?: string }) {
  const { title, pill, right } = useHeader();

  // UI state
  const [open, setOpen] = useState(false);             // left drawer (Navigation)
  const [openRight, setOpenRight] = useState(false);   // right drawer (Management)
  const [isSmall, setIsSmall] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [aboutFailed, setAboutFailed] = useState(false);
  const [showNotifMgr, setShowNotifMgr] = useState(false);

  // Theme
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Nav lists
  const [navLeft, setNavLeft] = useState(
    NAV_BASE.filter((n) => ["/app/calendar", "/app/cleaning", "/app/guest"].includes(n.href)),
  );
  const [navRight, setNavRight] = useState(
    NAV_BASE.filter((n) => !["/app/calendar", "/app/cleaning", "/app/guest"].includes(n.href)),
  );

  // Inbox badge
  const [inboxCount, setInboxCount] = useState<number>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("p4h:inboxCount") : null;
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.count ?? 0;
    } catch {
      return 0;
    }
  });

  // Responsiveness
  useEffect(() => {
    const detect = () => setIsSmall(typeof window !== "undefined" ? window.innerWidth < 480 : false);
    detect();
    window.addEventListener("resize", detect);
    return () => window.removeEventListener("resize", detect);
  }, []);

  // Theme init + listen
  useEffect(() => {
    setMounted(true);
    try {
      const fromHtml = document.documentElement.getAttribute("data-theme") as "light" | "dark" | null;
      const fromLS = localStorage.getItem("theme_v1") as "light" | "dark" | null;
      setTheme(fromHtml ?? fromLS ?? "dark");
    } catch {}
    function onThemeChange(e: Event) {
      const detail = (e as CustomEvent).detail as { theme?: "light" | "dark" } | undefined;
      if (detail?.theme) setTheme(detail.theme);
    }
    window.addEventListener("themechange" as any, onThemeChange);
    return () => window.removeEventListener("themechange" as any, onThemeChange);
  }, []);

  // Escape closes drawers
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setOpenRight(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Inbox badge events
  useEffect(() => {
    const onInbox = (e: Event) => {
      const detail = (e as CustomEvent).detail as { count?: number };
      if (typeof detail?.count === "number") setInboxCount(detail.count);
    };
    window.addEventListener("p4h:inboxCount", onInbox as EventListener);
    return () => window.removeEventListener("p4h:inboxCount", onInbox as EventListener);
  }, []);

  // Build base origin
  const BASE =
    (process.env.NEXT_PUBLIC_APP_URL as string | undefined) ||
    (typeof window !== "undefined" ? window.location.origin : "");

  function hardNavigate(href: string) {
    try {
      setOpen(false);
      const u = href.startsWith("http") ? href : `${BASE}${href}`;
      window.location.assign(u);
    } catch {
      window.location.href = href;
    }
  }

  // Load /api/me to filter nav by scopes/plan
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (!j?.me) return;

        const info = j.me as MeInfo;

        if (info.disabled) {
          setNavLeft([]);
          setNavRight(NAV_BASE.filter((it) => it.scope === "logout"));
          return;
        }

        const allowAll = info.role === "admin";
        const sc = new Set((info.scopes || []) as string[]);
        const plan = (info.plan || "basic").toLowerCase();

        let filtered = NAV_BASE.filter((it) => {
          if (it.scope === "logout") return true;
          if (it.href === "/app/team") return info.role === "admin" && plan === "premium";
          if (allowAll) return true;
          return sc.has(it.scope);
        });

        if (info.role === "admin") {
          const exists = filtered.some((x) => x.href === "/app/subscription");
          if (!exists) {
            filtered = [
              { href: "/app/subscription", label: "Subscription", emoji: "💳", scope: "subscription" },
              ...filtered,
            ];
          }
        }

        const left = filtered.filter((it) =>
          ["/app/calendar", "/app/cleaning", "/app/guest"].includes(it.href),
        );
        const right = filtered.filter(
          (it) => !["/app/calendar", "/app/cleaning", "/app/guest"].includes(it.href),
        );
        setNavLeft(left);
        setNavRight(right);
      } catch {
        // fallback: NAV_BASE rămâne
      }
    })();
  }, []);

  /* ----- Themed icons ----- */
  const THEME_ICONS: Record<string, { light: string; dark: string }> = {
    "/app": { light: "/dashboard_forlight.png", dark: "/dashboard_fordark.png" },
    "/app/channels": { light: "/ical_forlight.png", dark: "/ical_fordark.png" },
    "/app/cleaning": { light: "/cleaning_forlight.png", dark: "/cleaning_fordark.png" },
    "/app/propertySetup": { light: "/configurator_forlight.png", dark: "/configurator_fordark.png" },
    "/app/calendar": { light: "/calendar_forlight.png", dark: "/calendar_fordark.png" },
    "/app/team": { light: "/team_forlight.png", dark: "/team_fordark.png" },
    "/auth/logout": { light: "/logout_forlight.png", dark: "/logout_fordark.png" },
    "/app/subscription": { light: "/subscription_forlight.png", dark: "/subscription_fordark.png" },
    "/app/guest": { light: "/guest_forlight.png", dark: "/guest_fordark.png" },
    "/app/inbox": { light: "/guest_forlight.png", dark: "/guest_fordark.png" },
    "/app/reservationMessage": { light: "/inbox_forlight.png", dark: "/inbox_fordark.png" },
  };

  function NavIcon({ href, emoji, size }: { href: string; emoji: string; size: number }) {
    const themed = THEME_ICONS[href as keyof typeof THEME_ICONS];
    const src = themed ? (theme === "light" ? themed.light : themed.dark) : null;
    const [failed, setFailed] = useState(false);
    if (!mounted || !src || failed) return <span aria-hidden>{emoji}</span>;
    return (
      <img
        aria-hidden
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ display: "block" }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <>
      {/* Paint safe-area notch so it never looks transparent */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "var(--safe-top)",
          background: "var(--panel)",
          zIndex: 99,             // sub header, peste conținut
          pointerEvents: "none",
        }}
      />

      {/* Top App Bar */}
      <header
        style={{
          position: "sticky",
          top: 0,                  // lipit de viewport; safe-area e în paddingTop
          zIndex: 100,             // peste conținut, sub drawer-uri/modale
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: isSmall ? 6 : 6,
          // padding include safe-area top
          paddingRight: isSmall ? 10 : 14,
          paddingBottom: isSmall ? 16 : 10,
          paddingLeft: isSmall ? 10 : 14,
          flexWrap: "nowrap",
          background: "var(--panel)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Left: menu + title */}
        <div style={{ display: "flex", alignItems: "center", gap: isSmall ? 8 : 12, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setOpen(true);
              setOpenRight(false);
            }}
            aria-label="Open menu"
            style={{
              padding: isSmall ? 4 : 4,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {mounted && !aboutFailed ? (
              <img
                src={theme === "light" ? "/navigation_forlight.png" : "/navigation_fordark.png"}
                alt=""
                width={isSmall ? 28 : 32}
                height={isSmall ? 28 : 32}
                style={{ display: "block" }}
                onError={() => setAboutFailed(true)}
              />
            ) : (
              <>≡</>
            )}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: isSmall ? 6 : 10, flexWrap: "wrap" }}>
            <h1 style={{ ...titleStyle(isSmall), whiteSpace: isSmall ? 'normal' : 'nowrap' }}>
              {useMemo(() => {
                if (isSmall && typeof title === 'string') {
                  const t = title.trim();
                  if (/^automatic\s+welcome\s+message$/i.test(t)) {
                    return (<><span>Automatic Welcome</span><br/>Message</>);
                  }
                }
                return title;
              }, [title, isSmall])}
            </h1>
            {pill ? <span style={pillStyle(pill)}>{pill}</span> : null}
          </div>
        </div>

        {/* Right: actions + profile */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isSmall ? 8 : 12,
            flexWrap: "nowrap",
            width: "auto",
            justifyContent: "flex-end",
            marginTop: 0,
          }}
        >
          {right}
          {currentPath === '/app' && (
            <button
              onClick={() => setShowNotifMgr(true)}
              aria-label="Manage notifications"
              className="sb-btn sb-btn--ghost sb-btn--small"
            >
              Manage notifications
            </button>
          )}
          <button
            onClick={() => {
              setOpenRight(true);
              setOpen(false);
            }}
            aria-label="Open management menu"
            style={{
              padding: isSmall ? 4 : 4,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {mounted && !aboutFailed ? (
              <img
                src={theme === "light" ? "/aboutme_forlight.png" : "/aboutme_fordark.png"}
                alt=""
                width={isSmall ? 28 : 32}
                height={isSmall ? 28 : 32}
                style={{ display: "block" }}
                onError={() => setAboutFailed(true)}
              />
            ) : (
              <>≡</>
            )}
          </button>
        </div>
      </header>
      {showNotifMgr && (
        <div role="dialog" aria-modal="true" onClick={() => setShowNotifMgr(false)}
          style={{ position:'fixed', inset:0, zIndex: 600, background:'rgba(0,0,0,.55)', display:'grid', placeItems:'center', padding:12 }}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(560px,100%)', padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <strong>Manage notifications</strong>
              <button className="sb-btn sb-btn--small" onClick={()=>setShowNotifMgr(false)}>Close</button>
            </div>
            <NotifManagerUI />
          </div>
        </div>
      )}

      {/* Left Drawer — Navigation */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 120 }}
          />
          <aside
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              height: "100%",
              width: 300,
              background: "var(--panel)",
              color: "var(--text)",
              borderRight: "1px solid var(--border)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
              zIndex: 121, // peste header
              display: "grid",
              gridTemplateRows: "auto 1fr",
              paddingTop: isSmall ? "var(--safe-top)" : "calc(var(--safe-top) + 8px)",
            }}
          >
            <div
              style={{
                padding: 16,
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={drawerTitleStyle()}>Navigation</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <nav style={{ padding: 12, overflowY: "auto" }}>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                {navLeft.map((it) => {
                  const active = currentPath
                    ? it.href === "/app"
                      ? currentPath === "/app"
                      : currentPath === it.href || currentPath.startsWith(it.href + "/")
                    : false;

                  const isInbox = it.href === "/app/guest";

                  const ICON_SIZE_DEFAULT = 36;
                  const ICON_SIZE_PER_ROUTE: Record<string, number> = {
                    "/app/calendar": 32,
                    "/app/team": 32,
                  };
                  const ICON_SIZE = ICON_SIZE_PER_ROUTE[it.href] ?? ICON_SIZE_DEFAULT;

                  return (
                    <li key={it.href}>
                      <button
                        onClick={() => hardNavigate(it.href)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: active ? "var(--primary)" : "var(--card)",
                          color: active ? "#0c111b" : "var(--text)",
                          fontWeight: 800,
                          position: "relative",
                          cursor: "pointer",
                        }}
                      >
                        <NavIcon href={it.href} emoji={it.emoji} size={ICON_SIZE} />
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {it.label}
                          {isInbox && inboxCount > 0 && (
                            <span style={inboxDotStyle}>{inboxCount > 99 ? "99+" : inboxCount}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        </>
      )}

      {/* Right Drawer — Management */}
      {openRight && (
        <>
          <div
            onClick={() => setOpenRight(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 120 }}
          />
          <aside
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              height: "100%",
              width: 300,
              background: "var(--panel)",
              color: "var(--text)",
              borderLeft: "1px solid var(--border)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
              zIndex: 121, // peste header
              display: "grid",
              gridTemplateRows: "auto 1fr",
              paddingTop: isSmall ? "var(--safe-top)" : "calc(var(--safe-top) + 8px)",
            }}
          >
            <div
              style={{
                padding: 16,
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={drawerTitleStyle()}>Management</h2>
              <button
                onClick={() => setOpenRight(false)}
                aria-label="Close"
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <nav style={{ padding: 12, overflowY: "auto" }}>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                {navRight.map((it) => {
                  const active = currentPath
                    ? it.href === "/app"
                      ? currentPath === "/app"
                      : currentPath === it.href || currentPath.startsWith(it.href + "/")
                    : false;

                  const isInbox = it.href === "/app/guest";

                  const ICON_SIZE_DEFAULT = 36;
                  const ICON_SIZE_PER_ROUTE: Record<string, number> = {
                    "/app/calendar": 32,
                    "/app/team": 32,
                  };
                  const ICON_SIZE = ICON_SIZE_PER_ROUTE[it.href] ?? ICON_SIZE_DEFAULT;

                  return (
                    <li key={it.href}>
                      <button
                        onClick={() => {
                          setOpenRight(false);
                          hardNavigate(it.href);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: active ? "var(--primary)" : "var(--card)",
                          color: active ? "#0c111b" : "var(--text)",
                          fontWeight: 800,
                          position: "relative",
                          cursor: "pointer",
                        }}
                      >
                        <NavIcon href={it.href} emoji={it.emoji} size={ICON_SIZE} />
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {it.label}
                          {isInbox && inboxCount > 0 && (
                            <span style={inboxDotStyle}>{inboxCount > 99 ? "99+" : inboxCount}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        </>
      )}
    </>
  );
}

function NotifManagerUI() {
  const [status, setStatus] = useState<string>('');
  const [perm, setPerm] = useState<NotificationPermission>('default');
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
    <div style={{ display:'grid', gap:10 }}>
      <div style={{ display:'grid', gap:4 }}>
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

/* ---------------- Tiny style helpers ---------------- */
function pillStyle(pill: React.ReactNode): React.CSSProperties {
  const txt = typeof pill === "string" ? pill : "";
  const isError = /error/i.test(txt);
  const isBusy = /(sync|saving|loading|sign|creat)/i.test(txt);
  const isIdle = /^\s*idle\s*$/i.test(txt);
  const bg = isIdle ? "transparent" : (isError ? "var(--danger)" : isBusy ? "var(--primary)" : "var(--card)");
  const col = isIdle ? "transparent" : (isError || isBusy ? "#0c111b" : "var(--muted)");
  const borderCol = isIdle ? "transparent" : "var(--border)";
  return {
    padding: "4px 10px",
    borderRadius: 999,
    background: bg,
    color: col,
    border: `1px solid ${borderCol}`,
    fontWeight: 800,
    fontSize: 12,
  };
}

const inboxDotStyle: React.CSSProperties = {
  minWidth: 18,
  height: 18,
  borderRadius: 999,
  padding: "0 6px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 900,
  background: "var(--danger)",
  color: "#0c111b",
  border: "1px solid var(--danger)",
  lineHeight: 1,
};
