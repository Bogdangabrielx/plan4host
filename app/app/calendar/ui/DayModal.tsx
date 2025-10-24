"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import RoomDetailModal from "./RoomDetailModal";

export type Booking = {
  id: string;
  property_id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  status: "pending" | "confirmed" | "cancelled" | string;
  source?: string | null;
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
function prevDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
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

  // Local day navigation state (prev/next day)
  const [day, setDay] = useState<string>(dateStr);
  useEffect(() => { setDay(dateStr); }, [dateStr]);

  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookingsToday, setBookingsToday] = useState<Booking[]>([]);
  const [futureBookings, setFutureBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<"idle" | "loading" | "error">("idle");
  const [statusHint, setStatusHint] = useState<string>("");

  const [openRoom, setOpenRoom] = useState<Room | null>(null);
  const [createRoom, setCreateRoom] = useState<Room | null>(null);

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
        .lte("start_date", day)
        .gte("end_date", day)
        .neq("status", "cancelled")
        .order("start_date", { ascending: true }),
      supabase
        .from("bookings")
        .select("id,property_id,room_id,start_date,end_date,start_time,end_time,status,source")
        .eq("property_id", propertyId)
        .gte("start_date", day)
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
  }, [supabase, propertyId, day]);

  useEffect(() => { refresh(); }, [refresh]);

  const CI = property?.check_in_time || "14:00";
  const CO = property?.check_out_time || "11:00";

  const activeByRoom = useMemo(() => {
    const map = new Map<string, Booking>();
    for (const b of bookingsToday) {
      if (b.start_date <= day && day <= b.end_date) {
        if (!map.has(b.room_id)) map.set(b.room_id, b);
      }
    }
    return map;
  }, [bookingsToday, day]);

  const nextStartByRoom = useMemo(() => {
    const map = new Map<string, { start_date: string; start_time: string | null }>();
    for (const b of futureBookings) {
      if (!map.has(b.room_id)) map.set(b.room_id, { start_date: b.start_date, start_time: b.start_time ?? null });
    }
    return map;
  }, [futureBookings]);

  const collator = useMemo(() => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }), []);
  const roomsSorted = useMemo(
    () => [...rooms].sort((a, b) => collator.compare(a.name, b.name)),
    [rooms, collator]
  );

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
  function otaFill(src: any) {
    const s = (src || "").toLowerCase();
    if (s.includes("airbnb")) return "rgba(255,90,95,0.18)";
    if (s.includes("booking")) return "rgba(30,144,255,0.18)";
    if (s.includes("expedia")) return "rgba(254,203,46,0.22)";
    if (s.includes("ota") || s.includes("ical")) return "transparent";
    return "transparent";
  }

  const handleRoomModalClose = useCallback(async () => {
    setOpenRoom(null);
    await refresh();
  }, [refresh]);
  const handleRoomModalChanged = useCallback(async () => { await refresh(); }, [refresh]);
  const handleCreateModalClose = useCallback(async () => {
    setCreateRoom(null);
    await refresh();
  }, [refresh]);

  const RADIUS = 12;

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
        paddingTop: "calc(var(--safe-top) + 12px)",
        paddingBottom: "calc(var(--safe-bottom) + 12px)",
        paddingLeft: "12px",
        paddingRight: "12px",
        fontFamily:
          "Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1100px, 100%)",
          maxHeight: "calc(100dvh - (var(--safe-top) + var(--safe-bottom) + 48px))",
          overflow: "auto",
          WebkitOverflowScrolling: "touch" as any,
          overscrollBehavior: "contain",
          background: "var(--panel)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: RADIUS,
          position: "relative",
        }}
      >
        {/* HEADER — STICKY, FĂRĂ GAP SUS (pictăm chiar până în colțurile rotunjite) */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 3,
            background: "var(--panel)",
            // colțurile top, ca să nu se vadă „din spate” la scrol
            borderTopLeftRadius: RADIUS,
            borderTopRightRadius: RADIUS,
            // „pictăm” și linia de jos
            borderBottom: "1px solid var(--border)",
            // spațiere internă
            padding: 16,
            paddingBottom: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            // truc anti-hairline la Safari (evită o linie de 1px transparentă)
            transform: "translateZ(0)",
            willChange: "transform",
          }}
        >
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button className="sb-btn sb-cardglow sb-btn--icon" type="button" aria-label="Previous day" onClick={() => setDay((d)=> prevDate(d))}>◀</button>
            <strong style={{ letterSpacing: 0.2, fontSize: 16 }}>
              {day} 
            </strong>
            <button className="sb-btn sb-cardglow sb-btn--icon" type="button" aria-label="Next day" onClick={() => setDay((d)=> nextDate(d))}>▶</button>
          </div>

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

        {/* CONȚINUT — padding separat, ca să nu mai existe spațiu „deasupra” header-ului */}
        <div className="sb-cardglow" style={{ padding: 16, paddingTop: 12 }}>
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
              const endsToday = isReserved && b!.end_date === day;

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
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 12,
                        background: otaFill(b?.source),
                        pointerEvents: "none",
                      }}
                    />
                  )}

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

                  <div style={{ display: "grid", placeItems: "center", textAlign: "center", padding: "6px 4px" }}>
                    {isReserved && fullName && (
                      <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: 0.2 }}>
                        {fullName}
                      </div>
                    )}
                    {isReserved && !fullName && (
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--muted)" }}>
                        (Guest name not set)
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <small style={{ color: "var(--muted)" }}>
                      {isReserved ? formatReservedUntil(b!) : formatAvailableUntil(room.id)}
                    </small>

                    {endsToday && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
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
      </div>

      {openRoom && (
        <RoomDetailModal
          dateStr={day}
          propertyId={propertyId}
          room={openRoom}
          onClose={handleRoomModalClose}
          onChanged={handleRoomModalChanged}
        />
      )}

      {createRoom && (
        <RoomDetailModal
          dateStr={day}
          propertyId={propertyId}
          room={createRoom}
          forceNew={true}
          defaultStart={{ date: day, time: CI }}
          defaultEnd={{ date: nextDate(day), time: null }}
          onClose={handleCreateModalClose}
          onChanged={handleRoomModalChanged}
        />
      )}
    </div>
  );
}
