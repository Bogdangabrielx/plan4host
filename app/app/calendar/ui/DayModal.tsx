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
  source?: string | null;

  // Guest fields
  guest_first_name?: string | null;
  guest_last_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  guest_address?: string | null;
};

type Room = { id: string; name: string; property_id: string };
type Property = { id: string; check_in_time: string | null; check_out_time: string | null };

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

  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookingsToday, setBookingsToday] = useState<Booking[]>([]);
  const [futureBookings, setFutureBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<"idle" | "loading" | "error">("idle");
  const [statusHint, setStatusHint] = useState<string>("");

  // Modale
  const [openRoom, setOpenRoom] = useState<Room | null>(null);   // view/edit existentă
  const [createRoom, setCreateRoom] = useState<Room | null>(null); // creare nouă (forceNew)

  // ---------- Data load & refresh ----------
  const refresh = useCallback(async () => {
    setLoading("loading");
    setStatusHint("Loading rooms and bookings…");

    const [rProp, rRooms, rToday, rFuture] = await Promise.all([
      supabase
        .from("properties")
        .select("id,check_in_time,check_out_time")
        .eq("id", propertyId)
        .maybeSingle(),
      supabase
        .from("rooms")
        .select("id,name,property_id")
        .eq("property_id", propertyId)
        .order("name", { ascending: true }),
      supabase
        .from("bookings")
        .select(
          "id,property_id,room_id,start_date,end_date,start_time,end_time,status,source,guest_first_name,guest_last_name,guest_email,guest_phone,guest_address"
        )
        .eq("property_id", propertyId)
        // overlap with the selected day
        .lte("start_date", dateStr)
        .gte("end_date", dateStr)
        .neq("status", "cancelled")
        .order("start_date", { ascending: true }),
      supabase
        .from("bookings")
        .select("id,property_id,room_id,start_date,end_date,start_time,end_time,status,source")
        .eq("property_id", propertyId)
        .gte("start_date", dateStr)
        .neq("status", "cancelled")
        .order("start_date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: true }),
    ]);

    if (rProp.error || rRooms.error || rToday.error || rFuture.error) {
      setLoading("error");
      setStatusHint(
        rProp.error?.message ||
          rRooms.error?.message ||
          rToday.error?.message ||
          rFuture.error?.message ||
          "Failed to load data."
      );
      return;
    }

    setProperty((rProp.data as Property) ?? null);
    setRooms(rRooms.data ?? []);
    setBookingsToday(rToday.data ?? []);
    setFutureBookings(rFuture.data ?? []);
    setLoading("idle");
    setStatusHint("");
  }, [supabase, propertyId, dateStr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const CI = property?.check_in_time || "14:00";
  const CO = property?.check_out_time || "11:00";

  // map: room_id -> active booking (if any) pentru ziua selectată
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

  // ✅ sortare numeric-aware (ex: "Room 2" înainte de "Room 10")
  const collator = useMemo(() => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }), []);
  const roomsSorted = useMemo(() => [...rooms].sort((a, b) => collator.compare(a.name, b.name)), [rooms, collator]);

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

  // OTA color (soft/pastel) underlay mapping
  function otaFill(src: any) {
    const s = (src || '').toLowerCase();
    if (s.includes('airbnb')) return 'rgba(255,90,95,0.18)';      // Airbnb red (soft)
    if (s.includes('booking')) return 'rgba(30,144,255,0.18)';    // Booking blue (soft)
    if (s.includes('expedia')) return 'rgba(254,203,46,0.22)';    // Expedia yellow (soft)
    if (s.includes('ota') || s.includes('ical')) return 'transparent'; // OTA/iCal violet (soft)
    return 'transparent'; // default violet
  }

  // Refresh automat la închiderea modalei
  const handleRoomModalClose = useCallback(async () => {
    setOpenRoom(null);
    await refresh();
  }, [refresh]);
  const handleRoomModalChanged = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const handleCreateModalClose = useCallback(async () => {
    setCreateRoom(null);
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
        fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1100px, calc(100vw - 32px))",
          maxHeight: "calc(100dvh - 32px)",
          overflow: "auto",
          background: "var(--panel)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, position: "sticky", top: 0, background: "var(--panel)", zIndex: 1, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
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
            const endsToday = isReserved && b!.end_date === dateStr; // checkout în ziua selectată

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
                  minHeight: 140,
                  display: "grid",
                  gridTemplateRows: "auto 1fr auto",
                  userSelect: "none",
                }}
                title="Open reservation"
              >
                {isReserved && (
                  <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 12, background: otaFill(b?.source), pointerEvents: 'none' }} />
                )}
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

                {/* Footer: until text + Add reservation on checkout-day */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <small style={{ color: "var(--muted)" }}>
                    {isReserved ? formatReservedUntil(b!) : formatAvailableUntil(room.id)}
                  </small>

                  {/* ✅ Buton special: dacă rezervarea se termină azi, permite creare imediată de rezervare nouă */}
                  {endsToday && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // nu deschide modalul de vizualizare
                        setCreateRoom(room);
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid var(--primary)",
                        background: "var(--primary)",
                        color: "#0c111b",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                      title={`Add reservation starting today ${CI}`}
                    >
                      Add reservation
                    </button>
                  )}

                  <small style={{ color: "var(--muted)" }}>Open ▸</small>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Details modal (view/edit existent) */}
      {openRoom && (
        <RoomDetailModal
          dateStr={dateStr}
          propertyId={propertyId}
          room={openRoom}
          onClose={handleRoomModalClose}     // auto refresh on return
          onChanged={handleRoomModalChanged} // refresh on save
        />
      )}

      {/* Create modal (forceNew) pentru camere cu checkout în aceeași zi */}
      {createRoom && (
        <RoomDetailModal
          dateStr={dateStr}
          propertyId={propertyId}
          room={createRoom}
          forceNew={true}
          defaultStart={{ date: dateStr, time: CI }}             // începe azi, la check-in time (ex: 14:00)
          defaultEnd={{ date: nextDate(dateStr), time: null }}   // mâine, time implicit (salvezi în modal)
          onClose={handleCreateModalClose}       // auto refresh on return
          onChanged={handleRoomModalChanged}     // refresh on save
        />
      )}
    </div>
  );
}
