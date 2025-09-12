"use client";

import { useEffect, useState } from "react";
import { useHeader } from "../_components/HeaderContext";

const NAV_BASE = [
  { href: "/app", label: "Dashboard", emoji: "🏠", scope: "dashboard" },
  { href: "/app/calendar", label: "Calendar", emoji: "📅", scope: "calendar" },
  { href: "/app/propertySetup", label: "Property Setup", emoji: "⚙️", scope: "propertySetup" },
  { href: "/app/cleaning", label: "Cleaning Board", emoji: "🧹", scope: "cleaning" },
  { href: "/app/channels", label: "Channels & iCal", emoji: "🔗", scope: "channels" },
  { href: "/app/guest", label: "Guest Overview", emoji: "📥", scope: "inbox" },
  { href: "/app/team", label: "Team", emoji: "👥", scope: "team" },
  { href: "/auth/logout", label: "Logout", emoji: "🚪", scope: "logout" },
];

type MeInfo = {
  role: "admin" | "editor" | "viewer";
  scopes: string[];
  disabled: boolean;
  plan?: string;
};

export default function AppHeader({ currentPath }: { currentPath?: string }) {
  const { title, pill, right } = useHeader();
  const [open, setOpen] = useState(false);
  const [nav, setNav] = useState(NAV_BASE);
  const [me, setMe] = useState<MeInfo | null>(null);
  const [isSmall, setIsSmall] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);
  const [aboutFailed, setAboutFailed] = useState(false);

  useEffect(() => {
    const detect = () => setIsSmall(typeof window !== "undefined" ? window.innerWidth < 480 : false);
    detect();
    window.addEventListener("resize", detect);
    return () => window.removeEventListener("resize", detect);
  }, []);

  useEffect(() => {
    setMounted(true);
    try {
      const fromHtml = (document.documentElement.getAttribute("data-theme") as "light" | "dark" | null);
      const fromLS = (localStorage.getItem("theme_v1") as "light" | "dark" | null);
      setTheme(fromHtml ?? fromLS ?? "dark");
    } catch {}
    function onThemeChange(e: Event) {
      const detail = (e as CustomEvent).detail as { theme?: "light" | "dark" } | undefined;
      if (detail?.theme) setTheme(detail.theme);
    }
    window.addEventListener("themechange" as any, onThemeChange);
    return () => window.removeEventListener("themechange" as any, onThemeChange);
  }, []);

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

  const BASE =
    (process.env.NEXT_PUBLIC_APP_URL as string | undefined) ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const [inboxCount, setInboxCount] = useState<number>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("p4h:inboxCount") : null;
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.count ?? 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onInbox = (e: Event) => {
      const detail = (e as CustomEvent).detail as { count?: number };
      if (typeof detail?.count === "number") setInboxCount(detail.count);
    };
    window.addEventListener("p4h:inboxCount", onInbox as EventListener);
    return () => window.removeEventListener("p4h:inboxCount", onInbox as EventListener);
  }, []);

  function hardNavigate(href: string) {
    try {
      setOpen(false);
      const u = href.startsWith("http") ? href : `${BASE}${href}`;
      window.location.assign(u);
    } catch {
      window.location.href = href;
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (!j?.me) return;

        const info = j.me as MeInfo;
        setMe(info);

        // dacă e dezactivat, arată doar Logout
        if (info.disabled) {
          setNav(NAV_BASE.filter((it) => it.scope === "logout"));
          return;
        }

        const allowAll = info.role === "admin";
        const sc = new Set((info.scopes || []) as string[]);
        const plan = (info.plan || "basic").toLowerCase();

        let filtered = NAV_BASE.filter((it) => {
          if (it.scope === "logout") return true;

          // Team doar pentru admin + Premium
          if (it.href === "/app/team") return info.role === "admin" && plan === "premium";

          // Admin vede restul; altfel pe baza scopes
          if (allowAll) return true;
          return sc.has(it.scope);
        });

        // Admin vede și Subscription (upgrade/downgrade)
        if (info.role === "admin") {
          const exists = filtered.some((x) => x.href === "/app/subscription");
          if (!exists) {
            filtered = [
              { href: "/app/subscription", label: "Subscription", emoji: "💳", scope: "subscription" },
              ...filtered,
            ];
          }
        }

        setNav(filtered);
      } catch {
        // fallback: lăsăm NAV_BASE dacă /api/me eșuează
      }
    })();
  }, []);

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: "var(--safe-top)",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: isSmall ? 8 : 12,
          padding: isSmall ? "8px 10px" : "12px 16px",
          flexWrap: "wrap",
          background: "var(--panel)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isSmall ? 8 : 12, flexWrap: "wrap" }}>
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            style={{
              padding: isSmall ? 4 : 6,
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

          <div style={{ display: "flex", alignItems: "center", gap: isSmall ? 6 : 10, flexWrap: "wrap" }}>
            <div style={{ margin: 0, fontSize: isSmall ? 16 : 18, lineHeight: 1 }}>{title}</div>
            {pill ? <span style={pillStyle(pill)}>{pill}</span> : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isSmall ? 8 : 12,
            flexWrap: "wrap",
            width: isSmall ? "100%" : "auto",
            justifyContent: isSmall ? "flex-start" : "flex-end",
            marginTop: isSmall ? 6 : 0,
          }}
        >
          {right}
        </div>
      </header>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 40 }}
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
              zIndex: 41,
              display: "grid",
              gridTemplateRows: "auto 1fr",
              paddingTop: "var(--safe-top)",
            }}
          >
            <div
              style={{
                fontSize: 21,
                padding: 16,
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong>Plan4Host</strong>
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
                {nav.map((it) => {
                  const active = currentPath
                    ? currentPath === it.href || currentPath.startsWith(it.href + "/")
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
    </>
  );
}

function pillStyle(pill: React.ReactNode): React.CSSProperties {
  const txt = typeof pill === "string" ? pill : "";
  const isError = /error/i.test(txt);
  const isBusy = /(sync|saving|loading|sign|creat)/i.test(txt);
  const bg = isError ? "var(--danger)" : isBusy ? "var(--primary)" : "var(--card)";
  const col = isError || isBusy ? "#0c111b" : "var(--muted)";
  return {
    padding: "4px 10px",
    borderRadius: 999,
    background: bg,
    color: col,
    border: "1px solid var(--border)",
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