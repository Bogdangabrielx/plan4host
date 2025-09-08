"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Server page passes these in; we keep same shape */
type Property = {
  id: string;
  name: string;
  check_in_time: string | null;
  check_out_time: string | null;
};

type Room = { id: string; name: string; property_id: string };

/** Booking extended with optional fields we may use if they exist in DB */
type Booking = {
  id: string;
  property_id: string;
  room_id: string | null;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;   // "YYYY-MM-DD"
  start_time: string | null;
  end_time: string | null;
  status: "pending" | "confirmed" | "cancelled" | string;

  // Guest / form
  guest_first_name?: string | null;
  guest_last_name?: string | null;
  form_submitted_at?: string | null; // optional (fallback: created_at)
  created_at?: string | null;

  // iCal hints (any of these may exist)
  has_ical?: boolean | null;
  ical_uid?: string | null;
  ota_event_id?: string | null;
  ota_reservation_id?: string | null;
  source?: string | null;

  // Soft-hold (varianta A)
  is_soft_hold?: boolean | null;
  hold_expires_at?: string | null;
  hold_status?: "active" | "expired" | "promoted" | "cancelled" | null;

  [k: string]: any; // tolerate extra fields from select("*")
};

type Row = {
  booking: Booking;
  room: Room | null;
  typeName: string | null;
  color: "GREEN" | "YELLOW" | "RED";
  reason?: "missing_form" | "no_ota_found" | "type_conflict" | "room_required_auto_failed";
  subcopy?: string | null;
  cutoffISO: string; // informational
};

