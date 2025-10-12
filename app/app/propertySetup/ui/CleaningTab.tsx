"use client";

type TaskDef = { id: string; label: string; sort_index: number };

import { useState } from 'react';

export default function CleaningTab({
  tasks,
  onAdd, onRename, onDelete, onMove
}: {
  tasks: TaskDef[];
  onAdd: () => void;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
}) {
  const [confirmDel, setConfirmDel] = useState<null | { id: string; label: string }>(null);
  return (
    <section className="sb-card" style={{ display: "grid", gap: 12, padding: 12 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Cleaning tasks</h3>
        <button onClick={onAdd} className="sb-btn sb-btn--primary">+ Add task</button>
      </header>

      {tasks.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No cleaning tasks set up yet.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        {[...tasks].sort((a,b) => a.sort_index - b.sort_index).map((t, idx) => (
          <li key={t.id} style={row}>
            <input
              defaultValue={t.label}
              onBlur={(e) => {
                const v = e.currentTarget.value.trim();
                if (!v || v === t.label) { e.currentTarget.value = t.label; return; }
                onRename(t.id, v);
              }}
              style={textInput}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => onMove(t.id, "up")}   disabled={idx === 0}                   className="sb-btn" title="Move up">↑</button>
              <button onClick={() => onMove(t.id, "down")} disabled={idx === tasks.length - 1}    className="sb-btn" title="Move down">↓</button>
            </div>
            <button onClick={() => setConfirmDel({ id: t.id, label: t.label })} className="sb-btn">Delete</button>
          </li>
        ))}
      </ul>

      {confirmDel && (
        <div role="dialog" aria-modal="true" onClick={()=>setConfirmDel(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:120, display:'grid', placeItems:'center', padding:12 }}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(520px,100%)', padding:16, border:'1px solid var(--border)', borderRadius:12, background:'var(--panel)', color:'var(--text)' }}>
            <div style={{ display:'grid', gap:8 }}>
              <strong>Delete cleaning task</strong>
              <div style={{ color:'var(--muted)' }}>
                Are you sure you want to delete “{confirmDel.label}”? This action is irreversible.
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:6 }}>
                <button className="sb-btn" onClick={()=>setConfirmDel(null)}>Close</button>
                <button className="sb-btn sb-btn--primary" onClick={()=>{ const id=confirmDel.id; setConfirmDel(null); onDelete(id); }} style={{ background:'var(--danger)', color:'#fff', border:'1px solid var(--danger)' }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 90px 90px", gap: 8, alignItems: "center" };
const textInput: React.CSSProperties = { padding: 8, background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: 'inherit' };
const primaryBtn: React.CSSProperties = { padding: "8px 12px", background: "var(--primary)", color: "#0c111b", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 };
const ghostBtn: React.CSSProperties   = { padding: "6px 10px", background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer" };
const dangerBtn: React.CSSProperties  = { padding: "6px 10px", background: "transparent", color: "var(--text)", border: "1px solid var(--danger)", borderRadius: 8, cursor: "pointer", fontWeight: 700 };
