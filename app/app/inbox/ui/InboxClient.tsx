"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Property = {
  id: string;
  name: string;
  check_in_time: string | null;
  check_out_time: string | null;
};

type Room = { id: string; name: string; property_id: string };

type Booking = {
  id: string;
  property_id: string;
  room_id: string;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;   // "YYYY-MM-DD"
  start_time: string | null;
  end_time: string | null;
  status: "pending" | "confirmed" | "cancelled" | string;

  // Guest fields (din pașii precedenți)
  guest_first_name?: string | null;
  guest_last_name?: string | null;
};

type Row = {
  booking: Booking;
  room: Room | null;
  typeName: string | null; // TODO: leagă de room_types în pasul următor
  color: "GREEN" | "YELLOW" | "RED";
  reason?: "missing_form" | "no_ota_found" | "type_conflict" | "room_required_auto_failed";
  cutoffISO: string;
};

// ---- Helpers de dată (fallback TZ local) ----
function todayLocalISODate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}
function addDays(date: Date, days: number): Date {
  const dt = new Date(date);
  dt.setDate(dt.getDate() + days);
  return dt;
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

export default function InboxClient({
  initialProperties,
}: {
  initialProperties: Property[];
}) {
  const supabase = createClient();

  // ---- State
  const [properties, setProperties] = useState<Property[]>(initialProperties || []);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(
    initialProperties?.[0]?.id ?? null
  );

  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [loading, setLoading] = useState<"idle" | "loading" | "error">("idle");
  const [hint, setHint] = useState<string>("");

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
      supabase
        .from("bookings")
        .select(
          "id,property_id,room_id,start_date,end_date,start_time,end_time,status,guest_first_name,guest_last_name"
        )
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

    setRooms(rRooms.data ?? []);
    setBookings(rBookings.data ?? []);
    setLoading("idle");
    setHint("");
  }, [supabase, activePropertyId]);

  // Dacă serverul schimbă initialProperties (navigare), actualizăm local
  useEffect(() => {
    setProperties(initialProperties || []);
    if (!activePropertyId && initialProperties?.[0]?.id) {
      setActivePropertyId(initialProperties[0].id);
    }
  }, [initialProperties, activePropertyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ---- Build rows + culoare (v1: Name + cutoff -3 zile)
  const rows: Row[] = useMemo(() => {
    const now = new Date();
    return bookings.map((b) => {
      const room = rooms.find((r) => r.id === b.room_id) ?? null;
      const hasName = !!fullName(b);

      // cutoff = 00:00 în ziua (Arrival - 3 zile) — pentru v1 folosim TZ local
      const arrival0 = parseYMD(b.start_date);
      const cutoff = addDays(arrival0, -3);
      const cutoffISO = toLocalISO(cutoff);

      let color: Row["color"] = "GREEN";
      let reason: Row["reason"] | undefined;

      if (!hasName) {
        color = now < cutoff ? "YELLOW" : "RED";
        if (color === "RED") reason = "missing_form"; // placeholder până legăm iCal/Form real
      }

      // Type: „—” pentru moment; îl legăm la schema reală în pasul următor
      const typeName: string | null = null;

      return { booking: b, room, typeName, color, reason, cutoffISO };
    });
  }, [bookings, rooms]);

  // ---- Actions
  function requestFormLink(b: Booking): string {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      return `${origin}/checkin?booking=${b.id}`;
    }
    return `/checkin?booking=${b.id}`;
  }
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Link copied to clipboard");
    } catch {
      alert("Could not copy link");
    }
  }
  function openCalendarFor(b: Booking) {
    const url = `/app/calendar?date=${b.start_date}`;
    if (typeof window !== "undefined") window.location.href = url;
  }

  // ---- Sortare rânduri (după start_date, apoi #Room numeric-aware)
  const collator = useMemo(
    () => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }),
    []
  );
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
    if (color === "GREEN")
      return { ...base, background: "var(--success)", borderColor: "var(--success)" };
    if (color === "RED")
      return { ...base, background: "var(--danger)", borderColor: "var(--danger)", color: "#fff" };
    // YELLOW — folosește fallback dacă nu ai definit --warning în temă
    return {
      ...base,
      background: "var(--warning, #fbbf24)",
      borderColor: "var(--warning, #f59e0b)",
    };
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
        <small style={{ color: "var(--muted)" }}>Waiting window (until 3 days before arrival)</small>
        <span style={badgeStyle("RED")}>RED</span>
        <small style={{ color: "var(--muted)" }}>Action required</small>
      </div>

      {/* Rows */}
      <div style={{ display: "grid", gap: 10 }}>
        {rowsSorted.map((r) => {
          const b = r.booking;
          const nm = fullName(b) || "Unknown guest";
          const roomNo = r.room?.name ? `#${r.room.name}` : "#—";

          return (
            <div key={b.id} style={{ border: "1px solid var(--border)", background: "var(--panel)", borderRadius: 12, padding: 12, display: "grid", gap: 6 }}>
              {/* Linia principală */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <strong style={{ letterSpacing: 0.2 }}>
                  {nm} · {roomNo} — Type: {r.typeName ?? "—"} — {formatRange(b)}
                </strong>
                <span style={badgeStyle(r.color)}>{r.color}</span>
              </div>

              {/* Subtext + acțiuni YELLOW */}
              {r.color === "YELLOW" && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <small style={{ color: "var(--muted)" }}>
                    {fullName(b)
                      ? "Guest already named, will auto-promote to GREEN."
                      : "Waiting for the guest to complete the check-in form (until 3 days before arrival)."}
                  </small>
                  {!fullName(b) && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => copyToClipboard(requestFormLink(b))}
                        style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontWeight: 900, cursor: "pointer" }}
                        title="Copy check-in link"
                      >
                        Request form
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Subtext + acțiuni RED */}
              {r.color === "RED" && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <small style={{ color: "var(--muted)" }}>
                    {r.reason === "missing_form" && "Unknown guest — Missing guest data."}
                    {r.reason === "no_ota_found" && "Form dates do not match any OTA reservation."}
                    {r.reason === "type_conflict" && "Unmatched RoomType between OTA and form."}
                    {r.reason === "room_required_auto_failed" && "No free room of the booked type was available for auto-assignment."}
                  </small>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => {
                        const url = `/app/calendar?date=${b.start_date}`;
                        if (typeof window !== "undefined") window.location.href = url;
                      }}
                      style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--danger)", background: "transparent", color: "var(--text)", fontWeight: 900, cursor: "pointer" }}
                      title="Resolve in Calendar"
                    >
                      Resolve in Calendar
                    </button>
                    <button
                      onClick={() => copyToClipboard(requestFormLink(b))}
                      style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontWeight: 900, cursor: "pointer" }}
                      title="Copy check-in link"
                    >
                      Copy form link
                    </button>
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