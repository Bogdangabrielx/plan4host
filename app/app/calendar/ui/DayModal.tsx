"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import RoomDetailModal from "./RoomDetailModal";

/** Exported so RoomDetailModal can import the base shape */
export type Booking = {
  id: string;
  property_id: string;
  room_id: string;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;   // "YYYY-MM-DD"
  start_time: string | null; // "HH:mm" or null
  end_time: string | null;   // "HH:mm" or null
  status: "pending" | "confirmed" | "cancelled" | string;

  // Guest fields
  guest_first_name?: string | null;
  guest_last_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  guest_address?: string | null;
};

type Room = { id: string; name: string; property_id: string };

function nextDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function DayModal({
  dateStr,
  propertyId,
  onClose,
}: {
  dateStr: string;
  propertyId: string;
  onClose: () => void;
}) {
  const supabase = createClient();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookingsToday, setBookingsToday] = useState<Booking[]>([]);
  const [futureBookings, setFutureBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<"idle" | "loading" | "error">("idle");
  const [statusHint, setStatusHint] = useState<string>("");

  // Room detail modal state
  const [openRoom, setOpenRoom] = useState<Room | null>(null);

  // ---------- Data load & refresh ----------
  const refresh = useCallback(async () => {
    setLoading("loading");
    setStatusHint("Loading rooms and bookings…");

    const [rRooms, rToday, rFuture] = await Promise.all([
      supabase
        .from("rooms")
        .select("id,name,property_id")
        .eq("property_id", propertyId)
        .order("name", { ascending: true }),
      supabase
        .from("bookings")
        .select(
          "id,property_id,room_id,start_date,end_date,start_time,end_time,status,guest_first_name,guest_last_name,guest_email,guest_phone,guest_address"
        )
        .eq("property_id", propertyId)
        // overlap with the selected day
        .lte("start_date", dateStr)
        .gte("end_date", dateStr)
        .neq("status", "cancelled")
        .order("start_date", { ascending: true }),
      // ✅ FIX: include end_date and end_time so it matches Booking type
      supabase
        .from("bookings")
        .select("id,property_id,room_id,start_date,end_date,start_time,end_time,status")
        .eq("property_id", propertyId)
        .gte("start_date", dateStr)
        .neq("status", "cancelled")
        .order("start_date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: true }),
    ]);

    if (rRooms.error || rToday.error || rFuture.error) {
      setLoading("error");
      setStatusHint(rRooms.error?.message || rToday.error?.message || rFuture.error?.message || "Failed to load data.");
      return;
    }

    setRooms(rRooms.data ?? []);
    setBookingsToday(rToday.data ?? []);
    setFutureBookings(rFuture.data ?? []);
    setLoading("idle");
    setStatusHint("");
  }, [supabase, propertyId, dateStr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // map: room_id -> active booking (if any) for the selected day
  const activeByRoom = useMemo(() => {
    const map = new Map<string, Booking>();
    for (const b of bookingsToday) {
      if (b.start_date <= dateStr && dateStr <= b.end_date) {
        if (!map.has(b.room_id)) map.set(b.room_id, b);
      }
    }
    return map;
  }, [bookingsToday, dateStr]);

  // map: room_id -> earliest future booking start (>= dateStr)
  const nextStartByRoom = useMemo(() => {
    const map = new Map<string, { start_date: string; start_time: string | null }>();
    for (const b of futureBookings) {
      if (!map.has(b.room_id)) {
        map.set(b.room_id, { start_date: b.start_date, start_time: b.start_time ?? null });
      }
    }
    return map;
  }, [futureBookings]);

  // ✅ Numeric-aware alphabetical sort (e.g., "Room 2" before "Room 10")
  const collator = useMemo(() => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }), []);
  const roomsSorted = useMemo(
    () => [...rooms].sort((a, b) => collator.compare(a.name, b.name)),
    [rooms, collator]
  );

  // ------------- UI helpers --------------
  function formatReservedUntil(b: Booking) {
    const dt = b.end_date + (b.end_time ? ` ${b.end_time}` : "");
    return `Reserved until ${dt.trim()}`;
  }

  function formatAvailableUntil(roomId: string) {
    const nxt = nextStartByRoom.get(roomId);
    if (!nxt) return "Available (no upcoming bookings)";
    const dt = nxt.start_date + (nxt.start_time ? ` ${nxt.start_time}` : "");
    return `Available until ${dt.trim()}`;
  }

  function guestFullName(b?: Booking | null) {
    if (!b) return "";
    const f = (b.guest_first_name ?? "").trim();
    const l = (b.guest_last_name ?? "").trim();
    const full = [f, l].filter(Boolean).join(" ");
    return full || "";
  }

  // Always refresh when the details modal closes (even if nothing saved)
  const handleRoomModalClose = useCallback(async () => {
    setOpenRoom(null);
    await refresh(); // auto-refresh on return
  }, [refresh]);

  // Also refresh when RoomDetailModal explicitly signals changes
  const handleRoomModalChanged = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // ------------- Render ------------------
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.5)",
        display: "grid",
        placeItems: "center",
        fontFamily: '"Times New Roman", serif',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1100px, 96vw)",
          maxHeight: "86vh",
          overflow: "auto",
          background: "var(--panel)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <strong style={{ letterSpacing: 0.2, fontSize: 16 }}>
            {dateStr} — Rooms
          </strong>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {loading === "loading" && (
              <span
                style={{
                  fontSize: 12,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "var(--primary)",
                  color: "#0c111b",
                  fontWeight: 800,
                }}
              >
                Loading…
              </span>
            )}
            {loading === "error" && (
              <span
                style={{
                  fontSize: 12,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "var(--danger)",
                  color: "#fff",
                  fontWeight: 800,
                }}
              >
                Error
              </span>
            )}
            {statusHint && <small style={{ color: "var(--muted)" }}>{statusHint}</small>}
            <button
              onClick={refresh}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                fontWeight: 900,
                cursor: "pointer",
              }}
              title="Refresh"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Grid rooms */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {roomsSorted.map((room) => {
            const b = activeByRoom.get(room.id) || null;
            const isReserved = !!b && b.status !== "cancelled";
            const fullName = guestFullName(b);

            // For available rooms: preset default dates (start=today, end=tomorrow)
            const defaultStart = { date: dateStr, time: null as string | null };
            const defaultEnd = { date: nextDate(dateStr), time: null as string | null };

            return (
              <div
                key={room.id}
                onClick={() => setOpenRoom(room)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" ? setOpenRoom(room) : null)}
                style={{
                  position: "relative",
                  padding: 14,
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  background: "var(--card)",
                  cursor: "pointer",
                  minHeight: 120,
                  display: "grid",
                  gridTemplateRows: "auto 1fr auto",
                  userSelect: "none",
                }}
                title="Open reservation"
              >
                {/* Room name + status badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 15 }}>{room.name}</strong>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 800,
                      background: isReserved ? "var(--danger)" : "var(--success)",
                      border: `1px solid ${isReserved ? "var(--danger)" : "var(--success)"}`,
                      color: "#fff",
                    }}
                  >
                    {isReserved ? "Reserved" : "Available"}
                  </span>
                </div>

                {/* CENTER: Guest name (if reserved) */}
                <div
                  style={{
                    display: "grid",
                    placeItems: "center",
                    textAlign: "center",
                    padding: "6px 4px",
                  }}
                >
                  {isReserved && fullName && (
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: 16,
                        letterSpacing: 0.2,
                      }}
                    >
                      {fullName}
                    </div>
                  )}

                  {isReserved && !fullName && (
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "var(--muted)",
                      }}
                    >
                      (Guest name not set)
                    </div>
                  )}
                </div>

                {/* Footer: until text */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <small style={{ color: "var(--muted)" }}>
                    {isReserved ? formatReservedUntil(b!) : formatAvailableUntil(room.id)}
                  </small>
                  <small style={{ color: "var(--muted)" }}>Open ▸</small>
                </div>

                {/* Hint: when creating, dates will be prefilled */}
                {!isReserved && (
                  <small style={{ position: "absolute", bottom: 8, left: 14, color: "var(--muted)" }}>
                    (Start: {defaultStart.date} • End: {defaultEnd.date})
                  </small>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Details modal (create/edit) */}
      {openRoom && (
        <RoomDetailModal
          dateStr={dateStr}
          propertyId={propertyId}
          room={openRoom}
          // If room has NO active booking, prefill start=today, end=tomorrow
          defaultStart={
            activeByRoom.has(openRoom.id) ? undefined : { date: dateStr, time: null }
          }
          defaultEnd={
            activeByRoom.has(openRoom.id) ? undefined : { date: nextDate(dateStr), time: null }
          }
          onClose={handleRoomModalClose}     // auto refresh on return
          onChanged={handleRoomModalChanged} // refresh on save
        />
      )}
    </div>
  );
}