"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "@/app/app/_components/HeaderContext";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import { usePersistentProperty } from "@/app/app/_components/PropertySelection";

// Robust dynamic import
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
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
};

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const weekdayShort = ["Mo","Tu","We","Th","Fr","Sa","Su"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function ymd(d: Date)   { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function daysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate(); } // m: 0..11
function firstWeekday(y: number, m: number) { const js = new Date(y, m, 1).getDay(); return (js + 6) % 7; } // Mon=0 .. Sun=6
function addDaysStr(s: string, n: number) { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return ymd(d); }
function sameYMD(a: string, b: string) { return a === b; }
function isYMD(s: unknown): s is string { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); }

export default function CalendarClient({
  initialProperties,
  initialDate, // poate lipsi
}: {
  initialProperties: Property[];
  initialDate?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { setPill } = useHeader();
  const [properties] = useState<Property[]>(initialProperties);
  const [propertyId, setPropertyId] = usePersistentProperty(properties);
  const [isSmall, setIsSmall] = useState(false);

  // 🔔 mic preview al inelului pe mobil
  const [animateRing, setAnimateRing] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const touch = "ontouchstart" in window || window.matchMedia("(hover: none)").matches;
    if (touch) {
      setAnimateRing(true);
      const t = setTimeout(() => setAnimateRing(false), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  // === Permissions (admin/editor w/ calendar|reservations; viewer or disabled => read-only) ===
  const [me, setMe] = useState<null | { role: "admin"|"editor"|"viewer"; scopes: string[]; disabled: boolean }>(null);
  const [canEdit, setCanEdit] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const j = await r.json();
        if (!j?.me) return;
        const info = j.me as { role:"admin"|"editor"|"viewer"; scopes:string[]; disabled:boolean };
        setMe(info);
        const sc = new Set(info.scopes || []);
        const allowed = !info.disabled && (
          info.role === "admin" ||
          (info.role === "editor" && (sc.has("calendar") || sc.has("reservations")))
        );
        setCanEdit(!!allowed);
      } catch {/* ignore */}
    })();
  }, []);
  const readOnly = !canEdit;

  // === View state (inițializăm din initialDate dacă e valid) ===
  const today = new Date();
  const safeInitialDate = initialDate && isYMD(initialDate) ? initialDate : ymd(today);
  const initDt = new Date(`${safeInitialDate}T00:00:00`);

  const [view, setView]   = useState<"year" | "month">("month");
  const [year, setYear]   = useState<number>(initDt.getFullYear());
  const [month, setMonth] = useState<number>(initDt.getMonth()); // 0..11
  const [highlightDate, setHighlightDate] = useState<string | null>(safeInitialDate);

  // Data
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState<"Idle"|"Loading"|"Error">("Idle");

  // Day modal (only Month view)
  const [openDate, setOpenDate] = useState<string | null>(null);
  

  // Year overlay + month picker
  const [showYear, setShowYear] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const dateOverlayInputRef = useRef<HTMLInputElement | null>(null);

  // Detect small screens
  useEffect(() => {
    const detect = () => setIsSmall(typeof window !== "undefined" ? window.innerWidth < 480 : false);
    detect();
    window.addEventListener("resize", detect);
    return () => window.removeEventListener("resize", detect);
  }, []);

  useEffect(() => {
    if (isSmall && view !== "month") setView("month");
  }, [isSmall, view]);

  // Repoziționează dacă se schimbă initialDate (navigare cu alt query)
  useEffect(() => {
    if (initialDate && isYMD(initialDate)) {
      const d = new Date(`${initialDate}T00:00:00`);
      setYear(d.getFullYear());
      setMonth(d.getMonth());
      setView("month");
      setHighlightDate(initialDate);
    }
  }, [initialDate]);

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
          .order("start_date", { ascending: true }),
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

  // Header pill (show Read-only when idle)
  useEffect(() => {
    const label =
      loading === "Loading" ? "Syncing…" :
      loading === "Error"   ? "Error"    :
      readOnly              ? "Read-only":
                              "Idle";
    setPill(label);
  }, [loading, readOnly, setPill]);

  // Occupancy map
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
    setView("month");
    setHighlightDate(dateStr); // păstrăm highlight pe ziua selectată
  }
  function goToday() {
    const ds = ymd(today);
    goToMonthFor(ds);
  }
  function openDatePicker() { setShowDatePicker(true); }
  function onPickedDate(value: string) {
    if (!value) return;
    const d = new Date(value + "T00:00:00");
    if (!isNaN(d.getTime())) {
      setYear(d.getFullYear());
      setMonth(d.getMonth());
      setView("month");
      setHighlightDate(null);
    }
    setShowDatePicker(false);
  }

  // Auto focus input în popover
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

  // Shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setMonth(m => { const nm = m - 1; if (nm < 0) { setYear(y => y - 1); return 11; } return nm; });
      } else if (e.key === "ArrowRight") {
        setMonth(m => { const nm = m + 1; if (nm > 11) { setYear(y => y + 1); return 0; } return nm; });
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
      <PlanHeaderBadge title="Calendar" slot="header-right" />
      {/* Toolbar */}
      <div className="sb-toolbar" style={{ gap: isSmall ? 12 : 20 }}>
        <select
          className="sb-select"
          value={propertyId ?? ""} // evităm undefined
          onChange={(e) => { setPropertyId(e.currentTarget.value); }}
          style={{ minWidth: 220, maxWidth: 380, paddingInline: 12, height: 36, width: "auto" }}
        >
          {properties.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <div style={{ flexBasis: "100%", height: 8 }} />

        <div style={{ display: "flex", alignItems: "center", gap: isSmall ? 12 : 18, marginLeft: 0 }}>
          <button type="button" className="sb-btn sb-btn--icon" aria-label="Previous month"
            onClick={() => setMonth(m => { const nm = m - 1; if (nm < 0) { setYear(y => y - 1); return 11; } return nm; })}
          >◀</button>
          <button type="button" className="sb-btn sb-btn--ghost" onClick={openDatePicker}
            style={{ fontWeight: 900, fontSize: isSmall ? 16 : 18, paddingInline: 16, height: 36 }} aria-label="Pick date">
            {monthNames[month]} {year}
          </button>
          <button type="button" className="sb-btn sb-btn--icon" aria-label="Next month"
            onClick={() => setMonth(m => { const nm = m + 1; if (nm > 11) { setYear(y => y + 1); return 0; } return nm; })}
          >▶</button>
          <button type="button" className="sb-btn sb-btn--ghost sb-btn--small" onClick={() => setShowYear(true)} aria-label="Open year overview">
            Year
          </button>
        </div>
        <div style={{ flex: 1 }} />
      </div>

      {/* 🟢 MonthView în .modalCard cu trigger de mobil */}
      <MonthView
        year={year}
        month={month}
        roomsCount={rooms.length}
        occupancyMap={occupancyMap}
        highlightDate={highlightDate}
        isSmall={isSmall}
        onDayClick={(dateStr) => setOpenDate(dateStr)}
        animate={animateRing}
      />

      {/* DayModal — only Month view */}
      {openDate && (
  <div
    className="modalFlipWrapper"
    role="dialog"
    aria-modal="true"
    onClick={() => setOpenDate(null)}
  >
    {/* combinăm flipul cu stilul tău existent de card cu inel */}
    <div
      className="modalCard modalFlip"
      onClick={(e) => e.stopPropagation()}
      style={{ overflow: "auto", padding: 16 }}
    >
      <DayModal
        dateStr={openDate}
        propertyId={propertyId}
        canEdit={canEdit}
        onClose={() => setOpenDate(null)}
      />
    </div>
  </div>
)}

      {/* Year overlay */}
      {showYear && (
        <div role="dialog" aria-modal="true" onClick={() => setShowYear(false)}
          style={{ position: "fixed", inset: 0, zIndex: 225, background: "var(--bg)", display: "grid", placeItems: "center" }}>
          {/* înlocuit sb-card cu modalCard pentru același efect */}
          <div onClick={(e) => e.stopPropagation()} className="modalCard" style={{ width: "min(1024px, calc(100vw - 32px))", maxHeight: "calc(100vh - 32px)", overflow: "auto", padding: 16 }}>
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
              onMonthTitleClick={(m) => { setMonth(m); setView("month"); setHighlightDate(null); setShowYear(false); }}
              onDayClick={(dateStr) => { goToMonthFor(dateStr); setShowYear(false); }}
            />
          </div>
        </div>
      )}

      {/* Popover date picker */}
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
                fontSize: 10,
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 8,
              }}
            >
              {monthNames[m]}
            </button>
            <small style={{color: "var(--muted)" }}>{year}</small>
          </div>

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
            {typeof c.dayNum === "number" && (
              <span style={{
                position: "absolute", top: 3, left: 4, fontSize: 10,
                color: "var(--text)", opacity: 0.9, fontWeight: 700, lineHeight: 1
              }}>
                {c.dayNum}
              </span>
            )}
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
  year, month, roomsCount, occupancyMap, highlightDate, isSmall, onDayClick, animate
}: {
  year: number; month: number; roomsCount: number;
  occupancyMap: Map<string, Set<string>>;
  highlightDate: string | null;
  isSmall: boolean;
  onDayClick: (dateStr: string) => void;
  animate?: boolean;
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
    // 🟢 containerul principal — .modalCard cu inel
    <section className="modalCard cal-smoobu" data-animate={animate ? "true" : undefined} style={{ padding: 12 }}>
      {/* headers */}
      <div className="cal-weekdays" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
        {weekdayShort.map((w) => (
          <div key={w} style={{ textAlign: "center", color: "var(--muted)", fontSize: isSmall ? 11 : 12 }}>{w}</div>
        ))}
      </div>

      <div className="cal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {days.map((c, i) => {
          const clickable = !!c.dateStr;
          const weekend = c.dateStr ? (()=>{ const d=new Date(c.dateStr+"T00:00:00"); const w=d.getDay(); return w===0||w===6; })() : false;
          return (
            <div
              className="cal-day"
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
              {/* weekend tint */}
              {weekend && <div style={{ position: "absolute", inset: 0, background: "var(--cal-wkend)" }} />}

              {/* day number */}
              {c.dateStr && (
                <div className="cal-day-num" style={{
                  position: "absolute", top: 8, left: 8,
                  fontSize: isSmall ? 15 : 13,
                  color: "var(--text)", fontWeight: 800
                }}>
                  {parseInt(c.dateStr.slice(-2), 10)}
                </div>
              )}

              {/* highlight ring if selected */}
              {c.isHL && (
                <div style={{
                  position: "absolute", inset: 0, border: "2px solid var(--primary)", borderRadius: 10, pointerEvents: "none"
                }} />
              )}

              {/* occupancy fill */}
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

              {/* today dot */}
              {c.isToday && (
                <span aria-hidden style={{ position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: 999, background: "var(--primary)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
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
    </section>
  );
}