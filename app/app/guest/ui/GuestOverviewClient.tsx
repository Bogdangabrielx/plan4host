// app/app/guestOverview/ui/GuestOverviewClient.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "@/app/app/_components/HeaderContext";
import { usePersistentProperty } from "@/app/app/_components/PropertySelection";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import RoomDetailModal from "@/app/app/calendar/ui/RoomDetailModal";

/* ───────────────── Types ───────────────── */

type Property = {
  id: string;
  name: string;
  check_in_time: string | null;
  check_out_time: string | null;
  regulation_pdf_url?: string | null;
};
type Room = { id: string; name: string; property_id: string; room_type_id?: string | null };

type OverviewRow = {
  id: string | null;               // booking id
  property_id: string;
  room_id: string | null;
  start_date: string;
  end_date: string;
  status: "green" | "yellow" | "red";
  _room_label?: string | null;
  _room_type_id?: string | null;
  _room_type_name?: string | null;
  _ota_provider?: string | null;
  _ota_color?: string | null;
  _ota_logo_url?: string | null;
  _reason?:
    | "waiting_form"
    | "waiting_ical"
    | "missing_form"
    | "no_ota_found"
    | "type_conflict"
    | "room_required_auto_failed"
    | null;
  _cutoff_ts?: string | null;
  _guest_first_name?: string | null;
  _guest_last_name?: string | null;
};

/* ───────────────── Helpers ───────────────── */

function fmtDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}
function formatRange(a: string, b: string) {
  return `${fmtDate(a)} → ${fmtDate(b)}`;
}
function fullName(item: OverviewRow): string {
  const f = (item._guest_first_name ?? "").trim();
  const l = (item._guest_last_name ?? "").trim();
  return [f, l].filter(Boolean).join(" ").trim() || "—";
}

/** UI labels for statuses */
const STATUS_LABEL: Record<OverviewRow["status"], string> = {
  green: "New booking",
  yellow: "Awaiting",
  red: "Mismatched booking",
};

/** Solid badge colors (same on light/dark) */
const STATUS_COLOR: Record<OverviewRow["status"], string> = {
  green: "#6CCC4C",
  yellow: "#F1D82C",
  red: "#ED4337",
};

function statusTooltip(row: OverviewRow): string | undefined {
  const s = row.status === "green" && !row.room_id ? "yellow" : row.status;
  if (s === "yellow") {
    if (row._reason === "waiting_form") return "Awaiting guest check-in form (until 3 days before arrival).";
    if (row._reason === "waiting_ical") return "Awaiting matching OTA iCal event (up to ~2h after form submission).";
    return "Awaiting additional information.";
  }
  if (s === "red") {
    if (row._reason === "missing_form") return "No check-in form received for this OTA reservation.";
    if (row._reason === "no_ota_found") return "Form dates don’t match any OTA reservation.";
    if (row._reason === "type_conflict") return "Unmatched Room: OTA type and form type differ. Resolve in Calendar.";
    if (row._reason === "room_required_auto_failed") return "Auto-assignment failed: no free room of the booked type.";
    return "Action required.";
  }
  return undefined;
}

function getCheckinBase(): string {
  const v1 = (process.env.NEXT_PUBLIC_CHECKIN_BASE || "").toString().trim();
  if (v1) return v1.replace(/\/+$/, "");
  const v2 = (process.env.NEXT_PUBLIC_APP_URL || "").toString().trim();
  if (v2) return v2.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return "";
}
function buildPropertyCheckinLink(propertyId: string): string {
  const base = getCheckinBase();
  try {
    const u = new URL(base);
    const normalized = u.pathname.replace(/\/+$/, "");
    u.pathname = `${normalized}/checkin`;
    u.search = new URLSearchParams({ property: propertyId }).toString();
    return u.toString();
  } catch {
    return `${base.replace(/\/+$/, "")}/checkin?property=${encodeURIComponent(propertyId)}`;
  }
}