// ---- Date helpers ----
function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}
function addDays(date: Date, days: number): Date {
  const dt = new Date(date);
  dt.setDate(dt.getDate() + days);
  return dt;
}
function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600_000);
}
function todayLocalISODate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function toLocalISO(dt: Date): string {
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const HH = String(dt.getHours()).padStart(2, "0");
  const MM = String(dt.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${HH}:${MM}:00`;
}
function formatRange(b: Booking): string {
  const start = b.start_time ? `${b.start_date} ${b.start_time}` : b.start_date;
  const end = b.end_time ? `${b.end_date} ${b.end_time}` : b.end_date;
  return `${start} → ${end}`;
}
function fullName(b: Booking): string {
  const f = (b.guest_first_name ?? "").trim();
  const l = (b.guest_last_name ?? "").trim();
  return [f, l].filter(Boolean).join(" ");
}

// Heuristics: infer presence of Form/iCal from available fields
function hasForm(b: Booking): boolean {
  return !!fullName(b) || !!b.form_submitted_at;
}
function hasIcal(b: Booking): boolean {
  return !!(
    b.has_ical ||
    b.ical_uid ||
    b.ota_event_id ||
    b.ota_reservation_id ||
    (b.source && b.source.toLowerCase() === "ical")
  );
}
function formSubmittedAt(b: Booking): Date | null {
  const ts = b.form_submitted_at ?? b.created_at;
  if (!ts) return null;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

export default function InboxClient({ initialProperties }: { initialProperties: Property[] }) {
  const supabase = createClient();

  // ---- State
  const [properties, setProperties] = useState<Property[]>(initialProperties || []);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(initialProperties?.[0]?.id ?? null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [loading, setLoading] = useState<"idle" | "loading" | "error">("idle");
  const [hint, setHint] = useState<string>("");

  // UX: „Copy link” feedback
  const [copiedBookingId, setCopiedBookingId] = useState<string | null>(null);
  const copyTimer = useRef<number | null>(null);
  useEffect(() => {
    return () => { if (copyTimer.current) window.clearTimeout(copyTimer.current); };
  }, []);

  // ---- Refresh pentru proprietatea activă
  const refresh = useCallback(async () => {
    if (!activePropertyId) return;
    setLoading("loading");
    setHint("Loading…");

    const today = todayLocalISODate();

    const [rRooms, rBookings] = await Promise.all([
      supabase
        .from("rooms")
        .select("id,name,property_id")
        .eq("property_id", activePropertyId)
        .order("name", { ascending: true }),
      // select("*): luăm ce e disponibil (ex: created_at, form_submitted_at, ical_uid, is_soft_hold, hold_expires_at, ...)
      supabase
        .from("bookings")
        .select("*")
        .eq("property_id", activePropertyId)
        .gte("end_date", today) // doar curente/viitoare
        .neq("status", "cancelled")
        .order("start_date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: true }),
    ]);

    if (rRooms.error || rBookings.error) {
      setLoading("error");
      setHint(rRooms.error?.message || rBookings.error?.message || "Failed to load.");
      return;
    }

    setRooms((rRooms.data ?? []) as Room[]);
    setBookings((rBookings.data ?? []) as Booking[]);
    setLoading("idle");
    setHint("");
  }, [supabase, activePropertyId]);

  // Reacționează la schimbarea proprietății inițiale (navigare)
  useEffect(() => {
    setProperties(initialProperties || []);
    if (!activePropertyId && initialProperties?.[0]?.id) {
      setActivePropertyId(initialProperties[0].id);
    }
  }, [initialProperties, activePropertyId]);

  useEffect(() => { refresh(); }, [refresh]);

  // ---- Build rows + noua logică de culoare
  const rows: Row[] = useMemo(() => {
    const now = new Date();

    return bookings.map((b) => {
      const room = rooms.find((r) => r.id === b.room_id) ?? null;

      const _hasForm = hasForm(b);
      const _hasIcal = hasIcal(b);

      // Praguri:
      const arrival0 = parseYMD(b.start_date);        // 00:00 în ziua sosirii
      const cutoff3d = addDays(arrival0, -3);         // pentru „iCal fără Form”
      const formTs = formSubmittedAt(b);              // când a apărut Form-ul
      // nou: Form fără iCal → max 2 ore (sau respectă hold_expires_at, dacă există)
      const fallback2h = formTs ? addHours(formTs, 2) : null;
      const holdExpires = b.hold_expires_at ? new Date(b.hold_expires_at) : null;
      const cutoff2h = holdExpires ?? fallback2h;

      // Default
      let color: Row["color"] = "GREEN";
      let reason: Row["reason"] | undefined = undefined;
      let subcopy: Row["subcopy"] | null = null;
      let cutoffISO = toLocalISO(cutoff3d);

      // 1) Exact match (ambele) -> GREEN
      if (_hasForm && _hasIcal) {
        color = "GREEN";
      }
      // 2) iCal dar fără Form → YELLOW până la Arrival−3 zile, apoi RED
      else if (_hasIcal && !_hasForm) {
        if (now < cutoff3d) {
          color = "YELLOW";
          subcopy = "Waiting for the guest to complete the check-in form (until 3 days before arrival).";
          cutoffISO = toLocalISO(cutoff3d);
          reason = undefined;
        } else {
          color = "RED";
          reason = "missing_form";
          subcopy = "No check-in form was received for this OTA reservation.";
          cutoffISO = toLocalISO(cutoff3d);
        }
      }
      // 3) Form dar fără iCal → YELLOW max 2 ore, apoi RED (no_ota_found)
      else if (_hasForm && !_hasIcal) {
        if (cutoff2h && now < cutoff2h) {
          color = "YELLOW";
          subcopy = "Waiting for a matching OTA iCal event (max 2 hours after form submission).";
          cutoffISO = toLocalISO(cutoff2h);
        } else {
          color = "RED";
          reason = "no_ota_found";
          subcopy = "Form dates do not match any OTA reservation.";
          cutoffISO = cutoff2h ? toLocalISO(cutoff2h) : toLocalISO(now);
        }
      }
      // 4) fallback (foarte rar): nici form, nici iCal
      else {
        color = "RED";
        reason = "no_ota_found";
        subcopy = "No source data yet.";
        cutoffISO = toLocalISO(now);
      }

      // Type – necunoscut momentan; îl vom lega la room_types în pasul următor
      const typeName: string | null = null;

      return { booking: b, room, typeName, color, reason, subcopy, cutoffISO };
    });
  }, [bookings, rooms]);

  // ---- Actions
  const buildCheckinLink = useCallback((b: Booking): string => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const qs = new URLSearchParams();
    qs.set("booking", b.id);
    if (activePropertyId) qs.set("property", activePropertyId); // ⬅️ important: include property
    return `${origin}/checkin?${qs.toString()}`;
  }, [activePropertyId]);

  async function copyLinkFor(b: Booking) {
    const link = buildCheckinLink(b);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedBookingId(b.id);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopiedBookingId(null), 2000);
    } catch {
      alert("Could not copy link");
    }
  }

  function openCalendarFor(b: Booking) {
    const url = `/app/calendar?date=${b.start_date}`;
    if (typeof window !== "undefined") window.location.href = url;
  }

  // ---- Sorting rows (by start_date then room name numeric-aware)
  const collator = useMemo(() => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }), []);
  const rowsSorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const d = a.booking.start_date.localeCompare(b.booking.start_date);
      if (d !== 0) return d;
      return collator.compare(a.room?.name ?? "", b.room?.name ?? "");
    });
  }, [rows, collator]);

  // ---- Badge styles
  function badgeStyle(color: Row["color"]): React.CSSProperties {
    const base: React.CSSProperties = {
      display: "inline-block",
      padding: "2px 10px",
      fontSize: 12,
      fontWeight: 800,
      borderRadius: 999,
      border: "1px solid transparent",
      color: "#0c111b",
    };
    if (color === "GREEN") return { ...base, background: "var(--success)", borderColor: "var(--success)" };
    if (color === "RED") return { ...base, background: "var(--danger)", borderColor: "var(--danger)", color: "#fff" };
    // YELLOW — fallback (add --warning in theme if vrei)
    return { ...base, background: "var(--warning, #fbbf24)", borderColor: "var(--warning, #f59e0b)" };
  }

  // ---- Render
  return (
    <div style={{ padding: 16, fontFamily: '"Times New Roman", serif', color: "var(--text)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>Guest Overview</h1>
          {loading === "loading" && (
            <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, background: "var(--primary)", color: "#0c111b", fontWeight: 800 }}>
              Loading…
            </span>
          )}
          {loading === "error" && (
            <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, background: "var(--danger)", color: "#fff", fontWeight: 800 }}>
              Error
            </span>
          )}
          {hint && <small style={{ color: "var(--muted)" }}>{hint}</small>}
        </div>

        {/* Property selector + Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Property</label>
          <select
            value={activePropertyId ?? ""}
            onChange={(e) => setActivePropertyId((e.target as HTMLSelectElement).value || null)}
            style={{ padding: "8px 10px", background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 10, fontWeight: 700 }}
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
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <span style={badgeStyle("GREEN")}>GREEN</span>
        <small style={{ color: "var(--muted)" }}>All good</small>
        <span style={badgeStyle("YELLOW")}>YELLOW</span>
        <small style={{ color: "var(--muted)" }}>Waiting window (Form: max 2h; OTA: until 3 days before arrival)</small>
        <span style={badgeStyle("RED")}>RED</span>
        <small style={{ color: "var(--muted)" }}>Action required</small>
      </div>

      {/* Rows */}
      <div style={{ display: "grid", gap: 10 }}>
        {rowsSorted.map((r) => {
          const b = r.booking;
          const nm = fullName(b) || "Unknown guest";
          const roomNo = r.room?.name ? `#${r.room.name}` : "#—";

          const isIcalNoForm = hasIcal(b) && !hasForm(b);
          const isFormNoIcal = hasForm(b) && !hasIcal(b);

          return (
            <div key={b.id} style={{ border: "1px solid var(--border)", background: "var(--panel)", borderRadius: 12, padding: 12, display: "grid", gap: 6 }}>
              {/* Top line */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <strong style={{ letterSpacing: 0.2 }}>
                  {nm} · {roomNo} — Type: {r.typeName ?? "—"} — {formatRange(b)}
                </strong>
                <span style={badgeStyle(r.color)}>{r.color}</span>
              </div>

              {/* Subtext + actions */}
              {(r.color === "YELLOW" || r.color === "RED") && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <small style={{ color: "var(--muted)" }}>
                    {r.subcopy}
                  </small>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    {/* iCal fără Form -> oferă Copy check-in link (ca să trimiți invitația) */}
                    {(isIcalNoForm || (r.color === "RED" && r.reason === "missing_form")) && (
                      <button
                        onClick={() => copyLinkFor(b)}
                        style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontWeight: 900, cursor: "pointer" }}
                        title="Copy check-in link"
                      >
                        {copiedBookingId === b.id ? "Copied!" : "Copy check-in link"}
                      </button>
                    )}

                    {/* RED -> Resolve in Calendar */}
                    {r.color === "RED" && (
                      <button
                        onClick={() => openCalendarFor(b)}
                        style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--danger)", background: "transparent", color: "var(--text)", fontWeight: 900, cursor: "pointer" }}
                        title="Resolve in Calendar"
                      >
                        Resolve in Calendar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {rowsSorted.length === 0 && (
          <div style={{ border: "1px solid var(--border)", background: "var(--panel)", borderRadius: 12, padding: 16, color: "var(--muted)", textAlign: "center" }}>
            No current or upcoming reservations.
          </div>
        )}
      </div>
    </div>
  );
}