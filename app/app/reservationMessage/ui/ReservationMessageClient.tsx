"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePersistentProperty } from "@/app/app/_components/PropertySelection";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import { useHeader } from "@/app/app/_components/HeaderContext";

/* ... restul tipurilor tale rămân neschimbate ... */
type Property = { id: string; name: string };

type Block =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "divider" };

type ManualField = {
  uid: string; // UI-only stable key
  key: string;
  label: string;
  defaultValue?: string | null;
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
function slugify(s: string) { return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
function escapeHtml(s: string) { return (s || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] as string)); }
function mdToHtml(src: string) { let s = escapeHtml(src); s = s.replace(/\[(.+?)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>'); s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); s = s.replace(/(^|\s)\*(.+?)\*(?=\s|$)/g, '$1<em>$2</em>'); s = s.replace(/\n/g, "<br/>"); return s; }
function replaceVars(s: string, vars: Record<string, string>) { if (!s) return ""; return s.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => (vars?.[k] ?? `{{${k}}}`)); }
function renderTemplateToHtml(t: TemplateState, vars: Record<string, string>) { const out: string[] = []; for (const b of t.blocks) { if (b.type === "divider") out.push('<hr style="border:1px solid var(--border); opacity:.6;"/>'); else if (b.type === "heading") out.push(`<h3 style="margin:8px 0 6px;">${escapeHtml(replaceVars(b.text, vars))}</h3>`); else if (b.type === "paragraph") out.push(`<p style="margin:6px 0; line-height:1.5;">${mdToHtml(replaceVars(b.text, vars))}</p>`); } return out.join("\n"); }

export default function ReservationMessageClient({ initialProperties, isAdmin }: { initialProperties: Property[]; isAdmin: boolean }) {
  const [properties] = useState<Property[]>(initialProperties);
  const [propertyId, setPropertyId] = usePersistentProperty(properties);
  const [tpl, setTpl] = useState<TemplateState>(EMPTY);
  const [templates, setTemplates] = useState<Array<{ id:string; title:string; status:'draft'|'published'; updated_at:string }>>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [titleText, setTitleText] = useState<string>("");
  const [focusedInput, setFocusedInput] = useState<null | "title" | "body">(null);
  const [saving, setSaving] = useState<"Idle"|"Saving…"|"Synced"|"Error">("Idle");
  const { setPill } = useHeader();
  const titleRef = useRef<HTMLDivElement|null>(null);
  const bodyRef = useRef<HTMLDivElement|null>(null);
  const sb = useMemo(() => createClient(), []);
  const [hasRoomTypes, setHasRoomTypes] = useState(false);

  // === ROOM VARS: state pentru panel ===
  const [roomVarsOpen, setRoomVarsOpen] = useState(false);

  const storageKey = propertyId ? (activeId ? `p4h:rm:template:${activeId}` : lsKey(propertyId)) : "";

  /* --- restul efectelor tale: load templates, LS, etc. (nemonodificate) --- */
  useEffect(() => {
    let alive = true;
    if (!propertyId) { setTemplates([]); setActiveId(null); return; }
    (async () => {
      try {
        setLoadingList(true);
        const res = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(propertyId)}`, { cache: 'no-store' });
        const j = await res.json().catch(()=>({}));
        if (!alive) return;
        const items = Array.isArray(j?.items) ? j.items : [];
        setTemplates(items.map((x:any)=>({ id:String(x.id), title:String(x.title||''), status:(x.status||'draft'), updated_at:String(x.updated_at||'') })) as any);
      } finally { if (alive) setLoadingList(false); }
    })();
    return () => { alive = false; };
  }, [propertyId]);

  useEffect(() => {
    if (!propertyId) return;
    const keySnapshot = storageKey;
    let cancelled = false;

    setTpl(EMPTY);
    setTitleText("");
    if (titleRef.current) tokensTextToChips(titleRef.current, "");
    if (bodyRef.current) bodyRef.current.innerHTML = '';

    try {
      const raw = localStorage.getItem(keySnapshot);
      const parsed: TemplateState | null = raw ? JSON.parse(raw) : null;
      const base = parsed || EMPTY;
      if (!cancelled && keySnapshot === storageKey) {
        setTpl(base);
        const { title, body } = deriveFromBlocks(base.blocks);
        if (titleRef.current) tokensTextToChips(titleRef.current, title);
        if (bodyRef.current) bodyRef.current.innerHTML = tokensToChipsHTML(body);
      }
    } catch {
      if (!cancelled && keySnapshot === storageKey) {
        setTpl(EMPTY);
        setTitleText("");
        if (bodyRef.current) bodyRef.current.innerHTML = '';
      }
    }

    (async () => {
      try {
        const q = activeId ? `id=${encodeURIComponent(activeId)}` : `property=${encodeURIComponent(propertyId)}`;
        const res = await fetch(`/api/reservation-message/template?${q}`, { cache: 'no-store' });
        if (!res.ok) return;
        const j = await res.json();
        const t = j?.template;
        if (!t) return;
        const blocks: Block[] = (t.blocks as any[]).map((b) => ({ id: uid(), type: b.type, text: b.text ?? '' }));
        const fields: ManualField[] = (t.fields as any[]).map((f) => ({ uid: uid(), key: f.key, label: f.label, defaultValue: (f as any).default_value ?? null }));
        const next: TemplateState = { status: (t.status || 'draft') as any, blocks, fields };
        if (!cancelled && keySnapshot === storageKey) {
          setTpl(next);
          try { localStorage.setItem(keySnapshot, JSON.stringify(next)); } catch {}
          const { title, body } = deriveFromBlocks(blocks);
          if (titleRef.current) tokensTextToChips(titleRef.current, title);
          if (bodyRef.current) bodyRef.current.innerHTML = tokensToChipsHTML(body);
        }
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [storageKey, propertyId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!propertyId) { if (alive) setHasRoomTypes(false); return; }
        const r = await sb.from('room_types').select('id').eq('property_id', propertyId).limit(1);
        if (!alive) return;
        setHasRoomTypes((r.data ?? []).length > 0);
      } catch { if (alive) setHasRoomTypes(false); }
    })();
    return () => { alive = false; };
  }, [sb, propertyId]);

  function saveDraft() { if (!propertyId) return; const blocks = composeBlocks(); const next = { ...tpl, status: "draft" as const, blocks }; try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {} setTpl(next); syncToServer("draft", blocks); }
  function publish() { if (!propertyId) return; const blocks = composeBlocks(); const next = { ...tpl, status: "published" as const, blocks }; try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {} setTpl(next); syncToServer("published", blocks); }
  function resetAll() {
    if (!propertyId) return;
    const seeded: TemplateState = {
      status: "draft",
      fields: [],
      blocks: [
        { id: uid(), type: "heading", text: "Reservation details" },
        { id: uid(), type: "paragraph", text: "Hello {{guest_first_name}},\nCheck-in {{check_in_date}} {{check_in_time}}.\nCheck-out {{check_out_date}} {{check_out_time}}.\nRoom: {{room_name}}.\nWi-Fi: {{wifi_name}} / {{wifi_password}}.\nDoor code: {{door_code}}." },
      ],
    };
    try { localStorage.setItem(storageKey, JSON.stringify(seeded)); } catch {}
    setTpl(seeded);
    setTitleText("Reservation details");
    if (bodyRef.current) bodyRef.current.innerHTML = tokensToChipsHTML("Hello {{guest_first_name}},<br/>Check-in {{check_in_date}} {{check_in_time}}.<br/>Check-out {{check_out_date}} {{check_out_time}}.<br/>Room: {{room_name}}.<br/>Wi-Fi: {{wifi_name}} / {{wifi_password}}.<br/>Door code: {{door_code}}.");
  }
  async function syncToServer(status: "draft"|"published", blocks?: Block[]) {
    try {
      setSaving("Saving…");
      const blk = blocks ?? composeBlocks();
      const { title } = deriveFromBlocks(blk);
      const payload: any = {
        id: activeId || undefined,
        property_id: propertyId,
        title,
        status,
        blocks: blk.map((b:any) => ({ type: b.type, text: b.text || null })),
        fields: tpl.fields.map((f) => ({ key: f.key, label: f.label, default_value: (f.defaultValue ?? null) })),
      };
      const res = await fetch('/api/reservation-message/template', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json().catch(()=>({}));
      if (!res.ok || !j?.ok) { setSaving("Error"); return; }
      if (!activeId && j?.template_id) setActiveId(String(j.template_id));
      try {
        const rl = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(propertyId||'')}`, { cache:'no-store' });
        const jl = await rl.json().catch(()=>({}));
        const items = Array.isArray(jl?.items) ? jl.items : [];
        setTemplates(items.map((x:any)=>({ id:String(x.id), title:String(x.title||''), status:(x.status||'draft'), updated_at:String(x.updated_at||'') })) as any);
      } catch {}
      setSaving("Synced"); setTimeout(()=>setSaving("Idle"), 700);
    } catch { setSaving("Error"); }
  }

  async function onAddNew() { /* neschimbat */ 
    if (!propertyId) return;
    const t = prompt('Message title'); if (!t) return;
    try {
      const res = await fetch('/api/reservation-message/template', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ property_id: propertyId, title: t, status: 'draft', blocks: [{ type:'heading', text: t }], fields: [] }) });
      const j = await res.json().catch(()=>({}));
      if (!res.ok || !j?.template_id) throw new Error(j?.error || 'Create failed');
      setActiveId(String(j.template_id));
      const rl = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(propertyId)}`, { cache: 'no-store' });
      const jl = await rl.json().catch(()=>({}));
      const items = Array.isArray(jl?.items) ? jl.items : [];
      setTemplates(items.map((x:any)=>({ id:String(x.id), title:String(x.title||''), status:(x.status||'draft'), updated_at:String(x.updated_at||'') })) as any);
    } catch (e:any) { alert(e?.message || 'Failed'); }
  }
  async function onDuplicate(id: string, title: string) { /* neschimbat */ 
    try {
      const r = await fetch(`/api/reservation-message/template?id=${encodeURIComponent(id)}`, { cache:'no-store' });
      const j = await r.json().catch(()=>({}));
      const t = j?.template; if (!t) return;
      const blocks = (t.blocks||[]).map((b:any)=>({ type:b.type, text:b.text??null }));
      const fields = (t.fields||[]).map((f:any)=>({ key:f.key, label:f.label, default_value: (f.default_value ?? null) }));
      const res = await fetch('/api/reservation-message/template', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ property_id: t.property_id, title: `${title} (Copy)`, status: 'draft', blocks, fields }) });
      const jj = await res.json().catch(()=>({}));
      if (!res.ok || !jj?.template_id) throw new Error(jj?.error || 'Duplicate failed');
      setActiveId(String(jj.template_id));
      const rl = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(t.property_id)}`, { cache: 'no-store' });
      const jl = await rl.json().catch(()=>({}));
      const items = Array.isArray(jl?.items) ? jl.items : [];
      setTemplates(items.map((x:any)=>({ id:String(x.id), title:String(x.title||''), status:(x.status||'draft'), updated_at:String(x.updated_at||'') })) as any);
    } catch (e:any) { alert(e?.message || 'Failed'); }
  }
  async function onDelete(id: string) { /* neschimbat */ 
    if (!confirm('Delete this message?')) return;
    try {
      const r = await fetch(`/api/reservation-message/template?id=${encodeURIComponent(id)}`, { method:'DELETE' });
      if (!r.ok) throw new Error(await r.text());
      const rl = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(propertyId||'')}`, { cache: 'no-store' });
      const jl = await rl.json().catch(()=>({}));
      const items = Array.isArray(jl?.items) ? jl.items : [];
      setTemplates(items.map((x:any)=>({ id:String(x.id), title:String(x.title||''), status:(x.status||'draft'), updated_at:String(x.updated_at||'') })) as any);
      if (activeId === id) setActiveId(null);
    } catch (e:any) { alert(e?.message || 'Failed'); }
  }

  function insertVarIntoFocused(token: string) { if (focusedInput === "title" && titleRef.current) insertTokenChip(titleRef.current, token.replace(/[{}]/g, "")); else if (focusedInput === "body" && bodyRef.current) insertTokenChip(bodyRef.current, token.replace(/[{}]/g, "")); }
  function focusBody() { if (bodyRef.current) { try { bodyRef.current.focus(); } catch {} } }
  function applyBold() { if (focusedInput==='body') { focusBody(); document.execCommand('bold'); } }
  function applyItalic() { if (focusedInput==='body') { focusBody(); document.execCommand('italic'); } }
  function applyUnderline() { if (focusedInput==='body') { focusBody(); document.execCommand('underline'); } }
  function applyLink() { const container = focusedInput === 'body' ? bodyRef.current : (focusedInput === 'title' ? titleRef.current : null); if (!container) return; const url = prompt('Link URL (https://...)'); if (!url) return; const sel = window.getSelection(); const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null; const inside = range ? isRangeInside(range, container) : false; if (inside && sel && !sel.isCollapsed && sel.toString().trim()) { try { container.focus(); document.execCommand('createLink', false, url); } catch {} } else { const text = prompt('Link text') || url; insertAnchorAtCaret(container, url, text); } }

  function addFieldFromName(name: string) { const label = name.trim(); if (!label) return; const key = slugify(label); if (!key) return; let def: string | null | undefined = null; try { const ans = prompt('Valoare implicită pentru această variabilă (opțional)'); if (ans !== null) def = ans; } catch {} setTpl((prev) => { if (prev.fields.some((f) => f.key === key)) return prev; return { ...prev, fields: [...prev.fields, { uid: uid(), key, label, defaultValue: def }] }; }); }
  function removeFieldByUid(uidVal: string) { setTpl((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.uid !== uidVal) })); }

  function composeBlocks(): Block[] { const blocks: Block[] = []; const t = titleTextWithTokens(titleRef.current); const bHtml = htmlWithTokens(bodyRef.current?.innerHTML || '').trim(); if (t) blocks.push({ id: uid(), type: "heading", text: t }); if (bHtml) blocks.push({ id: uid(), type: "paragraph", text: bHtml }); return blocks; }
  function deriveFromBlocks(blocks: Block[]): { title: string; body: string } { let title = ""; const paras: string[] = []; for (const bl of blocks || []) { if (bl.type === "heading" && !title) title = (bl as any).text || ""; if (bl.type === "paragraph") paras.push(((bl as any).text || "")); } return { title, body: paras.join("") }; }

  const card: React.CSSProperties = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 };
  const input: React.CSSProperties = { padding: 10, background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, width: "100%", boxSizing: "border-box", fontFamily: 'inherit' };
  const btn: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontWeight: 700, cursor: "pointer" };
  const btnPri: React.CSSProperties = { ...btn, background: "var(--primary)", color: "#0c111b", border: "1px solid var(--border)" };

  useEffect(() => { setPill(saving); }, [saving, setPill]);

  return (
    <div style={{ display: "grid", gap: 12, fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      <PlanHeaderBadge title="Automatic Messages" slot="header-right" />

      {/* Property selector + === ROOM VARS button === */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Property</label>
        <select className="sb-select" value={propertyId} onChange={(e)=>setPropertyId((e.target as HTMLSelectElement).value)} style={{ minWidth: 220 }}>
          {properties.map((p)=> (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
        <div style={{ flex: 1 }} />
        {/* === ROOM VARS: toggle button (nu încurcă editorul) === */}
        <button
          className="sb-btn"
          onClick={()=>setRoomVarsOpen(true)}
          title="Room variables"
          style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color:'var(--text)', fontWeight:700 }}
          disabled={!propertyId}
        >
          Room variables
        </button>
      </div>

      {/* Variables row (mesaj) */}
      {activeId && (
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Variables</h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <small style={{ color: 'var(--muted)' }}>Insert variables:</small>
          {BUILTIN_VARS.map((v)=>(
            <button key={v.key} style={btn} onClick={()=>insertVarIntoFocused(`{{${v.key}}}`)} title={v.label}>{v.key}</button>
          ))}
          {hasRoomTypes && (
            <button key="room_type" style={btn} onClick={()=>insertVarIntoFocused(`{{room_type}}`)} title="Room type">room_type</button>
          )}
          {tpl.fields.map((f)=>(
            <span key={f.uid} className="rm-token" style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <button style={btn} onClick={()=>insertVarIntoFocused(`{{${f.key}}}`)} title={f.label}>{f.key}</button>
              {typeof f.defaultValue === 'string' && (<small style={{ color:'var(--muted)' }}>= {f.defaultValue || '""'}</small>)}
              <button style={{ ...btn, border: '1px solid var(--border)' }} onClick={()=>{
                try { const cur = typeof f.defaultValue === 'string' ? f.defaultValue : ''; const ans = prompt('Setează valoarea implicită', cur); if (ans !== null) { setTpl(prev => ({ ...prev, fields: prev.fields.map(x => x.uid === f.uid ? { ...x, defaultValue: ans } : x) })); } } catch {}
              }} title="Set default value">✎</button>
              <button style={{ ...btn, border: '1px solid var(--danger)' }} onClick={()=>removeFieldByUid(f.uid)} title="Remove">×</button>
            </span>
          ))}
          <AddVarInline onAdd={(name)=>addFieldFromName(name)} disabled={!isAdmin} />
        </div>
      </section>
      )}

      {/* Templates list (nemodificat) */}
      <section className="sb-card" style={{ padding:12, border:'1px solid var(--border)', borderRadius:12 }}>
        {/* ... conținutul tău existent ... */}
        {/* (am lăsat neschimbat pentru brevități) */}
        {/* —— păstrează aici exact ce ai deja din versiunea ta —— */}
      </section>

      {activeId && (
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Message</h2>
        {/* formatting bar */}
        <div style={{ display: 'grid', gap: 8 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Title</label>
            <ContentEditableStable ref={titleRef} onFocus={()=>setFocusedInput('title')} style={input} placeholder="Reservation details" />
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
            <ContentEditableStable ref={bodyRef} onFocus={()=>setFocusedInput('body')} style={{ ...input, minHeight: 260, lineHeight: 1.5, whiteSpace: 'pre-wrap' }} placeholder="Your message..." />
            <style dangerouslySetInnerHTML={{ __html: `
              [data-placeholder]:empty:before{ content: attr(data-placeholder); color: var(--muted); }
              .rm-token{ display:inline-block; padding: 2px 6px; border:1px solid var(--border); background: var(--panel); color: var(--text); border-radius: 8px; font-weight: 800; font-size: 12px; margin: 0 2px; }
            `}}/>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button style={btn} onClick={saveDraft} disabled={!isAdmin}>Save</button>
          <button style={btnPri} onClick={publish} disabled={!isAdmin}>Publish</button>
        </div>
      </section>
      )}

      {/* === ROOM VARS: drawer (nu încurcă editorul) === */}
      {roomVarsOpen && propertyId && (
        <RoomVariablesPanel
          propertyId={propertyId}
          onClose={()=>setRoomVarsOpen(false)}
          supabase={sb}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

/* ===== ROOM VARS: Drawer component ===== */
function RoomVariablesPanel({
  propertyId,
  onClose,
  supabase,
  isAdmin,
}: {
  propertyId: string;
  onClose: () => void;
  supabase: ReturnType<typeof createClient>;
  isAdmin: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [varsList, setVarsList] = useState<Array<{ id?: string; key: string; value: string; _local?: boolean }>>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle"|"saving"|"saved"|"error">("idle");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setErr(null);
        const r1 = await supabase.from('rooms').select('id,name').eq('property_id', propertyId).order('name',{ascending:true});
        if (r1.error) throw new Error(r1.error.message);
        const rs = (r1.data||[]).map((r:any)=>({ id:String(r.id), name: r.name || `#${String(r.id).slice(0,4)}` }));
        if (!alive) return;
        setRooms(rs);
        setRoomId(rs[0]?.id || null);
      } catch (e:any) {
        if (!alive) return;
        setErr(e?.message || 'Failed to load rooms');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [propertyId, supabase]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!roomId) { setVarsList([]); return; }
      try {
        setErr(null);
        const r = await supabase.from('room_variables').select('id,key,value').eq('property_id', propertyId).eq('room_id', roomId).order('key',{ascending:true});
        if (r.error) {
          // Tabelul s-ar putea să nu existe încă – nu blocăm UI
          setErr('Room variables table not found (run migration).'); 
          setVarsList([]);
          return;
        }
        const rows = (r.data||[]).map((x:any)=>({ id:String(x.id), key:String(x.key), value:String(x.value) }));
        if (!alive) return;
        setVarsList(rows);
      } catch (e:any) {
        if (!alive) return;
        setErr(e?.message || 'Failed to load variables');
        setVarsList([]);
      }
    })();
    return () => { alive = false; };
  }, [roomId, propertyId, supabase]);

  function addRow() {
    setVarsList((prev)=>[...prev, { key:'', value:'', _local:true }]);
  }

  async function saveRow(ix: number) {
    if (!isAdmin) return;
    const row = varsList[ix];
    const key = row.key.trim().toLowerCase().replace(/[^a-z0-9_]+/g,'_').replace(/^_+|_+$/g,'');
    if (!key) { alert('Cheia nu poate fi goală'); return; }
    if (!roomId) return;
    try {
      setSaving("saving");
      const payload: any = { property_id: propertyId, room_id: roomId, key, value: row.value ?? '' };
      const res = await supabase.from('room_variables').upsert(payload, { onConflict: 'property_id,room_id,key' }).select('id,key,value').single();
      if (res.error) throw new Error(res.error.message);
      const saved = { id: String(res.data.id), key: String(res.data.key), value: String(res.data.value) };
      setVarsList(prev => prev.map((r, i)=> i===ix ? saved : r));
      setSaving("saved"); setTimeout(()=>setSaving("idle"), 600);
    } catch (e:any) {
      setSaving("error"); setErr(e?.message || 'Save failed');
    }
  }

  async function deleteRow(ix: number) {
    if (!isAdmin) return;
    const row = varsList[ix];
    if (!row.id) { setVarsList(prev => prev.filter((_r,i)=>i!==ix)); return; }
    if (!confirm(`Delete variable "${row.key}"?`)) return;
    try {
      const res = await supabase.from('room_variables').delete().eq('id', row.id);
      if (res.error) throw new Error(res.error.message);
      setVarsList(prev => prev.filter((_r,i)=>i!==ix));
    } catch (e:any) {
      setErr(e?.message || 'Delete failed');
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex: 60 }} />
      {/* Drawer */}
      <div style={{
        position:'fixed', top:0, right:0, height:'100vh', width:'min(520px, 90vw)',
        background:'var(--panel)', borderLeft:'1px solid var(--border)', zIndex:61,
        display:'grid', gridTemplateRows:'auto 1fr auto'
      }}>
        <div style={{ padding:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
          <strong>Room variables</strong>
          <div style={{ flex:1 }} />
          <button onClick={onClose} className="sb-btn">Close</button>
        </div>

        <div style={{ padding:12, overflow:'auto', display:'grid', gap:10 }}>
          {loading ? (
            <div style={{ color:'var(--muted)' }}>Loading rooms…</div>
          ) : err ? (
            <div className="sb-card" style={{ padding:12, border:'1px solid var(--danger)', borderRadius:10 }}>
              <strong style={{ color:'var(--danger)' }}>Error</strong>
              <div style={{ color:'var(--muted)' }}>{err}</div>
            </div>
          ) : (
            <>
              <div style={{ display:'grid', gap:6 }}>
                <label style={{ fontSize:12, color:'var(--muted)', fontWeight:800 }}>Room</label>
                <select
                  className="sb-select"
                  value={roomId ?? ''}
                  onChange={(e)=>setRoomId((e.target as HTMLSelectElement).value || null)}
                >
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                <strong>Variables ({varsList.length})</strong>
                <button className="sb-btn sb-btn--primary" onClick={addRow} disabled={!isAdmin}>Add</button>
              </div>

              <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:0, background:'var(--card)', padding:'8px 10px', fontSize:12, fontWeight:800, color:'var(--muted)' }}>
                  <div>Key</div><div>Value</div><div></div>
                </div>
                {varsList.length === 0 ? (
                  <div style={{ padding:12, color:'var(--muted)' }}>No variables yet.</div>
                ) : (
                  varsList.map((row, ix) => (
                    <div key={(row.id||'new')+ix} style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, alignItems:'center', padding:'8px 10px', borderTop:'1px solid var(--border)' }}>
                      <input
                        value={row.key}
                        onChange={(e)=>setVarsList(prev => prev.map((r,i)=> i===ix ? { ...r, key: e.currentTarget.value } : r))}
                        placeholder="wifi_password"
                        style={{ padding:'8px 10px', border:'1px solid var(--border)', borderRadius:8, background:'var(--card)', color:'var(--text)' }}
                        disabled={!isAdmin}
                      />
                      <input
                        value={row.value}
                        onChange={(e)=>setVarsList(prev => prev.map((r,i)=> i===ix ? { ...r, value: e.currentTarget.value } : r))}
                        placeholder="MySecret123!"
                        style={{ padding:'8px 10px', border:'1px solid var(--border)', borderRadius:8, background:'var(--card)', color:'var(--text)' }}
                        disabled={!isAdmin}
                      />
                      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                        <button className="sb-btn" onClick={()=>saveRow(ix)} disabled={!isAdmin}>Save</button>
                        <button className="sb-btn" onClick={()=>deleteRow(ix)} disabled={!isAdmin} style={{ borderColor:'var(--danger)', color:'var(--danger)' }}>Delete</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <small style={{ color:'var(--muted)' }}>
                Sfat: folosește chei cu litere/cifre/underscore (ex: <code>wifi_password</code>, <code>door_code</code>). Aceste chei vor fi disponibile ca <code>{'{{wifi_password}}'}</code>, <code>{'{{door_code}}'}</code> în template.
              </small>
            </>
          )}
        </div>

        <div style={{ padding:12, borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color: saving==='saving' ? 'var(--primary)' : 'var(--muted)' }}>
            {saving==='saving' ? 'Saving…' : saving==='saved' ? 'Saved' : saving==='error' ? 'Error' : ''}
          </span>
          <div style={{ flex:1 }} />
          <button className="sb-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </>
  );
}