// normalize pentru căutare (fără diacritice)
function norm(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const raw = text;
  const rx = new RegExp(escapeRegExp(query), "ig");
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(raw))) {
    const start = m.index;
    const end = m.index + m[0].length;
    if (start > last) parts.push(raw.slice(last, start));
    parts.push(
      <mark
        key={start}
        style={{ background: "color-mix(in srgb, var(--primary) 25%, transparent)", padding: "0 2px", borderRadius: 4 }}
      >
        {raw.slice(start, end)}
      </mark>
    );
    last = end;
  }
  if (last < raw.length) parts.push(raw.slice(last));
  return parts;
}

/** Mobile-safe clipboard (desktop + iOS Safari fallback) */
async function copyTextMobileSafe(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (!ok) throw new Error("execCommand failed");
      return true;
    } catch {
      try { prompt("Copy link:", text); } catch {}
      return false;
    }
  }
}

/* ───────────────── Small/Mobile detection + tap helper ───────────────── */

function useIsSmall() {
  const [isSmall, setIsSmall] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(max-width: 560px), (pointer: coarse)")?.matches ?? false;
  });
  useEffect(() => {
    const mq = window.matchMedia?.("(max-width: 560px), (pointer: coarse)");
    const on = (e: MediaQueryListEvent) => setIsSmall(e.matches);
    try { mq?.addEventListener("change", on); } catch { mq?.addListener?.(on); }
    return () => {
      try { mq?.removeEventListener("change", on); } catch { mq?.removeListener?.(on); }
    };
  }, []);
  return isSmall;
}

function useTap(handler: () => void) {
  // pointer-up = fără delay pe mobil, funcționează și pe desktop
  return {
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      // ignoră clickul non-primar la mouse
      if (e.pointerType === "mouse" && (e.button ?? 0) !== 0) return;
      e.preventDefault();
      handler();
    },
  };
}

/* ───────────────── Component ───────────────── */

