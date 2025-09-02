"use client";

import { useEffect, useState } from "react";
import { useHeader } from "../_components/HeaderContext";

const NAV = [
  { href: "/app",            label: "Dashboard",       emoji: "🏠" },
  { href: "/app/calendar",   label: "Calendar",        emoji: "📅" },
  { href: "/app/configurator", label: "Configurator",  emoji: "⚙️" },
  { href: "/app/cleaning",   label: "Cleaning Board",  emoji: "🧹" },
  { href: "/app/channels",   label: "Channels & iCal", emoji: "🔗" },
  { href: "/app/inbox",      label: "Inbox",           emoji: "📥" },
  { href: "/auth/logout",    label: "Logout",          emoji: "🚪" },
];

export default function AppHeader({ currentPath }: { currentPath?: string }) {
  const { title, pill, right } = useHeader();
  const [open, setOpen] = useState(false);

  // Inbox count badge in the menu
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

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 16px",
          background: "var(--panel)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            style={{
              padding: 8,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ≡
          </button>

          {/* Title can be a ReactNode */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ margin: 0, fontSize: 18, lineHeight: 1 }}>{title}</div>
            {pill ? <span style={pillStyle(pill)}>{pill}</span> : null}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>{right}</div>
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
                {NAV.map((it) => {
                  const active = currentPath
                    ? currentPath === it.href || currentPath.startsWith(it.href + "/")
                    : false;
                  const isInbox = it.href === "/app/inbox";
                  return (
                    <li key={it.href}>
                      <a
                        href={it.href}
                        onClick={() => setOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 10,
                          textDecoration: "none",
                          border: "1px solid var(--border)",
                          background: active ? "var(--primary)" : "var(--card)",
                          color: active ? "#0c111b" : "var(--text)",
                          fontWeight: 800,
                          position: "relative",
                        }}
                      >
                        <span aria-hidden>{it.emoji}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {it.label}
                          {isInbox && inboxCount > 0 && (
                            <span style={inboxDotStyle}>{inboxCount > 99 ? "99+" : inboxCount}</span>
                          )}
                        </span>
                      </a>
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