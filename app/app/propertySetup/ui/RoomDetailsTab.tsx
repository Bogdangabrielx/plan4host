"use client";

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
  const [confirmDel, setConfirmDel] = useState<null | { kind: 'check'|'text'; id: string; label: string }>(null);
  const [showChecksInfo, setShowChecksInfo] = useState<boolean>(false);
  const [showNotesInfo, setShowNotesInfo] = useState<boolean>(false);
  return (
    <><div style={{ display: "grid", gap: 16 }}>
      {/* Checks */}
      <section className="sb-card" style={{ padding: 12 }}>
        <header style={head}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0 }}>Checklist Item</h3>
            <button
              type="button"
              aria-label="About checklist items"
              aria-expanded={showChecksInfo ? true : undefined}
              onClick={() => setShowChecksInfo(v => !v)}
              title="What are checklist items?"
              style={{
                width: 22,
                height: 22,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: '1px solid var(--text)',
                background: 'transparent',
                color: 'var(--text)',
                padding: 0,
                lineHeight: 1,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              i
            </button>
          </div>
          <button onClick={onAddCheck} className="sb-btn sb-btn--primary">+ Add</button>
        </header>
        {showChecksInfo && (
          <div id="checks-info" className="sb-card" style={infoBox}>
            <strong style={{ display: 'block', marginBottom: 6 }}>What are checklist items?</strong>
            <div style={{ color: 'var(--muted)' }}>
              Define yes/no preferences that staff can toggle per reservation. Examples: breakfast, daily towel change, extra bed.
              Set a default state here; the values can be adjusted later when managing each booking.
            </div>
          </div>
        )}
        {checks.length === 0 && <p style={{ color: "var(--muted)" }}>No checklist item defined yet.</p>}
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {[...checks].sort((a, b) => a.sort_index - b.sort_index).map((c, idx) => (
            <li key={c.id} style={rowBase} className="rd-row" data-kind="check">
              <input
                className="rd-name"
                defaultValue={c.label}
                onBlur={(e) => {
                  const v = e.currentTarget.value.trim();
                  if (v && v !== c.label) onRenameCheck(c.id, v);
                  else e.currentTarget.value = c.label;
                } }
                style={textInput} />

              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" defaultChecked={c.default_value} onChange={(e) => onToggleCheckDefault(c.id, e.currentTarget.checked)} />
                default ON
              </label>
              <div className="rd-actions" style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onMoveCheck(c.id, "up")} disabled={idx === 0} className="sb-btn" title="Move up">↑</button>
                <button onClick={() => onMoveCheck(c.id, "down")} disabled={idx === checks.length - 1} className="sb-btn" title="Move down">↓</button>
                <button onClick={() => setConfirmDel({ kind: 'check', id: c.id, label: c.label })} className="sb-btn">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Text fields */}
      <section className="sb-card" style={{ padding: 12 }}>
        <header style={head}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0 }}>Notes Tab</h3>
            <button
              type="button"
              aria-label="About notes tabs"
              aria-expanded={showNotesInfo ? true : undefined}
              onClick={() => setShowNotesInfo(v => !v)}
              title="What are notes tabs?"
              style={{
                width: 22,
                height: 22,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: '1px solid var(--text)',
                background: 'transparent',
                color: 'var(--text)',
                padding: 0,
                lineHeight: 1,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              i
            </button>
          </div>
          <button onClick={onAddText} className="sb-btn sb-btn--primary">+ Add</button>
        </header>
        {showNotesInfo && (
          <div id="notes-info" className="sb-card" style={infoBox}>
            <strong style={{ display: 'block', marginBottom: 6 }}>What are notes tabs?</strong>
            <div style={{ color: 'var(--muted)' }}>
              Private, staff‑only areas attached to each reservation. Use them to track internal instructions or comments (e.g., housekeeping notes, front desk reminders). Guests cannot see these notes.
            </div>
          </div>
        )}
        {texts.length === 0 && <p style={{ color: "var(--muted)" }}>No notes tab defined yet.</p>}
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {[...texts].sort((a, b) => a.sort_index - b.sort_index).map((t, idx) => (
            <li key={t.id} style={rowBase} className="rd-row" data-kind="text">
              <input
                defaultValue={t.label}
                onBlur={(e) => {
                  const v = e.currentTarget.value.trim();
                  if (v && v !== t.label) onRenameText(t.id, v);
                  else e.currentTarget.value = t.label;
                } }
                style={textInput} />
              <input
                defaultValue={t.placeholder || ""}
                placeholder="e.g. Front Desk Notes"
                onBlur={(e) => {
                  const v = e.currentTarget.value;
                  if (v !== (t.placeholder || "")) onPlaceholderText(t.id, v);
                } }
                style={textInput} />
              <div className="rd-actions" style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onMoveText(t.id, "up")} disabled={idx === 0} className="sb-btn" title="Move up">↑</button>
                <button onClick={() => onMoveText(t.id, "down")} disabled={idx === texts.length - 1} className="sb-btn" title="Move down">↓</button>
                <button onClick={() => setConfirmDel({ kind: 'text', id: t.id, label: t.label })} className="sb-btn">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {confirmDel && (
        <div role="dialog" aria-modal="true" onClick={() => setConfirmDel(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 120, display: 'grid', placeItems: 'center', padding: 12 }}>
          <div onClick={(e) => e.stopPropagation()} className="sb-card" style={{ width: 'min(520px,100%)', padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', color: 'var(--text)' }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <strong>Delete item</strong>
              <div style={{ color: 'var(--muted)' }}>
                Are you sure you want to delete “{confirmDel.label}”? This action is irreversible.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                <button className="sb-btn" onClick={() => setConfirmDel(null)}>Close</button>
                <button
                  className="sb-btn sb-btn--primary"
                  onClick={() => {
                    const item = confirmDel; setConfirmDel(null);
                    if (item.kind === 'check') onDeleteCheck(item.id); else onDeleteText(item.id);
                  } }
                  style={{ background: 'var(--danger)', color: '#fff', border: '1px solid var(--danger)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div><style jsx>{`
      /* Desktop grids: align columns per kind */
      @media (min-width: 721px) {
        .rd-row[data-kind="check"] { grid-template-columns: 1fr auto auto; align-items: center; }
        .rd-row[data-kind="text"]  { grid-template-columns: 1fr 1fr auto; align-items: center; }
      }
      /* Mobile: for checks, keep toggle + actions on one row */
      @media (max-width: 720px) {
        /* default: one column */
        .rd-row { grid-template-columns: 1fr; }
        /* checks: name spans full width; below it, toggle and actions share the row */
        .rd-row[data-kind="check"] {
          grid-template-columns: 1fr auto;
          grid-template-areas:
            "name name"
            "toggle actions";
          align-items: center;
        }
        .rd-row[data-kind="check"] > .rd-name { grid-area: name; }
        .rd-row[data-kind="check"] > label { grid-area: toggle; }
        .rd-row[data-kind="check"] > .rd-actions { grid-area: actions; }
        .rd-actions { display: flex; gap: 8px; justify-content: flex-end; }
      }
    `}</style></>
  );
}

// card replaced by sb-card
import { useState } from 'react';
const head: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 };
const rowBase: React.CSSProperties  = {
  background: "var(--panel)",
  display: "grid",
  gap: 8,
  alignItems: "center",
  borderRadius: 10,
  padding: 10,
};
const textInput: React.CSSProperties = { padding: 8, background: "var(--field)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: 'inherit' };
// buttons now use sb-btn classes
const infoBox: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--panel)",
  color: "var(--text)",
  borderRadius: 10,
  padding: 10,
  marginBottom: 8,
};