export default function GuestOverviewClient({ initialProperties }: { initialProperties: Property[] }) {
  const supabase = createClient();
  const { setPill } = useHeader();

  // Theme-aware icons (for light/dark)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark") return true;
    if (attr === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    try { m?.addEventListener("change", onChange); } catch { m?.addListener?.(onChange); }
    return () => {
      try { m?.removeEventListener("change", onChange); } catch { m?.removeListener?.(onChange); }
    };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const ob = new MutationObserver(() => {
      const t = root.getAttribute("data-theme");
      if (t === "dark") setIsDark(true);
      if (t === "light") setIsDark(false);
    });
    ob.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => ob.disconnect();
  }, []);
  const iconSrc = useCallback((base: "logoguest" | "room" | "night") => {
    return isDark ? `/${base}_fordark.png` : `/${base}_forlight.png`;
  }, [isDark]);
  const iconStyle: React.CSSProperties = { width: 16, height: 16, flex: "0 0 auto", opacity: 0.95 };
  const lineWrap: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, minWidth: 0 };

  // Responsive (small/mobile)
  const isSmall = useIsSmall();

  // Properties & selection
  const [properties, setProperties] = useState<Property[]>(initialProperties || []);
  const [activePropertyId, setActivePropertyId] = usePersistentProperty(properties);

  // Data
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<OverviewRow[]>([]);
  const [loading, setLoading] = useState<"idle" | "loading" | "error">("idle");

  // Search (guest name)
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  // UX small bits
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimer = useRef<number | null>(null);
  useEffect(() => () => { if (copyTimer.current) window.clearTimeout(copyTimer.current); }, []);

  // Modals
  const [modal, setModal] = useState<null | { propertyId: string; dateStr: string; room: Room }>(null);
  const [rmModal, setRmModal] = useState<null | { propertyId: string; item: OverviewRow }>(null);

  // Legend popovers
  const [legendInfo, setLegendInfo] = useState<null | "green" | "yellow" | "red">(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      let el = e.target as HTMLElement | null;
      while (el) {
        if ((el as HTMLElement).dataset?.legend === "keep") return;
        el = el.parentElement as HTMLElement | null;
      }
      setLegendInfo(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Permissions
  const [canEditGuest, setCanEditGuest] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        const me = j?.me as { role?: string; disabled?: boolean } | undefined;
        if (!me || me.disabled) { setCanEditGuest(false); return; }
        setCanEditGuest(me.role === "admin" || me.role === "editor");
      } catch { setCanEditGuest(false); }
    })();
  }, []);

  // Refresh client-side
  const refresh = useCallback(async () => {
    if (!activePropertyId) return;
    setLoading("loading");
    setPill("Loading…");

    const [rRooms] = await Promise.all([
      supabase
        .from("rooms")
        .select("id,name,property_id,room_type_id")
        .eq("property_id", activePropertyId)
        .order("name", { ascending: true }),
    ]);

    if (rRooms.error) {
      setLoading("error");
      setPill("Error");
      return;
    }
    setRooms((rRooms.data ?? []) as Room[]);

    try {
      const res = await fetch(`/api/guest-overview?property=${encodeURIComponent(activePropertyId)}`, { cache: "no-store", keepalive: true });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      const arr: OverviewRow[] = Array.isArray(j?.items) ? j.items : [];
      setItems(arr);
      setLoading("idle");
      setPill("Idle");
    } catch {
      setLoading("error");
      setPill("Error");
    }
  }, [activePropertyId, supabase, setPill]);

  useEffect(() => {
    setProperties(initialProperties || []);
  }, [initialProperties]);

  useEffect(() => { refresh(); }, [refresh]);

  // Maps & sorting
  const roomById = useMemo(() => {
    const m = new Map<string, Room>();
    rooms.forEach((r) => m.set(String(r.id), r));
    return m;
  }, [rooms]);

  const collator = useMemo(() => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }), []);
  const rows = useMemo(() => {
    return [...items].sort((a, b) => {
      const d = a.start_date.localeCompare(b.start_date);
      if (d !== 0) return d;
      return collator.compare(a._room_label ?? "", b._room_label ?? "");
    });
  }, [items, collator]);

  // Filter by name
  const visibleRows = useMemo(() => {
    const q = norm(query);
    if (!q) return rows;
    return rows.filter((r) => norm(fullName(r)).includes(q));
  }, [rows, query]);

  // Styles
  const containerStyle: React.CSSProperties = {
    margin: "0 auto",
    width: "min(960px, 100%)",
    padding: isSmall ? "10px 12px 16px" : "16px",
    paddingBottom: "calc(16px + var(--safe-bottom))",
  };
  const FIELD_STYLE: React.CSSProperties = {
    minWidth: isSmall ? "100%" : 220,
    width: isSmall ? "100%" : undefined,
    padding: "10px 12px",
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    fontWeight: 700,
    fontFamily: "inherit",
    minHeight: 44,
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
  const badgeStyle = (kind: OverviewRow["status"]): React.CSSProperties => ({
    display: "inline-block",
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 999,
    border: "1px solid " + STATUS_COLOR[kind],
    background: STATUS_COLOR[kind],
    color: "#ffffff",
    letterSpacing: 0.0,
  });
  // OTA badge helpers
  function builtinLogo(provider?: string | null): string | null {
    const p = (provider || "").toLowerCase();
    if (p.includes("booking")) return "/booking.png";
    if (p.includes("airbnb")) return "/airbnb.png";
    if (p.includes("expedia")) return "/expedia.png";
    return null;
  }
  function defaultOtaColor(provider?: string | null): string {
    const s = (provider || "").toLowerCase();
    if (s.includes("airbnb")) return "rgba(255, 90, 96, 0.81)";
    if (s.includes("booking")) return "rgba(30, 143, 255, 0.90)";
    if (s.includes("expedia")) return "rgba(254,203,46,0.81)";
    return "rgba(139,92,246,0.81)"; // violet fallback
  }
  function OtaBadge({ provider, color, logo, fullWidth }: { provider?: string | null; color?: string | null; logo?: string | null; fullWidth?: boolean }) {
    const show = !!(provider || logo);
    if (!show) return null;
    const bg = (color && color.trim()) || defaultOtaColor(provider || "");
    const src = (logo && logo.trim()) || builtinLogo(provider) || null;
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 21,
        background: bg,
        color: "#0c111b",
        border: "1px solid var(--border)",
        fontSize: 12,
        fontWeight: 800,
        width: fullWidth ? "100%" : undefined,
      }} title={provider || undefined}>
        {src ? <img src={src} alt="" width={16} height={16} style={{ borderRadius: 4 }} /> : <span style={{ width: 12, height: 12, borderRadius: 999, background: "#fff", display: "inline-block" }} />}
        <span>{provider || "OTA"}</span>
      </span>
    );
  }

  // Derive OTA badge meta (including temporary manual fallback for testing)
  function otaMetaForRow(it: OverviewRow, kind: OverviewRow["status"]): { provider?: string | null; color?: string | null; logo?: string | null } | null {
    const hasOta = !!(it._ota_provider || it._ota_color || it._ota_logo_url);
    if (hasOta) return { provider: it._ota_provider, color: it._ota_color as any, logo: it._ota_logo_url as any };
    // TEMP test: manual reservation badge — show only for manual-green (no reason, no OTA)
    if (!it._reason && kind === 'green') {
      return { provider: 'Manual', color: '#6CCC4C', logo: '/trivago.png' };
    }
    return null;
  }
  const BTN_TOUCH_STYLE: React.CSSProperties = {
    padding: "12px 14px",
    minHeight: 44,
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };

  // Actions
  const copyCheckinLink = useCallback(async (propertyId: string, key: string) => {
    const link = buildPropertyCheckinLink(propertyId);
    try {
      await copyTextMobileSafe(link);
      setCopiedKey(key);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      prompt("Copy this link:", link);
    }
  }, []);

  function resolveInCalendar(item: OverviewRow) {
    if (typeof window !== "undefined") window.location.href = `/app/calendar?date=${item.start_date}`;
  }
  function openReservation(item: OverviewRow, propertyId: string) {
    if (!item.room_id) { alert("This booking has no assigned room yet."); return; }
    const room = roomById.get(String(item.room_id));
    if (!room) { alert("Room not found locally. Try refreshing."); return; }
    setModal({ propertyId, dateStr: item.start_date, room });
  }

  // Header pill
  useEffect(() => {
    if (loading === "loading") setPill("Loading…");
    else if (loading === "error") setPill("Error");
    else setPill("Idle");
  }, [loading, setPill]);

  return (
    <div style={{ fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', color: "var(--text)" }}>
      <PlanHeaderBadge title="Guest Overview" slot="header-right" />

      <div style={containerStyle}>
        {/* Controls */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isSmall ? "1fr" : "auto 1fr",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800, width: isSmall ? "100%" : "auto" }}>
              Property
            </label>
            <select
              value={activePropertyId}
              onChange={(e) => setActivePropertyId((e.target as HTMLSelectElement).value)}
              style={FIELD_STYLE}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              className="sb-btn"
              {...useTap(refresh)}
              style={{ ...BTN_TOUCH_STYLE, borderRadius: 10 }}
              title="Refresh"
              type="button"
            >
              Refresh
            </button>
          </div>

          {/* Search */}
          <div style={{ display: "flex", justifyContent: "stretch", gridColumn: "1 / -1" }}>
            <div style={{ position: "relative", width: "100%" }}>
              <svg viewBox="0 0 24 24" aria-hidden="true" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, opacity: 0.7 }}>
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 5 1.5-1.5-5-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                placeholder="Search guest name…"
                aria-label="Search guest name"
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  background: "var(--card)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: 29,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  outline: "none",
                  minHeight: 44,
                }}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  {...useTap(() => { setQuery(""); searchRef.current?.focus(); })}
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--muted)",
                    cursor: "pointer",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Legend with popovers (legendInfo) */}
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap" }}>
          {(["green","yellow","red"] as const).map((k) => (
            <div key={k} style={{ position: "relative" }} data-legend="keep">
              <span style={badgeStyle(k)}>{STATUS_LABEL[k]}</span>
              <button
                type="button"
                {...useTap(() => setLegendInfo(legendInfo === k ? null : k))}
                aria-label={`What is ${STATUS_LABEL[k]}?`}
                style={{
                  marginLeft: 6, width: 24, height: 24, borderRadius: 6,
                  border: "1px solid var(--border)", background: "transparent",
                  color: "var(--muted)", lineHeight: 1, fontSize: 12, cursor: "pointer",
                  ...BTN_TOUCH_STYLE,
                  padding: 0, minHeight: 24,
                }}
              >
                i
              </button>

              {legendInfo === k && (
                isSmall ? (
                  <div data-legend="keep" style={{ marginTop: 6, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 8 }}>
                    {k === "green" && <div style={{ fontSize: 12, color: "var(--muted)" }}>New booking — no action required.</div>}
                    {k === "yellow" && (
                      <div style={{ fontSize: 12, color: "var(--muted)", display: "grid", gap: 2 }}>
                        <strong>Awaiting</strong>
                        <span>If form only: wait up to 2h for OTA iCal.</span>
                        <span>If iCal only: wait until 3 days before arrival or resend the form.</span>
                      </div>
                    )}
                    {k === "red" && <div style={{ fontSize: 12, color: "var(--muted)" }}>Mismatched booking — action required.</div>}
                  </div>
                ) : (
                  <div
                    data-legend="keep"
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "calc(100% + 8px)",
                      transform: "translateY(-50%)",
                      zIndex: 5,
                      background: "var(--panel)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: 8,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                      width: 260,
                      maxWidth: "min(320px, calc(100vw - 32px))",
                    }}
                  >
                    <div style={{ fontWeight: 800, marginBottom: 4 }}>{STATUS_LABEL[k]}</div>
                    {k === "green" && <div style={{ fontSize: 12, color: "var(--muted)" }}>New booking — no action required.</div>}
                    {k === "yellow" && (
                      <div style={{ fontSize: 12, color: "var(--muted)", display: "grid", gap: 2 }}>
                        <span>If form only: wait up to 2h for OTA iCal.</span>
                        <span>If iCal only: wait until 3 days before arrival or resend the form.</span>
                      </div>
                    )}
                    {k === "red" && <div style={{ fontSize: 12, color: "var(--muted)" }}>Mismatched booking — action required.</div>}
                  </div>
                )
              )}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ display: "grid", gap: 10 }}>
          {visibleRows.map((it) => {
            const rawName = fullName(it) || "Unknown guest";
            const kind: OverviewRow["status"] = it.status === "green" && !it.room_id ? "yellow" : it.status;

            const roomLabel = it._room_label ?? "—";
            const typeName = it._room_type_name ?? "—";
            const propertyId = activePropertyId!;
            const key = `${it.id ?? "noid"}|${it.start_date}|${it.end_date}|${it._room_type_id ?? "null"}`;

            const showCopy =
              kind !== "green" &&
              ((kind === "yellow" && it._reason === "waiting_form") ||
                (kind === "red" && it._reason === "missing_form"));

            return (
              <section
                key={key}
                className="sb-card"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 12,
                  background: "var(--panel)",
                  display: "grid",
                  gap: 8,
                  overflow: "hidden",
                }}
              >
                {/* Header: Badge on small above name; on desktop on the right */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isSmall ? "1fr" : "1fr auto",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "grid", gap: 4, lineHeight: 1.25, minWidth: 0 }}>
                    {isSmall && (
                      <span
                        style={{ ...badgeStyle(kind), marginBottom: 2, justifySelf: "start", width: "max-content" }}
                        title={statusTooltip(it)}
                      >
                        {STATUS_LABEL[kind]}
                      </span>
                    )}
                    {/* OTA badge will be rendered under the dates (see below) */}

                    {/* 1) Guest name */}
                    <div style={lineWrap}>
                      <Image src={iconSrc("logoguest")} alt="" width={16} height={16} style={iconStyle} />
                      <div style={{ fontWeight: 700, wordBreak: "break-word", minWidth: 0 }}>
                        {highlight(rawName, query)}
                      </div>
                    </div>

                    {/* 2) Room + optional type */}
                    <div style={lineWrap}>
                      <Image src={iconSrc("room")} alt="" width={16} height={16} style={iconStyle} />
                      <div style={{ color: "var(--muted)", minWidth: 0, overflowWrap: "anywhere" }}>
                        Room: {roomLabel}
                        {typeName && typeName !== "—" ? ` — Type: ${typeName}` : ""}
                      </div>
                    </div>

                    {/* 3) Dates */}
                    <div style={lineWrap}>
                      <Image src={iconSrc("night")} alt="" width={16} height={16} style={iconStyle} />
                      <div style={{ color: "var(--muted)" }}>
                        {formatRange(it.start_date, it.end_date)}
                      </div>
                    </div>
                  </div>

                  {!isSmall && (
                    <div style={{ justifySelf: "end", display: "grid", gap: 6, justifyItems: "end" }}>
                      <span style={badgeStyle(kind)} title={statusTooltip(it)}>
                        {STATUS_LABEL[kind]}
                      </span>
                      {(() => { const meta = otaMetaForRow(it, kind); return meta ? (
                        <OtaBadge provider={meta.provider} color={meta.color} logo={meta.logo} />
                      ) : null; })()}
                    </div>
                  )}
                </div>

                {/* OTA badge under the Dates row — mobile only (full width). */}
                {isSmall && (() => { const meta = otaMetaForRow(it, kind); return meta ? (
                  <div style={{ marginTop: 6 }}>
                    <OtaBadge provider={meta.provider} color={meta.color} logo={meta.logo} fullWidth={true} />
                  </div>
                ) : null; })()}

                {/* Actions */}
                <div
                  style={{
                    display: isSmall ? "grid" : "flex",
                    gridTemplateColumns: isSmall ? "1fr" : undefined,
                    alignItems: "center",
                    justifyContent: isSmall ? "stretch" : "flex-end",
                    gap: 8,
                    flexWrap: isSmall ? undefined : "wrap",
                  }}
                >
                  {/* Desktop: badge shown above (under status) */}
                  {kind === "green" && (
                    <>
                      <button
                        type="button"
                        {...useTap(() => setRmModal({ propertyId, item: it }))}
                        style={{
                          ...BTN_TOUCH_STYLE,
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                          color: "var(--text)",
                          fontWeight: 600,
                          cursor: "pointer",
                          width: isSmall ? "100%" : undefined,
                        }}
                        title="Reservation message"
                      >
                        Reservation message
                      </button>

                      <button
                        type="button"
                        {...useTap(() => openReservation(it, propertyId))}
                        disabled={!it.room_id || !roomById.has(String(it.room_id))}
                        aria-disabled={!it.room_id || !roomById.has(String(it.room_id))}
                        style={{
                          ...BTN_TOUCH_STYLE,
                          borderRadius: 21,
                          border: "1px solid var(--border)",
                          background: it.room_id && roomById.has(String(it.room_id)) ? "var(--primary)" : "var(--card)",
                          color: it.room_id && roomById.has(String(it.room_id)) ? "#0c111b" : "var(--text)",
                          fontWeight: 600,
                          cursor: it.room_id && roomById.has(String(it.room_id)) ? "pointer" : "not-allowed",
                          width: isSmall ? "100%" : undefined,
                        }}
                        title={it.room_id ? "Open reservation" : "No room assigned yet"}
                      >
                        Open reservation
                      </button>
                    </>
                  )}

                  {showCopy && (
                    <button
                      type="button"
                      {...useTap(() => copyCheckinLink(propertyId, key))}
                      style={{
                        ...BTN_TOUCH_STYLE,
                        borderRadius: 21,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: "var(--text)",
                        fontWeight: 600,
                        cursor: "pointer",
                        width: isSmall ? "100%" : undefined,
                      }}
                      title="Copy check-in link"
                    >
                      {copiedKey === key ? "Copied!" : "Copy check-in link"}
                    </button>
                  )}

                  {kind === "red" && (
                    <button
                      type="button"
                      {...useTap(() => resolveInCalendar(it))}
                      style={{
                        ...BTN_TOUCH_STYLE,
                        borderRadius: 21,
                        border: "1px solid var(--danger)",
                        background: "transparent",
                        color: "var(--text)",
                        fontWeight: 600,
                        cursor: "pointer",
                        width: isSmall ? "100%" : undefined,
                      }}
                      title="Resolve in Calendar"
                    >
                      Resolve in Calendar
                    </button>
                  )}
                </div>
              </section>
            );
          })}

          {visibleRows.length === 0 && (
            <div
              style={{
                border: "1px solid var(--border)",
                background: "var(--panel)",
                borderRadius: 12,
                padding: 16,
                color: "var(--muted)",
                textAlign: "center",
              }}
            >
              {query ? "No guests match your search." : "No current or upcoming reservations."}
            </div>
          )}
        </div>

        {/* Modals */}
        {modal && (
          <RoomDetailModal
            dateStr={modal.dateStr}
            propertyId={modal.propertyId}
            room={modal.room}
            forceNew={false}
            onClose={() => setModal(null)}
            onChanged={() => { refresh(); }}
          />
        )}

        {rmModal && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setRmModal(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 60, display: "grid", placeItems: "center", padding: 12 }}
          >
            <div
              onClick={(e)=>e.stopPropagation()}
              className="sb-card"
              style={{ width: "min(860px, 100%)", maxHeight: "calc(100vh - 32px)", overflow: "auto", padding: 16 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>Reservation message</strong>
                <button className="sb-btn" {...useTap(()=>setRmModal(null))} style={BTN_TOUCH_STYLE}>Close</button>
              </div>
              <RMContent propertyId={rmModal.propertyId} row={rmModal.item} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────── Reservation Message (safe HTML build, cu times live din bookings) ───────────────── */

function RMContent({ propertyId, row }: { propertyId: string; row: any }) {
  const supabase = useMemo(() => createClient(), []);
  const storageKey = `p4h:rm:template:${propertyId}`;

  const [tpl, setTpl] = useState<any>(null);
  const [values, setValues] = useState<Record<string,string>>({});
  const [preview, setPreview] = useState<string>("");

  // timpi/interval actuali, LIVE din DB bookings
  const [ciTime, setCiTime] = useState<string | null>(null);
  const [coTime, setCoTime] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(row.start_date);
  const [endDate, setEndDate] = useState<string>(row.end_date);
  const [loadingTimes, setLoadingTimes] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setTpl(raw ? JSON.parse(raw) : null);
    } catch { setTpl(null); }
  }, [storageKey]);

  // FETCH live start_time / end_time / dates
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!row?.id) return;
      setLoadingTimes(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time,end_time,start_date,end_date")
        .eq("id", row.id)
        .single();
      if (!alive) return;
      if (!error && data) {
        setCiTime(data.start_time ?? null);
        setCoTime(data.end_time ?? null);
        if (data.start_date) setStartDate(data.start_date);
        if (data.end_date) setEndDate(data.end_date);
      }
      setLoadingTimes(false);
    })();
    return () => { alive = false; };
  }, [supabase, row?.id]);

  // escape helpers
  function _escapeHtml(s: string) { return (s||"").replace(/[&<>"']/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] as string)); }
  function _replaceVarsHtml(html: string, vars: Record<string,string>) {
    if (!html) return "";
    const withVars = html.replace(/\{\{\s*([a-zA-Z0-9_]+)\}\}/g, (_m, k) => _escapeHtml(vars?.[k] ?? `{{${k}}}`));
    return withVars.replace(/\r?\n/g, "<br/>");
  }
  function _renderHeadingSafe(src: string, vars: Record<string,string>) {
    const s = src || "";
    const re = /\{\{\s*([a-zA-Z0-9_]+)\}\}/g;
    let out: string[] = []; let last = 0; let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      out.push(_escapeHtml(s.slice(last, m.index)));
      const key = m[1];
      out.push(_escapeHtml(vars?.[key] ?? `{{${key}}}`));
      last = m.index + m[0].length;
    }
    out.push(_escapeHtml(s.slice(last)));
    return out.join("");
  }
  function _renderRM(t: any, vars: Record<string,string>) {
    const out: string[] = [];
    for (const b of ((t?.blocks)||[])) {
      if (b.type === "divider") out.push('<hr style="border:1px solid var(--border); opacity:.6;"/>');
      else if (b.type === "heading") out.push(`<h3 style="margin:8px 0 6px;">${_renderHeadingSafe(b.text||"", vars)}</h3>`);
      else if (b.type === "paragraph") out.push(`<div style="margin:6px 0; line-height:1.5;">${_replaceVarsHtml(b.text||"", vars)}</div>`);
    }
    return out.join("\n");
  }

  // rebuild preview on tpl/values/time/date change
  useEffect(() => {
    if (!tpl) { setPreview(""); return; }

    const builtins: Record<string,string> = {
      guest_first_name: (row._guest_first_name || "").toString(),
      guest_last_name:  (row._guest_last_name  || "").toString(),

      check_in_date:  startDate,
      check_out_date: endDate,
      check_in_time:  ciTime || "",
      check_out_time: coTime || "",

      // aliasuri pentru șabloane mai vechi
      checkin_date:   startDate,
      checkout_date:  endDate,
      checkin_time:   ciTime || "",
      checkout_time:  coTime || "",

      room_name:      row._room_label || "",
      room_type:      row._room_type_name || "",
      property_name:  "",
    };

    const merged = { ...builtins, ...values };
    setPreview(_renderRM(tpl, merged));
  }, [tpl, values, row, ciTime, coTime, startDate, endDate]);

  const [copied, setCopied] = useState(false);
  async function onCopyPreview() {
    try {
      const text = preview.replace(/<br\/>/g, "\n").replace(/<[^>]+>/g, "");
      await copyTextMobileSafe(text);
      setCopied(true);
      setTimeout(()=>setCopied(false), 1500);
    } catch {}
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!tpl ? (
        <div style={{ color: "var(--muted)" }}>
          No template configured for this property. <a href="/app/reservationMessage" style={{ color: "var(--primary)" }}>Configure now</a>.
        </div>
      ) : (
        <>
          {(Array.isArray(tpl.fields) && tpl.fields.length > 0) && (
            <div style={{ display: "grid", gap: 8 }}>
              {tpl.fields.map((f: any) => (
                <div key={f.key} style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>{f.label}</label>
                  <input
                    style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", color: "var(--text)", fontFamily: "inherit", minHeight: 44 }}
                    value={values[f.key] || ""}
                    onChange={(e)=>setValues(prev=>({ ...prev, [f.key]: e.currentTarget.value }))}
                    placeholder={f.label}
                  />
                </div>
              ))}
            </div>
          )}

          <div
            style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--panel)", padding: 12, opacity: loadingTimes ? .7 : 1 }}
            dangerouslySetInnerHTML={{ __html: preview || "" }}
          />

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button
              type="button"
              className="sb-btn"
              {...useTap(onCopyPreview)}
              style={{ padding: "12px 14px", minHeight: 44, touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {copied ? "Copied!" : "Copy preview"}
            </button>
            <GenerateLinkButton propertyId={propertyId} bookingId={row.id} values={values} />
          </div>
        </>
      )}
    </div>
  );
}

function GenerateLinkButton({ propertyId, bookingId, values }:{
  propertyId: string;
  bookingId: string|null;
  values: Record<string,string>;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function onGenerateAndCopy() {
    if (!bookingId || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reservation-message/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: propertyId, booking_id: bookingId, values }),
        keepalive: true,
      });
      const j = await res.json().catch(()=>({}));
      if (!res.ok || !j?.url) {
        alert(j?.error || "Failed to generate link");
        return;
      }
      await copyTextMobileSafe(String(j.url));
      setCopied(true);
      setTimeout(()=>setCopied(false), 1500);
    } catch (e:any) {
      alert(e?.message || "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="sb-btn sb-btn--primary"
      {...useTap(onGenerateAndCopy)}
      disabled={busy || !bookingId}
      aria-busy={busy}
      title={bookingId ? "Copy generated link" : "No booking id"}
      style={{ padding: "12px 14px", minHeight: 44, touchAction: "manipulation", WebkitTapHighlightColor: "transparent", borderRadius: 10 }}
    >
      {busy ? "Generating…" : (copied ? "Copied!" : "Copy link")}
    </button>
  );
}
