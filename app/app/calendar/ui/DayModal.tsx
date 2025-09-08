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

  // guest fields
  guest_first_name?: string | null;
  guest_last_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  guest_address?: string | null;
};

type Room = { id: string; name: string; property_id: string };

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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<"idle" | "loading" | "error">("idle");
  const [statusHint, setStatusHint] = useState<string>("");

  // Room detail modal state
  const [openRoom, setOpenRoom] = useState<Room | null>(null);

  // ---------- Data load & refresh ----------
  const refresh = useCallback(async () => {
    setLoading("loading");
    setStatusHint("Loading rooms and bookings…");

    // 1) Load rooms alphabetically
    const r1 = await supabase
      .from("rooms")
      .select("id,name,property_id")
      .eq("property_id", propertyId)
      .order("name", { ascending: true });

    if (r1.error) {
      setLoading("error");
      setStatusHint(r1.error.message || "Failed to load rooms.");
      return;
    }
    const roomList = r1.data ?? [];
    setRooms(roomList);

    // 2) Load bookings that are active today OR in viitor (end_date >= azi)
    const r2 = await supabase
      .from("bookings")
      .select(
        "id,property_id,room_id,start_date,end_date,start_time,end_time,status,guest_first_name,guest_last_name,guest_email,guest_phone,guest_address"
      )
      .eq("property_id", propertyId)
      .neq("status", "cancelled")
      .gte("end_date", dateStr)
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true });

    if (r2.error) {
      setLoading("error");
      setStatusHint(r2.error.message || "Failed to load bookings.");
      return;
    }

    setBookings(r2.data ?? []);
    setLoading("idle");
    setStatusHint("");
  }, [supabase, propertyId, dateStr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Active booking per room (dacă start_date <= azi <= end_date)
  const activeByRoom = useMemo(() => {
    const map = new Map<string, Booking>();
    for (const b of bookings) {
      if (b.start_date <= dateStr && dateStr <= b.end_date) {
        if (!map.has(b.room_id)) map.set(b.room_id, b);
      }
    }
    return map;
  }, [bookings, dateStr]);

  // Următoarea rezervare (strict după azi) per room
  const nextByRoom = useMemo(() => {
    const map = new Map<string, Booking>();
    // bookings este deja ordonat ascendent după start_date/time
    for (const b of bookings) {
      if (b.start_date > dateStr) {
        if (!map.has(b.room_id)) {
          map.set(b.room_id, b);
        }
      }
    }
    return map;
  }, [bookings, dateStr]);

  // ------------- UI helpers --------------
  function formatReservedUntil(b: Booking) {
    const dt = b.end_date + (b.end_time ? ` ${b.end_time}` : "");
    return `Reserved until ${dt.trim()}`;
  }
  function formatAvailableUntil(nextB?: Booking | null) {
    if (!nextB) return "Available (no upcoming bookings)";
    return `Available until ${nextB.start_date}`;
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
    await refresh(); // <— REFRESH AUTOMAT LA ÎNTOARCERE
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
          width: "min(1000px, 96vw)",
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

        {/* Grid rooms (rooms sunt deja sortate alfabetic din query) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {rooms.map((room) => {
            const bActive = activeByRoom.get(room.id) || null;
            const bNext   = nextByRoom.get(room.id) || null;
            const isReserved = !!bActive && bActive.status !== "cancelled";
            const fullName = guestFullName(bActive);

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
                {/* Room name + status chip (ROȘU/VERDE) */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 15 }}>{room.name}</strong>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 900,
                      background: isReserved ? "var(--danger)" : "var(--success)",
                      border: `1px solid ${isReserved ? "var(--danger)" : "var(--success)"}`,
                      color: "#fff",
                      letterSpacing: 0.2,
                      textTransform: "uppercase",
                    }}
                  >
                    {isReserved ? "Reserved" : "Available"}
                  </span>
                </div>

                {/* CENTER: Guest name (dacă e rezervată) */}
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

                  {!isReserved && (
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "var(--muted)",
                      }}
                    >
                      {formatAvailableUntil(bNext)}
                    </div>
                  )}
                </div>

                {/* Footer: reserved until / hint */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <small style={{ color: "var(--muted)" }}>
                    {isReserved ? formatReservedUntil(bActive!) : "Tap to create reservation"}
                  </small>
                  <small style={{ color: "var(--muted)" }}>Open ▸</small>
                </div>
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
          onClose={handleRoomModalClose}     // <— Refresh on return (always)
          onChanged={handleRoomModalChanged} // <— Refresh on save
        />
      )}
    </div>
  );
}