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
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          paddingBottom:
            "calc(var(--bottom-nav-h,56px) + 12px + var(--safe-bottom,0px))",
        }}
      >
        {/* Toolbar: property/date selector pill with glow (dark theme friendly) */}
        <div className="sb-toolbar" style={{ gap: 12 }}>
          <div
            className="clean-pill"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 9999,
              background: "rgba(28, 45, 85, 0.6)", // blue glass
              border: "1px solid rgba(96, 165, 250, 0.4)", // neon subtle
              boxShadow: "0 0 18px rgba(96, 165, 250, 0.25)", // outer glow
              backdropFilter: "blur(4px)",
            }}
          >
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => setDateStr(addDaysStr(dateStr, -1))}
              style={{
                width: 36,
                height: 36,
                borderRadius: 9999,
                border: "1px solid rgba(96,165,250,0.25)",
                background: "rgba(24, 36, 64, 0.65)",
                color: "rgba(255,255,255,0.8)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              ◀
            </button>

            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.currentTarget.value)}
              style={{
                minWidth: 220,
                fontFamily: "inherit",
                background: "transparent",
                color: "rgba(255,255,255,1)",
                border: 0,
                outline: "none",
                fontWeight: 800,
                padding: "6px 4px",
                WebkitAppearance: "none",
                MozAppearance: "none",
                appearance: "none",
              }}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id} style={{ color: "#0c111b" }}>
                  {p.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.currentTarget.value)}
              style={{
                padding: "6px 8px",
                fontFamily: "inherit",
                background: "transparent",
                color: "rgba(255,255,255,1)",
                border: 0,
                outline: "none",
                fontWeight: 800,
              }}
            />

            <button
              type="button"
              aria-label="Next day"
              onClick={() => setDateStr(addDaysStr(dateStr, 1))}
              style={{
                width: 36,
                height: 36,
                borderRadius: 9999,
                border: "1px solid rgba(96,165,250,0.25)",
                background: "rgba(24, 36, 64, 0.65)",
                color: "rgba(255,255,255,0.8)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
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
          <><ul
                className="cleanGrid"
                style={{
                  listStyle: "none",
                  padding: 0,
                  display: "grid",
                  gap: 10,
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
                      onClick={!canWrite || isCleaned ? undefined : () => setOpenItem(it)}
                      className="sb-card"
                      style={{
                        aspectRatio: "1.2 / 1",
                        padding: 12,
                        cursor: isCleaned ? "default" : "pointer",
                        display: "grid",
                        placeItems: "center",
                        gap: 8,
                        opacity: isCleaned ? 0.72 : 1,
                        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(17, 24, 39, 0.9) 100%)",
                        border: "1px solid rgba(96,165,250,0.25)",
                        boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
                      }}
                      title={isCleaned ? "Cleaned" : "Open cleaning tasks"}
                    >
                      <div style={{ textAlign: "center", display: "grid", gap: 8 }}>
                        {/* Progress ring */}
                        <div
                          aria-hidden
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 9999,
                            padding: 2,
                            background: "linear-gradient(180deg, rgba(96, 165, 250, 0.4) 0%, rgba(15, 23, 42, 0.9) 100%)",
                            boxShadow: "0 0 10px rgba(96,165,250,0.15)",
                            margin: "0 auto",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: 9999,
                              background: "rgba(17,24,39,0.85)",
                              display: "grid",
                              placeItems: "center",
                              color: "rgba(228,234,243,1)",
                              fontSize: 12,
                              fontWeight: 800,
                              boxShadow: "inset 0 0 10px rgba(96,165,250,0.15)",
                            }}
                          >
                            {doneCount}/{total}
                          </div>
                        </div>

                        {/* Icon above room name, theme-aware */}
                        <Image
                          src={roomIconSrc}
                          alt=""
                          width={29}
                          height={29}
                          style={{ margin: "0 auto", opacity: 0.95, pointerEvents: "none" }} />

                        <strong
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {it.room.name}
                        </strong>

                        <small style={{ color: "rgba(154, 164, 175, 1)" }}>
                          {it.mode === "carry"
                            ? `carry-over • ${it.cleanDate}`
                            : it.statusLine}
                        </small>
                        {isCleaned && (
                          <span className="sb-badge">
                            {cleanedBy ? `Cleaned by ${cleanedBy}` : "Cleaned"}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul><style jsx>{`
            /* Desktop/tablet default */
            .cleanGrid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
            /* Phone: exactly two cards per row */
            @media (max-width: 640px) {
              .cleanGrid { grid-template-columns: repeat(2, 1fr); }
            }
          `}</style></>
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
