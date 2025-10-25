// app/app/cleaning/ui/CleaningClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "@/app/app/_components/HeaderContext";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import CleanTaskModal from "./CleanTaskModal";
import { usePersistentProperty } from "@/app/app/_components/PropertySelection";

/* ─── Types ─────────────────────────────────────────────────────────── */
type Property = { id: string; name: string; check_in_time: string | null; check_out_time: string | null };
type Room     = { id: string; name: string; property_id: string };
type Booking  = {
  id: string;
  room_id: string | null;
  property_id: string;
  start_date: string; end_date: string;
  start_time: string | null; end_time: string | null;
  status: string;
};
type TaskDef = { id: string; label: string; sort_index: number };

type RoomItem = {
  room: Room;
  mode: "checkout" | "carry";
  cleanDate: string;
  statusLine: string;
  priority: number;
  nextCheckin?: { date: string; time: string | null } | null;
  nextCheckinKey?: string | null;
};

type Plan = "basic" | "standard" | "premium" | null;

/* ─── Utils ─────────────────────────────────────────────────────────── */
function dstr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDaysStr(s: string, n: number) {
  const d = new Date(s + "T00:00:00");
  d.setDate(d.getDate() + n);
  return dstr(d);
}

/* ─── UI: Circular progress ring (uses theme variables) ─────────────── */
function CircleProgress({
  value,
  total,
  size = 44,
  strokeWidth = 5,
  textColor = 'color-mix(in srgb, var(--text) 90%, var(--bg) 10%)'
}: {
  value: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  textColor?: string;
}) {
  const safeTotal = Math.max(0, total);
  const v = Math.min(Math.max(0, value), safeTotal);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const pct = safeTotal > 0 ? v / safeTotal : 0;
  const offset = c * (1 - pct);
  const label = `${v}/${safeTotal}`;
  const cx = size / 2;
  const cy = size / 2;
  const gradId = useMemo(() => `gp-${Math.random().toString(36).slice(2)}`, []);
  const glowId = useMemo(() => `glow-${Math.random().toString(36).slice(2)}`, []);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        {/* Outer border gradient: var(--primary) → var(--card) */}
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
          <stop offset="100%" stopColor="var(--card)" stopOpacity={0.9} />
        </linearGradient>
        {/* Subtle glow for the progress stroke */}
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="var(--primary)" floodOpacity="0.15" />
        </filter>
      </defs>
      {/* Outer gradient ring (border) */}
      <circle cx={cx} cy={cy} r={r} stroke={`url(#${gradId})`} strokeWidth={Math.max(2, strokeWidth - 3)} fill="none" />
      {/* Track only (no filling as tasks complete) */}
      <circle cx={cx} cy={cy} r={r} stroke="var(--border)" strokeWidth={strokeWidth} fill="none" opacity={0.25} />
      {/* No center fill — keep middle transparent */}
      {/* Label */}
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontWeight={800} fontSize={size * 0.34} fill={textColor}>
        {label}
      </text>
    </svg>
  );
}

