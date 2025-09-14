"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TaskDef = { id: string; label: string; sort_index: number };
type Property = { id: string; check_in_time: string | null; check_out_time: string | null };

export default function CleaningRoomModal({
  propertyId,
  roomId,
  roomName,
  cleanDate,          // yyyy-mm-dd (ziua care se curăță; pentru carry-over e ziua checkout-ului anterior)
  tasks,              // definițiile (din parent)
  initialProgress,    // mapă {taskId: boolean} (din parent)
  onClose,
  onProgressChange,   // (taskId, value) -> parent sync
  onMarkedCleaned,    // () -> parent scoate cardul din board
}: {
  propertyId: string;
  roomId: string;
  roomName: string;
  cleanDate: string;
  tasks: TaskDef[];
  initialProgress: Record<string, boolean>;
  onClose: () => void;
  onProgressChange: (taskId: string, value: boolean) => void;
  onMarkedCleaned: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [progress, setProgress] = useState<Record<string, boolean>>(initialProgress || {});
  const [status, setStatus] = useState<"Idle" | "Saving…" | "Error" | "Saved">("Idle");
  const [hint, setHint] = useState<string>("");

  useEffect(() => { setProgress(initialProgress || {}); }, [initialProgress]);

  const sorted = useMemo(() => [...tasks].sort((a,b) => a.sort_index - b.sort_index), [tasks]);
  const total = sorted.length;
  const doneCount = sorted.reduce((acc, t) => acc + (progress[t.id] ? 1 : 0), 0);
  const allDone = total > 0 && doneCount === total;

  async function toggleTask(taskId: string, value: boolean) {
    setProgress(p => ({ ...p, [taskId]: value }));
    setStatus("Saving…"); setHint("Saving task…");

    const res = await supabase.from("cleaning_progress").upsert({
      property_id: propertyId,
      room_id: roomId,
      clean_date: cleanDate,
      task_id: taskId,
      done: value
    });

    if (res.error) {
      setStatus("Error"); setHint("Failed to save.");
      // revert local toggle if failed
      setProgress(p => ({ ...p, [taskId]: !value }));
      return;
    }

    setStatus("Saved"); setHint("Saved.");
    onProgressChange(taskId, value);

    // dacă toate sunt bifate -> auto mark as cleaned
    const latestDone = sorted.reduce((acc, t) => acc + ((t.id === taskId ? value : progress[t.id]) ? 1 : 0), 0);
    if (total > 0 && latestDone === total) {
      onMarkedCleaned();
      onClose();
    }
  }

  async function markAsCleanedNow() {
    // marchează toate ca true și salvează
    setStatus("Saving…"); setHint("Marking as cleaned…");
    const updates = sorted.map(t => ({
      property_id: propertyId,
      room_id: roomId,
      clean_date: cleanDate,
      task_id: t.id,
      done: true
    }));
    if (updates.length) {
      const res = await supabase.from("cleaning_progress").upsert(updates);
      if (res.error) { setStatus("Error"); setHint("Failed to mark."); return; }
    }
    // sync parent
    for (const t of sorted) onProgressChange(t.id, true);
    setStatus("Saved"); setHint("Marked as cleaned.");
    onMarkedCleaned();
    onClose();
  }

  function StatusPill() {
    const bg = status === "Saving…" ? "var(--primary)"
            : status === "Error"   ? "var(--danger)"
            : status === "Saved"   ? "var(--success, #22c55e)"
            : "#2a2f3a";
    const fg = status === "Saving…" ? "#0c111b" : "#fff";
    return (
      <span style={{ padding: "4px 8px", borderRadius: 999, background: bg, color: fg, fontSize: 12, fontWeight: 700 }}>
        {status}
      </span>
    );
  }

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(680px, 92vw)", maxHeight: "86vh", overflow: "auto",
          background: "var(--panel)", color: "var(--text)",
          border: "1px solid var(--border)", borderRadius: 12, padding: 16,
          fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
        }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <strong>{roomName} — Cleaning — {cleanDate}</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StatusPill />
            {hint && <small style={{ color: "var(--muted)" }}>{hint}</small>}
            <button onClick={onClose}
              style={{ padding: "6px 10px", background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer" }}>
              ✕
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ height: 8, background: "#1b2230", borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)" }}>
              <div style={{ width: `${Math.round((doneCount/total)*100)}%`, height: "100%", background: "var(--primary)" }} />
            </div>
            <small style={{ color: "var(--muted)" }}>{doneCount}/{total} tasks</small>
          </div>
        )}

        {/* Checklist (2 coloane pe desktop) */}
        {total === 0 ? (
          <p style={{ color: "var(--muted)" }}>No cleaning checklist defined for this property.</p>
        ) : (
          <ul style={{
            listStyle: "none", padding: 0,
            display: "grid", gap: 10, 
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))"
            
          }}>
            {sorted.map(t => {
              const checked = !!progress[t.id];
              return (
                <li key={t.id} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 10
                }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleTask(t.id, (e.target as HTMLInputElement).checked)}
                  />
                  <span>{t.label}</span>
                </li>
              );
            })}
          </ul>
        )}

        {/* Actions */}
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={markAsCleanedNow}
            style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#0c111b", fontWeight: 800, cursor: "pointer" }}>
            Mark as cleaned
          </button>
          <button onClick={onClose}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontWeight: 800, cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
