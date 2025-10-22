"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";



type TaskDef = { id: string; label: string; sort_index: number };
type Room = { id: string; name: string; property_id: string; };
type RoomItem = {
  room: Room;
  mode: "checkout" | "carry";
  cleanDate: string;
  statusLine: string;
  priority: number;
  nextCheckin?: { date: string; time: string | null } | null;
};

export default function CleanTaskModal({
  item,
  tasks,
  propertyId,
  progress,
  onClose,
  onLocalProgress,
  onComplete,
  onCleanedBy,
}: {
  item: RoomItem;
  tasks: TaskDef[];
  propertyId: string;
  progress: Record<string, boolean>;
  onClose: () => void;
  onLocalProgress: (roomId: string, cleanDate: string, taskId: string, value: boolean) => void;
  onComplete: (roomId: string, cleanDate: string) => void;
  onCleanedBy: (roomId: string, cleanDate: string, email: string | null) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const locked = useMemo(() => tasks.length > 0 && tasks.every(t => !!progress?.[t.id]), [tasks, progress]);

  // Actor email (for "Cleaned by <email>")
  const [actorEmail, setActorEmail] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setActorEmail(data.user?.email ?? null);
      } catch {
        setActorEmail(null);
      }
    })();
  }, [supabase]);

  useEffect(() => {
    setLocal(progress); // sync când deschidem
  }, [progress]);

  async function toggle(taskId: string, value: boolean) {
    if (locked) return; // immutable once cleaned
    setLocal(prev => ({ ...prev, [taskId]: value }));
    onLocalProgress(item.room.id, item.cleanDate, taskId, value);

    setSaving(true);
    await supabase.from("cleaning_progress").upsert({
      property_id: propertyId,
      room_id: item.room.id,
      clean_date: item.cleanDate,
      task_id: taskId,
      done: value
    });
    setSaving(false);

    // dacă toate sunt bifate -> auto "mark as cleaned"
    const allDone = tasks.length > 0 && tasks.every(t => (taskId === t.id ? value : !!local[t.id]));
    if (allDone) {
      onComplete(item.room.id, item.cleanDate);
      onCleanedBy(item.room.id, item.cleanDate, actorEmail);
      // Persist attribution server-side
      try {
        await fetch('/api/cleaning/mark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId, roomId: item.room.id, cleanDate: item.cleanDate })
        });
      } catch {}
    }
  }

  async function markAllDone() {
    if (locked) return;
    setSaving(true);
    // upsert pentru toate taskurile
    for (const t of tasks) {
      await supabase.from("cleaning_progress").upsert({
        property_id: propertyId,
        room_id: item.room.id,
        clean_date: item.cleanDate,
        task_id: t.id,
        done: true
      });
    }
    setSaving(false);
    // update local & parent, apoi complete
    const updated: Record<string, boolean> = {};
    for (const t of tasks) updated[t.id] = true;
    setLocal(updated);
    // update parent local map
    for (const t of tasks) onLocalProgress(item.room.id, item.cleanDate, t.id, true);
    onComplete(item.room.id, item.cleanDate);
    onCleanedBy(item.room.id, item.cleanDate, actorEmail);
    try {
      await fetch('/api/cleaning/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, roomId: item.room.id, cleanDate: item.cleanDate })
      });
    } catch {}
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50 }} />

      {/* Modal */}
      <div role="dialog" aria-modal="true" className="sb-card" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(640px, calc(100vw - 32px))", maxHeight: "calc(100vh - 32px)", overflow: "auto", zIndex: 51, display: "grid", gridTemplateRows: "auto 1fr auto", padding: 0, fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
        {/* HEADER – centered room name */}
<div style={{ padding: 14, borderBottom: "1px solid var(--border)" }}>
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "44px 1fr 44px",
      alignItems: "center",
      gap: 8,
      
    }}
  >
    {/* stânga: placeholder ca să putem centra corect */}
    <span aria-hidden />

    {/* centru: numele camerei + sublinia */}
    <div style={{ textAlign: "center", display: "grid", gap: 4, lineHeight: 1.2 }}>
      <strong style={{ fontSize: 18 }}>{item.room.name}</strong>
      <small style={{ color: "var(--muted)" }}>
        {item.mode === "carry"
          ? `carry-over • ${item.cleanDate}`
          : item.statusLine}
      </small>
    </div>

    {/* dreapta: buton închidere */}
    <button onClick={onClose} aria-label="Close" className="sb-btn sb-btn--ghost sb-btn--small" style={{ justifySelf: "end", width: 44, height: 44, padding: 0, borderRadius: 999 }}>✕</button>
  </div>
</div>


        {/* Body */}
        <div style={{ padding: 14, display: "grid", gap: 10 }}>
          {tasks.length === 0 ? (
            <p style={{ color: "var(--muted)",}}>No cleaning checklist defined for this property.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {[...tasks].sort((a,b)=>a.sort_index-b.sort_index).map(t => {
                const checked = !!local[t.id];
                return (
                  <li key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--card)", borderRadius: 10, padding: 10 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: locked ? "default" : "pointer", opacity: locked ? .7 : 1 }}>
                      <input type="checkbox" checked={checked} disabled={locked} onChange={(e) => toggle(t.id, (e.target as HTMLInputElement).checked)} />
                      <span>{t.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: 14,
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10
        }}>
          <small style={{ color: "var(--muted)" }}>{saving ? "Saving…" : locked ? "Cleaned" : "Synced"}</small>
          <div style={{ display: "flex", gap: 8 }}>
            {!locked && (
              <button onClick={markAllDone} className="sb-btn sb-btn--primary">Mark room as cleaned</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
