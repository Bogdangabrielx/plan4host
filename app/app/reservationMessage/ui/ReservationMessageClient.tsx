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
  const [propertyId, setPropertyId] = usePersistentProperty(properties);
  const [tpl, setTpl] = useState<TemplateState>(EMPTY);
  // Simplified editor state
  const [titleText, setTitleText] = useState<string>("");
  const [bodyText, setBodyText] = useState<string>("");
  const [focusedInput, setFocusedInput] = useState<null | "title" | "body">(null);
  const [saving, setSaving] = useState<"Idle"|"Saving…"|"Synced"|"Error">("Idle");
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
      const base = parsed || EMPTY;
      setTpl(base);
      // derive simple editor fields from blocks
      const { title, body } = deriveFromBlocks(base.blocks);
      setTitleText(title);
      setBodyText(body);
    } catch {
      setTpl(EMPTY);
      setTitleText("");
      setBodyText("");
    }
    // also try to load from server (overrides LS if available)
    (async () => {
      try {
        const res = await fetch(`/api/reservation-message/template?property=${encodeURIComponent(propertyId)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const j = await res.json();
        const t = j?.template;
        if (!t) return;
        const blocks: Block[] = (t.blocks as any[]).map((b) => ({ id: uid(), type: b.type, text: b.text ?? '' }));
        const fields: ManualField[] = (t.fields as any[]).map((f) => ({ key: f.key, label: f.label, required: !!f.required, multiline: !!f.multiline, placeholder: f.placeholder || '' }));
        const next: TemplateState = { status: (t.status || 'draft') as any, blocks, fields };
        setTpl(next);
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
        const { title, body } = deriveFromBlocks(blocks);
        setTitleText(title);
        setBodyText(body);
      } catch {}
    })();
  }, [storageKey, propertyId]);

  function saveDraft() {
    if (!propertyId) return;
    const blocks = composeBlocks();
    const next = { ...tpl, status: "draft" as const, blocks };
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
    setTpl(next);
    syncToServer("draft", blocks);
  }
  function publish() {
    if (!propertyId) return;
    const blocks = composeBlocks();
    const next = { ...tpl, status: "published" as const, blocks };
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
    setTpl(next);
    syncToServer("published", blocks);
  }
  function resetAll() {
    if (!propertyId) return;
    const seeded: TemplateState = {
      status: "draft",
      fields: [
        { key: "wifi_name", label: "Wi‑Fi name", required: false, multiline: false },
        { key: "wifi_password", label: "Wi‑Fi password", required: false, multiline: false },
        { key: "door_code", label: "Door code", required: false, multiline: false },
      ],
      blocks: [
        { id: uid(), type: "heading", text: "Reservation details" },
        { id: uid(), type: "paragraph", text: "Hello {{guest_first_name}},\nCheck‑in {{check_in_date}} {{check_in_time}}.\nCheck‑out {{check_out_date}} {{check_out_time}}.\nRoom: {{room_name}}.\nWi‑Fi: {{wifi_name}} / {{wifi_password}}.\nDoor code: {{door_code}}." },
      ],
    };
    try { localStorage.setItem(storageKey, JSON.stringify(seeded)); } catch {}
    setTpl(seeded);
    setTitleText("Reservation details");
    setBodyText("Hello {{guest_first_name}},\nCheck‑in {{check_in_date}} {{check_in_time}}.\nCheck‑out {{check_out_date}} {{check_out_time}}.\nRoom: {{room_name}}.\nWi‑Fi: {{wifi_name}} / {{wifi_password}}.\nDoor code: {{door_code}}.");
  }

  async function syncToServer(status: "draft"|"published", blocks?: Block[]) {
    try {
      setSaving("Saving…");
      const blk = blocks ?? composeBlocks();
      const payload = {
        property_id: propertyId,
        status,
        blocks: blk.map((b) => ({ type: b.type, text: (b as any).text || null })),
        fields: tpl.fields.map((f) => ({ key: f.key, label: f.label, required: !!f.required, multiline: !!f.multiline, placeholder: f.placeholder || null })),
      };
      const res = await fetch('/api/reservation-message/template', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      // ignore errors silently in UI; RLS/server will enforce perms
      if (!res.ok) setSaving("Error"); else { setSaving("Synced"); setTimeout(()=>setSaving("Idle"), 800); }
    } catch { setSaving("Error"); }
  }

  // Insert variable into the focused input
  function insertVarIntoFocused(token: string) {
    if (focusedInput === "title") setTitleText((t) => (t || "") + token);
    else if (focusedInput === "body") setBodyText((t) => (t || "") + token);
  }

  // Convert simple editor state to blocks
  function composeBlocks(): Block[] {
    const blocks: Block[] = [];
    const t = titleText.trim();
    const b = bodyText.trim();
    if (t) blocks.push({ id: uid(), type: "heading", text: t });
    if (b) blocks.push({ id: uid(), type: "paragraph", text: b });
    return blocks;
  }

  function deriveFromBlocks(blocks: Block[]): { title: string; body: string } {
    let title = "";
    const paras: string[] = [];
    for (const bl of blocks || []) {
      if (bl.type === "heading" && !title) title = (bl as any).text || "";
      if (bl.type === "paragraph") paras.push(((bl as any).text || ""));
    }
    return { title, body: paras.join("\n") };
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

  // (old block-based insert removed; using insertVarIntoFocused instead)

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
      {/* Property selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Property</label>
        <select className="sb-select" value={propertyId} onChange={(e)=>setPropertyId((e.target as HTMLSelectElement).value)} style={{ minWidth: 220 }}>
          {properties.map((p)=> (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
        <div style={{ flex: 1 }} />
        <small style={{ color: saving === 'Error' ? 'var(--danger)' : 'var(--muted)' }}>{saving}</small>
      </div>

      <div className="config-grid" style={{ alignItems: "start" }}>
        {/* Left: Simple editor */}
        <section style={card}>
          <h2 style={{ marginTop: 0 }}>Message</h2>
          {/* Variable chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <small style={{ color: 'var(--muted)' }}>Insert variable:</small>
            {BUILTIN_VARS.map((v)=>(
              <button key={v.key} style={btn} onClick={()=>insertVarIntoFocused(`{{${v.key}}}`)} title={v.label}>{v.key}</button>
            ))}
            {(tpl.fields||[]).map((f)=>(
              <button key={f.key} style={btn} onClick={()=>insertVarIntoFocused(`{{${f.key}}}`)} title={f.label}>{f.key}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Title</label>
              <input value={titleText} onChange={(e)=>setTitleText(e.currentTarget.value)} onFocus={()=>setFocusedInput('title')} style={input} placeholder="Reservation details" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Message</label>
              <textarea value={bodyText} onChange={(e)=>setBodyText(e.currentTarget.value)} onFocus={()=>setFocusedInput('body')} rows={8} style={{ ...input, resize: 'vertical' }} placeholder="Your message... You can use variables like {{guest_first_name}}." />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button style={btn} onClick={saveDraft} disabled={!isAdmin}>Save</button>
            <button style={btnPri} onClick={publish} disabled={!isAdmin}>Publish</button>
            <button style={{ ...btn, border: "1px dashed var(--border)" }} onClick={resetAll} disabled={!isAdmin}>Reset to minimal</button>
          </div>
        </section>

        {/* Right: Fields + Preview */}
        <section style={{ display: "grid", gap: 12 }}>
          <div style={card}>
            <h2 style={{ marginTop: 0 }}>Fields you will fill when generating the link</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <button style={btn} onClick={addField} disabled={!isAdmin}>+ Add field</button>
            </div>

            {(tpl.fields.length === 0) ? (
              <p style={{ color: "var(--muted)" }}>No manual fields.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                {tpl.fields.map((f, i) => (
                  <li key={f.key} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: "var(--card)" }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 160px" }}>
                        <input value={f.label} onChange={(e)=>updateField(i,{ label: e.currentTarget.value })} style={input} placeholder="Label (e.g. Wi‑Fi password)" disabled={!isAdmin} />
                        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input type="checkbox" checked={f.required} onChange={(e)=>updateField(i,{ required: e.currentTarget.checked })} disabled={!isAdmin} /> required
                        </label>
                      </div>
                      <div style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr" }}>
                        <input value={f.key} onChange={(e)=>updateField(i,{ key: slugify(e.currentTarget.value) })} style={input} placeholder="Key (e.g. wifi_password)" disabled={!isAdmin} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button style={{ ...btn, border: "1px solid var(--danger)" }} onClick={()=>removeField(i)} disabled={!isAdmin}>Remove</button>
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
              dangerouslySetInnerHTML={{ __html: renderTemplateToHtml({ ...tpl, blocks: composeBlocks() }, mergedVars) }}
            />
            <small style={{ color: "var(--muted)" }}>Note: built-in variables are shown with sample values here. The final content binds to real booking data when generating the link.</small>
          </div>
        </section>
      </div>
    </div>
  );
}