/* ─── Component ─────────────────────────────────────────────────────── */
export default function CleaningClient({ initialProperties }: { initialProperties: Property[] }) {
  const supabase = useMemo(() => createClient(), []);
  const { setTitle, setPill } = useHeader();

  const [status, setStatus] = useState<"Idle" | "Loading" | "Error">("Idle");

  const [properties] = useState<Property[]>(initialProperties);
  const [propertyId, setPropertyId] = usePersistentProperty(properties);

  // plan & features
  const [plan, setPlan] = useState<Plan>(null);
  const hasCleaningBoard = plan === "standard" || plan === "premium";
  const hasPriority      = plan === "premium";

  // Role/scopes gating: admin OR editor with 'cleaning' can write
  const [canWrite, setCanWrite] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        const me = j?.me as { role?: string; scopes?: string[]; disabled?: boolean } | undefined;
        if (!me) { setCanWrite(false); return; }
        const sc = new Set((me.scopes || []) as string[]);
        const allowed = !me.disabled && (me.role === 'admin' || (me.role === 'editor' && sc.has('cleaning')));
        setCanWrite(!!allowed);
      } catch { setCanWrite(false); }
    })();
  }, []);

  // Desktop-only: apply custom scrollbar to AppShell's main scroller
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDesktop = window.matchMedia?.('(min-width: 1025px)')?.matches ?? false;
    if (!isDesktop) return;
    const main = document.getElementById('app-main');
    if (!main) return;
    main.classList.add('sb-scrollbar');
    return () => { main.classList.remove('sb-scrollbar'); };
  }, []);

  const [dateStr, setDateStr] = useState<string>(dstr(new Date()));

  const [rooms, setRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<TaskDef[]>([]);
  const [items, setItems] = useState<RoomItem[]>([]);
  const [cleaningMap, setCleaningMap] = useState<Record<string, Record<string, boolean>>>({});
  const [cleanedByMap, setCleanedByMap] = useState<Record<string, string>>({});
  // Cache property presentation images by id (used in toolbar pill)
  const [propertyPhotos, setPropertyPhotos] = useState<Record<string, string | null>>({});

  const [openItem, setOpenItem] = useState<RoomItem | null>(null);

  /* Theme-aware icon (light/dark) */
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark") return true;
    if (attr === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    try { m?.addEventListener("change", onChange); } catch { m?.addListener?.(onChange); }
    return () => {
      try { m?.removeEventListener("change", onChange); } catch { m?.removeListener?.(onChange); }
    };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const ob = new MutationObserver(() => {
      const t = root.getAttribute("data-theme");
      if (t === "dark") setIsDark(true);
      if (t === "light") setIsDark(false);
    });
    ob.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => ob.disconnect();
  }, []);
  const roomIconSrc = isDark ? "/room_fordark.png" : "/room_forlight.png";

  // Load presentation image for the selected property (once per id)
  useEffect(() => {
    (async () => {
      if (!propertyId) return;
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
  }, [propertyId, supabase, propertyPhotos]);

  /* Header title + pill */
  useEffect(() => { setTitle("Cleaning Board"); }, [setTitle]);
  useEffect(() => {
    setPill(status === "Loading" ? "Syncing…" : status === "Error" ? "Error" : "Idle");
  }, [status, setPill]);

  /* Load plan (effective, for current account membership) */
  useEffect(() => {
    (async () => {
      const res = await supabase.rpc("account_current_plan");
      const p = (res.data as string | null)?.toLowerCase?.() as Plan | null;
      setPlan((p ?? 'basic') as Plan);
    })();
  }, [supabase]);

  /* Load data */
  useEffect(() => {
    if (!propertyId) return;
    if (!hasCleaningBoard) { setStatus("Idle"); return; }
    setStatus("Loading");

    (async () => {
      const rRooms = await supabase
        .from("rooms")
        .select("id,name,property_id")
        .eq("property_id", propertyId)
        .order("sort_index", { ascending: true })
        .order("created_at", { ascending: true });

      const rTasks = await supabase
        .from("cleaning_task_defs")
        .select("id,label,sort_index")
        .eq("property_id", propertyId)
        .order("sort_index", { ascending: true });

      const roomIds = (rRooms.data ?? []).map((r) => r.id);

      const rBookingsBefore = await supabase
        .from("bookings")
        .select("id,room_id,property_id,start_date,end_date,start_time,end_time,status")
        .in("room_id", roomIds.length ? roomIds : ["00000000-0000-0000-0000-000000000000"])
        .lte("end_date", dateStr)
        .neq("status", "cancelled")
        .order("end_date", { ascending: false });

      const rBookingsAfter = await supabase
        .from("bookings")
        .select("id,room_id,property_id,start_date,end_date,start_time,end_time,status")
        .in("room_id", roomIds.length ? roomIds : ["00000000-0000-0000-0000-000000000000"])
        .gte("start_date", dateStr)
        .neq("status", "cancelled")
        .order("start_date", { ascending: true });

      const fromStr = addDaysStr(dateStr, -30);
      const rProgress = await supabase
        .from("cleaning_progress")
        .select("room_id,clean_date,task_id,done")
        .eq("property_id", propertyId)
        .gte("clean_date", fromStr)
        .lte("clean_date", dateStr);

      // Load persisted attribution (who cleaned)
      const rMarks = await supabase
        .from("cleaning_marks")
        .select("room_id,clean_date,cleaned_by_email")
        .eq("property_id", propertyId)
        .gte("clean_date", fromStr)
        .lte("clean_date", dateStr);

      // Allow board to render even if cleaning_progress SELECT is not permitted (viewer without 'cleaning' scope).
      if (rRooms.error || rTasks.error || rBookingsBefore.error || rBookingsAfter.error) {
        setStatus("Error");
        return;
      }

      const _rooms = (rRooms.data ?? []) as Room[];
      const _tasks = (rTasks.data ?? []) as TaskDef[];
      setRooms(_rooms);
      setTasks(_tasks);

      // Indexări bookings
      const checkoutTodayByRoom = new Map<string, Booking>();
      const lastCheckoutBeforeByRoom = new Map<string, Booking>();
      for (const b of (rBookingsBefore.data ?? []) as Booking[]) {
        if (!b.room_id) continue;
        if (b.end_date === dateStr && !checkoutTodayByRoom.has(b.room_id)) checkoutTodayByRoom.set(b.room_id, b);
        if (b.end_date < dateStr && !lastCheckoutBeforeByRoom.has(b.room_id)) lastCheckoutBeforeByRoom.set(b.room_id, b);
      }
      const nextStartByRoom = new Map<string, Booking>();
      for (const b of (rBookingsAfter.data ?? []) as Booking[]) {
        if (!b.room_id) continue;
        if (!nextStartByRoom.has(b.room_id)) nextStartByRoom.set(b.room_id, b);
      }

      // Progress map
      const progMap: Record<string, Record<string, boolean>> = {};
      const progressRows = (rProgress.error ? [] : (rProgress.data ?? [])) as any[];
      for (const row of progressRows) {
        const key = `${row.room_id}|${row.clean_date}`;
        progMap[key] = progMap[key] || {};
        progMap[key][row.task_id] = !!row.done;
      }
      setCleaningMap(progMap);

      const cbMap: Record<string, string> = {};
      const markRows = (rMarks.error ? [] : (rMarks.data ?? [])) as any[];
      for (const m of markRows) {
        const key = `${m.room_id}|${m.clean_date}`;
        if (m.cleaned_by_email) cbMap[key] = m.cleaned_by_email as string;
      }
      setCleanedByMap(cbMap);

      // CI/CO din property (fallback)
      const prop = initialProperties.find((p) => p.id === propertyId);
      const CI = prop?.check_in_time || "14:00";
      const CO = prop?.check_out_time || "11:00";

      const list: RoomItem[] = [];
      for (const r of _rooms) {
        const checkoutToday = checkoutTodayByRoom.get(r.id) || null;
        const lastBefore = lastCheckoutBeforeByRoom.get(r.id) || null;

        // Carry-over DOAR a doua zi după end_date dacă nu e complet
        let hasCarry = false;
        let carryCleanDate = "";
        if (lastBefore && _tasks.length > 0) {
          if (lastBefore.end_date === addDaysStr(dateStr, -1)) {
            const key = `${r.id}|${lastBefore.end_date}`;
            const progress = progMap[key] || {};
            const doneCount = Object.values(progress).filter(Boolean).length;
            hasCarry = doneCount < _tasks.length;
            carryCleanDate = lastBefore.end_date;
          }
        }

        const next = nextStartByRoom.get(r.id) || null;
        const nextLabel = next
          ? (next.start_date === dateStr
              ? `next CI ${next.start_time || CI}`
              : next.start_date === addDaysStr(dateStr, 1)
                ? `next CI tomorrow ${next.start_time || CI}`
                : `next CI ${next.start_date} ${next.start_time || CI}`)
          : "no next CI";

        if (checkoutToday) {
          const statusLine = `checkout ${checkoutToday.end_time || CO} • ${nextLabel}`;

          // prioritizare doar Premium
          let pr = 2;
          if (hasPriority) {
            if (next && next.start_date === dateStr) pr = 0;
            else if (next && next.start_date === addDaysStr(dateStr, 1)) pr = 1;
          }

          const nextKey =
            hasPriority &&
            (next && (next.start_date === dateStr || next.start_date === addDaysStr(dateStr, 1)))
              ? (next.start_time || CI)
              : null;

          list.push({
            room: r,
            mode: "checkout",
            cleanDate: dateStr,
            statusLine,
            priority: pr,
            nextCheckin: next ? { date: next.start_date, time: next.start_time } : null,
            nextCheckinKey: nextKey
          });
        }

        if (hasCarry) {
          const already = list.find((it) => it.room.id === r.id && it.cleanDate === dateStr);
          if (!already) {
            list.push({
              room: r,
              mode: "carry",
              cleanDate: carryCleanDate, // progress legat de ziua checkout-ului
              statusLine: `carry-over from ${carryCleanDate}`,
              priority: 3,
              nextCheckin: null,
              nextCheckinKey: null
            });
          }
        }
      }

      // Sortare: Premium = priority + ora CI; Standard = alfabetic
      if (hasPriority) {
        list.sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          if (a.nextCheckinKey && b.nextCheckinKey && a.nextCheckinKey !== b.nextCheckinKey) {
            return a.nextCheckinKey.localeCompare(b.nextCheckinKey);
          }
          return a.room.name.localeCompare(b.room.name);
        });
      } else {
        list.sort((a, b) => a.room.name.localeCompare(b.room.name));
      }

      setItems(list);
      setStatus("Idle");
    })();
  }, [propertyId, dateStr, supabase, initialProperties, hasPriority, hasCleaningBoard]);

  function sortedTasks(): TaskDef[] { return [...tasks].sort((a, b) => a.sort_index - b.sort_index); }

  function onLocalProgress(roomId: string, cleanDate: string, taskId: string, value: boolean) {
    const key = `${roomId}|${cleanDate}`;
    setCleaningMap((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [taskId]: value } }));
  }

  function onComplete(roomId: string, cleanDate: string) {
    // Păstrăm cardurile de tip "checkout" în board ca să poată afișa "Cleaned by <email>"
    // Eliminăm doar carry-over-ul (deoarece dispare din ziua următoare oricum)
    setItems((prev) =>
      prev.filter((it) => {
        if (it.room.id !== roomId) return true;
        if (it.mode === "carry") return !(it.cleanDate === cleanDate);
        return true; // keep checkout
      })
    );
    setOpenItem(null);
  }

  function onCleanedBy(roomId: string, cleanDate: string, email: string | null) {
    if (!email) return;
    const key = `${roomId}|${cleanDate}`;
    setCleanedByMap((prev) => ({ ...prev, [key]: email }));
  }

  const tdefs = sortedTasks();

  /* ─── Gating: Basic → card de upgrade ─────────────────────────────── */
  if (plan && !hasCleaningBoard) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 16
          }}
        >
          <h2 style={{ marginTop: 0 }}>Cleaning Board</h2>
          <p style={{ color: "var(--muted)" }}>
            This feature is available on <strong>Standard</strong> and <strong>Premium</strong> plans.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href="/app/subscription"
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--primary)",
                color: "#0c111b",
                fontWeight: 800,
                textDecoration: "none"
              }}
            >
              Upgrade plan
            </a>
            <a
              href="/app"
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text)",
                fontWeight: 800,
                textDecoration: "none"
              }}
            >
              Back to dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ─── UI principal (scroll conținut, header/bottom fixe în AppShell) ─ */
  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gap: 12,
        fontFamily:
          "Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        height: "calc(100dvh - var(--safe-top,0px) - var(--safe-bottom,0px))",
      }}
    >
      <PlanHeaderBadge title="Cleaning Board" slot="header-right" />
      <div
        data-scroll
        style={{
          /* Avoid nested scrolling; AppShell's #app-main is the only scroller */
          overflow: "visible",
          paddingBottom:
            "calc(var(--bottom-nav-h,56px) + 12px + var(--safe-bottom,0px))",
        }}
      >
        {/* Toolbar */}
        <div className="sb-toolbar" style={{ gap: 12, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Property</label>
          {/* Pill card with property avatar (left) + selector */}
          <div
            className="Sb-cardglow"
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 10px 6px 56px',
              borderRadius: 999,
              minHeight: 56,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
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
              value={propertyId}
              onChange={(e) => setPropertyId(e.currentTarget.value)}
              className="sb-select"
              style={{
                background: 'transparent',
                border: '0',
                boxShadow: 'none',
                padding: '10px 12px',
                minWidth: 220,
                minHeight: 44,
                fontFamily: 'inherit',
              }}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="sb-btn sb-cardglow sb-btn--icon"
              aria-label="Previous day"
              onClick={() => setDateStr(addDaysStr(dateStr, -1))}
            >
              ◀
            </button>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.currentTarget.value)}
              className="sb-btn sb-cardglow sb-btn--ghost"
              style={{ padding: "8px 12px", fontFamily: "inherit" }}
            />
            <button
              type="button"
              className="sb-btn sb-cardglow sb-btn--icon"
              aria-label="Next day"
              onClick={() => setDateStr(addDaysStr(dateStr, 1))}
            >
              ▶
            </button>
          </div>
        </div>

        {tdefs.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>
            No cleaning checklist defined. Configure tasks in{" "}
            <a href="/app/propertySetup" style={{ color: "var(--primary)" }}>
              Property Setup → Cleaning
            </a>
            .
          </div>
        ) : items.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No rooms to clean for this day.</div>
        ) : (
          <ul
            className="cleaning-grid"
            style={{
              listStyle: "none",
              padding: 0,
              display: "grid",
              gridTemplateColumns:
                "var(--clean-grid-cols, repeat(auto-fill, minmax(var(--clean-card-min, 180px), 1fr)))",
              gap: "var(--clean-grid-gap, 10px)",
            }}
          >
            {items.map((it) => {
              const key = `${it.room.id}|${it.cleanDate}`;
              const prog = cleaningMap[key] || {};
              const doneCount = tdefs.filter((t) => !!prog[t.id]).length;
              const total = tdefs.length;
              const cleaned = total > 0 && doneCount === total;
              const cleanedBy = cleanedByMap[key];
              const isCleaned = cleaned || !!cleanedBy;

              return (
                <li
                  key={it.room.id + "|" + it.cleanDate}
                  onClick={
                    !canWrite || isCleaned ? undefined : () => setOpenItem(it)
                  }
                  className="sb-cardglow"
                  style={{
                    aspectRatio: "var(--clean-card-aspect, 3 / 4)",
                    padding: 10,
                    cursor: isCleaned ? "default" : "pointer",
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 13,
                    gap: 6,
                    opacity: isCleaned ? 0.66 : 1,
                  }}
                  title={isCleaned ? "Cleaned" : "Open cleaning tasks"}
                >
                  <div style={{ textAlign: "center", display: "grid", gap: 6 }}>
                    {/* Icon above room name, theme-aware */}
                    <Image
                      src={roomIconSrc}
                      alt=""
                      width={29}
                      height={29}
                      style={{ margin: "0 auto", opacity: 0.95, pointerEvents: "none" }}
                    />

                    <strong
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {it.room.name}
                    </strong>

                    <small style={{ color: "var(--muted)" }}>
                      {it.mode === "carry" ? `carry-over • ${it.cleanDate}` : it.statusLine}
                    </small>

                    <div style={{ display: 'grid', placeItems: 'center', gap: 4 }}>
                      <CircleProgress value={isCleaned ? total : doneCount} total={total} size={44} />
                      {isCleaned && cleanedBy ? (
                        <small style={{ color: 'var(--muted)', fontSize: 11 }}>Cleaned by {cleanedBy}</small>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {openItem && (
          <CleanTaskModal
            item={openItem}
            tasks={tdefs}
            propertyId={propertyId}
            progress={cleaningMap[`${openItem.room.id}|${openItem.cleanDate}`] || {}}
            onClose={() => setOpenItem(null)}
            onLocalProgress={onLocalProgress}
            onComplete={onComplete}
            onCleanedBy={onCleanedBy}
          />
        )}
      </div>
    </div>
  );
}

/* Styles */
const primaryBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--primary)",
  color: "#0c111b",
  fontWeight: 800,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid var(--danger)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 800,
  cursor: "pointer",
};