/* ==== restul helperelor tale rămân neschimbate (ContentEditableStable, AddVarInline, etc.) ==== */
const ContentEditableStable = React.memo(
  React.forwardRef<HTMLDivElement, { onFocus?: () => void; style?: React.CSSProperties; placeholder?: string }>(
    function CE({ onFocus, style, placeholder }, ref) {
      return (
        <div ref={ref} contentEditable suppressContentEditableWarning onFocus={onFocus} style={style} data-placeholder={placeholder}/>
      );
    }
  ),
  () => true
);

function AddVarInline({ onAdd, disabled }: { onAdd: (name: string) => void; disabled?: boolean }) { const [val, setVal] = useState(""); function submit(){ const v = val.trim(); if(!v) return; onAdd(v); setVal(""); } return (<span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
  <input value={val} onChange={(e)=>setVal(e.currentTarget.value)} onKeyDown={(e)=>{ if (e.key === 'Enter') { e.preventDefault(); submit(); } }} placeholder="Add variable…" style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} disabled={!!disabled}/>
  <button onClick={submit} disabled={!!disabled} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--primary)', color: '#0c111b', fontWeight: 700 }}>Add</button>
</span>); }

function insertTokenChip(container: HTMLDivElement, key: string) { const sel = window.getSelection(); if (!sel || sel.rangeCount === 0) { container.focus(); return; } const range = sel.getRangeAt(0); let node: Node|null = range.commonAncestorContainer; let inside = false; while (node) { if (node === container) { inside = true; break; } node = node.parentNode; } if (!inside) { container.focus(); return; } const chip = document.createElement('span'); chip.className = 'rm-token'; chip.setAttribute('data-token', key); chip.contentEditable = 'false'; chip.textContent = key; range.deleteContents(); range.insertNode(chip); const space = document.createTextNode(' '); chip.after(space); sel.collapse(space, 1); }
function isRangeInside(range: Range, container: HTMLElement): boolean { let node: Node | null = range.commonAncestorContainer; while (node) { if (node === container) return true; node = node.parentNode; } return false; }
function insertAnchorAtCaret(container: HTMLDivElement, url: string, text: string) { const sel = window.getSelection(); if (!sel || sel.rangeCount === 0) { container.focus(); return; } const range = sel.getRangeAt(0); if (!isRangeInside(range, container)) { try { container.focus(); } catch {} } const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noreferrer'; a.textContent = text || url; range.deleteContents(); range.insertNode(a); const space = document.createTextNode(' '); a.after(space); sel.collapse(space, 1); }
function tokensTextToChips(container: HTMLDivElement, text: string) { const s = text || ''; const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g; container.innerHTML = ''; let last = 0; let m: RegExpExecArray | null; while ((m = re.exec(s))) { const before = s.slice(last, m.index); if (before) container.appendChild(document.createTextNode(before)); const chip = document.createElement('span'); chip.className = 'rm-token'; chip.setAttribute('data-token', m[1]); chip.contentEditable = 'false'; chip.textContent = m[1]; container.appendChild(chip); container.appendChild(document.createTextNode(' ')); last = m.index + m[0].length; } const tail = s.slice(last); if (tail) container.appendChild(document.createTextNode(tail)); }
function titleTextWithTokens(el: HTMLDivElement | null): string { if (!el) return ''; const nodes = Array.from(el.childNodes); let out = ''; for (const n of nodes) { if (n.nodeType === 3) out += n.nodeValue || ''; else if (n instanceof HTMLElement && n.classList.contains('rm-token')) { const k = n.getAttribute('data-token') || ''; out += `{{${k}}}`; } else out += (n.textContent || ''); } return out.trim(); }
function tokensToChipsHTML(html: string): string { if (!html) return ''; return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => `<span class=\"rm-token\" data-token=\"${k}\" contenteditable=\"false\">${k}</span>`); }
function htmlWithTokens(html: string): string { const tmp = document.createElement('div'); tmp.innerHTML = html || ''; tmp.querySelectorAll('span.rm-token[data-token]').forEach((el) => { const k = el.getAttribute('data-token') || ''; el.replaceWith(document.createTextNode(`{{${k}}}`)); }); tmp.querySelectorAll('[contenteditable], [data-placeholder]').forEach((el) => { el.removeAttribute('contenteditable'); el.removeAttribute('data-placeholder'); }); return tmp.innerHTML; }
function markdownToHtmlInline(src: string): string { let s = escapeHtml(src || ''); s = s.replace(/\[(.+?)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>'); s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); s = s.replace(/__([^_]+?)__/g, '<u>$1</u>'); s = s.replace(/(^|\s)\*(.+?)\*(?=\s|$)/g, '$1<em>$2</em>'); s = s.replace(/\n/g, '<br/>'); return s; }
function titleToChips(title: string): string { const esc = (str: string) => str.replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;"," >":"&gt;","\"":"&quot;","'":"&#39;"}[c] as string)); const s = String(title || ''); return s.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => `<span class=\"rm-token\" data-token=\"${esc(k)}\" contenteditable=\"false\">${esc(k)}</span>`); }