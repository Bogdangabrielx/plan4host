"use client";
import { useEffect, useState } from "react";

type CheckDef = { id: string; label: string; default_value: boolean; sort_index: number };
type TextDef  = { id: string; label: string; placeholder: string | null; sort_index: number };

export default function RoomDetailsTab({
  checks, texts,
  onAddCheck, onRenameCheck, onToggleCheckDefault, onDeleteCheck, onMoveCheck,
  onAddText, onRenameText, onPlaceholderText, onDeleteText, onMoveText
}: {
  checks: CheckDef[];
  texts: TextDef[];
  onAddCheck: () => void;
  onRenameCheck: (id: string, label: string) => void;
  onToggleCheckDefault: (id: string, v: boolean) => void;
  onDeleteCheck: (id: string) => void;
  onMoveCheck: (id: string, dir: "up" | "down") => void;
  onAddText: () => void;
  onRenameText: (id: string, label: string) => void;
  onPlaceholderText: (id: string, ph: string) => void;
  onDeleteText: (id: string) => void;
  onMoveText: (id: string, dir: "up" | "down") => void;
}) {
  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    const detect = () => setIsSmall(typeof window !== "undefined" ? window.innerWidth < 480 : false);
    detect();
    window.addEventListener("resize", detect);
    return () => window.removeEventListener("resize", detect);
  }, []);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Checks */}
      <section style={card}>
        <header style={head}><h3 style={{ margin: 0 }}>Checks</h3><button onClick={onAddCheck} style={primaryBtn}>+ Add</button></header>
        {checks.length === 0 && <p style={{ color: "var(--muted)" }}>No checks defined yet.</p>}
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {[...checks].sort((a,b) => a.sort_index - b.sort_index).map((c, idx) => (
            <li key={c.id} style={{ ...row, gridTemplateColumns: isSmall ? "1fr" : (row.gridTemplateColumns as string) }}>
              <input
                defaultValue={c.label}
                onBlur={(e) => {
                  const v = e.currentTarget.value.trim();
                  if (v && v !== c.label) onRenameCheck(c.id, v);
                  else e.currentTarget.value = c.label;
                }}
                style={textInput}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" defaultChecked={c.default_value} onChange={(e) => onToggleCheckDefault(c.id, e.currentTarget.checked)} />
                default ON
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onMoveCheck(c.id, "up")} disabled={idx === 0} style={ghostBtn} title="Move up">↑</button>
                <button onClick={() => onMoveCheck(c.id, "down")} disabled={idx === checks.length - 1} style={ghostBtn} title="Move down">↓</button>
              </div>
              <button onClick={() => onDeleteCheck(c.id)} style={dangerBtn}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      {/* Text fields */}
      <section style={card}>
        <header style={head}><h3 style={{ margin: 0 }}>Text fields</h3><button onClick={onAddText} style={primaryBtn}>+ Add</button></header>
        {texts.length === 0 && <p style={{ color: "var(--muted)" }}>No text fields defined yet.</p>}
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {[...texts].sort((a,b) => a.sort_index - b.sort_index).map((t, idx) => (
            <li key={t.id} style={{ ...row, gridTemplateColumns: isSmall ? "1fr" : (row.gridTemplateColumns as string) }}>
              <input
                defaultValue={t.label}
                onBlur={(e) => {
                  const v = e.currentTarget.value.trim();
                  if (v && v !== t.label) onRenameText(t.id, v);
                  else e.currentTarget.value = t.label;
                }}
                style={textInput}
              />
              <input
                defaultValue={t.placeholder || ""}
                placeholder="placeholder"
                onBlur={(e) => {
                  const v = e.currentTarget.value;
                  if (v !== (t.placeholder || "")) onPlaceholderText(t.id, v);
                }}
                style={textInput}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onMoveText(t.id, "up")} disabled={idx === 0} style={ghostBtn} title="Move up">↑</button>
                <button onClick={() => onMoveText(t.id, "down")} disabled={idx === texts.length - 1} style={ghostBtn} title="Move down">↓</button>
              </div>
              <button onClick={() => onDeleteText(t.id)} style={dangerBtn}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 12 };
const head: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 };
const row: React.CSSProperties  = { display: "grid", gridTemplateColumns: "1fr 160px 90px 90px", gap: 8, alignItems: "center" };
const textInput: React.CSSProperties = { padding: 8, background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8 };
const primaryBtn: React.CSSProperties = { padding: "8px 12px", background: "var(--primary)", color: "#0c111b", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 };
const ghostBtn: React.CSSProperties   = { padding: "6px 10px", background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer" };
const dangerBtn: React.CSSProperties  = { padding: "6px 10px", background: "transparent", color: "var(--text)", border: "1px solid var(--danger)", borderRadius: 8, cursor: "pointer", fontWeight: 700 };
