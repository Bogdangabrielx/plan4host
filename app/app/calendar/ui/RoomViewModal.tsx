"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";

const DayModal: any = dynamic(
  () => import("./DayModal").then((m: any) => m.default ?? m.DayModal ?? (() => null)),
  { ssr: false }
);

type Room = { id: string; name: string; property_id: string };
type Booking = {
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
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstWeekday(y: number, m: number) { const js = new Date(y, m, 1).getDay(); return (js + 6) % 7; }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function RoomViewModal({
  propertyId,
  initialYear,
  initialMonth,
  canEdit,
  onClose,
}: {
  propertyId: string;
  initialYear: number;
  initialMonth: number; // 0..11
  canEdit: boolean;
  onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<"Idle"|"Loading"|"Error">("Idle");
  const [openDate, setOpenDate] = useState<string | null>(null);

  // Load rooms + bookings overlapping the month
  useEffect(() => {
    if (!propertyId) return;
    const from = `${year}-${pad(month+1)}-01`;
    const to = `${year}-${pad(month+1)}-${pad(daysInMonth(year, month))}`;

    (async () => {
      setLoading("Loading");
      const rRooms = await supabase
        .from("rooms")
        .select("id,name,property_id")
        .eq("property_id", propertyId)
        .order("sort_index", { ascending: true })
        .order("created_at", { ascending: true });

      // overlap: start_date <= to AND end_date >= from
      const rBookings = await supabase
        .from("bookings")
        .select("id,property_id,room_id,start_date,end_date,start_time,end_time,status")
        .eq("property_id", propertyId)
        .neq("status","cancelled")
        .lte("start_date", to)
        .gte("end_date", from)
        .order("start_date", { ascending: true });

      if (rRooms.error || rBookings.error) {
        setRooms([]);
        setBookings([]);
        setLoading("Error");
      } else {
        setRooms((rRooms.data ?? []) as Room[]);
        setBookings((rBookings.data ?? []) as Booking[]);
        setLoading("Idle");
      }
    })();
  }, [propertyId, year, month, supabase]);

  const occByRoom = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const b of bookings) {
      if (!b.room_id) continue;
      let d = b.start_date;
      const end = b.end_date;
      while (d <= end) {
        const set = map.get(b.room_id) || new Set<string>();
        set.add(d);
        map.set(b.room_id, set);
        // add 1 day
        const dt = new Date(d + "T00:00:00"); dt.setDate(dt.getDate() + 1); d = ymd(dt);
      }
    }
    return map;
  }, [bookings]);

  const RADIUS = 12;

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 240, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", padding: 12 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(1100px, 100%)",
        maxHeight: "calc(100dvh - 48px)",
        overflow: "auto",
        background: "var(--panel)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: RADIUS,
      }}>
        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--panel)", borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS, borderBottom: "1px solid var(--border)", padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <strong>Room view — {monthNames[month]} {year}</strong>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="sb-btn sb-btn--icon" aria-label="Prev month" onClick={() => setMonth(m => { const nm = m - 1; if (nm < 0) { setYear(y => y - 1); return 11; } return nm; })}>◀</button>
            <button className="sb-btn sb-btn--icon" aria-label="Next month" onClick={() => setMonth(m => { const nm = m + 1; if (nm > 11) { setYear(y => y + 1); return 0; } return nm; })}>▶</button>
            <button className="sb-btn sb-btn--ghost sb-btn--small" onClick={onClose}>Close</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 12 }}>
          {loading === "Error" && (
            <div style={{ color: "var(--muted)" }}>Failed to load rooms or bookings.</div>
          )}
          {loading === "Loading" && (
            <div style={{ color: "var(--muted)", marginBottom: 8 }}>Loading…</div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {rooms.map((r) => (
              <div key={r.id} className="sb-card" style={{ padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <strong style={{ fontSize: 14 }}>{r.name}</strong>
                  <small style={{ color: "var(--muted)" }}>{monthNames[month]} {year}</small>
                </div>
                <MiniMonthRoom
                  year={year}
                  month={month}
                  roomId={r.id}
                  occDays={occByRoom.get(r.id) || new Set<string>()}
                  onDayClick={(dateStr) => setOpenDate(dateStr)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {openDate && (
        <DayModal
          dateStr={openDate}
          propertyId={propertyId}
          canEdit={canEdit}
          onClose={() => setOpenDate(null)}
        />
      )}
    </div>
  );
}

function MiniMonthRoom({ year, month, roomId, occDays, onDayClick }: {
  year: number; month: number; roomId: string; occDays: Set<string>;
  onDayClick: (dateStr: string) => void;
}) {
  const dim = daysInMonth(year, month);
  const fw  = firstWeekday(year, month);
  const cells: Array<{ dateStr?: string; dayNum?: number; reserved?: boolean }> = [];

  for (let i = 0; i < fw; i++) cells.push({});
  for (let d = 1; d <= dim; d++) {
    const ds = `${year}-${pad(month+1)}-${pad(d)}`;
    cells.push({ dateStr: ds, dayNum: d, reserved: occDays.has(ds) });
  }
  const rows  = Math.ceil(cells.length / 7);
  const total = rows * 7;
  while (cells.length < total) cells.push({});

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
      {cells.map((c, i) => {
        const clickable = !!c.dateStr;
        return (
          <div
            key={i}
            onClick={clickable ? () => onDayClick(c.dateStr!) : undefined}
            title={c.dateStr ? (c.reserved ? "Reserved" : "Available") : undefined}
            style={{
              position: "relative",
              height: 28,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: c.reserved ? "var(--danger)" : "var(--card)",
              opacity: c.reserved ? 0.25 : 1,
              cursor: clickable ? "pointer" : "default",
              overflow: "hidden",
            }}
          >
            {typeof c.dayNum === "number" && (
              <span style={{ position: "absolute", top: 5, left: 6, fontSize: 11, color: "var(--text)", fontWeight: 800 }}>
                {c.dayNum}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

