"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import { useHeader } from "@/app/app/_components/HeaderContext";

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
  const { setPill } = useHeader();
  const [properties] = useState<Property[]>(initialProperties);
  const [propertyId, setPropertyId] = useState<string>(initialProperties[0]?.id ?? "");
  const [isSmall, setIsSmall] = useState(false);

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

  // Detect very small screens and prefer Month view there
  useEffect(() => {
    const detect = () => setIsSmall(typeof window !== "undefined" ? window.innerWidth < 480 : false);
    detect();
    window.addEventListener("resize", detect);
    return () => window.removeEventListener("resize", detect);
  }, []);

  useEffect(() => {
    if (isSmall && view !== "month") setView("month");
  }, [isSmall]);

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

  // Header status pill next to title
  useEffect(() => {
    const label = loading === "Loading" ? "Syncing…" : loading === "Error" ? "Error" : "Idle";
    setPill(label);
  }, [loading, setPill]);

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

      {/* Supabase‑style toolbar */}
      <div className="sb-toolbar" style={{ gap: isSmall ? 8 : 12 }}>
        {/* Property select */}
        <select
          className="sb-select"
          value={propertyId}
          onChange={(e) => { setPropertyId(e.currentTarget.value); }}
          style={{ minWidth: 220 }}
        >
          {properties.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* View segmented control (forces Month on very small screens) */}
        <div className="sb-seg">
          <button
            type="button"
            data-active={view === "year" && !isSmall}
            onClick={() => { if (!isSmall) setView("year"); }}
          >
            Year
          </button>
          <button
            type="button"
            data-active={view === "month"}
            onClick={() => setView("month")}
          >
            Month
          </button>
        </div>

        {/* Month context */}
        {view === "month" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" className="sb-btn sb-btn--ghost sb-btn--small" onClick={backToYear}>Back to Year</button>
            <strong>{monthNames[month]}</strong>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1, minWidth: isSmall ? "100%" : 0 }} />

        {/* Year navigation + today */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: isSmall ? "100%" : "auto", justifyContent: isSmall ? "flex-start" : "flex-end" }}>
          <button type="button" className="sb-btn sb-btn--icon" onClick={() => setYear(y => y - 1)} aria-label="Previous year">◀</button>
          <strong style={{ minWidth: 90, textAlign: "center" }}>{year}</strong>
          <button type="button" className="sb-btn sb-btn--icon" onClick={() => setYear(y => y + 1)} aria-label="Next year">▶</button>
          <button type="button" className="sb-btn sb-btn--primary" onClick={goToday}>Today</button>
        </div>
      </div>

      {view === "year" ? (
        <YearView
          year={year}
          roomsCount={rooms.length}
          occupancyMap={occupancyMap}
          isSmall={isSmall}
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
          isSmall={isSmall}
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
  isSmall,
  onMonthTitleClick,
  onDayClick
}: {
  year: number;
  roomsCount: number;
  occupancyMap: Map<string, Set<string>>;
  isSmall: boolean;
  onMonthTitleClick: (monthIndex: number) => void;
  onDayClick: (dateStr: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: isSmall ? "repeat(1, 1fr)" : "repeat(3, 1fr)", gap: 12 }}>
      {Array.from({ length: 12 }).map((_, m) => (
        <div key={m} className="sb-card" style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <button onClick={() => onMonthTitleClick(m)} className="sb-btn sb-btn--ghost sb-btn--small" style={{ borderStyle: "dashed" as const }}>
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
  year, month, roomsCount, occupancyMap, highlightDate, isSmall, onDayClick
}: {
  year: number; month: number; roomsCount: number;
  occupancyMap: Map<string, Set<string>>;
  highlightDate: string | null;
  isSmall: boolean;
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
    <div className="sb-card" style={{ boxShadow: "0 3px 20px #2e6dc656", padding: 12 }}>
      {/* week day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
        {weekdayShort.map((w) => (
          <div key={w} style={{ textAlign: "center", color: "var(--muted)", fontSize: isSmall ? 11 : 12 }}>{w}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {days.map((c, i) => {
          const clickable = !!c.dateStr;
          const weekend = c.dateStr ? (()=>{ const d=new Date(c.dateStr+"T00:00:00"); const w=d.getDay(); return w===0||w===6; })() : false;
          return (
            <div
              key={i}
              onClick={clickable ? () => onDayClick(c.dateStr!) : undefined}
              title={c.dateStr ? tooltipFor(c.dateStr, roomsCount, occupancyMap) : undefined}
              style={{
                position: "relative",
                height: isSmall ? 66 : 88,
                borderRadius: 10,
                border: c.isToday ? "2px solid var(--primary)" : "1px solid var(--border)",
                background: "var(--card)",
                cursor: clickable ? "pointer" : "default",
                overflow: "hidden",
                boxShadow: c.isToday ? "0 0 0 3px rgba(96,165,250,0.25)" : "none",
                transition: "border-color .15s ease, box-shadow .15s ease, transform .05s ease",
              }}
              onMouseDown={(e)=>{ (e.currentTarget as HTMLDivElement).style.transform='scale(0.99)'; }}
              onMouseUp={(e)=>{ (e.currentTarget as HTMLDivElement).style.transform='scale(1)'; }}
            >
              {weekend && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(96,165,250,0.06)" }} />
              )}
              {/* day number */}
              {c.dateStr && (
                <div style={{
                  position: "absolute", top: 8, left: 8,
                  fontSize: isSmall ? 15 : 13,
                  color: "var(--text)", fontWeight: 900,
                  textShadow: "0 1px 2px rgba(0,0,0,0.55)"
                }}>
                  {parseInt(c.dateStr.slice(-2), 10)}
                </div>
              )}
              {/* highlight for selected day from Year view */}
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
                    opacity: isSmall ? 0.25 : 0.35,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10, color: "var(--muted)", fontSize: 12, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 6, background: "var(--primary)", borderRadius: 4, display: "inline-block", opacity: .35 }} />
          Occupancy
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 14, background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: 4, display: "inline-block" }} />
          Weekend
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 14, border: "2px solid var(--primary)", borderRadius: 6, display: "inline-block", boxShadow: "0 0 0 3px rgba(96,165,250,0.25)" }} />
          Today
        </span>
      </div>
    </div>
  );
}

/* Legacy local styles (kept only for inline elements in the grid) */
