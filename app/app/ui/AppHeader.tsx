"use client";

import { useEffect, useMemo, useState } from "react";
import { useHeader } from "../_components/HeaderContext";

/* ---------------- Navigation model ---------------- */
const NAV_BASE = [
  { href: "/app", label: "Dashboard", emoji: "🏠", scope: "dashboard" },
  { href: "/app/calendar", label: "Calendar", emoji: "📅", scope: "calendar" },
  { href: "/app/propertySetup", label: "Property Setup", emoji: "⚙️", scope: "property_setup" },
  { href: "/app/checkinEditor", label: "Check-in Editor", emoji: "📝", scope: "checkin_editor" },
  { href: "/app/cleaning", label: "Cleaning Board", emoji: "🧹", scope: "cleaning" },
  { href: "/app/channels", label: "Sync Calendars", emoji: "🔗", scope: "channels" },
  { href: "/app/reservationMessage", label: "Automatic Messages", emoji: "✉️", scope: "reservation_message" },
  { href: "/app/guest", label: "Guest Overview", emoji: "📥", scope: "guest_overview" },
  { href: "/app/notifications", label: "Notifications", emoji: "🔔", scope: "notifications" },
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
  // const [showNotifMgr, setShowNotifMgr] = useState(false);

  // Theme
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Nav lists
  const [navLeft, setNavLeft] = useState(
    NAV_BASE.filter((n) => ["/app/calendar", "/app/cleaning", "/app/guest"].includes(n.href)),
  );
  const [navRight, setNavRight] = useState(
    NAV_BASE.filter((n) => !["/app/calendar", "/app/cleaning", "/app/guest"].includes(n.href)),
  );

  // Hover state for drawer items (simulate selected on hover)
  const [hoverLeft, setHoverLeft] = useState<string | null>(null);
  const [hoverRight, setHoverRight] = useState<string | null>(null);
  // Press (tap) highlight state for mobile
  const [pressedLeft, setPressedLeft] = useState<string | null>(null);
  const [pressedRight, setPressedRight] = useState<string | null>(null);

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
    const onOpenMgmt = () => { setOpenRight(true); setOpen(false); };
    window.addEventListener("p4h:openManagement" as any, onOpenMgmt as any);
    return () => {
      window.removeEventListener("p4h:inboxCount", onInbox as EventListener);
      window.removeEventListener("p4h:openManagement" as any, onOpenMgmt as any);
    };
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
          if (it.href === "/app/notifications") return true; // always allow per-device notifications
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

        // Ensure Notifications appears right after Subscription when present
        const hasSub = filtered.some((x) => x.href === "/app/subscription");
        const notifIdx = filtered.findIndex((x) => x.href === "/app/notifications");
        if (hasSub && notifIdx !== -1) {
          const subIdx = filtered.findIndex((x) => x.href === "/app/subscription");
          if (subIdx !== -1 && notifIdx !== subIdx + 1) {
            const [notif] = filtered.splice(notifIdx, 1);
            filtered.splice(subIdx + 1, 0, notif);
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
    "/app/checkinEditor": { light: "/checkin_editor_forlight.png", dark: "/checkin_editor_fordark.png" },
    "/app/calendar": { light: "/calendar_forlight.png", dark: "/calendar_fordark.png" },
    "/app/notifications": { light: "/notification_forlight.png", dark: "/notification_fordark.png" },
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
          top: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          paddingRight: 14,
          paddingBottom: 10,
          paddingLeft: 14,
          background: "var(--panel)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Left: menu + title */}
        <div style={{ display: "flex", alignItems: "center", gap: isSmall ? 8 : 12, flexWrap: "wrap" }}>
          {!isSmall && (
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
          )}

          <div style={{ display: "flex", alignItems: "center", gap: isSmall ? 6 : 10, flexWrap: "wrap" }}>
            <h1 style={{ ...titleStyle(isSmall), whiteSpace: isSmall ? 'normal' : 'nowrap' }}>
              {useMemo(() => {
                if (isSmall && typeof title === 'string') {
                  const t = title.trim();
                  if (/^automatic\s+welcome\s+message$/i.test(t)) {
                    return (<><span>Automatic</span>Messages</>);
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
          {!isSmall && (
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
          )}
        </div>
      </header>
      {/* Notifications modal removed; now a dedicated page under /app/notifications */}

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
                    "/app/notifications": 32,
                  };
                  const ICON_SIZE = ICON_SIZE_PER_ROUTE[it.href] ?? ICON_SIZE_DEFAULT;

                  return (
                    <li key={it.href}>
                      <button
                        onClick={() => hardNavigate(it.href)}
                        onPointerDown={() => setPressedLeft(it.href)}
                        onPointerUp={() => setPressedLeft((p) => (p === it.href ? null : p))}
                        onPointerLeave={() => setPressedLeft((p) => (p === it.href ? null : p))}
                        onMouseEnter={() => setHoverLeft(it.href)}
                        onMouseLeave={() => setHoverLeft((h) => (h === it.href ? null : h))}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: active || hoverLeft === it.href || pressedLeft === it.href ? "var(--primary)" : "var(--card)",
                          color: active || hoverLeft === it.href || pressedLeft === it.href ? "#0c111b" : "var(--text)",
                          fontWeight: 800,
                          position: "relative",
                          cursor: "pointer",
                          transform: pressedLeft === it.href ? "scale(0.98)" : (hoverLeft === it.href && !active ? "scale(1.02)" : undefined),
                          transition: "transform .12s ease, background-color .15s ease, color .15s ease, border-color .15s ease",
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
                    "/app/notifications": 32,
                  };
                  const ICON_SIZE = ICON_SIZE_PER_ROUTE[it.href] ?? ICON_SIZE_DEFAULT;

                  return (
                    <li key={it.href}>
                      <button
                        onClick={() => {
                          setOpenRight(false);
                          hardNavigate(it.href);
                        }}
                        onPointerDown={() => setPressedRight(it.href)}
                        onPointerUp={() => setPressedRight((p) => (p === it.href ? null : p))}
                        onPointerLeave={() => setPressedRight((p) => (p === it.href ? null : p))}
                        onMouseEnter={() => setHoverRight(it.href)}
                        onMouseLeave={() => setHoverRight((h) => (h === it.href ? null : h))}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: active || hoverRight === it.href || pressedRight === it.href ? "var(--primary)" : "var(--card)",
                          color: active || hoverRight === it.href || pressedRight === it.href ? "#0c111b" : "var(--text)",
                          fontWeight: 800,
                          position: "relative",
                          cursor: "pointer",
                          transform: pressedRight === it.href ? "scale(0.98)" : (hoverRight === it.href && !active ? "scale(1.02)" : undefined),
                          transition: "transform .12s ease, background-color .15s ease, color .15s ease, border-color .15s ease",
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

// Notifications UI moved to /app/notifications

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
