"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePersistentProperty } from "@/app/app/_components/PropertySelection";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";

type Property = { id: string; name: string };

type Block =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "divider" };

type ManualField = {
  key: string;
  label: string;
  required: boolean;
  multiline: boolean;
  placeholder?: string;
};

type TemplateState = {
  blocks: Block[];
  fields: ManualField[];
  status: "draft" | "published";
};

const BUILTIN_VARS: Array<{ key: string; label: string }> = [
  { key: "guest_first_name", label: "Guest first name" },
  { key: "guest_last_name", label: "Guest last name" },
  { key: "check_in_date", label: "Check-in date (YYYY-MM-DD)" },
  { key: "check_in_time", label: "Check-in time (HH:MM)" },
  { key: "check_out_date", label: "Check-out date (YYYY-MM-DD)" },
  { key: "check_out_time", label: "Check-out time (HH:MM)" },
  { key: "room_name", label: "Room name" },
  { key: "property_name", label: "Property name" },
];

const EMPTY: TemplateState = { blocks: [], fields: [], status: "draft" };

function lsKey(pid: string) { return `p4h:rm:template:${pid}`; }

function uid() { return Math.random().toString(36).slice(2, 10); }

function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function escapeHtml(s: string) {
  return (s || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] as string));
}

// Minimal Markdown (bold/italic/links) → HTML; headings separate as dedicated block
function mdToHtml(src: string) {
  let s = escapeHtml(src);
  // links [text](url)
  s = s.replace(/\[(.+?)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  // bold **text**
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // italic *text*
  s = s.replace(/(^|\s)\*(.+?)\*(?=\s|$)/g, '$1<em>$2</em>');
  // line breaks
  s = s.replace(/\n/g, "<br/>");
  return s;
}

function renderTemplateToHtml(t: TemplateState, vars: Record<string, string>) {
  const out: string[] = [];
  for (const b of t.blocks) {
    if (b.type === "divider") {
      out.push('<hr style="border:1px solid var(--border); opacity:.6;"/>');
    } else if (b.type === "heading") {
      const txt = replaceVars(b.text, vars);
      out.push(`<h3 style="margin:8px 0 6px;">${escapeHtml(txt)}</h3>`);
    } else if (b.type === "paragraph") {
      const txt = replaceVars(b.text, vars);
      out.push(`<p style="margin:6px 0; line-height:1.5;">${mdToHtml(txt)}</p>`);
    }
  }
  return out.join("\n");
}

function replaceVars(s: string, vars: Record<string, string>) {
  if (!s) return "";
  return s.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => (vars?.[k] ?? `{{${k}}}`));
}

export default function ReservationMessageClient({ initialProperties, isAdmin }: { initialProperties: Property[]; isAdmin: boolean }) {
  const [properties] = useState<Property[]>(initialProperties);
  const [propertyId] = usePersistentProperty(properties);
  const [tpl, setTpl] = useState<TemplateState>(EMPTY);
  const [focusedBlock, setFocusedBlock] = useState<string | null>(null);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({
    guest_first_name: "Alex",
    guest_last_name: "Popescu",
    check_in_date: "2025-01-02",
    check_in_time: "14:00",
    check_out_date: "2025-01-05",
    check_out_time: "11:00",
    room_name: "Room 101",
    property_name: properties.find(p=>p.id===propertyId)?.name || "Your Property",
  });

  const storageKey = propertyId ? lsKey(propertyId) : "";

  // Load from LS on property change
  useEffect(() => {
    if (!propertyId) return;
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed: TemplateState | null = raw ? JSON.parse(raw) : null;
      setTpl(parsed || EMPTY);
    } catch {
      setTpl(EMPTY);
    }
  }, [storageKey, propertyId]);

  function saveDraft() {
    if (!propertyId) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ ...tpl, status: "draft" })); } catch {}
    setTpl(prev => ({ ...prev, status: "draft" }));
  }
  function publish() {
    if (!propertyId) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ ...tpl, status: "published" })); } catch {}
    setTpl(prev => ({ ...prev, status: "published" }));
  }
  function resetAll() {
    if (!propertyId) return;
    const seeded: TemplateState = {
      status: "draft",
      fields: [
        { key: "door_code", label: "Door access code", required: false, multiline: false, placeholder: "e.g. 1234" },
        { key: "wifi_name", label: "Wi-Fi name", required: false, multiline: false },
        { key: "wifi_password", label: "Wi-Fi password", required: false, multiline: false },
      ],
      blocks: [
        { id: uid(), type: "heading", text: "Reservation Details" },
        { id: uid(), type: "paragraph", text: "Hello {{guest_first_name}},\nWe are happy to welcome you to {{property_name}}." },
        { id: uid(), type: "paragraph", text: "Check-in: **{{check_in_date}}** at {{check_in_time}}\nCheck-out: **{{check_out_date}}** at {{check_out_time}}\nRoom: {{room_name}}" },
        { id: uid(), type: "divider" },
        { id: uid(), type: "paragraph", text: "Wi‑Fi: **{{wifi_name}}** — Password: **{{wifi_password}}**" },
        { id: uid(), type: "paragraph", text: "Door code: **{{door_code}}**" },
      ],
    };
    try { localStorage.setItem(storageKey, JSON.stringify(seeded)); } catch {}
    setTpl(seeded);
  }

  function addBlock(kind: Block["type"]) {
    const base: Block = kind === "divider"
      ? { id: uid(), type: "divider" }
      : { id: uid(), type: kind as any, text: "" };
    setTpl((prev) => ({ ...prev, blocks: [...prev.blocks, base] }));
  }
  function updateBlock(id: string, text: string) {
    setTpl((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? ({ ...(b as any), text } as Block) : b)),
    }));
  }
  function removeBlock(id: string) {
    setTpl((prev) => ({ ...prev, blocks: prev.blocks.filter((b) => b.id !== id) }));
  }
  function moveBlock(id: string, dir: "up" | "down") {
    setTpl((prev) => {
      const idx = prev.blocks.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= prev.blocks.length) return prev;
      const list = prev.blocks.slice();
      const a = list[idx];
      list[idx] = list[swap];
      list[swap] = a;
      return { ...prev, blocks: list };
    });
  }

  function addField() {
    setTpl((prev) => ({
      ...prev,
      fields: [...prev.fields, { key: `field_${prev.fields.length + 1}`, label: "New field", required: false, multiline: false }],
    }));
  }
  function updateField(i: number, patch: Partial<ManualField>) {
    setTpl((prev) => ({
      ...prev,
      fields: prev.fields.map((f, idx) => (idx === i ? { ...f, ...patch, key: patch.label ? slugify(patch.label) : f.key } : f)),
    }));
  }
  function removeField(i: number) {
    setTpl((prev) => ({ ...prev, fields: prev.fields.filter((_, idx) => idx !== i) }));
  }

  function insertVar(token: string) {
    if (!focusedBlock) return;
    setTpl((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.id !== focusedBlock) return b;
        if (b.type === "divider") return b;
        const cur = (b as any).text as string;
        return { ...(b as any), text: (cur || "") + token } as Block;
      }),
    }));
  }

  const mergedVars = useMemo(() => ({
    ...previewVars,
    ...(tpl.fields || []).reduce((acc, f) => { acc[f.key] = acc[f.key] ?? ""; return acc; }, {} as Record<string,string>),
  }), [previewVars, tpl.fields]);

  // Styles
  const card: React.CSSProperties = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 };
  const input: React.CSSProperties = { padding: 10, background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, width: "100%", boxSizing: "border-box", fontFamily: 'inherit' };
  const btn: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontWeight: 800, cursor: "pointer" };
  const btnPri: React.CSSProperties = { ...btn, background: "var(--primary)", color: "#0c111b", border: "1px solid var(--border)" };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <PlanHeaderBadge title="Reservation Message" slot="header-right" />
      {!isAdmin && (
        <div style={card}>
          <p style={{ margin: 0, color: "var(--muted)" }}>Only admins can configure the Reservation Message template.</p>
        </div>
      )}

      <div className="config-grid" style={{ alignItems: "start" }}>
        {/* Left: Blocks */}
        <section style={card}>
          <h2 style={{ marginTop: 0 }}>Blocks</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={btn} onClick={() => addBlock("heading")}>+ Heading</button>
            <button style={btn} onClick={() => addBlock("paragraph")}>+ Paragraph (Markdown)</button>
            <button style={btn} onClick={() => addBlock("divider")}>+ Divider</button>
          </div>

          {tpl.blocks.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No blocks yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {tpl.blocks.map((b, i) => (
                <li key={b.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: "var(--card)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <strong>{b.type === "heading" ? "Heading" : b.type === "paragraph" ? "Paragraph" : "Divider"}</strong>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={btn} onClick={() => moveBlock(b.id, "up")}>↑</button>
                      <button style={btn} onClick={() => moveBlock(b.id, "down")}>↓</button>
                      <button style={{ ...btn, border: "1px solid var(--danger)" }} onClick={() => removeBlock(b.id)}>Delete</button>
                    </div>
                  </div>
                  {b.type !== "divider" && (
                    <>
                      <textarea
                        value={(b as any).text}
                        onChange={(e) => updateBlock(b.id, e.currentTarget.value)}
                        onFocus={() => setFocusedBlock(b.id)}
                        rows={b.type === "heading" ? 1 : 4}
                        style={{ ...input, resize: "vertical" }}
                        placeholder={b.type === "heading" ? "Heading text" : "Markdown paragraph. You can use **bold**, *italic*, [link](https://example.com). Use {{variable}} to insert fields."}
                      />
                      <details style={{ marginTop: 6 }}>
                        <summary style={{ cursor: "pointer", color: "var(--muted)" }}>Preview</summary>
                        <div
                          style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8, marginTop: 6, background: "var(--panel)" }}
                          dangerouslySetInnerHTML={{ __html: renderTemplateToHtml({ ...tpl, blocks: [b] }, mergedVars) }}
                        />
                      </details>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button style={btn} onClick={saveDraft}>Save draft</button>
            <button style={btnPri} onClick={publish}>Publish</button>
            <button style={{ ...btn, border: "1px dashed var(--border)" }} onClick={resetAll}>Reset to example</button>
          </div>
        </section>

        {/* Right: Fields + Preview */}
        <section style={{ display: "grid", gap: 12 }}>
          <div style={card}>
            <h2 style={{ marginTop: 0 }}>Manual fields</h2>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              Define the extra fields you will fill in when generating a message (e.g., Wi‑Fi password). Use Insert
              variable to place {"{{"}key{"}"} into your text.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <button style={btn} onClick={addField}>+ Add field</button>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <small style={{ color: "var(--muted)" }}>Insert variable into focused block:</small>
                {(tpl.fields || []).map((f) => (
                  <button key={f.key} style={btn} onClick={() => insertVar(`{{${f.key}}}`)} title={`Insert {{${f.key}}}`}>{f.key}</button>
                ))}
                {BUILTIN_VARS.map((v) => (
                  <button key={v.key} style={btn} onClick={() => insertVar(`{{${v.key}}}`)} title={v.label}>{v.key}</button>
                ))}
              </div>
            </div>

            {(tpl.fields.length === 0) ? (
              <p style={{ color: "var(--muted)" }}>No manual fields.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                {tpl.fields.map((f, i) => (
                  <li key={f.key} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: "var(--card)" }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 120px 120px" }}>
                        <input value={f.label} onChange={(e)=>updateField(i,{ label: e.currentTarget.value })} style={input} placeholder="Label (e.g. Wi‑Fi password)" />
                        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input type="checkbox" checked={f.required} onChange={(e)=>updateField(i,{ required: e.currentTarget.checked })} /> required
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input type="checkbox" checked={f.multiline} onChange={(e)=>updateField(i,{ multiline: e.currentTarget.checked })} /> multiline
                        </label>
                      </div>
                      <div style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 1fr" }}>
                        <input value={f.key} onChange={(e)=>updateField(i,{ key: slugify(e.currentTarget.value) })} style={input} placeholder="Key (e.g. wifi_password)" />
                        <input value={f.placeholder || ""} onChange={(e)=>updateField(i,{ placeholder: e.currentTarget.value })} style={input} placeholder="Placeholder (optional)" />
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button style={{ ...btn, border: "1px solid var(--danger)" }} onClick={()=>removeField(i)}>Remove</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={card}>
            <h2 style={{ marginTop: 0 }}>Live preview</h2>
            {/* Preview inputs for manual fields */}
            {tpl.fields.length > 0 && (
              <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
                {tpl.fields.map((f) => (
                  <div key={f.key} style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>{f.label} {f.required ? "*" : ""}</label>
                    {f.multiline ? (
                      <textarea
                        value={mergedVars[f.key] || ""}
                        onChange={(e)=>setPreviewVars((prev)=>({ ...prev, [f.key]: e.currentTarget.value }))}
                        rows={3}
                        style={{ ...input, resize: "vertical" }}
                        placeholder={f.placeholder || ""}
                      />
                    ) : (
                      <input
                        value={mergedVars[f.key] || ""}
                        onChange={(e)=>setPreviewVars((prev)=>({ ...prev, [f.key]: e.currentTarget.value }))}
                        style={input}
                        placeholder={f.placeholder || ""}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            <div
              style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 10, background: "var(--card)" }}
              dangerouslySetInnerHTML={{ __html: renderTemplateToHtml(tpl, mergedVars) }}
            />
            <small style={{ color: "var(--muted)" }}>Note: built-in variables are shown with sample values here. The final content binds to real booking data when generating the link.</small>
          </div>
        </section>
      </div>
    </div>
  );
}
