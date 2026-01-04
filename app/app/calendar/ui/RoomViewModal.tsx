"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";

const RoomDetailModal: any = dynamic(
  () => import("./RoomDetailModal").then((m: any) => m.default ?? m.RoomDetailModal ?? (() => null)),
  { ssr: false }
);

type Room = { id: string; name: string; property_id: string };
type Booking = {
  id: string;
  property_id: string;
  room_id: string | null;
  room_type_id?: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  source?: string | null;
  ota_integration_id?: string | null;
};
type TypeIntegration = {
  id: string;
  property_id: string;
  room_type_id: string | null;
  room_id?: string | null;
  provider: string | null;
  is_active: boolean | null;
  color?: string | null;
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
  const [integrations, setIntegrations] = useState<TypeIntegration[]>([]);
  const [loading, setLoading] = useState<"Idle"|"Loading"|"Error">("Idle");
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [openRoom, setOpenRoom] = useState<Room | null>(null);

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
        .select("id,property_id,room_id,room_type_id,start_date,end_date,start_time,end_time,status,source,ota_integration_id")
        .eq("property_id", propertyId)
        .neq("status","cancelled")
        .lte("start_date", to)
        .gte("end_date", from)
        .order("start_date", { ascending: true });

      // Integrations are optional (RLS may block for non-channels users). We tolerate errors.
      const rInteg = await supabase
        .from("ical_type_integrations")
        .select("id,property_id,room_type_id,room_id,provider,is_active,color")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: true });

      if (rRooms.error || rBookings.error) {
        setRooms([]);
        setBookings([]);
        setLoading("Error");
      } else {
        setRooms((rRooms.data ?? []) as Room[]);
        setBookings((rBookings.data ?? []) as Booking[]);
        if (!rInteg.error) setIntegrations((rInteg.data ?? []) as TypeIntegration[]);
        setLoading("Idle");
      }
    })();
  }, [propertyId, year, month, supabase]);

  function normalizeProvider(s?: string | null) {
    const p = (s || "").toLowerCase();
    if (!p) return "manual"; // null/empty → manual
    if (p.includes("manual") || p.includes("native") || p.includes("internal") || p.includes("form") || p.includes("direct")) return "manual";
    if (p.includes("airbnb")) return "airbnb";
    if (p.includes("booking")) return "booking";
    if (p.includes("expedia")) return "expedia";
    if (p.includes("trivago")) return "trivago";
    if (p.includes("lastminute")) return "lastminute";
    if (p.includes("travelminit")) return "travelminit";
    // other/ical/unknown providers → use generic fallback palette
    return "other";
  }

  const providerColors = useMemo(() => {
    const map = new Map<string, string>();
    // User manual overrides from Channels (only if set), lower priority than explicit manual color rule
    for (const it of integrations) {
      if (!it?.is_active) continue;
      const key = normalizeProvider(it.provider);
      if (it.color && !map.has(key)) map.set(key, it.color);
    }
    // Fallback palette copied from GuestOverview defaults
    if (!map.has("airbnb")) map.set("airbnb", "rgba(255, 90, 96, 0.81)");
    if (!map.has("booking")) map.set("booking", "rgba(30, 143, 255, 0.90)");
    if (!map.has("expedia")) map.set("expedia", "rgba(254,203,46,0.81)");
    if (!map.has("trivago")) map.set("trivago", "linear-gradient(90deg, #ec7163ff 0%, #f2a553ff 50%, #3eadd7 100%)");
    if (!map.has("lastminute")) map.set("lastminute", "#d493baff");
    if (!map.has("travelminit")) map.set("travelminit", "#a4579f");
    if (!map.has("other")) map.set("other", "rgba(139,92,246,0.81)"); // violet fallback
    return map;
  }, [integrations]);

  // Exact integration color by integration id
  const integColorById = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of integrations) {
      if (!it?.is_active) continue;
      if ((it as any).id && it.color) {
        m.set(String((it as any).id), it.color);
      }
    }
    return m;
  }, [integrations]);

  // Integration color by room/type (for cases where source is generic 'ical' or unknown)
  const integColorByRoomId = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of integrations) {
      if (!it?.is_active) continue;
      if (it.room_id && it.color) {
        if (!m.has(it.room_id)) m.set(it.room_id, it.color);
      }
    }
    return m;
  }, [integrations]);
  const integColorByTypeId = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of integrations) {
      if (!it?.is_active) continue;
      if (it.room_type_id && it.color) {
        if (!m.has(it.room_type_id)) m.set(it.room_type_id, it.color);
      }
    }
    return m;
  }, [integrations]);

  const colorByRoomDate = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const b of bookings) {
      if (!b.room_id) continue;
      const key = normalizeProvider(b.source);
      let color: string | undefined;
      // 1) Integration-specific color
      const intId = (b as any).ota_integration_id as string | undefined;
      if (intId && integColorById.has(intId)) {
        color = integColorById.get(intId);
      }
      if (key === "manual") {
        color = "#6CCC4C";
      } else {
        // 2) Provider-based palette
        if (!color && key !== "other") color = providerColors.get(key);
        // If unknown/generic ('other') or no provider color set, try integration color by room or type
        if (!color) {
          color = (b.room_id && integColorByRoomId.get(b.room_id))
            || ((b as any).room_type_id && integColorByTypeId.get((b as any).room_type_id as string))
            || providerColors.get("other")
            || "rgba(139,92,246,0.81)";
        }
      }
      let d = b.start_date;
      const end = b.end_date;
      while (d <= end) {
        const inner = map.get(b.room_id) || new Map<string, string>();
        // Prefer first assignment; if overlaps somehow, keep existing
        if (!inner.has(d)) inner.set(d, color!);
        map.set(b.room_id, inner);
        const dt = new Date(d + "T00:00:00"); dt.setDate(dt.getDate() + 1); d = ymd(dt);
      }
    }
    return map;
  }, [bookings, providerColors, integColorByRoomId, integColorByTypeId]);

  const RADIUS = 12;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        top: "calc(var(--safe-top, 0px) + var(--p4h-fixed-header-h, 0px))",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 240,
        background: "rgba(0,0,0,0.5)",
        display: "grid",
        placeItems: "center",
        paddingTop: 12,
        paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
        paddingLeft: 12,
        paddingRight: 12,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cal-smoobu sb-cardglow"
        style={{
          width: "min(1100px, 100%)",
          maxHeight:
            "calc(100dvh - (var(--safe-top, 0px) + var(--p4h-fixed-header-h, 0px) + var(--safe-bottom, 0px) + 48px))",
          overflow: "auto",
          WebkitOverflowScrolling: "touch" as any,
          overscrollBehavior: "contain" as any,
          background: "var(--panel)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: RADIUS,
        }}
      >
        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--panel)", borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS, borderBottom: "1px solid var(--border)", padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <strong>Room view — {monthNames[month]} {year}</strong>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="sb-btn sb-cardglow sb-btn--icon" aria-label="Prev month" onClick={() => setMonth(m => { const nm = m - 1; if (nm < 0) { setYear(y => y - 1); return 11; } return nm; })}>◀</button>
            <button className="sb-btn  sb-cardglow sb-btn--icon" aria-label="Next month" onClick={() => setMonth(m => { const nm = m + 1; if (nm > 11) { setYear(y => y + 1); return 0; } return nm; })}>▶</button>
            <button
              className="sb-btn sb-cardglow sb-btn--icon"
              aria-label="Close room view"
              onClick={onClose}
              style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}
            >
              ✕
            </button>
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
              <div key={r.id} className="sb-card sb-cardglow" style={{ padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <strong style={{ fontSize: 14 }}>{r.name}</strong>
                  <small style={{ color: "var(--muted)" }}>{monthNames[month]} {year}</small>
                </div>
                <MiniMonthRoom
                  year={year}
                  month={month}
                  room={r}
                  colors={colorByRoomDate.get(r.id) || new Map<string,string>()}
                  onDayClick={(room, dateStr) => { setOpenRoom(room); setOpenDate(dateStr); }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {openDate && openRoom && (
        <RoomDetailModal
          dateStr={openDate}
          propertyId={propertyId}
          room={openRoom}
          onClose={() => { setOpenDate(null); setOpenRoom(null); }}
          onChanged={() => { /* no-op refresh is handled on reopen */ }}
        />
      )}
    </div>
  );
}

function MiniMonthRoom({ year, month, room, colors, onDayClick }: {
  year: number; month: number; room: Room; colors: Map<string,string>;
  onDayClick: (room: Room, dateStr: string) => void;
}) {
  const dim = daysInMonth(year, month);
  const fw  = firstWeekday(year, month);
  const cells: Array<{ dateStr?: string; dayNum?: number; color?: string; isToday?: boolean }> = [];
  const todayStr = ymd(new Date());

  for (let i = 0; i < fw; i++) cells.push({});
  for (let d = 1; d <= dim; d++) {
    const ds = `${year}-${pad(month+1)}-${pad(d)}`;
    cells.push({ dateStr: ds, dayNum: d, color: colors.get(ds), isToday: ds === todayStr });
  }
  const rows  = Math.ceil(cells.length / 7);
  const total = rows * 7;
  while (cells.length < total) cells.push({});

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
      {cells.map((c, i) => {
        const clickable = !!c.dateStr;
        const hasColor = !!c.color;
        return (
          <div
            key={i}
            onClick={clickable ? () => onDayClick(room, c.dateStr!) : undefined}
            title={c.dateStr ? (hasColor ? "Reserved" : "Available") : undefined}
            style={{
              position: "relative",
              height: 28,
              borderRadius: 8,
              border: "1px solid var(--cal-brd, var(--border))",
              background: "var(--card)",
              boxShadow: c.isToday ? "0 0 0 2px var(--cal-today-ring, color-mix(in srgb, var(--primary) 60%, #ffffff))" : "none",
              cursor: clickable ? "pointer" : "default",
              overflow: "hidden",
            }}
          >
            {hasColor && (
              <div style={{ position: 'absolute', inset: 0, background: c.color!, opacity: 0.28 }} />
            )}
            {typeof c.dayNum === "number" && (
              <span style={{ position: "absolute", top: 5, left: 6, fontSize: 11, color: "var(--text)", fontWeight: 800 }}>
                {c.dayNum}
              </span>
            )}
            {/* Today dot removed; keep only the ring via boxShadow */}
          </div>
        );
      })}
    </div>
  );
}
