"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "@/app/app/_components/HeaderContext";
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
  id: string | null;
  property_id: string;
  room_id: string | null;
  start_date: string;
  end_date: string;
  status: "green" | "yellow" | "red";
  _room_label?: string | null;
  _room_type_id?: string | null;
  _room_type_name?: string | null;
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

const STATUS_LABEL: Record<OverviewRow["status"], string> = {
  green: "New booking",
  yellow: "Awaiting",
  red: "Mismatched booking",
};

const STATUS_COLOR: Record<OverviewRow["status"], string> = {
  green: "#6CCC4C",
  yellow: "#F1D82C",
  red: "#ED4337",
};

function statusTooltip(row: OverviewRow): string | undefined {
  if (row.status === "yellow") {
    if (row._reason === "waiting_form") {
      return "Awaiting OTA iCal event. Wait up to ~2h after the form submission.";
    }
    if (row._reason === "waiting_ical") {
      return "Awaiting guest check-in form. Up to 3 days before arrival.";
    }
    return "Awaiting additional info.";
  }
  if (row.status === "red") {
    if (row._reason === "missing_form") return "No check-in form was received for this OTA reservation.";
    if (row._reason === "no_ota_found") return "Form dates do not match any OTA reservation.";
    if (row._reason === "type_conflict") return "Room type conflict between OTA and check-in form.";
    if (row._reason === "room_required_auto_failed") return "No free room of the booked type for auto-assignment.";
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

// normalizează pentru căutare (remove diacritics + lowercase)
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
  const nText = norm(text);
  const nQ = norm(query);
  if (!nQ) return text;
  if (!nText.includes(nQ)) return text;

  const raw = text;
  const parts: React.ReactNode[] = [];
  const rx = new RegExp(escapeRegExp(query), "ig");
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(raw))) {
    const start = m.index;
    const end = m.index + m[0].length;
    if (start > last) parts.push(raw.slice(last, start)); // ✅ () not []
    parts.push(
      <mark
        key={start}
        style={{
          background: "color-mix(in srgb, var(--primary) 25%, transparent)",
          padding: "0 2px",
          borderRadius: 4,
        }}
      >
        {raw.slice(start, end)} {/* ✅ () not [] */}
      </mark>
    );
    last = end;
  }
  if (last < raw.length) parts.push(raw.slice(last)); // ✅ () not []
  return parts;
}

/* ───────────────── Component ───────────────── */

