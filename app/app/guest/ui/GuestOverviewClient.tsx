// app/app/guest/ui/GuestOverviewClient.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

// ---- Shape-ul din /api/guest-overview ----
type OverviewItem = {
  kind: "green" | "yellow" | "red";
  reason?:
    | "waiting_form"
    | "waiting_ical"
    | "missing_form"
    | "no_ota_found"
    | "type_conflict"
    | "room_required_auto_failed";
  start_date: string;
  end_date: string;
  room_id?: string | null;
  room_label?: string | null;
  room_type_id?: string | null;
  room_type_name?: string | null;
  booking_id?: string | null;
  guest_first_name?: string | null;
  guest_last_name?: string | null;
  guest_name?: string | null; // ← NEW: fallback pentru manual
  cutoff_ts?: string | null;
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
function fullName(item: OverviewItem): string {
  const f = (item.guest_first_name ?? "").trim();
  const l = (item.guest_last_name ?? "").trim();
  const combined = [f, l].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  // fallback legacy (manual)
  return (item.guest_name ?? "").trim();
}
function hasName(item: OverviewItem): boolean {
  return fullName(item).length > 0;
}
function toBadge(kind: OverviewItem["kind"]): "GREEN" | "YELLOW" | "RED" {
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

// Subcopy pentru stări
function subcopyFor(item: OverviewItem): string | null {
  if (item.kind === "yellow") {
    if (item.reason === "waiting_form") {
      return "Waiting for the guest to complete the check-in form (until 3 days before arrival).";
    }
    if (item.reason === "waiting_ical") {
      return "Waiting for a matching OTA iCal event (max 2 hours after form submission).";
    }
  }
  if (item.kind === "red") {
    if (item.reason === "missing_form") return "No check-in form was received for this OTA reservation.";
    if (item.reason === "no_ota_found") return "Form dates do not match any OTA reservation.";
    if (item.reason === "type_conflict") return "Unmatched Room: OTA type and form type differ. Resolve in Calendar.";
    if (item.reason === "room_required_auto_failed") return "No free room of the booked type was available for auto-assignment.";
    return "Action required.";
  }
  return null;
}

// ---- Componenta principală ----
export default function GuestOverviewClient({ initialProperties }: { initialProperties: Property[] }) {
  const supabase = createClient();

  // Proprietăți + selecție
  const [properties, setProperties] = useState<Property[]>(initialProperties || []);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(initialProperties?.[0]?.id ?? null);

  // Date auxiliare pentru UI (Rooms + Types)
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);

  // Items din API-ul nou
  const [items, setItems] = useState<OverviewItem[]>([]);
  const [loading, setLoading] = useState<"idle" | "loading" | "error">("idle");
  const [hint, setHint] = useState<string>("");

  // UX: feedback “Copied!”
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimer = useRef<number | null>(null);
  useEffect(() => () => { if (copyTimer.current) window.clearTimeout(copyTimer.current); }, []);

  // Modal — deschidem rezervarea (GREEN)
  const [modal, setModal] = useState<null | { propertyId: string; dateStr: string; room: Room }>(null);

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
      const arr: OverviewItem[] = Array.isArray(j?.items) ? j.items : [];
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

  // Mape utile
  const roomById = useMemo(() => {
    const m = new Map<string, Room>();
    rooms.forEach((r) => m.set(String(r.id), r));
    return m;
  }, [rooms]);

  const typeNameById = useMemo(() => {
    const m = new Map<string, string>();
    roomTypes.forEach((t) => m.set(String(t.id), t.name));
    return m;
  }, [roomTypes]);

  // Sortare: după start_date, apoi după nume cameră (natural)
  const collator = useMemo(() => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }), []);
  const rows = useMemo(() => {
    return [...items].sort((a, b) => {
      const d = a.start_date.localeCompare(b.start_date);
      if (d !== 0) return d;
      const rnA = a.room_label ?? "";
      const rnB = b.room_label ?? "";
      return collator.compare(rnA, rnB);
    });
  }, [items, collator]);

  // Badge styling
  function badgeStyle(kind: OverviewItem["kind"]): React.CSSProperties {
    const base: React.CSSProperties = {
      display: "inline-block",
      padding: "2px 10px",
      fontSize: 12,
      fontWeight: 800,
      borderRadius: 999,
      border: "1px solid transparent",
      color: "#0c111b",
    };
    if (kind === "green") return { ...base, background: "var(--success)", borderColor: "var(--success)" };
    if (kind === "red") return { ...base, background: "var(--danger)", borderColor: "var(--danger)", color: "#fff" };
    return { ...base, background: "var(--warning, #fbbf24)", borderColor: "var(--warning, #f59e0b)" };
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
      prompt("Copy this link:", link);
    }
  }, []);

  function resolveInCalendar(item: OverviewItem, _propertyId: string) {
    const url = `/app/calendar?date=${item.start_date}`;
    if (typeof window !== "undefined") window.location.href = url;
  }

  // ✅ Robust: dacă nu găsim camera în cache, o citim din Supabase înainte să deschidem modalul
  async function openReservation(item: OverviewItem, propertyId: string) {
    if (!item.room_id) {
      alert("This booking has no assigned room yet.");
      return;
    }

    let room = roomById.get(String(item.room_id)) || null;

    if (!room) {
      const { data, error } = await supabase
        .from("rooms")
        .select("id,name,property_id,room_type_id")
        .eq("id", item.room_id)
        .maybeSingle();

      if (!error && data) {
        room = data as Room;
      }
    }

    if (!room) {
      alert("Room not found. Try refreshing.");
      return;
    }

    setModal({ propertyId, dateStr: item.start_date, room });
  }

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
        <span style={badgeStyle("green")}>GREEN</span>
        <small style={{ color: "var(--muted)" }}>All good</small>
        <span style={badgeStyle("yellow")}>YELLOW</span>
        <small style={{ color: "var(--muted)" }}>Waiting window (Form: max 2h; OTA: until 3 days before arrival)</small>
        <span style={badgeStyle("red")}>RED</span>
        <small style={{ color: "var(--muted)" }}>Action required</small>
      </div>

      {/* Rows */}
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((it) => {
          // Regula de aur în UI: dacă are NUME (inclusiv guest_name), forțăm GREEN
          const name = fullName(it) || "Unknown guest";
          const effectiveKind: OverviewItem["kind"] = hasName(it) ? "green" : it.kind;

          const roomNo = it.room_label ? `#${it.room_label}` : "#—";
          const badge = toBadge(effectiveKind);
          const typeName = it.room_type_name ?? (it.room_type_id ? typeNameById.get(String(it.room_type_id)) ?? null : null);

          const subcopy = effectiveKind === "green" ? null : subcopyFor(it);
          const propertyId = activePropertyId!;

          const key = `${it.booking_id ?? "noid"}|${it.start_date}|${it.end_date}|${it.room_type_id ?? "null"}`;

          const showCopy =
            effectiveKind !== "green" &&
            ((it.kind === "yellow" && it.reason === "waiting_form") || (it.kind === "red" && it.reason === "missing_form"));

          return (
            <div key={key} style={{ border: "1px solid var(--border)", background: "var(--panel)", borderRadius: 12, padding: 12, display: "grid", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <strong style={{ letterSpacing: 0.2 }}>
                  {name} · {roomNo} — Type: {typeName ?? "—"} — {formatRange(it.start_date, it.end_date)}
                </strong>
                <span style={badgeStyle(effectiveKind)}>{badge}</span>
              </div>

              {subcopy && <small style={{ color: "var(--muted)" }}>{subcopy}</small>}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                {/* GREEN → Open reservation (RoomDetailModal) */}
                {effectiveKind === "green" && (
                  <button
                    onClick={() => openReservation(it, propertyId)}
                    disabled={!it.room_id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: it.room_id ? "var(--primary)" : "var(--card)",
                      color: it.room_id ? "#0c111b" : "var(--text)",
                      fontWeight: 900,
                      cursor: it.room_id ? "pointer" : "not-allowed",
                    }}
                    title={it.room_id ? "Open reservation" : "No room assigned yet"}
                  >
                    Open reservation
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

                {/* RED → Resolve in Calendar */}
                {effectiveKind === "red" && (
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
    </div>
  );
}