"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RoomDetailModal from "./RoomDetailModal";

type Property = { id: string; name: string; check_in_time: string | null; check_out_time: string | null };
type Room = { id: string; name: string; property_id: string };
export type Booking = {
  id: string;
  property_id: string;
  room_id: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function addDaysStr(s: string, n: number) { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<"Idle" | "Loading" | "Error">("Loading");

  const [selected, setSelected] = useState<null | {
    room: Room;
    forceNew?: boolean;
    prefill?: { startDate: string; startTime: string | null; endDate: string; endTime: string | null };
  }>(null);

  async function reload() {
    const [p1, p2, p3] = await Promise.all([
      supabase
        .from("properties").select("id,name,check_in_time,check_out_time")
        .eq("id", propertyId).maybeSingle(),
      supabase
        .from("rooms").select("id,name,property_id")
        .eq("property_id", propertyId)
        .order("sort_index", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("bookings")
        .select("id,property_id,room_id,start_date,end_date,start_time,end_time,status")
        .eq("property_id", propertyId)
        .neq("status", "cancelled")
        .gte("start_date", addDaysStr(dateStr, -365))
        .lte("end_date", addDaysStr(dateStr, 365))
        .order("start_date", { ascending: true }),
    ]);
    if (!p1.error) setProperty((p1.data ?? null) as any);
    if (!p2.error) setRooms((p2.data ?? []) as any);
    if (!p3.error) setBookings((p3.data ?? []) as any);
    setLoading("Idle");
  }

  useEffect(() => {
    (async () => {
      setLoading("Loading");
      await reload();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, dateStr]);

  const checkIn  = property?.check_in_time || "14:00";
  const checkOut = property?.check_out_time || "11:00";

  const activeByRoom = useMemo(() => {
    const m = new Map<string, Booking | null>();
    for (const r of rooms) m.set(r.id, null);
    const arr: Booking[] = Array.isArray(bookings) ? bookings : [];
    for (const b of arr) {
      if (!b.room_id) continue;
      if (b.start_date <= dateStr && dateStr <= b.end_date) m.set(b.room_id, b);
    }
    return m;
  }, [bookings, rooms, dateStr]);

  const nextByRoom = useMemo(() => {
    const m = new Map<string, Booking | null>();
    for (const r of rooms) m.set(r.id, null);
    const arr: Booking[] = Array.isArray(bookings) ? bookings : [];
    for (const b of arr) {
      if (!b.room_id) continue;
      if (b.start_date > dateStr) {
        const cur = m.get(b.room_id);
        if (!cur || b.start_date < cur.start_date) m.set(b.room_id, b);
      }
    }
    return m;
  }, [bookings, rooms, dateStr]);

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "min(920px, 92vw)", maxHeight: "86vh", overflow: "auto",
                 background: "var(--panel)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <strong>{dateStr} — Rooms</strong>
          <span style={{
            fontSize: 12, padding: "4px 8px", borderRadius: 999,
            background: loading === "Loading" ? "var(--primary)" : loading === "Error" ? "var(--danger)" : "#2a2f3a",
            color: loading === "Loading" ? "#0c111b" : "#fff", fontWeight: 700
          }}>
            {loading === "Loading" ? "Loading…" : loading === "Error" ? "Error" : "Idle"}
          </span>
        </div>

        {rooms.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No rooms found for this property.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
            {rooms.map((r) => {
              const active = activeByRoom.get(r.id) || null;
              const next   = nextByRoom.get(r.id)   || null;

              const showAddNew = !!active && active.end_date === dateStr; // termină azi
              const badge: "Reserved" | "Available" = active ? "Reserved" : "Available";
              const subtitle = active
                ? `Reserved until ${active.end_date} ${active.end_time || checkOut}`
                : next
                ? `Available (until ${next.start_date} ${next.start_time || checkIn})`
                : "Available";

              return (
                <li key={r.id}
                  onClick={() => setSelected({ room: r })}
                  style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 12,
                           display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer" }}
                  title={showAddNew ? "Open reservation (current)" : "Open reservation"}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <strong style={{ color: "var(--text)" }}>{r.name}</strong>
                    <small style={{ color: "var(--muted)" }}>{subtitle}</small>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {showAddNew && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected({
                            room: r,
                            forceNew: true,
                            prefill: {
                              startDate: dateStr,
                              startTime: checkIn,
                              endDate: addDaysStr(dateStr, 1),
                              endTime: checkOut
                            }
                          });
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid var(--primary)",
                          background: "transparent",
                          color: "var(--text)",
                          fontWeight: 800,
                          cursor: "pointer"
                        }}
                        title="Add new reservation starting after check-out"
                      >
                        Add new reservation
                      </button>
                    )}
                    <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 800,
                                   background: badge === "Reserved" ? "var(--danger)" : "var(--success, #22c55e)", color: "#0c111b" }}>
                      {badge}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected && (
        <RoomDetailModal
          dateStr={dateStr}
          propertyId={propertyId}
          room={selected.room}
          forceNew={!!selected.forceNew}
          defaultStart={selected.prefill ? { date: selected.prefill.startDate, time: selected.prefill.startTime } : undefined}
          defaultEnd={selected.prefill ? { date: selected.prefill.endDate, time: selected.prefill.endTime } : undefined}
          onClose={() => setSelected(null)}
          onChanged={async () => { await reload(); }}
        />
      )}
    </div>
  );
}
