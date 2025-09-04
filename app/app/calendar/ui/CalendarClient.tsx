"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
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
  const [view, setView]   = useState<"year" | "month">("month");
  const [year, setYear]   = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth()); // 0..11
  const [highlightDate, setHighlightDate] = useState<string | null>(null); // highlight în Month view

  // Data
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState<"Idle"|"Loading"|"Error">("Idle");

  // Day modal (ONLY in Month view)
  const [openDate, setOpenDate] = useState<string | null>(null);
  // Year overlay (opened from a dedicated button) + month picker
  const [showYear, setShowYear] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const dateOverlayInputRef = useRef<HTMLInputElement | null>(null);

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
    setHighlightDate(null);
    setView("month");
  }
  function goToday() {
    const ds = ymd(today);
    goToMonthFor(ds);
  }
  // backToYear removed (legacy)

  function openDatePicker() { setShowDatePicker(true); }

  function onPickedDate(value: string) {
    if (!value) return;
    const d = new Date(value + "T00:00:00");
    if (!isNaN(d.getTime())) {
      setYear(d.getFullYear());
      setMonth(d.getMonth());
    }
    setShowDatePicker(false);
  }

  // Auto focus the visible input when popover opens (and try showPicker if available)
  useEffect(() => {
    if (!showDatePicker) return;
    const el = dateOverlayInputRef.current;
    if (!el) return;
    try {
      el.focus();
      // @ts-ignore
      if (typeof el.showPicker === "function") el.showPicker();
    } catch {}
  }, [showDatePicker]);

  // Keyboard shortcuts: Left/Right = prev/next month, T = today, Y = year overlay
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setMonth(m => {
          const nm = m - 1; if (nm < 0) { setYear(y => y - 1); return 11; } return nm;
        });
      } else if (e.key === "ArrowRight") {
        setMonth(m => {
          const nm = m + 1; if (nm > 11) { setYear(y => y + 1); return 0; } return nm;
        });
      } else if (e.key.toLowerCase() === "t") {
        goToday();
      } else if (e.key.toLowerCase() === "y") {
        openDatePicker();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={{ display: "grid", gap: 12, color: "var(--text)" }}>
      {/* Minimal toolbar */}
      <div className="sb-toolbar" style={{ gap: isSmall ? 12 : 20 }}>
        <select
          className="sb-select"
          value={propertyId}
          onChange={(e) => { setPropertyId(e.currentTarget.value); }}
          style={{ minWidth: 240, paddingInline: 14, height: 40 }}
        >
          {properties.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: isSmall ? 12 : 18, marginLeft: isSmall ? 0 : 12 }}>
          <button
            type="button"
            className="sb-btn sb-btn--icon"
            aria-label="Previous month"
            onClick={() => setMonth(m => { const nm = m - 1; if (nm < 0) { setYear(y => y - 1); return 11; } return nm; })}
          >
            ◀
          </button>
          <button
            type="button"
            className="sb-btn sb-btn--ghost"
            onClick={openDatePicker}
            style={{ fontWeight: 900, fontSize: isSmall ? 16 : 20, paddingInline: 18, height: 40 }}
            aria-label="Pick date"
          >
            {monthNames[month]} {year}
          </button>
          <button
            type="button"
            className="sb-btn sb-btn--ghost sb-btn--small"
            onClick={() => setShowYear(true)}
            aria-label="Open year overview"
          >
            Year
          </button>
          <button
            type="button"
            className="sb-btn sb-btn--icon"
            aria-label="Next month"
            onClick={() => setMonth(m => { const nm = m + 1; if (nm > 11) { setYear(y => y + 1); return 0; } return nm; })}
          >
            ▶
          </button>
        </div>
        <div style={{ flex: 1 }} />
      </div>

      <MonthView
        year={year}
        month={month}
        roomsCount={rooms.length}
        occupancyMap={occupancyMap}
        highlightDate={null}
        isSmall={isSmall}
        onDayClick={(dateStr) => setOpenDate(dateStr)}
      />

      {/* DayModal — only in Month view */}
      {openDate && (
        <DayModal
          dateStr={openDate}
          propertyId={propertyId}
          onClose={() => setOpenDate(null)}
        />
      )}

      {/* Year overlay (opened via dedicated button) */}
      {showYear && (
        <div role="dialog" aria-modal="true" onClick={() => setShowYear(false)}
          style={{ position: "fixed", inset: 0, zIndex: 225, background: "var(--bg)", display: "grid", placeItems: "center" }}>
          <div onClick={(e) => e.stopPropagation()} className="sb-card" style={{ width: "min(1024px, 95vw)", maxHeight: "86vh", overflow: "auto", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <strong style={{ fontSize: 16 }}>Pick a month — {year}</strong>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="sb-btn sb-btn--icon" aria-label="Previous year" onClick={() => setYear(y => y - 1)}>◀</button>
                <button type="button" className="sb-btn sb-btn--icon" aria-label="Next year" onClick={() => setYear(y => y + 1)}>▶</button>
                <button type="button" className="sb-btn sb-btn--ghost sb-btn--small" onClick={() => setShowYear(false)}>Close</button>
              </div>
            </div>
            <YearView
              year={year}
              roomsCount={rooms.length}
              occupancyMap={occupancyMap}
              isSmall={isSmall}
              onMonthTitleClick={(m) => { setMonth(m); setShowYear(false); }}
              onDayClick={(dateStr) => { goToMonthFor(dateStr); setShowYear(false); }}
            />
          </div>
        </div>
      )}

      {/* Visible popover date picker */}
      {showDatePicker && (
        <div role="dialog" aria-modal="true" onClick={() => setShowDatePicker(false)}
          style={{ position: "fixed", inset: 0, zIndex: 230, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center" }}>
          <div onClick={(e) => e.stopPropagation()} className="sb-popover">
            <input
              ref={dateOverlayInputRef}
              type="month"
              defaultValue={`${year}-${pad(month + 1)}`}
              onChange={(e) => onPickedDate(e.currentTarget.value + "-01")}
              className="sb-select"
              style={{ padding: 10 }}
            />
          </div>
        </div>
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
            <button
              onClick={() => onMonthTitleClick(m)}
              style={{
                appearance: 'none',
                border: 0,
                background: 'transparent',
                color: 'var(--text)',
                fontWeight: 900,
                fontSize: 14,
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 8,
              }}
            >
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
                border: "1px solid var(--cal-brd)",
                background: "var(--card)",
                cursor: clickable ? "pointer" : "default",
                overflow: "hidden",
                boxShadow: c.isToday ? "0 0 0 2px var(--cal-today-ring)" : "none",
                transition: "border-color .15s ease, box-shadow .15s ease, transform .05s ease",
              }}
              onMouseDown={(e)=>{ (e.currentTarget as HTMLDivElement).style.transform='scale(0.99)'; }}
              onMouseUp={(e)=>{ (e.currentTarget as HTMLDivElement).style.transform='scale(1)'; }}
            >
              {weekend && (
                <div style={{ position: "absolute", inset: 0, background: "var(--cal-wkend)" }} />
              )}
              {/* day number */}
              {c.dateStr && (
                <div style={{
                  position: "absolute", top: 8, left: 8,
                  fontSize: isSmall ? 15 : 13,
                  color: "var(--text)", fontWeight: 800,
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
                    opacity: isSmall ? 0.18 : 0.22,
                  }}
                />
              )}
              {/* tiny today dot */}
              {c.isToday && (
                <span aria-hidden style={{ position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: 999, background: "var(--primary)" }} />
              )}
            </div>
          );
        })}
      </div>
      {/* Legend (aligned with visuals) */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10, color: "var(--muted)", fontSize: 12, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 6, background: "var(--primary)", borderRadius: 4, display: "inline-block", opacity: .22 }} />
          Occupancy
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 10, background: "var(--cal-wkend)", borderRadius: 3, display: "inline-block" }} />
          Weekend
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, background: "var(--primary)", borderRadius: 999, display: "inline-block" }} />
          Today
        </span>
      </div>
    </div>
  );
}

/* Legacy local styles (kept only for inline elements in the grid) */
