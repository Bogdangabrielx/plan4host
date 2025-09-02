"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";

// Robust dynamic import: works whether DayModal is a default or a named export.
const DayModal: any = dynamic(
  () => import("./DayModal").then((m: any) => m.default ?? m.DayModal ?? (() => null)),
  { ssr: false }
);

type Property = { id: string; name: string; check_in_time: string | null; check_out_time: string | null };
type Room = { id: string; name: string; property_id: string };
type Booking = {
  id: string;
  property_id: string;
  room_id: string | null;
  start_date: string;   // "YYYY-MM-DD"
  end_date: string;     // "YYYY-MM-DD"
  start_time: string | null; // "HH:MM"
  end_time: string | null;   // "HH:MM"
  status: string;
};

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const weekdayShort = ["Mo","Tu","We","Th","Fr","Sa","Su"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function ymd(d: Date)   { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function daysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate(); } // m: 0..11
function firstWeekday(y: number, m: number) { // Monday=0 … Sunday=6
  const js = new Date(y, m, 1).getDay(); // 0..6 (Sun..Sat)
  return (js + 6) % 7;
}
function addDaysStr(s: string, n: number) {
  const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return ymd(d);
}
function sameYMD(a: string, b: string) { return a === b; }

export default function CalendarClient({ initialProperties }: { initialProperties: Property[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [properties] = useState<Property[]>(initialProperties);
  const [propertyId, setPropertyId] = useState<string>(initialProperties[0]?.id ?? "");

  // View state
  const today = new Date();
  const [view, setView]   = useState<"year" | "month">("year");
  const [year, setYear]   = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth()); // 0..11
  const [highlightDate, setHighlightDate] = useState<string | null>(null); // highlight în Month view

  // Data
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState<"Idle"|"Loading"|"Error">("Idle");

  // Day modal (ONLY in Month view)
  const [openDate, setOpenDate] = useState<string | null>(null);

  // Load rooms + bookings for current window
  useEffect(() => {
    if (!propertyId) return;
    let from: string, to: string;
    if (view === "year") {
      from = `${year}-01-01`;
      to   = `${year}-12-31`;
    } else {
      const first = `${year}-${pad(month+1)}-01`;
      const last  = `${year}-${pad(month+1)}-${pad(daysInMonth(year, month))}`;
      from = first; to = last;
    }

    (async () => {
      setLoading("Loading");
      const [r1, r2] = await Promise.all([
        supabase.from("rooms")
          .select("id,name,property_id")
          .eq("property_id", propertyId)
          .order("sort_index", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase.from("bookings")
          .select("id,property_id,room_id,start_date,end_date,start_time,end_time,status")
          .eq("property_id", propertyId)
          .neq("status","cancelled")
          .gte("start_date", from)
          .lte("end_date", to)
          .order("start_date", { ascending: true })
      ]);
      if (r1.error || r2.error) {
        setRooms([]); setBookings([]); setLoading("Error");
      } else {
        setRooms((r1.data ?? []) as Room[]);
        setBookings((r2.data ?? []) as Booking[]);
        setLoading("Idle");
      }
    })();
  }, [propertyId, view, year, month, supabase]);

  // Occupancy map: dateStr -> set(room_id)
  const occupancyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const b of bookings) {
      if (!b.room_id) continue;
      let d = b.start_date;
      const end = b.end_date;
      while (d <= end) {
        if (!map.has(d)) map.set(d, new Set<string>());
        map.get(d)!.add(b.room_id);
        d = addDaysStr(d, 1);
      }
    }
    return map;
  }, [bookings]);

  // Helpers
  function goToMonthFor(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setHighlightDate(dateStr);
    setView("month");
  }
  function goToday() {
    const ds = ymd(today);
    goToMonthFor(ds); // highlight today's date în Month view
  }
  function backToYear() {
    setHighlightDate(null);
    setView("year");
  }

  return (
    <div style={{ display: "grid", gap: 12, color: "var(--text)" }}>
      <PlanHeaderBadge title="Calendar" />

      {/* Top toolbar: LEFT = property + pill + Month section; RIGHT = ◀ Year ▶ Today */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {/* LEFT */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 320 }}>
          <select
            value={propertyId}
            onChange={(e) => { setPropertyId(e.currentTarget.value); }}
            style={select}
          >
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <span
            style={{
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 999,
              background: loading === "Loading" ? "var(--primary)" : loading === "Error" ? "var(--danger)" : "#2a2f3a",
              color: loading === "Loading" ? "#0c111b" : "#fff",
              fontWeight: 700
            }}
          >
            {loading === "Loading" ? "Syncing…" : loading === "Error" ? "Error" : "Idle"}
          </span>

          {/* Month section (only in month view) */}
          {view === "month" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={backToYear} style={linkBtn}>Back to Year</button>
              <strong style={{ color: "var(--text)" }}>{monthNames[month]}</strong>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* RIGHT — ◀ Year ▶ always together + Today */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setYear(y => y - 1)}
            style={btn}
          >
            ◀
          </button>

          <strong style={{ minWidth: 90, textAlign: "center", color: "var(--text)" }}>{year}</strong>

          <button
            onClick={() => setYear(y => y + 1)}
            style={btn}
          >
            ▶
          </button>

          <button onClick={goToday} style={btn}>Today</button>
        </div>
      </div>

      {view === "year" ? (
        <YearView
          year={year}
          roomsCount={rooms.length}
          occupancyMap={occupancyMap}
          onMonthTitleClick={(m) => { setMonth(m); setHighlightDate(null); setView("month"); }}
          onDayClick={(dateStr) => goToMonthFor(dateStr)} // orice zi -> Month view
        />
      ) : (
        <MonthView
          year={year}
          month={month}
          roomsCount={rooms.length}
          occupancyMap={occupancyMap}
          highlightDate={highlightDate}
          onDayClick={(dateStr) => setOpenDate(dateStr)} // în Month view: deschide DayModal
        />
      )}

      {/* DayModal — only in Month view */}
      {openDate && (
        <DayModal
          dateStr={openDate}
          propertyId={propertyId}
          onClose={() => setOpenDate(null)}
        />
      )}
    </div>
  );
}

