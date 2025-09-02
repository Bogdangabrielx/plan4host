"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "@/app/app/_components/HeaderContext";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import CleanTaskModal from "./CleanTaskModal";

/* ─── Types ─────────────────────────────────────────────────────────── */
type Property = { id: string; name: string; check_in_time: string | null; check_out_time: string | null; };
type Room = { id: string; name: string; property_id: string; };
type Booking = {
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

/* ─── Component ─────────────────────────────────────────────────────── */
export default function CleaningClient({ initialProperties }: { initialProperties: Property[] }) {
  const supabase = useMemo(() => createClient(), []);
  const { setTitle, setPill, setRight } = useHeader();

  const [status, setStatus] = useState<"Idle" | "Loading" | "Error">("Idle");

  const [properties] = useState<Property[]>(initialProperties);
  const [propertyId, setPropertyId] = useState<string>(initialProperties[0]?.id ?? "");

  // plan & features
  const [plan, setPlan] = useState<Plan>(null);
  const hasCleaningBoard = plan === "standard" || plan === "premium";
  const hasPriority      = plan === "premium";

  const today = new Date();
  const dstr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const [dateStr, setDateStr] = useState<string>(dstr(today));

  const [rooms, setRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<TaskDef[]>([]);
  const [items, setItems] = useState<RoomItem[]>([]);
  const [cleaningMap, setCleaningMap] = useState<Record<string, Record<string, boolean>>>({});

  const [openItem, setOpenItem] = useState<RoomItem | null>(null);

  function addDaysStr(s: string, n: number) {
    const d = new Date(s + "T00:00:00");
    d.setDate(d.getDate() + n);
    return dstr(d);
  }

  /* Header title: doar string */
  useEffect(() => { setTitle("Cleaning Board"); }, [setTitle]);

  /* Pill + right controls */
  useEffect(() => {
    const pillTxt = status === "Loading" ? "Syncing…" : status === "Error" ? "Error" : "Idle";
    setPill(pillTxt);

    const right = (
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          style={{ background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", padding: "6px 10px", borderRadius: 8 }}
        >
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Date</label>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.currentTarget.value)}
            style={{ padding: 6, background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8 }}
          />
        </div>
      </div>
    );
    setRight(right);
  }, [status, propertyId, properties, dateStr, setPill, setRight]);

  /* Load plan (accounts) */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("plan, valid_until")
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        const acc = data[0] as any;
        const now = new Date();
        const valid = acc.valid_until ? new Date(acc.valid_until) > now : true;
        setPlan(valid ? (acc.plan as Plan) : "basic");
      } else {
        setPlan("basic");
      }
    })();
  }, [supabase]);

  /* Load data */
  useEffect(() => {
    if (!propertyId) return;
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

      const roomIds = (rRooms.data ?? []).map(r => r.id);

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

      if (rRooms.error || rTasks.error || rBookingsBefore.error || rBookingsAfter.error || rProgress.error) {
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
      for (const row of (rProgress.data ?? []) as any[]) {
        const key = `${row.room_id}|${row.clean_date}`;
        progMap[key] = progMap[key] || {};
        progMap[key][row.task_id] = !!row.done;
      }
      setCleaningMap(progMap);

      // CI/CO din property (fallback)
      const prop = initialProperties.find(p => p.id === propertyId);
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
          const already = list.find(it => it.room.id === r.id && it.cleanDate === dateStr);
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
  }, [propertyId, dateStr, supabase, initialProperties, hasPriority]);

  function sortedTasks(): TaskDef[] { return [...tasks].sort((a,b)=>a.sort_index - b.sort_index); }

  function onLocalProgress(roomId: string, cleanDate: string, taskId: string, value: boolean) {
    const key = `${roomId}|${cleanDate}`;
    setCleaningMap(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [taskId]: value } }));
  }

  function onComplete(roomId: string, cleanDate: string) {
    setItems(prev => prev.filter(it => {
      if (it.room.id !== roomId) return true;
      if (it.mode === "checkout") return !(it.cleanDate === dateStr);
      if (it.mode === "carry")   return !(it.cleanDate === cleanDate);
      return true;
    }));
    setOpenItem(null);
  }

  const tdefs = sortedTasks();

  /* ─── Gating: Basic → card de upgrade ─────────────────────────────── */
  if (plan && !hasCleaningBoard) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <PlanHeaderBadge title="Cleaning Board" />

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
            <a href="/app/billing" style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--primary)",
              color: "#0c111b",
              fontWeight: 800,
              textDecoration: "none"
            }}>
              Upgrade plan
            </a>
            <a href="/app" style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              fontWeight: 800,
              textDecoration: "none"
            }}>
              Back to dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ─── UI principal ─────────────────────────────────────────────────── */
  return (
    <div>
      <PlanHeaderBadge title="Cleaning Board" />

      {tdefs.length === 0 ? (
        <div style={{ color: "var(--muted)" }}>
          No cleaning checklist defined. Configure tasks in <a href="/app/configurator" style={{ color: "var(--primary)" }}>Configurator → Cleaning</a>.
        </div>
      ) : items.length === 0 ? (
        <div style={{ color: "var(--muted)" }}>No rooms to clean for this day.</div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12
          }}
        >
          {items.map((it) => {
            const key = `${it.room.id}|${it.cleanDate}`;
            const prog = cleaningMap[key] || {};
            const doneCount = tdefs.filter(t => !!prog[t.id]).length;
            const total = tdefs.length;

            return (
              <li
                key={it.room.id + "|" + it.cleanDate}
                onClick={() => setOpenItem(it)}
                style={{
                  aspectRatio: " 1.5 / 1",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 12,
                  cursor: "pointer",
                  display: "grid",
                  gridTemplateRows: "auto 1fr auto",
                  gap: 8
                }}
                title="Open cleaning tasks"
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.room.name}
                  </strong>
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: it.mode === "carry" ? "transparent" : "var(--primary)",
                      border: it.mode === "carry" ? "1px solid var(--danger)" : "var(--primary)",
                      color: it.mode === "carry" ? "var(--danger)" : "#0c111b",
                      fontWeight: 800,
                      fontSize: 11,
                      flexShrink: 0
                    }}
                  >
                    {it.mode === "carry" ? "carry-over" : "today"}
                  </span>
                </div>

                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                  {it.statusLine}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {it.mode === "checkout" ? dateStr : it.cleanDate}
                  </span>
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "var(--panel)",
                      color: "var(--text)",
                      fontWeight: 800,
                      fontSize: 12
                    }}
                  >
                    {doneCount}/{total}
                  </span>
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
        />
      )}
    </div>
  );
}



