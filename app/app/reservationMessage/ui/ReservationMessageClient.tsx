"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePersistentProperty } from "@/app/app/_components/PropertySelection";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import { useHeader } from "@/app/app/_components/HeaderContext";

type Property = { id: string; name: string };

type Block =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "divider" };

type ManualField = {
  uid: string; // UI-only stable key
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
  const [bodyHtml, setBodyHtml] = useState<string>("");
  const [focusedInput, setFocusedInput] = useState<null | "title" | "body">(null);
  const [saving, setSaving] = useState<"Idle"|"Saving…"|"Synced"|"Error">("Idle");
  const { setPill } = useHeader();
  const titleRef = useRef<HTMLDivElement|null>(null);
  const bodyRef = useRef<HTMLDivElement|null>(null);
  const [previewFontPx, setPreviewFontPx] = useState<number>(16);
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
      setBodyHtml(markdownToHtmlInline(body));
    } catch {
      setTpl(EMPTY);
      setTitleText("");
      setBodyHtml("");
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
        const fields: ManualField[] = (t.fields as any[]).map((f) => ({ uid: uid(), key: f.key, label: f.label, required: !!f.required, multiline: !!f.multiline, placeholder: f.placeholder || '' }));
        const next: TemplateState = { status: (t.status || 'draft') as any, blocks, fields };
        setTpl(next);
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
        const { title, body } = deriveFromBlocks(blocks);
        setTitleText(title);
        setBodyHtml(markdownToHtmlInline(body));
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
        { uid: uid(), key: "wifi_name", label: "Wi‑Fi name", required: false, multiline: false },
        { uid: uid(), key: "wifi_password", label: "Wi‑Fi password", required: false, multiline: false },
        { uid: uid(), key: "door_code", label: "Door code", required: false, multiline: false },
      ],
      blocks: [
        { id: uid(), type: "heading", text: "Reservation details" },
        { id: uid(), type: "paragraph", text: "Hello {{guest_first_name}},\nCheck‑in {{check_in_date}} {{check_in_time}}.\nCheck‑out {{check_out_date}} {{check_out_time}}.\nRoom: {{room_name}}.\nWi‑Fi: {{wifi_name}} / {{wifi_password}}.\nDoor code: {{door_code}}." },
      ],
    };
    try { localStorage.setItem(storageKey, JSON.stringify(seeded)); } catch {}
    setTpl(seeded);
    setTitleText("Reservation details");
    setBodyHtml(markdownToHtmlInline("Hello {{guest_first_name}},\nCheck‑in {{check_in_date}} {{check_in_time}}.\nCheck‑out {{check_out_date}} {{check_out_time}}.\nRoom: {{room_name}}.\nWi‑Fi: {{wifi_name}} / {{wifi_password}}.\nDoor code: {{door_code}}."));
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
    if (focusedInput === "title" && titleRef.current) {
      // Insert plain text token into title (chips optional later)
      const t = (titleRef.current.textContent || "") + token;
      titleRef.current.textContent = t;
      setTitleText(t);
    } else if (focusedInput === "body" && bodyRef.current) {
      insertTokenChip(bodyRef.current, token.replace(/[{}]/g, ""));
      setBodyHtml(bodyRef.current.innerHTML);
    }
  }

  function focusBody() { if (bodyRef.current) { try { bodyRef.current.focus(); } catch {} } }
  function applyBold() { if (focusedInput==='body') { focusBody(); document.execCommand('bold'); setBodyHtml(bodyRef.current?.innerHTML || ''); } }
  function applyItalic() { if (focusedInput==='body') { focusBody(); document.execCommand('italic'); setBodyHtml(bodyRef.current?.innerHTML || ''); } }
  function applyUnderline() { if (focusedInput==='body') { focusBody(); document.execCommand('underline'); setBodyHtml(bodyRef.current?.innerHTML || ''); } }
  function applyLink() { if (focusedInput==='body') { const url = prompt('Link URL (https://...)'); if (!url) return; focusBody(); document.execCommand('createLink', false, url); setBodyHtml(bodyRef.current?.innerHTML || ''); } }

  // Convert simple editor state to blocks
  function composeBlocks(): Block[] {
    const blocks: Block[] = [];
    const t = titleText.trim();
    const b = htmlToMarkdownWithTokens(bodyRef.current?.innerHTML || bodyHtml).trim();
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
      fields: [...prev.fields, { uid: uid(), key: `field_${prev.fields.length + 1}`, label: "New field", required: false, multiline: false }],
    }));
  }
  function updateField(i: number, patch: Partial<ManualField>) {
    setTpl((prev) => ({
      ...prev,
      fields: prev.fields.map((f, idx) => {
        if (idx !== i) return f;
        const next = { ...f, ...patch } as ManualField;
        if (patch.key !== undefined) next.key = slugify(patch.key as string);
        return next;
      }),
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

  // Reflect saving state in AppHeader pill
  useEffect(() => {
    setPill(saving);
  }, [saving, setPill]);

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
              <button key={f.uid} style={btn} onClick={()=>insertVarIntoFocused(`{{${f.key}}}`)} title={f.label}>{f.key}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Title</label>
              <div
                ref={titleRef}
                contentEditable
                suppressContentEditableWarning
                onFocus={()=>setFocusedInput('title')}
                onInput={(e)=>setTitleText((e.currentTarget as HTMLDivElement).innerText)}
                style={{ ...input, minHeight: 38 }}
                data-placeholder="Reservation details"
              >{titleText}</div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Message</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                <small style={{ color: 'var(--muted)' }}>Formatting:</small>
                <button style={btn} onMouseDown={(e)=>e.preventDefault()} onClick={(e)=>{e.preventDefault(); applyBold();}} disabled={!isAdmin}><strong>B</strong></button>
                <button style={btn} onMouseDown={(e)=>e.preventDefault()} onClick={(e)=>{e.preventDefault(); applyItalic();}} disabled={!isAdmin}><span style={{ fontStyle: 'italic' }}>I</span></button>
                <button style={btn} onMouseDown={(e)=>e.preventDefault()} onClick={(e)=>{e.preventDefault(); applyUnderline();}} disabled={!isAdmin}><span style={{ textDecoration: 'underline' }}>U</span></button>
                <button style={btn} onMouseDown={(e)=>e.preventDefault()} onClick={(e)=>{e.preventDefault(); applyLink();}} disabled={!isAdmin}>Link</button>
              </div>
              <div
                ref={bodyRef}
                contentEditable
                suppressContentEditableWarning
                onFocus={()=>setFocusedInput('body')}
                onInput={(e)=>setBodyHtml((e.currentTarget as HTMLDivElement).innerHTML)}
                style={{ ...input, minHeight: 160, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}
                data-placeholder="Your message..."
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
              <style dangerouslySetInnerHTML={{ __html: `
                [data-placeholder]:empty:before{ content: attr(data-placeholder); color: var(--muted); }
                .rm-token{ display:inline-block; padding: 2px 6px; border:1px solid var(--border); background: var(--panel); color: var(--text); border-radius: 8px; font-weight: 800; font-size: 12px; margin: 0 2px; }
              `}}/>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button style={btn} onClick={saveDraft} disabled={!isAdmin}>Save</button>
            <button style={btnPri} onClick={publish} disabled={!isAdmin}>Publish</button>
            <button style={{ ...btn, border: "1px dashed var(--border)" }} onClick={resetAll} disabled={!isAdmin}>Reset to minimal</button>
          </div>
        </section>

        {/* Right: Fields */}
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
                  <li key={f.uid} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: "var(--card)" }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 160px" }}>
                        <input value={f.label} onChange={(e)=>updateField(i,{ label: e.currentTarget.value })} style={input} placeholder="Label (e.g. Wi‑Fi password)" disabled={!isAdmin} />
                        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input type="checkbox" checked={f.required} onChange={(e)=>updateField(i,{ required: e.currentTarget.checked })} disabled={!isAdmin} /> required
                        </label>
                      </div>
                      <div style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr" }}>
                        <input value={f.key} onChange={(e)=>updateField(i,{ key: e.currentTarget.value })} style={input} placeholder="Key (e.g. wifi_password)" disabled={!isAdmin} />
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

          {/* Preview removed per request (WYSIWYG composing) */}
        </section>
      </div>
    </div>
  );
}

// Insert a token chip at caret inside a contentEditable container
function insertTokenChip(container: HTMLDivElement, key: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) { container.focus(); return; }
  const range = sel.getRangeAt(0);
  // Ensure selection is inside container
  let node: Node|null = range.commonAncestorContainer;
  let inside = false;
  while (node) { if (node === container) { inside = true; break; } node = node.parentNode; }
  if (!inside) { container.focus(); return; }
  const chip = document.createElement('span');
  chip.className = 'rm-token';
  chip.setAttribute('data-token', key);
  chip.contentEditable = 'false';
  chip.textContent = key;
  range.deleteContents();
  range.insertNode(chip);
  // place caret after chip
  const space = document.createTextNode(' ');
  chip.after(space);
  sel.collapse(space, 1);
}

// Convert HTML (with strong/em/u/a/br and rm-token spans) to markdown + tokens {{ }}
function htmlToMarkdownWithTokens(html: string): string {
  // Replace token spans with placeholders
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  tmp.querySelectorAll('span.rm-token[data-token]').forEach((el) => {
    const k = el.getAttribute('data-token') || '';
    el.replaceWith(document.createTextNode(`{{${k}}}`));
  });
  // Replace <br> with \n
  const walker = (node: Node): string => {
    if (node.nodeType === 3) return (node.nodeValue || '');
    if (!(node instanceof HTMLElement)) return '';
    const tag = node.tagName.toLowerCase();
    const content = Array.from(node.childNodes).map(walker).join('');
    if (tag === 'br') return '\n';
    if (tag === 'strong' || tag === 'b') return `**${content}**`;
    if (tag === 'em' || tag === 'i') return `*${content}*`;
    if (tag === 'u') return `__${content}__`;
    if (tag === 'a') {
      const href = node.getAttribute('href') || '';
      return href ? `[${content}](${href})` : content;
    }
    if (tag === 'p' || tag === 'div') return content + '\n';
    return content;
  };
  let out = Array.from(tmp.childNodes).map(walker).join('');
  // normalize multiple newlines
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

// Basic markdown-to-HTML inline (supports tokens shown as text; builder-only)
function markdownToHtmlInline(src: string): string {
  let s = escapeHtml(src || '');
  s = s.replace(/\[(.+?)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+?)__/g, '<u>$1</u>');
  s = s.replace(/(^|\s)\*(.+?)\*(?=\s|$)/g, '$1<em>$2</em>');
  s = s.replace(/\n/g, '<br/>');
  return s;
}