/* ================== YEAR VIEW ================== */

function YearView({
  year,
  roomsCount,
  occupancyMap,
  onMonthTitleClick,
  onDayClick
}: {
  year: number;
  roomsCount: number;
  occupancyMap: Map<string, Set<string>>;
  onMonthTitleClick: (monthIndex: number) => void;
  onDayClick: (dateStr: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      {Array.from({ length: 12 }).map((_, m) => (
        <div key={m} style={panel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <button onClick={() => onMonthTitleClick(m)} style={linkBtn}>
              {monthNames[m]}
            </button>
            <small style={{color: "var(--muted)" }}>{year}</small>
          </div>

          {/* Mini month (7 cols) — zile CLICKABILE și NUMEROTATE */}
          <MiniMonth
            year={year}
            month={m}
            roomsCount={roomsCount}
            occupancyMap={occupancyMap}
            onDayClick={onDayClick}
          />
        </div>
      ))}
    </div>
  );
}

function MiniMonth({
  year, month, roomsCount, occupancyMap, onDayClick
}: {
  year: number; month: number; roomsCount: number;
  occupancyMap: Map<string, Set<string>>;
  onDayClick: (dateStr: string) => void;
}) {
  const dim = daysInMonth(year, month);
  const fw  = firstWeekday(year, month); // 0..6
  const cells: Array<{ dateStr?: string; occPct?: number; dayNum?: number }> = [];

  for (let i = 0; i < fw; i++) cells.push({});
  for (let d = 1; d <= dim; d++) {
    const ds  = `${year}-${pad(month+1)}-${pad(d)}`;
    const occ = occupancyMap.get(ds)?.size ?? 0;
    const pct = roomsCount > 0 ? (occ / roomsCount) : 0;
    cells.push({ dateStr: ds, occPct: pct, dayNum: d });
  }
  const rows  = Math.ceil(cells.length / 7);
  const total = rows * 7;
  while (cells.length < total) cells.push({});

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
      {cells.map((c, i) => {
        const clickable = !!c.dateStr;
        return (
          <div
            key={i}
            onClick={clickable ? () => onDayClick(c.dateStr!) : undefined}
            title={c.dateStr ? tooltipFor(c.dateStr, roomsCount, occupancyMap) : undefined}
            style={{
              position: "relative",
              height: 26,
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--card)",
              cursor: clickable ? "pointer" : "default",
              overflow: "hidden",
            }}
          >
            {/* day number (vizibil pe dark) */}
            {typeof c.dayNum === "number" && (
              <span style={{
                position: "absolute", top: 3, left: 4, fontSize: 10,
                color: "var(--text)", opacity: 0.9, fontWeight: 700, lineHeight: 1
              }}>
                {c.dayNum}
              </span>
            )}

            {/* vertical occupancy fill (bottom→top) */}
            {typeof c.occPct === "number" && (
              <div
                style={{
                  position: "absolute",
                  left: 0, right: 0, bottom: 0,
                  height: `${Math.round((c.occPct ?? 0) * 100)}%`,
                  background: "var(--primary)",
                  opacity: 0.35,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function tooltipFor(dateStr: string, roomsCount: number, map: Map<string, Set<string>>) {
  const occ = map.get(dateStr)?.size ?? 0;
  return `${occ}/${roomsCount} rooms occupied`;
}

/* ================== MONTH VIEW ================== */

function MonthView({
  year, month, roomsCount, occupancyMap, highlightDate, onDayClick
}: {
  year: number; month: number; roomsCount: number;
  occupancyMap: Map<string, Set<string>>;
  highlightDate: string | null;
  onDayClick: (dateStr: string) => void;
}) {
  const dim = daysInMonth(year, month);
  const fw  = firstWeekday(year, month);
  const todayStr = ymd(new Date());
  const hl = highlightDate;

  const days: Array<{ dateStr?: string; occPct?: number; isToday?: boolean; isHL?: boolean }> = [];
  for (let i = 0; i < fw; i++) days.push({});
  for (let d = 1; d <= dim; d++) {
    const ds  = `${year}-${pad(month+1)}-${pad(d)}`;
    const occ = occupancyMap.get(ds)?.size ?? 0;
    const pct = roomsCount > 0 ? (occ / roomsCount) : 0;
    days.push({ dateStr: ds, occPct: pct, isToday: sameYMD(ds, todayStr), isHL: hl ? sameYMD(ds, hl) : false });
  }
  const rows  = Math.ceil(days.length / 7);
  const total = rows * 7;
  while (days.length < total) days.push({});

  return (
    <div style={{ boxShadow: "0 3px 20px #2e6dc656", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
      {/* week day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
        {weekdayShort.map((w) => (
          <div key={w} style={{ textAlign: "center", color: "var(--muted)", fontSize: 12 }}>{w}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {days.map((c, i) => {
          const clickable = !!c.dateStr;
          return (
            <div
              key={i}
              onClick={clickable ? () => onDayClick(c.dateStr!) : undefined}
              title={c.dateStr ? tooltipFor(c.dateStr, roomsCount, occupancyMap) : undefined}
              style={{
                position: "relative",
                height: 84,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--card)",
                cursor: clickable ? "pointer" : "default",
                overflow: "hidden",
              }}
            >
              {/* day number */}
              {c.dateStr && (
                <div style={{
                  position: "absolute", top: 6, left: 6, fontSize: 12,
                  color: "var(--text)", fontWeight: 700
                }}>
                  {parseInt(c.dateStr.slice(-2), 10)}
                </div>
              )}

              {/* today badge */}
              {c.isToday && (
                <div style={{
                  position: "absolute", top: 4, right: 4, fontSize: 10,
                  padding: "2px 6px", borderRadius: 999, background: "var(--primary)", color: "#0c111b", fontWeight: 800
                }}>
                  Today
                </div>
              )}
              {/* highlight for selected day from Year view / Today */}
              {c.isHL && (
                <div style={{
                  position: "absolute", inset: 0, border: "2px solid var(--primary)", borderRadius: 10, pointerEvents: "none"
                }} />
              )}

              {/* vertical occupancy fill */}
              {typeof c.occPct === "number" && (
                <div
                  style={{
                    position: "absolute",
                    left: 0, right: 0, bottom: 0,
                    height: `${Math.round((c.occPct ?? 0) * 100)}%`,
                    background: "var(--primary)",
                    opacity: 0.35,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ UI styles (high-contrast on dark) ============ */
const panel: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 12,
};

const btn: React.CSSProperties = {
  padding: "6px 10px",
  background: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  cursor: "pointer",
};

const linkBtn: React.CSSProperties = {
  ...btn,
  background: "transparent",
  border: "1px dashed var(--border)",
  fontWeight: 800,
  color: "var(--text)",
};

const select: React.CSSProperties = {
  background: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  padding: "6px 10px",
  borderRadius: 8,
};


