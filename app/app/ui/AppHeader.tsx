"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useHeader } from "../_components/HeaderContext";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

type Lang = "en" | "ro";

/* ---------------- Navigation model ---------------- */
const NAV_BASE = [
  { href: "/app/dashboard", label: "Dashboard", emoji: "🏠", scope: "dashboard" },
  { href: "/app/calendar", label: "Calendar", emoji: "📅", scope: "calendar" },
  { href: "/app/propertySetup", label: "Setup", emoji: "⚙️", scope: "property_setup" },
  { href: "/app/checkinEditor", label: "Check‑in", emoji: "📝", scope: "checkin_editor" },
  { href: "/app/cleaning", label: "Cleaning", emoji: "🧹", scope: "cleaning" },
  { href: "/app/channels", label: "Channels", emoji: "🔗", scope: "channels" },
  { href: "/app/reservationMessage", label: "Messages", emoji: "✉️", scope: "reservation_message" },
  { href: "/app/guest", label: "Guests", emoji: "📥", scope: "guest_overview" },
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
const TITLE_FAMILY = "inherit";

function titleStyle(isSmall: boolean): React.CSSProperties {
  return {
    margin: 0,
    fontFamily: TITLE_FAMILY,
    fontSize: "var(--fs-h)",
    lineHeight: "var(--lh-h)",
    fontWeight: "var(--fw-bold)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    textShadow: "0 0 18px color-mix(in srgb, var(--primary) 18%, transparent)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "min(60vw, 520px)",
  };
}

function drawerTitleStyle(): React.CSSProperties {
  return {
    fontFamily: TITLE_FAMILY,
    fontSize: "var(--fs-h)",
    lineHeight: "var(--lh-h)",
    fontWeight: "var(--fw-bold)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    textShadow: "0 0 16px color-mix(in srgb, var(--primary) 14%, transparent)",
    color: "var(--muted)",
    margin: 0,
  };
}

function drawerSectionTitleStyle(compact = false): React.CSSProperties {
  return {
    fontFamily: TITLE_FAMILY,
    fontSize: "var(--fs-s)",
    lineHeight: "var(--lh-s)",
    fontWeight: "var(--fw-bold)",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "var(--muted)",
    margin: 0,
    padding: compact ? "10px 8px 6px" : "12px 8px 8px",
  };
}

/* ---------------- Component ---------------- */
export default function AppHeader({ currentPath }: { currentPath?: string }) {
  const { title, pill, right } = useHeader();
  const headerRef = useRef<HTMLElement | null>(null);

  // UI state
  const [open, setOpen] = useState(false);             // left drawer (Navigation)
  const [openRight, setOpenRight] = useState(false);   // right drawer (Management)
  const [isSmall, setIsSmall] = useState(false);
  // Hide top header nav buttons when BottomNav is shown (<=640px)
  const [isMobileNav, setIsMobileNav] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  // const [showNotifMgr, setShowNotifMgr] = useState(false);
  const [activePropertyPhotoUrl, setActivePropertyPhotoUrl] = useState<string | null>(null);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [navBtnHover, setNavBtnHover] = useState(false);
  const [navBtnPressed, setNavBtnPressed] = useState(false);
  const [mgmtBtnHover, setMgmtBtnHover] = useState(false);
  const [mgmtBtnPressed, setMgmtBtnPressed] = useState(false);

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
  const preloadedRef = useRef<Set<string>>(new Set());

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

  // Track same breakpoint as BottomNav (<= 640px)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobileNav(!!mq.matches);
    update();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    } else {
      // Safari fallback
      // @ts-ignore
      mq.addListener(update);
      return () => {
        // @ts-ignore
        mq.removeListener(update);
      };
    }
  }, []);

  // Write the real header height to CSS so app-main padding matches (prevents overlap when titles wrap)
  useEffect(() => {
    const el = headerRef.current as HTMLElement | null;
    if (!el || typeof document === "undefined") return;

    const write = () => {
      try {
        const h = el.getBoundingClientRect?.().height ?? 0;
        if (h > 0) document.documentElement.style.setProperty("--app-header-h", `${Math.ceil(h)}px`);
      } catch {}
    };

    write();

    const RO = (typeof window !== "undefined" ? (window as any).ResizeObserver : undefined) as
      | typeof ResizeObserver
      | undefined;
    let ro: ResizeObserver | undefined;
    if (RO) {
      ro = new RO(() => write());
      ro.observe(el);
    }
    window.addEventListener("resize", write);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", write);
    };
  }, [isMobileNav, isSmall, title, pill, right]);

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

  // UI language from login preference (localStorage/cookie)
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

  const tr = {
    en: {
      navigation: "Navigation",
      management: "Management",
      recurring: "Recurring",
      main: "Main",
      operations: "Operations",
      setup: "Setup",
      account: "Account",
      other: "Other",
      labels: {
        "/app/dashboard": "Dashboard",
        "/app/calendar": "Calendar",
        "/app/propertySetup": "Setup",
        "/app/checkinEditor": "Check-in",
        "/app/cleaning": "Cleaning",
        "/app/channels": "Channels",
        "/app/reservationMessage": "Messages",
        "/app/guest": "Guests",
        "/app/notifications": "Notifications",
        "/app/team": "Team",
        "/app/subscription": "Subscription",
        "/auth/logout": "Logout",
      } as Record<string, string>,
    },
    ro: {
      navigation: "Navigare",
      management: "Management",
      recurring: "Recurent",
      main: "Principal",
      operations: "Operatiuni",
      setup: "Setari",
      account: "Cont",
      other: "Altele",
      labels: {
        "/app/dashboard": "Control",
        "/app/calendar": "Calendar",
        "/app/propertySetup": "Setari",
        "/app/checkinEditor": "Check-in",
        "/app/cleaning": "Curatenie",
        "/app/channels": "Canale",
        "/app/reservationMessage": "Mesaje",
        "/app/guest": "Oaspeti",
        "/app/notifications": "Notificari",
        "/app/team": "Echipa",
        "/app/subscription": "Abonament",
        "/auth/logout": "Delogare",
      } as Record<string, string>,
    },
  } as const;
  const t = tr[lang];
  const navLabel = (href: string, fallback: string) => t.labels[href] || fallback;
  const translateTitle = (value: string): string => {
    if (lang !== "ro") return value;
    const key = value.trim().toLowerCase();
    const map: Record<string, string> = {
      "dashboard": "Control",
      "calendar": "Calendar",
      "property setup": "Setari proprietate",
      "check-in editor": "Editor check-in",
      "cleaning board": "Curatenie",
      "sync calendars": "Sincronizare calendare",
      "channels & ical": "Canale si iCal",
      "automatic messages": "Mesaje automate",
      "guest overview": "Oaspeti",
      "notifications": "Notificari",
      "subscription": "Abonament",
      "team": "Echipa",
      "qr generator": "Generator QR",
    };
    return map[key] || value;
  };

  // Active property photo (desktop nav button)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const readSelectedId = () => {
      try {
        const u = new URL(window.location.href);
        const fromUrl = u.searchParams.get("property");
        if (fromUrl) return fromUrl;
      } catch {}
      try {
        return localStorage.getItem("p4h:selectedPropertyId");
      } catch {}
      return null;
    };

    const apply = (id: string | null) => {
      const clean = (id || "").trim();
      setActivePropertyId(clean || null);
    };

    apply(readSelectedId());

    function onEvt(e: Event) {
      const d = (e as CustomEvent).detail as { id?: string } | undefined;
      apply(d?.id ?? null);
    }
    const onPop = () => apply(readSelectedId());
    window.addEventListener("p4h:selectedProperty", onEvt as EventListener);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("p4h:selectedProperty", onEvt as EventListener);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!activePropertyId) {
      setActivePropertyPhotoUrl(null);
      return;
    }
    let cancelled = false;
    const sb = createSupabaseClient();
    (async () => {
      try {
        const r = await sb
          .from("properties")
          .select("presentation_image_url")
          .eq("id", activePropertyId)
          .maybeSingle();
        const url = (r.data as any)?.presentation_image_url || null;
        if (!cancelled) setActivePropertyPhotoUrl(url);
      } catch {
        if (!cancelled) setActivePropertyPhotoUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activePropertyId, mounted]);
  // Preload theme-specific nav icons to reduce flicker
  useEffect(() => {
    if (typeof document === "undefined") return;
    const icons = Object.values(THEME_ICONS)
      .map((pair) => (theme === "light" ? pair.light : pair.dark));
    icons.forEach((href) => {
      if (preloadedRef.current.has(href)) return;
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = href;
      document.head.appendChild(link);
      preloadedRef.current.add(href);
    });
  }, [theme]);

  // Keep header pinned to visual viewport during pinch-zoom only (no adjustment for pull/keyboard)
  useEffect(() => {
    const vv = (typeof window !== 'undefined' ? (window as any).visualViewport : null);
    const el = headerRef.current as any;
    if (!vv || !el) return;
    const onVv = () => {
      try {
        const scale = vv.scale || 1;
        if (scale && Math.abs(scale - 1) > 0.02) {
          el.style.transform = `translate3d(${Math.round(vv.offsetLeft)}px, ${Math.round(vv.offsetTop)}px, 0)`;
        } else {
          el.style.transform = '';
        }
      } catch {}
    };
    onVv();
    vv.addEventListener('resize', onVv);
    vv.addEventListener('scroll', onVv);
    return () => { try { vv.removeEventListener('resize', onVv); vv.removeEventListener('scroll', onVv); } catch {} };
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
	    "/app/dashboard": { light: "/svg_dashboard.svg", dark: "/svg_dashboard.svg" },
	    "/app/channels": { light: "/svg_channels.svg", dark: "/svg_channels.svg" },
	    "/app/cleaning": { light: "/svg_cleaning.svg", dark: "/svg_cleaning.svg" },
	    "/app/propertySetup": { light: "/svg_setup.svg", dark: "/svg_setup.svg" },
	    "/app/checkinEditor": { light: "/svg_checkin.svg", dark: "/svg_checkin.svg" },
	    "/app/calendar": { light: "/svg_calendar.svg", dark: "/svg_calendar.svg" },
	    "/app/notifications": { light: "/svg_notifications.svg", dark: "/svg_notifications.svg" },
	    "/app/team": { light: "/svg_team.svg", dark: "/svg_team.svg" },
	    "/auth/logout": { light: "/svg_logout.svg", dark: "/svg_logout.svg" },
	    "/app/subscription": { light: "/svg_subscription.svg", dark: "/svg_subscription.svg" },
	    "/app/guest": { light: "/svg_guests.svg", dark: "/svg_guests.svg" },
	    "/app/inbox": { light: "/guest_forlight.png", dark: "/guest_fordark.png" },
	    "/app/reservationMessage": { light: "/svg_messages.svg", dark: "/svg_messages.svg" },
	  };

	  function NavIcon({ href, emoji, size }: { href: string; emoji: string; size: number }) {
	    const themed = THEME_ICONS[href as keyof typeof THEME_ICONS];
	    const src = themed ? (theme === "light" ? themed.light : themed.dark) : null;
	    const [failed, setFailed] = useState(false);
	    if (!mounted || !src || failed) return <span aria-hidden>{emoji}</span>;

	    if (src.endsWith(".svg")) {
	      const maskSizePx = Math.max(12, Math.round(size * 0.82)); // normalize viewBox differences
	      // Use CSS masking so the icon automatically follows the parent's `color`
	      // (e.g. hover/active => var(--primary)).
	      return (
	        <span
	          aria-hidden
	          style={{
	            width: size,
	            height: size,
	            display: "block",
	            backgroundColor: "currentColor",
	            WebkitMaskImage: `url(${src})`,
	            maskImage: `url(${src})`,
	            WebkitMaskRepeat: "no-repeat",
	            maskRepeat: "no-repeat",
	            WebkitMaskPosition: "center",
	            maskPosition: "center",
	            WebkitMaskSize: `${maskSizePx}px ${maskSizePx}px`,
	            maskSize: `${maskSizePx}px ${maskSizePx}px`,
	            pointerEvents: "none",
	          }}
	        />
	      );
	    }
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

  // Hide header status pill completely (keep state updates for internal logic/overlays).
  const pillEl = null;

  const renderedTitle = useMemo(() => {
    const baseTitle = typeof title === "string" ? translateTitle(title) : title;
    if (isSmall && typeof baseTitle === "string") {
      const tTitle = baseTitle.trim();
      if (/^automatic\s+welcome\s+message$/i.test(tTitle)) {
        return (
          <>
            <span>Automatic</span>Messages
          </>
        );
      }
    }
    return baseTitle;
  }, [title, isSmall, lang]);

  const noEllipsisTitle =
    !!currentPath && /^\/app\/(notifications|subscription)(\/|$)/.test(currentPath);

  const shrinkInsteadOfEllipsisTitle =
    !!currentPath &&
    /^\/app\/reservationMessage(\/|$)/.test(currentPath) &&
    typeof renderedTitle === "string" &&
    /automatic\s+messages/i.test(renderedTitle);

  const transparentMobileHeader = isMobileNav;
  const mobileHeaderRadius = 23;

  // When any modal dialog is open, keep the (otherwise transparent) mobile header on a solid surface
  // so the blurred overlay doesn't make the top area look "see-through".
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    let raf = 0;

    const update = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const anyDialog = !!document.body.querySelector('[role="dialog"][aria-modal="true"]');
        if (anyDialog) root.setAttribute("data-p4h-dialog-open", "1");
        else root.removeAttribute("data-p4h-dialog-open");
      });
    };

    update();
    const mo = new MutationObserver(update);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      try { mo.disconnect(); } catch {}
      if (raf) cancelAnimationFrame(raf);
      root.removeAttribute("data-p4h-dialog-open");
    };
  }, []);

  const logoutItem =
    navRight.find((it) => it.href === "/auth/logout") ??
    navLeft.find((it) => it.href === "/auth/logout") ??
    NAV_BASE.find((it) => it.href === "/auth/logout") ??
    null;

  const navSectionsRight = useMemo(() => {
    const items = navRight.filter((it) => it.href !== "/auth/logout");

    const take = (hrefs: string[]) => items.filter((it) => hrefs.includes(it.href));
    const main = take(["/app/dashboard"]);
    const operations = take(["/app/reservationMessage", "/app/channels"]);
    const setup = take(["/app/propertySetup", "/app/checkinEditor"]);
    const account = take(["/app/notifications", "/app/subscription", "/app/team"]);

    const used = new Set([...main, ...operations, ...setup, ...account].map((x) => x.href));
    const other = items.filter((it) => !used.has(it.href));

    return [
      { key: "main", items: main },
      { key: "operations", items: operations },
      { key: "setup", items: setup },
      { key: "account", items: account },
      { key: "other", items: other },
    ].filter((s) => s.items.length > 0);
  }, [navRight]);

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
          background: transparentMobileHeader ? "var(--app-header-mobile-bg, transparent)" : "var(--panel)",
          ...(transparentMobileHeader
            ? { backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }
            : null),
          zIndex: 99,             // sub header, peste conținut
          pointerEvents: "none",
        }}
      />

      {/* Top App Bar */}
      <header
        ref={headerRef as any}
        style={{
          position: isSmall ? "fixed" : "sticky",
          top: isSmall ? "var(--safe-top)" : 0,
          left: isSmall ? 0 : undefined,
          right: isSmall ? 0 : undefined,
          zIndex: 100,
          display: "grid",
          gridTemplateColumns: isMobileNav
            ? "minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)"
            : "minmax(0,1fr) minmax(0,520px) minmax(0,1fr)",
          alignItems: "center",
          gap: 6,
          paddingRight: isSmall ? 10 : 14,
          paddingTop: isSmall ? 12 : 10,
          paddingBottom: isSmall ? 12 : 10,
          paddingLeft: isSmall ? 10 : 14,
          background: transparentMobileHeader ? "var(--app-header-mobile-bg, transparent)" : "var(--panel)",
          ...(transparentMobileHeader
            ? {
                borderBottom: "1px solid var(--border)",
                borderBottomLeftRadius: mobileHeaderRadius,
                borderBottomRightRadius: mobileHeaderRadius,
                overflow: "hidden",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }
            : { borderBottom: "1px solid var(--border)" }),
        }}
      >
        {isMobileNav ? (
          <>
            {/* Left: status pill (keeps title centered) */}
            <div
              style={{
                gridColumn: 1,
                justifySelf: "start",
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
              }}
            >
              {pillEl}
            </div>

            {/* Center: title */}
            <div
              style={{
                gridColumn: 2,
                justifySelf: "center",
                width: "100%",
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
                textAlign: "center",
              }}
            >
              <h1
                style={{
                  ...titleStyle(isSmall),
                  textAlign: "center",
                  maxWidth: "100%",
                  // Don't clip composed titles (e.g. title + plan badge under it)
                  ...(typeof renderedTitle === "string"
                    ? {
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow:
                          noEllipsisTitle || shrinkInsteadOfEllipsisTitle ? "clip" : "ellipsis",
                        fontSize: noEllipsisTitle
                          ? "clamp(14px, 3.6vw, var(--fs-h))"
                          : shrinkInsteadOfEllipsisTitle
                            ? "clamp(13px, 3.3vw, 18px)"
                            : undefined,
                        letterSpacing: noEllipsisTitle || shrinkInsteadOfEllipsisTitle ? "0.06em" : undefined,
                      }
                    : {
                        whiteSpace: "normal",
                        overflow: "visible",
                        textOverflow: "clip",
                      }),
                }}
              >
                {renderedTitle}
              </h1>
            </div>

            {/* Right: actions + management */}
            <div
              style={{
                gridColumn: 3,
                justifySelf: "end",
                display: "flex",
                alignItems: "center",
                gap: isSmall ? 8 : 12,
                flexWrap: "nowrap",
                width: "auto",
                justifyContent: "flex-end",
                marginTop: 0,
                minWidth: 0,
              }}
            >
              {right}
	              <button
	                type="button"
	                aria-label="Open management"
	                onClick={() => {
	                  setOpenRight(true);
	                  setOpen(false);
	                }}
	                style={{
	                  width: isSmall ? 40 : 46,
	                  height: isSmall ? 40 : 46,
	                  borderRadius: 999,
	                  border: "1px solid var(--border)",
	                  background: "var(--card)",
	                  color: openRight ? "var(--primary)" : "var(--text)",
	                  display: "grid",
	                  placeItems: "center",
	                  cursor: "pointer",
	                  transition: "color .15s ease, transform .12s ease",
	                }}
	              >
	                {mounted ? (
	                  <span
	                    aria-hidden
	                    style={{
	                      width: isSmall ? 26 : 30,
	                      height: isSmall ? 26 : 30,
	                      display: "block",
	                      backgroundColor: "currentColor",
	                      WebkitMaskImage: "url(/svg_more.svg)",
	                      maskImage: "url(/svg_more.svg)",
	                      WebkitMaskRepeat: "no-repeat",
	                      maskRepeat: "no-repeat",
	                      WebkitMaskPosition: "center",
	                      maskPosition: "center",
	                      WebkitMaskSize: `${isSmall ? 22 : 26}px ${isSmall ? 22 : 26}px`,
	                      maskSize: `${isSmall ? 22 : 26}px ${isSmall ? 22 : 26}px`,
	                      pointerEvents: "none",
	                    }}
	                  />
	                ) : (
	                  <>⋯</>
	                )}
	              </button>
	            </div>
	          </>
		        ) : (
	          <>
	            {/* Left: navigation */}
	            <div style={{ gridColumn: 1, justifySelf: "start", minWidth: 0, display: "flex", alignItems: "center", gap: isSmall ? 8 : 12 }}>
			              <button
			                onClick={() => {
			                  setOpen(true);
			                  setOpenRight(false);
			                }}
                  onPointerEnter={() => setNavBtnHover(true)}
                  onPointerLeave={() => { setNavBtnHover(false); setNavBtnPressed(false); }}
                  onPointerDown={() => setNavBtnPressed(true)}
                  onPointerUp={() => setNavBtnPressed(false)}
                  onPointerCancel={() => setNavBtnPressed(false)}
		                aria-label="Open menu"
		                style={{
		                  width: isSmall ? 40 : 46,
		                  height: isSmall ? 40 : 46,
		                  padding: 3,
		                  borderRadius: 999,
		                  border: "1px solid",
		                  borderColor: open
                        ? "color-mix(in srgb, var(--primary) 45%, var(--border))"
                        : navBtnHover
                          ? "color-mix(in srgb, var(--primary) 24%, var(--border))"
                          : "var(--border)",
		                  background: "var(--card)",
		                  color: "var(--text)",
		                  fontWeight: "var(--fw-bold)",
		                  cursor: "pointer",
		                  display: "grid",
		                  placeItems: "center",
		                  overflow: "hidden",
		                  boxShadow: navBtnPressed
                        ? "0 6px 16px rgba(0,0,0,0.14), inset 0 0 0 2px rgba(0,0,0,0.28)"
		                        : (navBtnHover || open)
		                          ? "0 12px 28px rgba(0,0,0,0.18), inset 0 0 0 2px rgba(0,0,0,0.28)"
		                          : "0 8px 20px rgba(0,0,0,0.14), inset 0 0 0 2px rgba(0,0,0,0.28)",
		                  transform: navBtnPressed
                        ? "scale(0.96)"
                        : (navBtnHover || open)
                          ? "translateY(-1px)"
                          : "none",
		                  transition: "transform .12s ease, box-shadow .15s ease, border-color .15s ease",
		                }}
		              >
	                {mounted ? (
	                  activePropertyPhotoUrl ? (
	                    <img
	                      src={activePropertyPhotoUrl}
	                      alt=""
	                      width={isSmall ? 34 : 40}
	                      height={isSmall ? 34 : 40}
	                      style={{
	                        display: "block",
	                        width: "100%",
	                        height: "100%",
		                        borderRadius: 999,
		                        objectFit: "cover",
		                        pointerEvents: "none",
	                      }}
                      onError={() => setActivePropertyPhotoUrl(null)}
                    />
                  ) : (
	                    <span
	                      aria-hidden
	                      style={{
	                        width: isSmall ? 32 : 38,
	                        height: isSmall ? 32 : 38,
	                        display: "block",
	                        backgroundColor: "currentColor",
	                        WebkitMaskImage: "url(/svg_navigation.svg)",
	                        maskImage: "url(/svg_navigation.svg)",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
	                        WebkitMaskPosition: "center",
	                        maskPosition: "center",
	                        WebkitMaskSize: `${isSmall ? 24 : 28}px ${isSmall ? 24 : 28}px`,
	                        maskSize: `${isSmall ? 24 : 28}px ${isSmall ? 24 : 28}px`,
	                        pointerEvents: "none",
	                      }}
	                    />
                  )
                ) : (
                  <>≡</>
                )}
              </button>
            </div>

	            {/* Center: title */}
	            <div
	              style={{
	                gridColumn: 2,
	                justifySelf: "center",
	                minWidth: 0,
	                width: "100%",
	                display: "flex",
	                alignItems: "center",
	                justifyContent: "center",
                gap: isSmall ? 6 : 10,
                flexWrap: "wrap",
              }}
            >
              <h1
                style={{
                  ...titleStyle(isSmall),
                  ...(typeof renderedTitle === "string"
                    ? {
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow:
                          noEllipsisTitle || shrinkInsteadOfEllipsisTitle ? "clip" : "ellipsis",
                        fontSize: noEllipsisTitle
                          ? "clamp(14px, 3.6vw, var(--fs-h))"
                          : shrinkInsteadOfEllipsisTitle
                            ? "clamp(13px, 3.3vw, 18px)"
                            : undefined,
                        letterSpacing: noEllipsisTitle || shrinkInsteadOfEllipsisTitle ? "0.06em" : undefined,
                      }
                    : { whiteSpace: "normal", overflow: "visible", textOverflow: "clip" }),
                }}
              >
                {renderedTitle}
              </h1>
              {pillEl}
            </div>

            {/* Right: actions + management */}
	            <div
	              style={{
	                gridColumn: 3,
	                justifySelf: "end",
	                display: "flex",
	                alignItems: "center",
	                gap: isSmall ? 8 : 12,
	                flexWrap: "nowrap",
                width: "auto",
                justifyContent: "flex-end",
                marginTop: 0,
                minWidth: 0,
              }}
            >
              {right}
              <button
                onClick={() => {
                  setOpenRight(true);
                  setOpen(false);
                }}
                onPointerEnter={() => setMgmtBtnHover(true)}
                onPointerLeave={() => { setMgmtBtnHover(false); setMgmtBtnPressed(false); }}
                onPointerDown={() => setMgmtBtnPressed(true)}
                onPointerUp={() => setMgmtBtnPressed(false)}
                onPointerCancel={() => setMgmtBtnPressed(false)}
                aria-label="Open management menu"
                style={{
                  width: isSmall ? 40 : 46,
                  height: isSmall ? 40 : 46,
                  padding: 0,
                  borderRadius: 999,
                  border: "1px solid",
                  borderColor: openRight
                    ? "color-mix(in srgb, var(--primary) 45%, var(--border))"
                    : mgmtBtnHover
                      ? "color-mix(in srgb, var(--primary) 24%, var(--border))"
                      : "var(--border)",
                  background: "var(--card)",
                  color: "var(--text)",
                  fontWeight: "var(--fw-bold)",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: mgmtBtnPressed
                    ? "0 6px 16px rgba(0,0,0,0.14), inset 0 0 0 2px rgba(0,0,0,0.28)"
                    : (mgmtBtnHover || openRight)
                      ? "0 12px 28px rgba(0,0,0,0.18), inset 0 0 0 2px rgba(0,0,0,0.28)"
                      : "0 8px 20px rgba(0,0,0,0.14), inset 0 0 0 2px rgba(0,0,0,0.28)",
                  transform: mgmtBtnPressed
                    ? "scale(0.96)"
                    : (mgmtBtnHover || openRight)
                      ? "translateY(-1px)"
                      : "none",
                  transition: "transform .12s ease, box-shadow .15s ease, border-color .15s ease",
                }}
              >
                {mounted ? (
                  <span
                    aria-hidden
                    style={{
                      width: isSmall ? 32 : 38,
                      height: isSmall ? 32 : 38,
                      display: "block",
                      backgroundColor: "currentColor",
                      WebkitMaskImage: "url(/svg_more.svg)",
                      maskImage: "url(/svg_more.svg)",
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                      WebkitMaskSize: `${isSmall ? 24 : 28}px ${isSmall ? 24 : 28}px`,
                      maskSize: `${isSmall ? 24 : 28}px ${isSmall ? 24 : 28}px`,
                      pointerEvents: "none",
                    }}
                  />
                ) : (
                  <>⋯</>
                )}
              </button>
            </div>
          </>
        )}
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
              bottom: 0,
              left: 0,
              width: isMobileNav ? 240 : 280,
              maxWidth: "86vw",
              background: "var(--panel)",
              color: "var(--muted)",
              borderRight: "1px solid var(--border)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
              zIndex: 121, // peste header
              display: "grid",
              gridTemplateRows: logoutItem ? "auto 1fr auto" : "auto 1fr",
              paddingTop: isSmall ? "var(--safe-top)" : "calc(var(--safe-top) + 8px)",
              paddingBottom: isMobileNav ? "var(--nav-h, 0px)" : 0,
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
              <h2 style={drawerTitleStyle()}>{t.navigation}</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--text)",
                  fontWeight: "var(--fw-medium)",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                ✕
              </button>
            </div>

	            <nav
	              style={{
	                padding: isMobileNav ? 12 : 10,
	                overflowY: "auto",
	                WebkitOverflowScrolling: "touch",
	                paddingBottom: isMobileNav ? "calc(16px + var(--safe-bottom, 0px))" : "16px",
	              }}
	            >
                <div style={drawerSectionTitleStyle(!isMobileNav)}>
                  {isMobileNav ? t.navigation : t.recurring}
                </div>
		              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: isMobileNav ? 4 : 2 }}>
		                {navLeft.filter((it) => !isMobileNav || it.href !== "/auth/logout").map((it) => {
		                  const active = currentPath
		                    ? it.href === "/app/dashboard"
		                      ? currentPath === "/app/dashboard"
		                      : currentPath === it.href || currentPath.startsWith(it.href + "/")
		                    : false;

	                  const isInbox = it.href === "/app/guest";

	                  const ICON_SIZE = isMobileNav ? 22 : 32;
	                  const ICON_COL = isMobileNav ? 32 : 40;
	                  const ICON_ROW = isMobileNav ? 28 : 32;
                    const itemPadding = isMobileNav ? "10px 10px" : "8px 8px";
                    const itemRadius = isMobileNav ? 12 : 12;

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
		                          display: "grid",
		                          gridTemplateColumns: `${ICON_COL}px 1fr`,
		                          alignItems: "center",
		                          columnGap: 8,
		                          padding: itemPadding,
		                          borderRadius: itemRadius,
		                          border: "none",
		                          background:
                                (active || hoverLeft === it.href || pressedLeft === it.href)
                                  ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                                  : "transparent",
		                          color: active || hoverLeft === it.href || pressedLeft === it.href ? "var(--primary)" : "var(--muted)",
		                          fontFamily: "inherit",
		                          fontSize: "var(--fs-b)",
		                          fontWeight: active ? "var(--fw-bold)" : "var(--fw-medium)",
		                          lineHeight: "var(--lh-b)",
		                          letterSpacing: "-0.01em",
		                          position: "relative",
		                          cursor: "pointer",
		                          transform: pressedLeft === it.href ? "scale(0.98)" : (hoverLeft === it.href && !active ? "scale(1.02)" : undefined),
		                          transition: "transform .12s ease, color .15s ease",
		                        }}
		                      >
	                        <span
	                          aria-hidden
	                          style={{ width: ICON_COL, height: ICON_ROW, display: "grid", placeItems: "center" }}
	                        >
	                          <NavIcon href={it.href} emoji={it.emoji} size={ICON_SIZE} />
	                        </span>
	                        <span style={{ display: "flex", alignItems: "center", gap: 8, color: "currentColor" }}>
	                          {navLabel(it.href, it.label)}
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

            {isMobileNav && logoutItem ? (
              <div
                style={{
                  padding: "12px 12px calc(12px + var(--safe-bottom, 0px))",
                  borderTop: "1px solid var(--border)",
                  background: "color-mix(in srgb, var(--panel) 92%, transparent)",
                }}
              >
                <button
                  onClick={() => hardNavigate(logoutItem.href)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "grid",
                    gridTemplateColumns: "32px 1fr",
                    alignItems: "center",
                    columnGap: 8,
                    padding: "10px 10px",
                    borderRadius: 12,
                    border: "none",
                    background: "transparent",
                    color: "var(--muted)",
                    fontFamily: "inherit",
                    fontSize: "var(--fs-b)",
                    fontWeight: "var(--fw-medium)",
                    lineHeight: "var(--lh-b)",
                    cursor: "pointer",
                  }}
                >
                  <span aria-hidden style={{ width: 32, height: 28, display: "grid", placeItems: "center" }}>
                    <NavIcon href={logoutItem.href} emoji={logoutItem.emoji} size={22} />
                  </span>
                  <span style={{ color: "currentColor" }}>{navLabel(logoutItem.href, logoutItem.label)}</span>
                </button>
              </div>
            ) : null}
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
              bottom: 0,
              right: 0,
              width: isMobileNav ? 240 : 280,
              maxWidth: "86vw",
              background: "var(--panel)",
              color: "var(--muted)",
              borderLeft: "1px solid var(--border)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
              zIndex: 121, // peste header
              display: "grid",
              gridTemplateRows: logoutItem ? "auto 1fr auto" : "auto 1fr",
              paddingTop: isSmall ? "var(--safe-top)" : "calc(var(--safe-top) + 8px)",
              paddingBottom: isMobileNav ? "var(--nav-h, 0px)" : 0,
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
              <h2 style={drawerTitleStyle()}>{t.management}</h2>
              <button
                onClick={() => setOpenRight(false)}
                aria-label="Close"
	                style={{
	                  width: 36,
	                  height: 36,
	                  borderRadius: 999,
	                  border: "1px solid var(--border)",
	                  background: "var(--card)",
	                  color: "var(--text)",
	                  fontWeight: "var(--fw-medium)",
	                  cursor: "pointer",
	                  display: "grid",
	                  placeItems: "center",
	                }}
	              >
	                ✕
	              </button>
            </div>

	            <nav
	              style={{
	                padding: isMobileNav ? 12 : 10,
	                overflowY: "auto",
	                WebkitOverflowScrolling: "touch",
	                paddingBottom: "16px",
	              }}
	            >
                {navSectionsRight.map((section, idx) => (
                  <div
                    key={section.key}
                    style={{
                      marginBottom: isMobileNav ? 12 : 14,
                      borderTop: idx > 0 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div style={drawerSectionTitleStyle(!isMobileNav)}>
                      {section.key === "main"
                        ? t.main
                        : section.key === "operations"
                          ? t.operations
                          : section.key === "setup"
                            ? t.setup
                            : section.key === "account"
                              ? t.account
                              : t.other}
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: isMobileNav ? 4 : 2 }}>
                      {section.items.map((it) => {
		                  const active = currentPath
		                    ? it.href === "/app/dashboard"
		                      ? currentPath === "/app/dashboard"
		                      : currentPath === it.href || currentPath.startsWith(it.href + "/")
		                    : false;

	                  const isInbox = it.href === "/app/guest";

	                  const ICON_SIZE = isMobileNav ? 22 : 32;
	                  const ICON_COL = isMobileNav ? 32 : 40;
	                  const ICON_ROW = isMobileNav ? 28 : 32;
                    const itemPadding = isMobileNav ? "10px 10px" : "8px 8px";
                    const itemRadius = isMobileNav ? 12 : 12;

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
	                          display: "grid",
	                          gridTemplateColumns: `${ICON_COL}px 1fr`,
	                          alignItems: "center",
	                          columnGap: 8,
	                          padding: itemPadding,
	                          borderRadius: itemRadius,
	                          border: "none",
	                          background:
                              (active || hoverRight === it.href || pressedRight === it.href)
                                ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                                : "transparent",
	                          color: active || hoverRight === it.href || pressedRight === it.href ? "var(--primary)" : "var(--muted)",
	                          fontFamily: "inherit",
	                          fontSize: "var(--fs-b)",
	                          fontWeight: active ? "var(--fw-bold)" : "var(--fw-medium)",
	                          lineHeight: "var(--lh-b)",
	                          letterSpacing: "-0.01em",
	                          position: "relative",
	                          cursor: "pointer",
	                          transform: pressedRight === it.href ? "scale(0.98)" : (hoverRight === it.href && !active ? "scale(1.02)" : undefined),
	                          transition: "transform .12s ease, color .15s ease",
	                        }}
	                      >
	                        <span
	                          aria-hidden
	                          style={{ width: ICON_COL, height: ICON_ROW, display: "grid", placeItems: "center" }}
	                        >
	                          <NavIcon href={it.href} emoji={it.emoji} size={ICON_SIZE} />
	                        </span>
	                        <span style={{ display: "flex", alignItems: "center", gap: 8, color: "currentColor" }}>
	                          {navLabel(it.href, it.label)}
	                          {isInbox && inboxCount > 0 && (
	                            <span style={inboxDotStyle}>{inboxCount > 99 ? "99+" : inboxCount}</span>
	                          )}
	                        </span>
	                      </button>
	                    </li>
                  );
                })}
                    </ul>
                  </div>
                ))}
            </nav>

            {logoutItem ? (
              <div
                style={{
                  padding: isMobileNav ? "12px 12px calc(12px + var(--safe-bottom, 0px))" : "12px",
                  borderTop: "1px solid var(--border)",
                  background: "color-mix(in srgb, var(--panel) 92%, transparent)",
                }}
              >
                <button
                  onClick={() => {
                    setOpenRight(false);
                    hardNavigate(logoutItem.href);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "grid",
                    gridTemplateColumns: "32px 1fr",
                    alignItems: "center",
                    columnGap: 8,
                    padding: "10px 10px",
                    borderRadius: 12,
                    border: "none",
                    background: "transparent",
                    color: "var(--muted)",
                    fontFamily: "inherit",
                    fontSize: "var(--fs-b)",
                    fontWeight: "var(--fw-medium)",
                    lineHeight: "var(--lh-b)",
                    cursor: "pointer",
                  }}
                >
                  <span aria-hidden style={{ width: 32, height: 28, display: "grid", placeItems: "center" }}>
                    <NavIcon href={logoutItem.href} emoji={logoutItem.emoji} size={22} />
                  </span>
                  <span style={{ color: "currentColor" }}>{navLabel(logoutItem.href, logoutItem.label)}</span>
                </button>
              </div>
            ) : null}
          </aside>
        </>
      )}
    </>
  );
}

// Notifications UI moved to /app/notifications

/* ---------------- Tiny style helpers ---------------- */
const inboxDotStyle: React.CSSProperties = {
  minWidth: 18,
  height: 18,
  borderRadius: 999,
  padding: "0 8px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "var(--fs-s)",
  fontWeight: "var(--fw-bold)",
  background: "var(--danger)",
  color: "#0c111b",
  border: "1px solid var(--danger)",
  lineHeight: 1,
};
