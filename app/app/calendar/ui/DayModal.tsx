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

  // NEW guest fields used in UI
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

    const [r1, r2] = await Promise.all([
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
        // overlap: start_date <= dateStr <= end_date
        .lte("start_date", dateStr)
        .gte("end_date", dateStr)
        .neq("status", "cancelled")
        .order("start_date", { ascending: true }),
    ]);

    if (r1.error || r2.error) {
      setLoading("error");
      setStatusHint(r1.error?.message || r2.error?.message || "Failed to load data.");
      return;
    }

    setRooms(r1.data ?? []);
    setBookings(r2.data ?? []);
    setLoading("idle");
    setStatusHint("");
  }, [supabase, propertyId, dateStr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // map for quick lookup: room_id -> active booking (if any)
  const bookingByRoom = useMemo(() => {
    const map = new Map<string, Booking>();
    for (const b of bookings) {
      // safety check; server filter already ensures overlap
      if (b.start_date <= dateStr && dateStr <= b.end_date) {
        if (!map.has(b.room_id)) map.set(b.room_id, b);
        // if multiple, keep earliest start (already sorted)
      }
    }
    return map;
  }, [bookings, dateStr]);

  // ------------- UI helpers --------------
  function formatUntil(b: Booking) {
    const dt = b.end_date + (b.end_time ? ` ${b.end_time}` : "");
    return `Reserved until ${dt.trim()}`;
    // (dacă dorești, putem face format localizat cu Intl.DateTimeFormat)
  }
  function guestFullName(b?: Booking | null) {
    if (!b) return "";
    const f = (b.guest_first_name ?? "").trim();
    const l = (b.guest_last_name ?? "").trim();
    const full = [f, l].filter(Boolean).join(" ");
    return full || ""; // afișăm doar dacă avem ceva
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

        {/* Grid rooms */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {rooms.map((room) => {
            const b = bookingByRoom.get(room.id) || null;
            const isReserved = !!b && b.status !== "cancelled";
            const fullName = guestFullName(b);

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
                  minHeight: 110,
                  display: "grid",
                  gridTemplateRows: "auto 1fr auto",
                  userSelect: "none",
                }}
                title="Open reservation"
              >
                {/* Room name */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 15 }}>{room.name}</strong>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 800,
                      background: isReserved ? "var(--primary)" : "transparent",
                      border: isReserved ? "1px solid var(--primary)" : "1px solid var(--border)",
                      color: isReserved ? "#0c111b" : "var(--text)",
                    }}
                  >
                    {isReserved ? "Reserved" : "Available"}
                  </span>
                </div>

                {/* CENTER: Guest name (if any) */}
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

                {/* Footer: reserved until / action hint */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <small style={{ color: "var(--muted)" }}>
                    {isReserved ? formatUntil(b!) : "Tap to create reservation"}
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