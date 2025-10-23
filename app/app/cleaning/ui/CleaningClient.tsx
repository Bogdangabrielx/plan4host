// app/app/cleaning/ui/CleaningClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
function fmtHumanDate(isoDate: string) {
  // ex: "24 Oct 2025"
  try {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(/,/g, "");
  } catch {
    return isoDate;
  }
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

  const [dateStr, setDateStr] = useState<string>(dstr(new Date()));

  const [rooms, setRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<TaskDef[]>([]);
  const [items, setItems] = useState<RoomItem[]>([]);
  const [cleaningMap, setCleaningMap] = useState<Record<string, Record<string, boolean>>>({});
  const [cleanedByMap, setCleanedByMap] = useState<Record<string, string>>({});

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

  /* Header title + pill (status) */
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

  /* ─── Date selector (vizual) ──────────────────────────────────────── */
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const triggerPick = () => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click();

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
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          paddingBottom:
            "calc(var(--bottom-nav-h,56px) + 12px + var(--safe-bottom,0px))",
        }}
      >
        {/* ── Top nav din poză: buton stânga + pastilă dată centrată ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            padding: "8px 8px 2px",
          }}
        >
          {/* Prev */}
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => setDateStr(addDaysStr(dateStr, -1))}
            style={chevronBtn}
          >
            <span style={{ transform: "translateX(-1px)" }}>◀</span>
          </button>

          {/* Date pill (click to open native date picker) */}
          <div
            onClick={triggerPick}
            role="button"
            aria-label="Change date"
            title="Change date"
            style={datePill}
          >
            {fmtHumanDate(dateStr)}
            {/* glow layer */}
            <div style={datePillGlow} />
          </div>

          {/* Next (invizibil pentru a păstra layout-ul echilibrat) */}
          <button
            type="button"
            aria-label="Next day"
            onClick={() => setDateStr(addDaysStr(dateStr, 1))}
            style={chevronBtn}
          >
            <span style={{ transform: "translateX(1px)" }}>▶</span>
          </button>
        </div>

        {/* input ascuns dar funcțional pentru a deschide native date picker */}
        <input
          ref={dateInputRef}
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.currentTarget.value)}
          style={hiddenDateInput}
        />

        {/* Toolbar existentă – doar proprietatea (lăsată simplă) */}
        <div className="sb-toolbar" style={{ gap: 12, marginTop: 6 }}>
          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>
            Property
          </label>
          <select
            className="sb-select"
            value={propertyId}
            onChange={(e) => setPropertyId(e.currentTarget.value)}
            style={{ minWidth: 220, fontFamily: "inherit" }}
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Conținut */}
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
            style={{
              listStyle: "none",
              padding: 0,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
              marginTop: 10,
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
                  style={{
                    ...cardShell,
                    cursor: isCleaned ? "default" : "pointer",
                    opacity: isCleaned ? 0.66 : 1,
                  }}
                  title={isCleaned ? "Cleaned" : "Open cleaning tasks"}
                >
                  {/* inner content */}
                  <div style={{ textAlign: "center", display: "grid", gap: 10 }}>
                    {/* icon */}
                    <Image
                      src={roomIconSrc}
                      alt=""
                      width={44}
                      height={44}
                      style={{ margin: "6px auto 2px", opacity: 0.95, pointerEvents: "none" }}
                    />

                    {/* Room name */}
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 800,
                        letterSpacing: 0.2,
                        textShadow: "0 1px 0 rgba(0,0,0,0.25)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {it.room.name}
                    </div>

                    {/* Status line */}
                    <div
                      style={{
                        color: "var(--muted)",
                        fontSize: 16,
                        display: "grid",
                        gap: 4,
                        lineHeight: 1.25,
                      }}
                    >
                      {it.mode === "carry" ? (
                        <>
                          <span>carry-over</span>
                          <span>• {it.cleanDate}</span>
                        </>
                      ) : (
                        <>
                          <span>checkout {it.statusLine.split(" • ")[0].replace("checkout ", "")}</span>
                          <span>• {it.statusLine.split(" • ")[1]}</span>
                        </>
                      )}
                    </div>

                    {/* Ring counter */}
                    <div style={{ display: "grid", placeItems: "center", marginTop: 8 }}>
                      <div style={ringOuter}>
                        <div style={ringInner}>
                          <div style={{ fontSize: 22, fontWeight: 800 }}>
                            {isCleaned ? "✓" : `${doneCount}/${total}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* badge cleaned by */}
                    {isCleaned && cleanedBy && (
                      <div style={badgeSmall}>Cleaned by {cleanedBy}</div>
                    )}
                  </div>

                  {/* glossy edges */}
                  <div style={cardEdge} />
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

/* ─── Styles (inline objects pentru look din poză) ───────────────────── */

const hiddenDateInput: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  opacity: 0,
  pointerEvents: "none",
};

const chevronBtn: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 999,
  border: "1px solid rgba(112,134,183,0.25)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.15) 100%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 20px rgba(0,0,0,0.25)",
  color: "var(--text)",
  display: "grid",
  placeItems: "center",
  backdropFilter: "blur(6px)",
};

const datePill: React.CSSProperties = {
  position: "relative",
  justifySelf: "center",
  minWidth: 220,
  padding: "14px 22px",
  borderRadius: 18,
  border: "1px solid rgba(112,134,183,0.35)",
  background:
    "radial-gradient(120% 160% at 50% -20%, rgba(96,165,250,0.25) 0%, rgba(96,165,250,0.12) 35%, rgba(16,24,40,0.2) 100%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.20) 100%)",
  boxShadow:
    "0 8px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 3px rgba(96,165,250,0.12)",
  color: "var(--text)",
  fontSize: 22,
  fontWeight: 900,
  textAlign: "center",
  cursor: "pointer",
  userSelect: "none",
};

const datePillGlow: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: 18,
  boxShadow: "0 0 40px 10px rgba(96,165,250,0.25)",
  pointerEvents: "none",
};

const cardShell: React.CSSProperties = {
  position: "relative",
  display: "grid",
  placeItems: "center",
  padding: 18,
  borderRadius: 28,
  border: "1px solid rgba(112,134,183,0.2)",
  background:
    "radial-gradient(140% 160% at 50% -40%, rgba(96,165,250,0.08) 0%, rgba(96,165,250,0.04) 40%, rgba(15,23,42,0.6) 100%), rgba(17,24,39,0.55)",
  boxShadow:
    "0 12px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
  minHeight: 280,
  aspectRatio: "0.78 / 1", // aprox. proporția din poză
  overflow: "hidden",
};

const cardEdge: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: 28,
  boxShadow: "inset 0 0 0 1px rgba(96,165,250,0.04), inset 0 -80px 120px rgba(0,0,0,0.25)",
  pointerEvents: "none",
};

const ringOuter: React.CSSProperties = {
  width: 110,
  height: 110,
  borderRadius: 999,
  border: "6px solid rgba(96,165,250,0.15)",
  boxShadow: "inset 0 0 0 6px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.25)",
  display: "grid",
  placeItems: "center",
};

const ringInner: React.CSSProperties = {
  width: 88,
  height: 88,
  borderRadius: 999,
  border: "6px solid rgba(112,134,183,0.35)",
  background:
    "radial-gradient(120% 140% at 50% -20%, rgba(96,165,250,0.12) 0%, rgba(96,165,250,0.05) 40%, rgba(2,6,23,0.6) 100%)",
  display: "grid",
  placeItems: "center",
};

const badgeSmall: React.CSSProperties = {
  marginTop: 6,
  alignSelf: "center",
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(112,134,183,0.3)",
  background: "rgba(255,255,255,0.04)",
  fontSize: 12,
  fontWeight: 700,
  color: "var(--muted)",
};

/* (ex.) butoane reutilizabile – păstrate dacă ai nevoie în alte locuri */
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