"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "@/app/app/_components/HeaderContext";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import RoomDetailModal from "@/app/app/calendar/ui/RoomDetailModal";

// ---- Types din pagina server (le folosim și aici) ----
type Property = {
  id: string;
  name: string;
  check_in_time: string | null;
  check_out_time: string | null;
  regulation_pdf_url?: string | null; // opțional
};

type Room = { id: string; name: string; property_id: string; room_type_id?: string | null };
type RoomType = { id: string; name: string; property_id: string };

// ---- Forma pe care o întoarce /api/guest-overview (rows) ----
type OverviewRow = {
  id: string | null;             // booking_id
  property_id: string;
  room_id: string | null;
  start_date: string;            // yyyy-mm-dd
  end_date: string;              // yyyy-mm-dd
  status: "green" | "yellow" | "red";

  // meta opționale pentru UI
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

// ---- Helpers dată/oră & text ----
function fmtDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${dd}.${mm}.${y}`;
}
function formatRange(startYMD: string, endYMD: string): string {
  return `${fmtDate(startYMD)} → ${fmtDate(endYMD)}`;
}
function fullName(item: OverviewRow): string {
  const f = (item._guest_first_name ?? "").trim();
  const l = (item._guest_last_name ?? "").trim();
  const combined = [f, l].filter(Boolean).join(" ").trim();
  return combined || "—";
}
function toBadge(kind: OverviewRow["status"]): "GREEN" | "YELLOW" | "RED" {
  return kind === "green" ? "GREEN" : kind === "yellow" ? "YELLOW" : "RED";
}

// Link public /checkin pe proprietate
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

// Subcopy pentru stări (folosește status + _reason din OverviewRow)
function subcopyFor(row: OverviewRow): string | null {
  if (row.status === "yellow") {
    if (row._reason === "waiting_form") {
      return "Waiting for the guest to complete the check-in form (until 3 days before arrival).";
    }
    if (row._reason === "waiting_ical") {
      return "Waiting for a matching OTA iCal event (max 2 hours after form submission).";
    }
  }
  if (row.status === "red") {
    if (row._reason === "missing_form") return "No check-in form was received for this OTA reservation.";
    if (row._reason === "no_ota_found") return "Form dates do not match any OTA reservation.";
    if (row._reason === "type_conflict") return "Unmatched Room: OTA type and form type differ. Resolve in Calendar.";
    if (row._reason === "room_required_auto_failed") return "No free room of the booked type was available for auto-assignment.";
    return "Action required.";
  }
  return null;
}

// ---- Componenta principală ----
export default function GuestOverviewClient({ initialProperties }: { initialProperties: Property[] }) {
  const supabase = createClient();
  const { setPill } = useHeader();

  // Proprietăți + selecție
  const [properties, setProperties] = useState<Property[]>(initialProperties || []);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(initialProperties?.[0]?.id ?? null);

  // Date auxiliare pentru UI (Rooms + Types)
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);

  // Items din API-ul nou (/api/guest-overview)
  const [items, setItems] = useState<OverviewRow[]>([]);
  const [loading, setLoading] = useState<"idle" | "loading" | "error">("idle");
  const [hint, setHint] = useState<string>("");

  // UX: feedback “Copied!”
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimer = useRef<number | null>(null);
  useEffect(() => () => { if (copyTimer.current) window.clearTimeout(copyTimer.current); }, []);

  // Modal — deschidem rezervarea (GREEN)
  const [modal, setModal] = useState<null | { propertyId: string; dateStr: string; room: Room }>(null);
  // Reservation Message modal (stub UI for now)
  const [rmModal, setRmModal] = useState<null | { propertyId: string; item: OverviewRow }>(null);

  // Legend info popovers
  const [legendInfo, setLegendInfo] = useState<null | 'green' | 'yellow' | 'red'>(null);
  // Close legend on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      let el = e.target as HTMLElement | null;
      while (el) {
        if ((el as HTMLElement).dataset && (el as HTMLElement).dataset.legend === 'keep') return;
        el = el.parentElement as HTMLElement | null;
      }
      setLegendInfo(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Permisiuni: editor/admin pot face acțiuni (viewer = read-only)
  const [canEditGuest, setCanEditGuest] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/me', { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const me = j?.me as { role?: string; disabled?: boolean } | undefined;
        if (!me || me.disabled) { setCanEditGuest(false); return; }
        setCanEditGuest(me.role === 'admin' || me.role === 'editor');
      } catch {
        setCanEditGuest(false);
      }
    })();
  }, []);

  // Refresh (rooms + types + overview items)
  const refresh = useCallback(async () => {
    if (!activePropertyId) return;
    setLoading("loading");
    setHint("Loading…");

    // 1) Rooms + Types
    const [rRooms, rTypes] = await Promise.all([
      supabase
        .from("rooms")
        .select("id,name,property_id,room_type_id")
        .eq("property_id", activePropertyId)
        .order("name", { ascending: true }),
      supabase
        .from("room_types")
        .select("id,name,property_id")
        .eq("property_id", activePropertyId)
        .order("name", { ascending: true }),
    ]);

    if (rRooms.error || rTypes.error) {
      setLoading("error");
      setHint(rRooms.error?.message || rTypes.error?.message || "Failed to load rooms/types.");
      return;
    }

    setRooms((rRooms.data ?? []) as Room[]);
    setRoomTypes((rTypes.data ?? []) as RoomType[]);

    // 2) Overview items din API (no-store)
    try {
      const res = await fetch(`/api/guest-overview?property=${encodeURIComponent(activePropertyId)}`, { cache: "no-store" });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const j = await res.json();
      const arr: OverviewRow[] = Array.isArray(j?.items) ? j.items : [];
      setItems(arr);
      setLoading("idle");
      setHint("");
    } catch (e: any) {
      setLoading("error");
      setHint(e?.message || "Failed to load guest overview.");
    }
  }, [activePropertyId, supabase]);

  useEffect(() => {
    setProperties(initialProperties || []);
    if (!activePropertyId && initialProperties?.[0]?.id) {
      setActivePropertyId(initialProperties[0].id);
    }
  }, [initialProperties, activePropertyId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Reflect loading status in the AppHeader pill
  useEffect(() => {
    const label =
      loading === "error" ? "Error" :
      loading === "loading" ? "Loading…" : "Idle";
    setPill(label);
  }, [loading, setPill]);

  // Mape utile
  const roomById = useMemo(() => {
    const m = new Map<string, Room>();
    rooms.forEach((r) => m.set(String(r.id), r));
    return m;
  }, [rooms]);

  // Sortare: după start_date, apoi după nume cameră (natural)
  const collator = useMemo(() => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }), []);
  const rows = useMemo(() => {
    return [...items].sort((a, b) => {
      const d = a.start_date.localeCompare(b.start_date);
      if (d !== 0) return d;
      const rnA = a._room_label ?? "";
      const rnB = b._room_label ?? "";
      return collator.compare(rnA, rnB);
    });
  }, [items, collator]);

  // Badge styling
  function badgeStyle(kind: OverviewRow["status"]): React.CSSProperties {
    const base: React.CSSProperties = {
      display: "inline-block",
      padding: "2px 10px",
      fontSize: 12,
      fontWeight: 800,
      borderRadius: 999,
      border: "1px solid transparent",
      color: "#0c111b",
    };
    if (kind === "green") return { ...base, background: "transparent", borderColor: "var(--success)",color:"var(--success)" };
    if (kind === "red") return { ...base, background: "transparent", borderColor: "var(--danger)", color:"var(--danger)" };
    return { ...base, background: "transparent", borderColor: "var(--warning, #f59e0b)", color:"var(--warning, #f59e0b)" };
  }

  // Actions
  const copyCheckinLink = useCallback(async (propertyId: string, key: string) => {
    const link = buildPropertyCheckinLink(propertyId);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedKey(key);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // fallback
      prompt("Copy this link:", link);
    }
  }, []);

  function resolveInCalendar(item: OverviewRow, _propertyId: string) {
    const url = `/app/calendar?date=${item.start_date}`;
    if (typeof window !== "undefined") window.location.href = url;
  }

  function openReservation(item: OverviewRow, propertyId: string) {
    if (!item.room_id) {
      alert("This booking has no assigned room yet.");
      return;
    }
    const room = roomById.get(String(item.room_id));
    if (!room) {
      alert("Room not found locally. Try refreshing.");
      return;
    }
    setModal({ propertyId, dateStr: item.start_date, room });
  }

  // ===== Reservation Message (UI stub) =====
  type RMField = { key: string; label: string; required: boolean; multiline: boolean; placeholder?: string };
  type RMTemplate = { status: 'draft'|'published'; fields: RMField[]; blocks: Array<{ id: string; type: 'heading'|'paragraph'|'divider'; text?: string }>; };
  function tplLsKey(pid: string) { return `p4h:rm:template:${pid}`; }
  function escapeHtml(s: string) { return (s||"").replace(/[&<>"']/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] as string)); }
  function mdToHtml(src: string) {
    let s = escapeHtml(src);
    s = s.replace(/\[(.+?)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|\s)\*(.+?)\*(?=\s|$)/g, '$1<em>$2</em>');
    s = s.replace(/\n/g, '<br/>');
    return s;
  }
  function replaceVars(s: string, vars: Record<string,string>) {
    if (!s) return "";
    return s.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => (vars?.[k] ?? `{{${k}}}`));
  }
  function renderRM(tpl: RMTemplate, vars: Record<string,string>) {
    const out: string[] = [];
    for (const b of (tpl.blocks||[])) {
      if (b.type === 'divider') out.push('<hr style="border:1px solid var(--border); opacity:.6;"/>');
      else if (b.type === 'heading') out.push(`<h3 style="margin:8px 0 6px;">${escapeHtml(replaceVars(b.text||'', vars))}</h3>`);
      else if (b.type === 'paragraph') out.push(`<p style=\"margin:6px 0; line-height:1.5;\">${mdToHtml(replaceVars(b.text||'', vars))}</p>`);
    }
    return out.join('\n');
  }

  return (
    <div style={{ padding: 16, fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', color: "var(--text)" }}>
      {/* Put plan badge in AppHeader (right slot) and ensure title */}
      <PlanHeaderBadge title="Guest Overview" slot="header-right" />
      <div style={{ margin: '0 auto', width: 'min(1200px, calc(100vw - 32px))' }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div />

        {/* Property selector + Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Property</label>
          <select
            value={activePropertyId ?? ""}
            onChange={(e) => setActivePropertyId((e.target as HTMLSelectElement).value || null)}
            style={{ padding: "8px 10px", background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 10, fontWeight: 700, fontFamily: 'inherit' }}
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={refresh}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontWeight: 900, cursor: "pointer" }}
            title="Refresh"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", marginBottom: 12 }}>
        {/* GREEN */}
        <div style={{ position: 'relative', display: 'inline-block' }} data-legend="keep"
             onMouseEnter={() => setLegendInfo('green')} onMouseLeave={() => setLegendInfo(null)}>
          <span style={badgeStyle('green')}>GREEN</span>
          <button
            type="button"
            aria-label="What is GREEN?"
            onClick={(e) => { e.stopPropagation(); setLegendInfo(legendInfo === 'green' ? null : 'green'); }}
            style={{ position:'absolute', top: -10, right: -10, width: 14, height: 14, borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', display: 'grid', placeItems: 'center', lineHeight: 0, fontSize: 10, cursor: 'pointer' }}
          >
            i
          </button>
          {legendInfo === 'green' && (
            <div data-legend="keep" style={{ position: 'absolute', top: '50%', left: 'calc(100% + 8px)', transform: 'translateY(-50%)', zIndex: 5, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.25)', width: 220, maxWidth: 'min(300px, calc(100vw - 32px))' }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>GREEN</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Nothing to do</div>
            </div>
          )}
        </div>

        {/* YELLOW */}
        <div style={{ position: 'relative', display: 'inline-block' }} data-legend="keep"
             onMouseEnter={() => setLegendInfo('yellow')} onMouseLeave={() => setLegendInfo(null)}>
          <span style={badgeStyle('yellow')}>YELLOW</span>
          <button
            type="button"
            aria-label="What is YELLOW?"
            onClick={(e) => { e.stopPropagation(); setLegendInfo(legendInfo === 'yellow' ? null : 'yellow'); }}
            style={{ position:'absolute', top: -10, right: -10, width: 14, height: 14, borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', display: 'grid', placeItems: 'center', lineHeight: 0, fontSize: 10, cursor: 'pointer' }}
          >
            i
          </button>
          {legendInfo === 'yellow' && (
            <div data-legend="keep" style={{ position: 'absolute', top: '50%', left: 'calc(100% + 8px)', transform: 'translateY(-50%)', zIndex: 5, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.25)', width: 260, maxWidth: 'min(320px, calc(100vw - 32px))' }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>YELLOW </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', display: 'grid', gap: 2 }}>
                <span>-Waiting window-</span>
                <span>Only Form: max 2h</span>
                <span>Only iCal: until 3 days before arrival</span>
              </div>
            </div>
          )}
        </div>

        {/* RED */}
        <div style={{ position: 'relative', display: 'inline-block' }} data-legend="keep"
             onMouseEnter={() => setLegendInfo('red')} onMouseLeave={() => setLegendInfo(null)}>
          <span style={badgeStyle('red')}>RED</span>
          <button
            type="button"
            aria-label="What is RED?"
            onClick={(e) => { e.stopPropagation(); setLegendInfo(legendInfo === 'red' ? null : 'red'); }}
            style={{ position:'absolute', top: -10, right: -10, width: 14, height: 14, borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', display: 'grid', placeItems: 'center', lineHeight: 0, fontSize: 10, cursor: 'pointer' }}
          >
            i
          </button>
          {legendInfo === 'red' && (
            <div data-legend="keep" style={{ position: 'absolute', top: '50%', left: 'calc(100% + 8px)', transform: 'translateY(-50%)', zIndex: 5, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.25)', width: 220, maxWidth: 'min(300px, calc(100vw - 32px))' }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>RED</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Action required</div>
            </div>
          )}
        </div>
      </div>

      {/* Rows */}
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((it) => {
          const name = fullName(it) || "Unknown guest";

          // Fail-safe: dacă din greșeală vine GREEN fără room -> degradează local la YELLOW
          const kind: OverviewRow["status"] =
            it.status === "green" && !it.room_id ? "yellow" : it.status;

          const roomLabel = it._room_label ?? "—";
          const badge = toBadge(kind);
          const typeName = it._room_type_name ?? "—";

          const subcopy = kind === "green" ? null : subcopyFor(it);
          const propertyId = activePropertyId!;

          const key = `${it.id ?? "noid"}|${it.start_date}|${it.end_date}|${it._room_type_id ?? "null"}`;

          const showCopy =
            kind !== "green" &&
            ((kind === "yellow" && it._reason === "waiting_form") || (kind === "red" && it._reason === "missing_form"));

          return (
            <div key={key} style={{ border: "1px solid var(--border)", background: "var(--panel)", borderRadius: 12, padding: 12, display: "grid", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <em style={{ letterSpacing: 0.2, fontStyle: "italic", fontWeight: 400 }}>
                  {name} · Room: {roomLabel} — Type: {typeName} — {formatRange(it.start_date, it.end_date)}
                </em>
                <span style={badgeStyle(kind)}>{badge}</span>
              </div>

              {subcopy && <small style={{ color: "var(--muted)" }}>{subcopy}</small>}

              {/* Actions */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            {/* GREEN → Open reservation (RoomDetailModal) */}
            {kind === "green" && canEditGuest && (
              <button
                onClick={() => openReservation(it, propertyId)}
                    disabled={!it.room_id || !roomById.has(String(it.room_id))}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: it.room_id && roomById.has(String(it.room_id)) ? "var(--primary)" : "var(--card)",
                      color: it.room_id && roomById.has(String(it.room_id)) ? "#0c111b" : "var(--text)",
                      fontWeight: 900,
                      cursor: it.room_id && roomById.has(String(it.room_id)) ? "pointer" : "not-allowed",
                    }}
                    title={it.room_id ? "Open reservation" : "No room assigned yet"}
                >
                  Open reservation
                </button>
            )}

            {/* GREEN → Reservation message (UI stub) */}
            {kind === "green" && (
              <button
                onClick={() => setRmModal({ propertyId, item: it })}
                style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontWeight: 900, cursor: "pointer" }}
                title="Reservation message"
              >
                Reservation message
              </button>
            )}

                {/* YELLOW(iCal) / RED(missing_form) → Copy link */}
                {showCopy && (
                  <button
                    onClick={() => copyCheckinLink(propertyId, key)}
                    style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontWeight: 900, cursor: "pointer" }}
                    title="Copy check-in link"
                  >
                    {copiedKey === key ? "Copied!" : "Copy check-in link"}
                  </button>
                )}

                {/* RED → Resolve in Calendar (deschide pe luna corectă) */}
                {kind === "red" && canEditGuest && (
                  <button
                    onClick={() => resolveInCalendar(it, propertyId)}
                    style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--danger)", background: "transparent", color: "var(--text)", fontWeight: 900, cursor: "pointer" }}
                    title="Resolve in Calendar"
                  >
                    Resolve in Calendar
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div style={{ border: "1px solid var(--border)", background: "var(--panel)", borderRadius: 12, padding: 16, color: "var(--muted)", textAlign: "center" }}>
            No current or upcoming reservations.
          </div>
        )}
      </div>

      {/* Modal pentru “Open reservation” din GREEN */}
      {modal && (
        <RoomDetailModal
          dateStr={modal.dateStr}
          propertyId={modal.propertyId}
          room={modal.room}
          forceNew={false}
          onClose={() => setModal(null)}
          onChanged={() => {
            refresh();
          }}
        />
      )}

      {rmModal && (
        <div role="dialog" aria-modal="true" onClick={() => setRmModal(null)}
             style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 60, display: "grid", placeItems: "center", padding: 12 }}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width: 'min(860px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', overflow: 'auto', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
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

function RMContent({ propertyId, row }: { propertyId: string; row: any }) {
  const storageKey = `p4h:rm:template:${propertyId}`;
  const [tpl, setTpl] = useState<any>(null);
  const [values, setValues] = useState<Record<string,string>>({});
  const [preview, setPreview] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Local render helpers (mirror of the builder's preview)
  function _escapeHtml(s: string) { return (s||"").replace(/[&<>"']/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] as string)); }
  function _replaceVarsHtml(html: string, vars: Record<string,string>) {
    if (!html) return "";
    const withVars = html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => _escapeHtml(vars?.[k] ?? `{{${k}}}`));
    return withVars.replace(/\r?\n/g, '<br/>' );
  }
  function _renderHeadingSafe(src: string, vars: Record<string,string>) {
    const s = src || '';
    const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    let out: string[] = [];
    let last = 0; let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      out.push(_escapeHtml(s.slice(last, m.index)));
      const key = m[1];
      out.push(_escapeHtml(vars?.[key] ?? `{{${key}}}`));
      last = m.index + m[0].length;
    }
    out.push(_escapeHtml(s.slice(last)));
    return out.join('');
  }
  function _renderRM(t: any, vars: Record<string,string>) {
    const out: string[] = [];
    for (const b of ((t?.blocks)||[])) {
      if (b.type === 'divider') out.push('<hr style="border:1px solid var(--border); opacity:.6;"/>');
      else if (b.type === 'heading') out.push(`<h3 style=\"margin:8px 0 6px;\">${_renderHeadingSafe(b.text||'', vars)}</h3>`);
      else if (b.type === 'paragraph') out.push(`<div style=\"margin:6px 0; line-height:1.5;\">${_replaceVarsHtml(b.text||'', vars)}</div>`);
    }
    return out.join('\n');
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
    <div style={{ display: 'grid', gap: 12 }}>
      {!tpl ? (
        <div style={{ color: 'var(--muted)' }}>
          No template configured for this property. <a href="/app/reservationMessage" style={{ color: 'var(--primary)' }}>Configure now</a>.
        </div>
      ) : (
        <>
          {(Array.isArray(tpl.fields) && tpl.fields.length > 0) && (
            <div style={{ display: 'grid', gap: 8 }}>
              {tpl.fields.map((f: any) => (
                <div key={f.key} style={{ display: 'grid', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>{f.label}</label>
                  <input style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card)', color: 'var(--text)', fontFamily: 'inherit' }}
                         value={values[f.key] || ''}
                         onChange={(e)=>setValues(prev=>({ ...prev, [f.key]: e.currentTarget.value }))}
                         placeholder={f.label}
                  />
                </div>
              ))}
            </div>
          )}
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--panel)', padding: 12 }}
               dangerouslySetInnerHTML={{ __html: preview }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="sb-btn" onClick={onCopyPreview}>{copied ? 'Copied!' : 'Copy preview'}</button>
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
    if (!bookingId) { alert('Missing booking id'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/reservation-message/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: propertyId, booking_id: bookingId, values }),
      });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) { alert(j?.error || 'Failed to generate link'); setBusy(false); return; }
      const url = j?.url as string;
      if (url) {
        try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(()=>setCopied(false), 1500); } catch { prompt('Copy link:', url); }
      }
    } catch (e:any) {
      alert(e?.message || 'Network error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <button className="sb-btn sb-btn--primary" onClick={onClick} disabled={busy || !bookingId} title={bookingId ? 'Generate link' : 'No booking id'}>
      {copied ? 'Copied!' : (busy ? 'Generating…' : 'Generate & copy link')}
    </button>
  );
}
