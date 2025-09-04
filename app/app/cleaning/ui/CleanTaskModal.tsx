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
}: {
  item: RoomItem;
  tasks: TaskDef[];
  propertyId: string;
  progress: Record<string, boolean>;
  onClose: () => void;
  onLocalProgress: (roomId: string, cleanDate: string, taskId: string, value: boolean) => void;
  onComplete: (roomId: string, cleanDate: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLocal(progress); // sync când deschidem
  }, [progress]);

  async function toggle(taskId: string, value: boolean) {
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
    }
  }

  async function markAllDone() {
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
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50 }} />

      {/* Modal */}
      <div role="dialog" aria-modal="true" className="sb-card" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(640px, 92vw)", zIndex: 51, display: "grid", gridTemplateRows: "auto 1fr auto", padding: 0 }}>
        {/* HEADER – centered room name */}
<div style={{ padding: 14, borderBottom: "1px solid var(--border)" }}>
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "40px 1fr 40px",
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
    <button onClick={onClose} aria-label="Close" className="sb-btn sb-btn--ghost sb-btn--small" style={{ justifySelf: "end" }}>✕</button>
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
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input type="checkbox" checked={checked} onChange={(e) => toggle(t.id, (e.target as HTMLInputElement).checked)} />
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
          <small style={{ color: "var(--muted)" }}>{saving ? "Saving…" : "Synced"}</small>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={markAllDone} className="sb-btn sb-btn--primary">Mark as cleaned</button>
          </div>
        </div>
      </div>
    </>
  );
}
