"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import RoomViewModal from "./RoomViewModal";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "@/app/app/_components/HeaderContext";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import { usePersistentPropertyState } from "@/app/app/_components/PropertySelection";

// Robust dynamic import
const DayModal: any = dynamic(
  () => import("./DayModal").then((m: any) => m.default ?? m.DayModal ?? (() => null)),
  { ssr: false }
);
const RoomDetailModal: any = dynamic(
  () => import("./RoomDetailModal").then((m: any) => m.default ?? m.RoomDetailModal ?? (() => null)),
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

type Lang = "en" | "ro";
const monthNamesByLang: Record<Lang, string[]> = {
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  ro: ["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"],
};
const weekdayShortByLang: Record<Lang, string[]> = {
  en: ["Mo","Tu","We","Th","Fr","Sa","Su"],
  ro: ["Lu","Ma","Mi","Jo","Vi","Sa","Du"],
};

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
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { setPill } = useHeader();
  const [lang, setLang] = useState<Lang>("en");
  const [properties] = useState<Property[]>(initialProperties);
  const isSinglePropertyAccount = properties.length === 1;
  const { propertyId, setPropertyId, ready: propertyReady } = usePersistentPropertyState(properties);
  const [isSmall, setIsSmall] = useState(false);
  // Cache property presentation images (avatar in pill selector)
  const [propertyPhotos, setPropertyPhotos] = useState<Record<string, string | null>>({});

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
  const [hasLoadedRooms, setHasLoadedRooms] = useState<boolean>(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [pendingQuickCreate, setPendingQuickCreate] = useState(false);
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);
  const [roomPickerRooms, setRoomPickerRooms] = useState<Room[]>([]);

  // Day modal (only Month view)
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [createTarget, setCreateTarget] = useState<{ room: Room; date: string } | null>(null);
  

  // Year overlay + month picker
  const [showYear, setShowYear] = useState<boolean>(false);
  const [showRoomView, setShowRoomView] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const dateOverlayInputRef = useRef<HTMLInputElement | null>(null);
  const [showNoRoomsPopup, setShowNoRoomsPopup] = useState<boolean>(false);

  // Detect small screens
  useEffect(() => {
    if (typeof window === "undefined") return;
    const readLang = (): Lang => {
      try {
        const ls = localStorage.getItem("app_lang");
        if (ls === "ro" || ls === "en") return ls;
      } catch {}
      try {
        const ck = document.cookie
          .split("; ")
          .find((x) => x.startsWith("app_lang="))
          ?.split("=")[1];
        if (ck === "ro" || ck === "en") return ck;
      } catch {}
      return "en";
    };
    setLang(readLang());
    const onStorage = () => setLang(readLang());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const detect = () => setIsSmall(typeof window !== "undefined" ? window.innerWidth < 480 : false);
    detect();
    window.addEventListener("resize", detect);
    return () => window.removeEventListener("resize", detect);
  }, []);

  // Ascunde scrollbar-ul pe ecrane mari doar pe această pagină (desktop)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const main = document.getElementById("app-main");
    if (main) main.setAttribute("data-calendar-nosb", "1");
    return () => {
      if (main) main.removeAttribute("data-calendar-nosb");
    };
  }, []);

  // Load presentation image for selected property (once per id)
  useEffect(() => {
    (async () => {
      if (!propertyReady || !propertyId) return;
      if (propertyPhotos[propertyId] !== undefined) return;
      try {
        const r = await supabase
          .from('properties')
          .select('presentation_image_url')
          .eq('id', propertyId)
          .maybeSingle();
        const url = (r.data as any)?.presentation_image_url || null;
        setPropertyPhotos(prev => ({ ...prev, [propertyId]: url }));
      } catch {
        setPropertyPhotos(prev => ({ ...prev, [propertyId]: null }));
      }
    })();
  }, [propertyId, supabase, propertyPhotos, propertyReady]);

  useEffect(() => {
    if (isSmall && view !== "month") setView("month");
  }, [isSmall, view]);

  // Asigură că există o proprietate selectată (prima disponibilă) imediat ce state-ul e gata
  useEffect(() => {
    if (!propertyId && properties.length > 0) {
      setPropertyId(properties[0].id);
    }
  }, [propertyId, properties, setPropertyId]);

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
  const loadSeqRef = useRef(0);
  useEffect(() => {
    if (!propertyReady || !propertyId) return;
    const seq = (loadSeqRef.current += 1);
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
      if (seq !== loadSeqRef.current) return;
      if (r1.error || r2.error) {
        setRooms([]); setBookings([]); setLoading("Error"); setHasLoadedRooms(true);
      } else {
        setRooms((r1.data ?? []) as Room[]);
        setBookings((r2.data ?? []) as Booking[]);
        setLoading("Idle");
        setHasLoadedRooms(true);
      }
    })();
  }, [propertyId, view, year, month, supabase, refreshToken]);
  // If the selected property has no rooms yet, guide the user with a custom popup
  useEffect(() => {
    if (!propertyId) return;
    if (!hasLoadedRooms || loading !== "Idle") return;
    if (!isSinglePropertyAccount) return;
    if (rooms.length === 0) {
      setShowNoRoomsPopup(true);
    }
  }, [propertyId, rooms.length, loading, hasLoadedRooms, isSinglePropertyAccount]);

  // Header pill (show Read-only when idle)
  useEffect(() => {
    const label =
      !propertyReady       ? (lang === "ro" ? "Se incarca…" : "Loading…") :
      loading === "Loading" ? (lang === "ro" ? "Se sincronizeaza…" : "Syncing…") :
      loading === "Error"   ? (lang === "ro" ? "Eroare" : "Error")    :
      me === null           ? (lang === "ro" ? "Se incarca…" : "Loading…") :
                              (lang === "ro" ? "Inactiv" : "Idle");
    setPill(label);
  }, [loading, me, propertyReady, setPill, lang]);

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
  function refreshData() {
    setRefreshToken((x) => x + 1);
  }
  const currentPropertyId = propertyId || properties[0]?.id || null;
  const todayYmd = ymd(today);
  const [totalBookingsAll, setTotalBookingsAll] = useState<number>(0);
  const [upcomingBookingsAll, setUpcomingBookingsAll] = useState<number>(0);
  const occupiedToday = useMemo(() => {
    if (!currentPropertyId) return 0;
    return bookings.filter(
      (b) =>
        b.property_id === currentPropertyId &&
        b.start_date <= todayYmd &&
        b.end_date >= todayYmd
    ).length;
  }, [bookings, currentPropertyId, todayYmd]);
  const totalUnits = useMemo(
    () => rooms.filter((r) => r.property_id === currentPropertyId).length,
    [rooms, currentPropertyId]
  );
  // Fetch global counts for property (not limited to current view)
  useEffect(() => {
    if (!currentPropertyId) return;
    (async () => {
      try {
        const { count: total } = await supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("property_id", currentPropertyId)
          .neq("status", "cancelled");
        setTotalBookingsAll(total || 0);
      } catch {
        setTotalBookingsAll(0);
      }
      try {
        const { count: upcoming } = await supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("property_id", currentPropertyId)
          .neq("status", "cancelled")
          .gte("end_date", todayYmd);
        setUpcomingBookingsAll(upcoming || 0);
      } catch {
        setUpcomingBookingsAll(0);
      }
    })();
  }, [currentPropertyId, supabase, todayYmd, refreshToken]);
  const openQuickCreateNow = () => {
    if (!currentPropertyId) return;
    if (!rooms.length) {
      setShowNoRoomsPopup(true);
      return;
    }
    const propertyRooms = rooms.filter((r) => r.property_id === currentPropertyId);
    if (!propertyRooms.length) {
      setShowNoRoomsPopup(true);
      return;
    }
    if (propertyRooms.length > 1) {
      setRoomPickerRooms(propertyRooms);
      setRoomPickerOpen(true);
      return;
    }
    const room = propertyRooms[0];
    const baseDate = highlightDate ?? ymd(today);
    setCreateTarget({ room, date: baseDate });
  };

  function startQuickCreate() {
    // Asigură că avem o proprietate selectată; dacă lipsește, setează prima și reîncearcă după load.
    if (!propertyId) {
      if (properties[0]?.id) {
        setPropertyId(properties[0].id);
        setPendingQuickCreate(true);
        refreshData();
      }
      return;
    }
    const currentPropertyId = propertyId || properties[0]?.id || null;
    if (!currentPropertyId) return;
    // Dacă încă nu s-au încărcat camerele/datele, memorăm intenția și forțăm un refresh.
    if (!hasLoadedRooms || loading === "Loading") {
      setPendingQuickCreate(true);
      refreshData();
      return;
    }
    openQuickCreateNow();
  }

  useEffect(() => {
    if (pendingQuickCreate && (propertyId || properties[0]?.id) && hasLoadedRooms && loading === "Idle") {
      setPendingQuickCreate(false);
      openQuickCreateNow();
    }
  }, [pendingQuickCreate, hasLoadedRooms, loading, propertyId, properties]);

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
    <div style={{ fontFamily: "inherit", color: "var(--text)" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (min-width: 1024px) {
              #app-main[data-calendar-nosb="1"]{
                scrollbar-width: none;
                -ms-overflow-style: none;
              }
              #app-main[data-calendar-nosb="1"]::-webkit-scrollbar{
                display: none;
              }
            }
          `,
        }}
      />
      <PlanHeaderBadge title={lang === "ro" ? "Calendar" : "Calendar"} slot="under-title" />
      <div style={{ padding: isSmall ? "10px 12px 16px" : "16px", display: "grid", gap: 12 }}>
      {/* Toolbar */}
      <div className="sb-toolbar" style={{ gap: isSmall ? 12 : 20, flexWrap: 'wrap', marginBottom: 12 }}>
        {/* Pill selector with avatar on the left (no text label) */}
        <div
          className="modalCard Sb-cardglow"
          style={{
            position: 'relative',
            display: isSmall ? 'grid' : 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: isSmall ? '8px 10px 8px 56px' : '6px 10px 6px 56px',
            borderRadius: 999,
            minHeight: 56,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            width: isSmall ? '100%' : undefined,
          }}
        >
          {propertyId && propertyPhotos[propertyId] ? (
            <img
              src={propertyPhotos[propertyId] as string}
              alt=""
              width={40}
              height={40}
              style={{ position: 'absolute', left: 8, width: 40, height: 40, borderRadius: 999, objectFit: 'cover', border: '2px solid var(--card)' }}
            />
          ) : null}
          <select
            className="sb-select"
            value={propertyId ?? ""}
            onChange={(e) => {
              const next = e.currentTarget.value;
              if (!next || next === propertyId) return;
              setOpenDate(null);
              setShowRoomView(false);
              setShowYear(false);
              setShowDatePicker(false);
              setShowNoRoomsPopup(false);
              setRooms([]);
              setBookings([]);
              setHasLoadedRooms(false);
              setLoading("Loading");
              setPropertyId(next);
            }}
            style={{
              background: 'transparent',
              border: '0',
              boxShadow: 'none',
              padding: '10px 12px',
              minHeight: 44,
              minWidth: isSmall ? '100%' : 220,
              maxWidth: isSmall ? '100%' : 380,
              width: isSmall ? '100%' : 'auto',
              fontWeight: 700,
              fontFamily: 'inherit',
            }}
          >
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div style={{ flexBasis: "100%", height: 8 }} />

        {/* Nav row: [Prev] [Month Year] [Next] */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            alignItems: 'center',
            gap: isSmall ? 8 : 12,
            width: isSmall ? '100%' : undefined,
            marginLeft: 0,
          }}
        >
          <button type="button" className="sb-btn sb-cardglow sb-btn--icon" aria-label={lang === "ro" ? "Luna anterioara" : "Previous month"}
            onClick={() => setMonth(m => { const nm = m - 1; if (nm < 0) { setYear(y => y - 1); return 11; } return nm; })}
          >◀</button>

          <button type="button" className="sb-btn sb-cardglow sb-btn--ghost" onClick={openDatePicker}
            style={{ fontWeight: 900, fontSize: isSmall ? 16 : 18, paddingInline: 16, height: 45, textAlign: 'center' }} aria-label={lang === "ro" ? "Alege data" : "Pick date"}>
            {monthNamesByLang[lang][month]} {year}
          </button>

          <button type="button" className="sb-btn sb-cardglow sb-btn--icon" aria-label={lang === "ro" ? "Luna urmatoare" : "Next month"}
            onClick={() => setMonth(m => { const nm = m + 1; if (nm > 11) { setYear(y => y + 1); return 0; } return nm; })}
          >▶</button>
        </div>

        {/* Mode row: Year / Room view (wraps below on small screens) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: isSmall ? '100%' : undefined, justifyContent: isSmall ? 'center' : undefined }}>
          <button type="button" className="sb-btn  sb-btn--ghost sb-btn--small" onClick={() => setShowYear(true)} aria-label={lang === "ro" ? "Deschide anul" : "Open year overview"}>
            {lang === "ro" ? "An" : "Year"}
          </button>
          <button type="button" className="sb-btn  sb-btn--ghost sb-btn--small" onClick={() => setShowRoomView(true)} aria-label={lang === "ro" ? "Deschide camerele" : "Open room overview"}>
            {lang === "ro" ? "Camere" : "Room view"}
          </button>
        </div>
        <div style={{ flex: 1 }} />
      </div>

      {/* Summary row: totals */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
          padding: isSmall ? "0 2px" : "0 4px",
          marginTop: -6,
          marginBottom: 6,
          color: "var(--muted)",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--primary)" }} />
          {lang === "ro" ? "Rezervări totale" : "Total bookings"}:{" "}
          <span style={{ color: "var(--text)" }}>{totalBookingsAll}</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "color-mix(in srgb, var(--text) 50%, transparent)" }} />
          {lang === "ro" ? "Viitoare" : "Upcoming"}:{" "}
          <span style={{ color: "var(--text)" }}>{upcomingBookingsAll}</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "color-mix(in srgb, var(--success, #22c55e) 70%, transparent)" }} />
          {lang === "ro" ? "Unități ocupate azi" : "Occupied today"}:{" "}
          <span style={{ color: "var(--text)" }}>
            {occupiedToday}/{totalUnits || "0"}
          </span>
        </span>
      </div>

      {/* 🟢 MonthView în .modalCard cu trigger de mobil */}
      <MonthView
        lang={lang}
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
        <DayModal
          dateStr={openDate}
          propertyId={propertyId}
          lang={lang}
          canEdit={canEdit}        /* <-- gating passed to modal */
          onClose={() => setOpenDate(null)}
        />
      )}

      {/* Floating quick-add reservation button */}
      {canEdit && propertyReady && (
        <button
          type="button"
          aria-label={lang === "ro" ? "Adaugă rezervare" : "Add reservation"}
          onClick={startQuickCreate}
          style={{
            position: "fixed",
            right: 18,
            bottom: "calc(var(--nav-h) + var(--safe-bottom, 0px) + 16px)",
            width: 62,
            height: 62,
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--text)",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 18px 36px rgba(0,0,0,0.28)",
            cursor: "pointer",
            zIndex: 235,
          }}
        >
          <span
            aria-hidden
            style={{
              display: "block",
              width: 22,
              height: 22,
              backgroundColor: "currentColor",
              WebkitMaskImage: "url(/svg_add_icon.svg)",
              maskImage: "url(/svg_add_icon.svg)",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskSize: "18px 18px",
              maskSize: "18px 18px",
            }}
          />
        </button>
      )}

      {/* Year overlay */}
      {showYear && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowYear(false)}
          style={{
            position: "fixed",
            top: "calc(var(--safe-top, 0px) + var(--p4h-fixed-header-h, 0px))",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 225,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            paddingTop: 12,
            paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
            paddingLeft: 12,
            paddingRight: 12,
          }}
        >
          {/* înlocuit sb-card cu modalCard pentru același efect */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="modalCard"
            style={{
              width: "min(1024px, calc(100vw - 32px))",
              maxHeight:
                "calc(100dvh - (var(--safe-top, 0px) + var(--p4h-fixed-header-h, 0px) + var(--safe-bottom, 0px) + 32px))",
              overflow: "auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              padding: 0,
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 6,
                background: "var(--panel)",
                borderBottom: "1px solid var(--border)",
                padding: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <strong style={{ fontSize: 16 }}>{lang === "ro" ? "Alege luna" : "Pick a month"} — {year}</strong>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="sb-btn sb-cardglow sb-btn--icon"
                  aria-label={lang === "ro" ? "Anul anterior" : "Previous year"}
                  onClick={() => setYear((y) => y - 1)}
                >
                  ◀
                </button>
                <button
                  type="button"
                  className="sb-btn sb-cardglow sb-btn--icon"
                  aria-label={lang === "ro" ? "Anul urmator" : "Next year"}
                  onClick={() => setYear((y) => y + 1)}
                >
                  ▶
                </button>
                <button
                  type="button"
                  className="sb-btn sb-cardglow sb-btn--icon"
                  aria-label={lang === "ro" ? "Inchide anul" : "Close year overview"}
                  onClick={() => setShowYear(false)}
                  style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ padding: 16, position: "relative", zIndex: 1 }}>
            <YearView
              lang={lang}
              year={year}
              roomsCount={rooms.length}
              occupancyMap={occupancyMap}
              isSmall={isSmall}
              onMonthTitleClick={(m) => { setMonth(m); setView("month"); setHighlightDate(null); setShowYear(false); }}
              onDayClick={(dateStr) => { goToMonthFor(dateStr); setShowYear(false); }}
            />
            </div>
          </div>
        </div>
      )}

      {/* Room View overlay */}
      {showRoomView && (
        <RoomViewModal
          propertyId={propertyId}
          lang={lang}
          initialYear={year}
          initialMonth={month}
          canEdit={canEdit}
          onClose={() => setShowRoomView(false)}
        />
      )}
      {createTarget && propertyId && (
        <RoomDetailModal
          dateStr={createTarget.date}
          propertyId={propertyId}
          room={createTarget.room}
          lang={lang}
          forceNew
          defaultStart={{
            date: createTarget.date,
            time: (properties.find((p) => p.id === propertyId)?.check_in_time) || null,
          }}
          defaultEnd={{
            date: addDaysStr(createTarget.date, 1),
            time: (properties.find((p) => p.id === propertyId)?.check_out_time) || null,
          }}
          onClose={() => setCreateTarget(null)}
          onChanged={() => {
            refreshData();
          }}
        />
      )}
      {roomPickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setRoomPickerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 240,
            background: "rgba(0,0,0,0.55)",
            display: "grid",
            placeItems: "center",
            padding: 12,
            paddingTop: "calc(var(--safe-top, 0px) + 12px)",
            paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="sb-cardglow"
            style={{
              width: "min(420px, 100%)",
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 14,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 16 }}>
              {lang === "ro" ? "Alege camera pentru rezervare" : "Pick a room to create booking"}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {roomPickerRooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="sb-btn sb-cardglow"
                  style={{ justifyContent: "flex-start" }}
                  onClick={() => {
                    const baseDate = highlightDate ?? ymd(today);
                    setCreateTarget({ room: r, date: baseDate });
                    setRoomPickerOpen(false);
                  }}
                >
                  {r.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="sb-btn sb-btn--ghost"
              onClick={() => setRoomPickerOpen(false)}
            >
              {lang === "ro" ? "Anulează" : "Cancel"}
            </button>
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
	      {showNoRoomsPopup && (
	        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowNoRoomsPopup(false)}
          className="sb-cardglow"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 260,
            background: "rgba(0,0,0,0.55)",
            display: "grid",
            placeItems: "center",
            padding: 12,
            paddingTop: "calc(var(--safe-top, 0px) + 12px)",
            paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="sb-cardglow"
            style={{
              width: "min(420px, 100%)",
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {lang === "ro" ? "Aceasta proprietate nu are inca camere" : "This property has no rooms yet"}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {lang === "ro"
                ? "Pentru a folosi calendarul, adauga cel putin o camera pentru aceasta proprietate. Deschidem Setari, la meniul Camere."
                : "To use the calendar, please add at least one room for this property. We’ll open Property Setup on the Rooms tab."}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="sb-btn sb-btn--primary"
                onClick={() => {
                  setShowNoRoomsPopup(false);
                  try {
                    if (typeof window !== "undefined") {
                      window.location.href = "/app/propertySetup?tab=rooms";
                    } else {
                      router.push("/app/propertySetup?tab=rooms");
                    }
                  } catch {
                    router.push("/app/propertySetup?tab=rooms");
                  }
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
	      )}
      </div>
    </div>
  );
}

/* ================== YEAR VIEW ================== */

function YearView({
  lang,
  year,
  roomsCount,
  occupancyMap,
  isSmall,
  onMonthTitleClick,
  onDayClick
}: {
  lang: Lang;
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
              {monthNamesByLang[lang][m]}
            </button>
            <small style={{color: "var(--muted)" }}>{year}</small>
          </div>

          <MiniMonth
            lang={lang}
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
  lang, year, month, roomsCount, occupancyMap, onDayClick
}: {
  lang: Lang;
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
            title={c.dateStr ? tooltipFor(c.dateStr, roomsCount, occupancyMap, lang) : undefined}
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

function tooltipFor(dateStr: string, roomsCount: number, map: Map<string, Set<string>>, lang: Lang) {
  const occ = map.get(dateStr)?.size ?? 0;
  return lang === "ro" ? `${occ}/${roomsCount} camere ocupate` : `${occ}/${roomsCount} rooms occupied`;
}

/* ================== MONTH VIEW ================== */

function MonthView({
  lang, year, month, roomsCount, occupancyMap, highlightDate, isSmall, onDayClick, animate
}: {
  lang: Lang;
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
    <section className="modalCard cal-smoobu sb-cardglow" data-animate={animate ? "true" : undefined} style={{ padding: 12 }}>
      {/* headers */}
      <div className="cal-weekdays" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
        {weekdayShortByLang[lang].map((w) => (
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
              title={c.dateStr ? tooltipFor(c.dateStr, roomsCount, occupancyMap, lang) : undefined}
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
                    opacity: isSmall ? 0.18 : 0.09,
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
          {lang === "ro" ? "Ocupare" : "Occupancy"}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, background: "var(--primary)", borderRadius: 999, display: "inline-block" }} />
          {lang === "ro" ? "Astazi" : "Today"}
        </span>
      </div>
    </section>
  );
}