export default function GuestOverviewClient({ initialProperties }: { initialProperties: Property[] }) {
  const supabase = createClient();
  const { setPill } = useHeader();

  // Responsive
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 560 : false
  );
  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 560);
    onR();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // Properties & selection
  const [properties, setProperties] = useState<Property[]>(initialProperties || []);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(initialProperties?.[0]?.id ?? null);

  // Data
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<OverviewRow[]>([]);
  const [loading, setLoading] = useState<"idle" | "loading" | "error">("idle");
  const [hint, setHint] = useState<string>("");

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

  // Loaders
  const refresh = useCallback(async () => {
    if (!activePropertyId) return;
    setLoading("loading");
    setPill("Loading…");
    setHint("Loading…");

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
      setHint(rRooms.error?.message || "Failed to load rooms.");
      return;
    }

    setRooms((rRooms.data ?? []) as Room[]);

    try {
      const res = await fetch(`/api/guest-overview?property=${encodeURIComponent(activePropertyId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      const arr: OverviewRow[] = Array.isArray(j?.items) ? j.items : [];
      setItems(arr);
      setLoading("idle");
      setPill("Idle");
      setHint("");
    } catch (e: any) {
      setLoading("error");
      setPill("Error");
      setHint(e?.message || "Failed to load guest overview.");
    }
  }, [activePropertyId, supabase, setPill]);

  useEffect(() => {
    setProperties(initialProperties || []);
    if (!activePropertyId && initialProperties?.[0]?.id) {
      setActivePropertyId(initialProperties[0].id);
    }
  }, [initialProperties, activePropertyId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Maps & sorted rows
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

  // Apply search filter
  const visibleRows = useMemo(() => {
    const q = norm(query);
    if (!q) return rows;
    return rows.filter((r) => {
      const name = norm(fullName(r));
      return name.includes(q);
    });
  }, [rows, query]);

  // Styles
  const containerStyle: React.CSSProperties = {
    margin: "0 auto",
    width: "min(960px, 100%)",
    padding: isMobile ? "10px 12px 16px" : "16px",
    paddingBottom: "calc(16px + var(--safe-bottom))",
  };
  const controlsLeft: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  };
  const selectStyle: React.CSSProperties = {
    minWidth: isMobile ? "100%" : 220,
    width: isMobile ? "100%" : undefined,
    padding: "8px 10px",
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    fontWeight: 700,
    fontFamily: "inherit",
  };
  const searchWrap: React.CSSProperties = { position: "relative", width: "100%" };
  const searchInput: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px 10px 36px",
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 29,
    fontWeight: 700,
    fontFamily: "inherit",
    outline: "none",
  };
  const searchIcon: React.CSSProperties = {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    width: 18,
    height: 18,
    opacity: 0.7,
    pointerEvents: "none",
  };
  const clearBtn: React.CSSProperties = {
    position: "absolute",
    right: 6,
    top: "50%",
    transform: "translateY(-50%)",
    width: 24,
    height: 24,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--muted)",
    cursor: "pointer",
  };
  const actionsRow = (wrap?: boolean): React.CSSProperties => ({
    display: wrap ? "grid" : "flex",
    gridTemplateColumns: wrap ? "1fr" : undefined,
    alignItems: "center",
    justifyContent: wrap ? "stretch" : "flex-end",
    gap: 8,
    flexWrap: wrap ? undefined : "wrap",
  });

  const badgeStyle = (kind: OverviewRow["status"]): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 999,
    border: `1px solid ${STATUS_COLOR[kind]}`,
    background: STATUS_COLOR[kind], // solid fill
    color: "#fff", // white text on both themes
    letterSpacing: 0.2,
  });

  // Actions
  const copyCheckinLink = useCallback(async (propertyId: string, key: string) => {
    const link = buildPropertyCheckinLink(propertyId);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedKey(key);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopiedKey(null), 1500);
    } catch { prompt("Copy this link:", link); }
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
            gridTemplateColumns: isMobile ? "1fr" : "auto 1fr",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div style={controlsLeft}>
            <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800, width: isMobile ? "100%" : "auto" }}>
              Property
            </label>
            <select
              value={activePropertyId ?? ""}
              onChange={(e) => setActivePropertyId((e.target as HTMLSelectElement).value || null)}
              style={selectStyle}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button onClick={refresh} className="sb-btn" style={{ padding: "8px 8px", borderRadius: 10 }} title="Refresh">
              Refresh
            </button>
          </div>

          {/* Search */}
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={searchWrap}>
              <svg viewBox="0 0 24 24" aria-hidden="true" style={searchIcon}>
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 5 1.5-1.5-5-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                placeholder="Search guest name…"
                aria-label="Search guest name"
                style={searchInput}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                  style={clearBtn}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          {(["green","yellow","red"] as const).map((k) => (
            <span key={k} style={badgeStyle(k)}>{STATUS_LABEL[k]}</span>
          ))}
        </div>

        {/* Rows */}
        <div style={{ display: "grid", gap: 10 }}>
          {visibleRows.map((it) => {
            const rawName = fullName(it) || "Unknown guest";
            // if green but no room yet, treat as yellow "awaiting"
            const effectiveStatus: OverviewRow["status"] = it.status === "green" && !it.room_id ? "yellow" : it.status;
            const roomLabel = it._room_label ?? "—";
            const typeName = it._room_type_name ?? "—";
            const propertyId = activePropertyId!;
            const key = `${it.id ?? "noid"}|${it.start_date}|${it.end_date}|${it._room_type_id ?? "null"}`;
            const showCopy =
              effectiveStatus !== "green" &&
              ((effectiveStatus === "yellow" && it._reason === "waiting_form") ||
                (effectiveStatus === "red" && it._reason === "missing_form"));

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
                {/* Top line */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <em
                    style={{
                      letterSpacing: 0.2,
                      fontStyle: "italic",
                      fontWeight: 400,
                      wordBreak: "break-word",
                    }}
                  >
                    <span>{highlight(rawName, query)}</span> · Room: {roomLabel} — Type: {typeName}
                    <br />
                    {formatRange(it.start_date, it.end_date)}
                  </em>
                  <div style={{ justifySelf: isMobile ? "start" : "end" }}>
                    <span
                      style={badgeStyle(effectiveStatus)}
                      title={statusTooltip(it)}
                      aria-label={statusTooltip(it)}
                    >
                      {STATUS_LABEL[effectiveStatus]}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={actionsRow(isMobile)}>
                  {effectiveStatus === "green" && canEditGuest && (
                    <button
                      onClick={() => openReservation(it, propertyId)}
                      disabled={!it.room_id || !roomById.has(String(it.room_id))}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: it.room_id && roomById.has(String(it.room_id)) ? "var(--primary)" : "var(--card)",
                        color: it.room_id && roomById.has(String(it.room_id)) ? "#0c111b" : "var(--text)",
                        fontWeight: 900,
                        cursor: it.room_id && roomById.has(String(it.room_id)) ? "pointer" : "not-allowed",
                        width: isMobile ? "100%" : undefined,
                      }}
                      title={it.room_id ? "Open reservation" : "No room assigned yet"}
                    >
                      Open reservation
                    </button>
                  )}

                  {effectiveStatus === "green" && (
                    <button
                      onClick={() => setRmModal({ propertyId, item: it })}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: "var(--text)",
                        fontWeight: 900,
                        cursor: "pointer",
                        width: isMobile ? "100%" : undefined,
                      }}
                      title="Reservation message"
                    >
                      Reservation message
                    </button>
                  )}

                  {showCopy && (
                    <button
                      onClick={() => copyCheckinLink(propertyId, key)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: "var(--text)",
                        fontWeight: 900,
                        cursor: "pointer",
                        width: isMobile ? "100%" : undefined,
                      }}
                      title="Copy check-in link"
                    >
                      {copiedKey === key ? "Copied!" : "Copy check-in link"}
                    </button>
                  )}

                  {effectiveStatus === "red" && canEditGuest && (
                    <button
                      onClick={() => resolveInCalendar(it)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--danger)",
                        background: "transparent",
                        color: "var(--text)",
                        fontWeight: 900,
                        cursor: "pointer",
                        width: isMobile ? "100%" : undefined,
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
                <button className="sb-btn" onClick={() => setRmModal(null)}>Close</button>
              </div>
              <RMContent propertyId={rmModal.propertyId} row={rmModal.item} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────── Reservation Message (safe HTML build) ───────────────── */

function RMContent({ propertyId, row }: { propertyId: string; row: any }) {
  const storageKey = `p4h:rm:template:${propertyId}`;
  const [tpl, setTpl] = useState<any>(null);
  const [values, setValues] = useState<Record<string,string>>({});
  const [preview, setPreview] = useState<string>("");
  const [copied, setCopied] = useState(false);

  function _escapeHtml(s: string) { return (s||"").replace(/[&<>"']/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] as string)); }
  function _replaceVarsHtml(html: string, vars: Record<string,string>) {
    if (!html) return "";
    const withVars = html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => _escapeHtml(vars?.[k] ?? `{{${k}}}`));
    return withVars.replace(/\r?\n/g, "<br/>");
  }
  function _renderHeadingSafe(src: string, vars: Record<string,string>) {
    const s = src || "";
    const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    let out: string[] = []; let last = 0; let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      out.push(_escapeHtml(s.slice(last, m.index))); // ✅ () not []
      const key = m[1];
      out.push(_escapeHtml(vars?.[key] ?? `{{${key}}}`));
      last = m.index + m[0].length;
    }
    out.push(_escapeHtml(s.slice(last))); // ✅ () not []
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setTpl(raw ? JSON.parse(raw) : null);
    } catch { setTpl(null); }
  }, [storageKey]);

  useEffect(() => {
    if (!tpl) { setPreview(""); return; }
    const builtins: Record<string,string> = {
      guest_first_name: (row._guest_first_name || "").toString(),
      guest_last_name: (row._guest_last_name || "").toString(),
      check_in_date: row.start_date,
      check_in_time: "14:00",
      check_out_date: row.end_date,
      check_out_time: "11:00",
      room_name: row._room_label || "",
      room_type: row._room_type_name || "",
      property_name: "",
    };
    const merged = { ...builtins, ...values };
    setPreview(_renderRM(tpl, merged));
  }, [tpl, values, row]);

  async function onCopyPreview() {
    try {
      const text = preview.replace(/<br\/>/g, "\n").replace(/<[^>]+>/g, "");
      await navigator.clipboard.writeText(text);
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
                    style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", color: "var(--text)", fontFamily: "inherit" }}
                    value={values[f.key] || ""}
                    onChange={(e)=>setValues(prev=>({ ...prev, [f.key]: e.currentTarget.value }))}
                    placeholder={f.label}
                  />
                </div>
              ))}
            </div>
          )}

          <div
            style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--panel)", padding: 12 }}
            dangerouslySetInnerHTML={{ __html: preview || "" }}
          />

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button className="sb-btn" onClick={onCopyPreview}>{copied ? "Copied!" : "Copy preview"}</button>
            <GenerateLinkButton propertyId={propertyId} bookingId={row.id} values={values} />
          </div>
        </>
      )}
    </div>
  );
}

function GenerateLinkButton({ propertyId, bookingId, values }:{ propertyId: string; bookingId: string|null; values: Record<string,string> }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  async function onClick() {
    if (!bookingId) { alert("Missing booking id"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/reservation-message/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: propertyId, booking_id: bookingId, values }),
      });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) { alert(j?.error || "Failed to generate link"); setBusy(false); return; }
      const url = j?.url as string;
      if (url) {
        try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(()=>setCopied(false), 1500); }
        catch { prompt("Copy link:", url); }
      }
    } catch (e:any) {
      alert(e?.message || "Network error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button className="sb-btn sb-btn--primary" onClick={onClick} disabled={busy || !bookingId} title={bookingId ? "Generate link" : "No booking id"}>
      {copied ? "Copied!" : (busy ? "Generating…" : "Copy link")}
    </button>
  );
}