// app/app/automatic-messages/ReservationMessageClient.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePersistentProperty } from "@/app/app/_components/PropertySelection";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import { useHeader } from "@/app/app/_components/HeaderContext";

/* ----------------------------- Tipuri ----------------------------- */
type Property = { id: string; name: string };

type Block =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "divider" };

type ManualField = {
  uid: string; // UI-only
  key: string;
  label: string;
  defaultValue?: string | null;
};

type TemplateState = {
  blocks: Block[];
  fields: ManualField[];
  status: "draft" | "published";
};

type RoomVarDef = { id: string; key: string; label: string };

const BUILTIN_VARS: Array<{ key: string; label: string }> = [
  { key: "guest_first_name", label: "Guest first name" },
  { key: "guest_last_name", label: "Guest last name" },
  { key: "check_in_date", label: "Check-in date" },
  { key: "check_in_time", label: "Check-in time" },
  { key: "check_out_date", label: "Check-out date" },
  { key: "check_out_time", label: "Check-out time" },
  { key: "room_name", label: "Room name" },
  { key: "property_name", label: "Property name" },
];

const EMPTY: TemplateState = { blocks: [], fields: [], status: "draft" };

/* ----------------------------- Utils ----------------------------- */
function uid() { return Math.random().toString(36).slice(2, 10); }
function escapeHtml(s: string) {
  return (s || "").replace(/[&<>"']/g, (c) => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c] as string
  ));
}
function mdToHtml(src: string) {
  let s = escapeHtml(src);
  s = s.replace(/\[(.+?)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|\s)\*(.+?)\*(?=\s|$)/g, '$1<em>$2</em>');
  s = s.replace(/\n/g, "<br/>");
  return s;
}

/* --------- Chip-only editor helpers (UI arată DOAR chip, nu {{ }}) --------- */
function makeChipEl(key: string, label: string) {
  const chip = document.createElement("span");
  chip.className = "rm-token";
  chip.setAttribute("data-token", key);
  chip.setAttribute("data-label", label);
  chip.contentEditable = "false";
  chip.textContent = label;
  return chip;
}

function insertChip(container: HTMLDivElement, key: string, label: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) { try { container.focus(); } catch {} return; }
  const range = sel.getRangeAt(0);
  // ensure inside
  let n: Node|null = range.commonAncestorContainer;
  let inside = false;
  while (n) { if (n === container) { inside = true; break; } n = n.parentNode; }
  if (!inside) { try { container.focus(); } catch {} return; }
  const chip = makeChipEl(key, label);
  range.deleteContents();
  range.insertNode(chip);
  const space = document.createTextNode(" ");
  chip.after(space);
  sel.collapse(space, 1);
}

/** Body → înlocuiește chip-urile cu {{token}} pentru salvare */
function htmlWithTokens(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  tmp.querySelectorAll("span.rm-token[data-token]").forEach((el) => {
    const key = el.getAttribute("data-token") || "";
    el.replaceWith(document.createTextNode(`{{${key}}}`));
  });
  tmp.querySelectorAll("[contenteditable],[data-placeholder]").forEach((el) => {
    el.removeAttribute("contenteditable");
    el.removeAttribute("data-placeholder");
  });
  return tmp.innerHTML;
}

/** Title: scrie chip-uri pornind de la string cu {{token}} (pentru load) */
function tokensTextToChips(container: HTMLDivElement, text: string, labelByKey: Record<string,string>) {
  const s = text || "";
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  container.innerHTML = "";
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const before = s.slice(last, m.index);
    if (before) container.appendChild(document.createTextNode(before));
    const key = m[1];
    const label = labelByKey[key] || key;
    container.appendChild(makeChipEl(key, label));
    container.appendChild(document.createTextNode(" "));
    last = m.index + m[0].length;
  }
  const tail = s.slice(last);
  if (tail) container.appendChild(document.createTextNode(tail));
}

/** Body: înlocuiește {{token}} cu chip-uri la load */
function tokensToChipsHTML(html: string, labelByKey: Record<string,string>): string {
  if (!html) return "";
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => {
    const lab = labelByKey[k] || k;
    return `<span class="rm-token" data-token="${k}" data-label="${escapeHtml(lab)}" contenteditable="false">${escapeHtml(lab)}</span>`;
  });
}

/** Title → string cu {{token}} (pentru salvare) */
function titleTextWithTokens(el: HTMLDivElement | null): string {
  if (!el) return "";
  let out = "";
  for (const n of Array.from(el.childNodes)) {
    if (n.nodeType === 3) out += n.nodeValue || "";
    else if (n instanceof HTMLElement && n.classList.contains("rm-token")) {
      out += `{{${n.getAttribute("data-token") || ""}}}`;
    } else out += (n.textContent || "");
  }
  return out.trim();
}

/** Reetichetare chip-uri după ce vin definițiile */
function refreshChipLabels(container: HTMLDivElement | null, labelByKey: Record<string,string>) {
  if (!container) return;
  container.querySelectorAll("span.rm-token[data-token]").forEach((el) => {
    const key = el.getAttribute("data-token") || "";
    const wanted = labelByKey[key] || key;
    if (el.textContent !== wanted) {
      el.textContent = wanted;
      el.setAttribute("data-label", wanted);
    }
  });
}

/* ----------------------------- Component principal ----------------------------- */
export default function ReservationMessageClient({
  initialProperties,
  isAdmin,
}: { initialProperties: Property[]; isAdmin: boolean }) {
  const [properties] = useState<Property[]>(initialProperties);
  const [propertyId, setPropertyId] = usePersistentProperty(properties);
  const [tpl, setTpl] = useState<TemplateState>(EMPTY);
  const [templates, setTemplates] = useState<Array<{ id:string; title:string; status:'draft'|'published'; updated_at:string }>>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);

  const { setPill } = useHeader();
  const [saving, setSaving] = useState<"Idle"|"Saving…"|"Synced"|"Error">("Idle");
  useEffect(()=>setPill(saving), [saving, setPill]);

  // contentEditable refs
  const titleRef = useRef<HTMLDivElement|null>(null);
  const bodyRef = useRef<HTMLDivElement|null>(null);

  // Supabase
  const sb = useMemo(() => createClient(), []);

  // Room types?
  const [hasRoomTypes, setHasRoomTypes] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!propertyId) { setHasRoomTypes(false); return; }
      const r = await sb.from("room_types").select("id").eq("property_id", propertyId).limit(1);
      if (!alive) return;
      setHasRoomTypes((r.data ?? []).length > 0);
    })();
    return () => { alive = false; };
  }, [sb, propertyId]);

  /* ---------- Room Variables: Definiții ---------- */
  const [isRVOpen, setRVOpen] = useState(false);
  const [defs, setDefs] = useState<RoomVarDef[]>([]);
  const [loadingDefs, setLoadingDefs] = useState(false);
  const [defError, setDefError] = useState<string | null>(null);
  const [newDefLabel, setNewDefLabel] = useState("");
  const [creatingDef, setCreatingDef] = useState(false);

  function labelMap(): Record<string,string> {
    const m: Record<string,string> = {};
    for (const b of BUILTIN_VARS) m[b.key] = b.label;
    if (hasRoomTypes) m["room_type"] = "Room type";
    for (const d of defs) m[d.key] = d.label;
    for (const f of tpl.fields) m[f.key] = f.label;
    return m;
  }

  async function loadDefinitions(pid: string | null) {
    setDefError(null);
    if (!pid) { setDefs([]); return; }
    try {
      setLoadingDefs(true);
      const res = await fetch(`/api/room-variables/definitions?property=${encodeURIComponent(pid)}`, { cache: "no-store" });
      const j = await res.json().catch(()=>({}));
      if (!res.ok || !j?.items) throw new Error(j?.error || "Failed to load definitions");
      setDefs((j.items as any[]).map(x => ({ id: String(x.id), key: String(x.key), label: String(x.label) })));
    } catch (e:any) {
      setDefError(e?.message || "Failed to load");
      setDefs([]);
    } finally {
      setLoadingDefs(false);
      // re-etichetăm chip-urile după load
      refreshChipLabels(titleRef.current, labelMap());
      refreshChipLabels(bodyRef.current, labelMap());
    }
  }

  async function createDefinition() {
    setDefError(null);
    if (!propertyId) { setDefError("Selectează o proprietate."); return; }
    const label = newDefLabel.trim();
    if (!label) { setDefError("Scrie un nume (ex: Room key)"); return; }
    try {
      setCreatingDef(true);
      const res = await fetch("/api/room-variables/definitions", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ property_id: propertyId, label }),
      });
      const j = await res.json().catch(()=>({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Create failed");
      const d = j.definition;
      const newDef: RoomVarDef = { id: String(d.id), key: String(d.key), label: String(d.label) };
      setDefs(prev => [newDef, ...prev]);
      setNewDefLabel("");
      // update chip labels imediat
      refreshChipLabels(titleRef.current, labelMap());
      refreshChipLabels(bodyRef.current, labelMap());
    } catch (e:any) {
      setDefError(e?.message || "Create failed");
    } finally {
      setCreatingDef(false);
    }
  }

  /* ---------- Template list load ---------- */
  const storageKey = propertyId ? (activeId ? `p4h:rm:template:${activeId}` : `p4h:rm:template:${propertyId}`) : "";

  useEffect(() => {
    let alive = true;
    if (!propertyId) { setTemplates([]); setActiveId(null); return; }
    (async () => {
      try {
        setLoadingList(true);
        const res = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(propertyId)}`, { cache: "no-store" });
        const j = await res.json().catch(()=>({}));
        if (!alive) return;
        const items = Array.isArray(j?.items) ? j.items : [];
        setTemplates(items.map((x:any)=>({ id:String(x.id), title:String(x.title||""), status:(x.status||"draft"), updated_at:String(x.updated_at||"") })));
      } finally {
        if (alive) setLoadingList(false);
      }
    })();
    loadDefinitions(propertyId);
    return () => { alive = false; };
  }, [propertyId]);

  /* ---------- Template load (LS + server) ---------- */
  useEffect(() => {
    if (!propertyId) return;
    const keySnapshot = storageKey;
    let cancelled = false;

    // curăță UI
    setTpl(EMPTY);
    if (titleRef.current) tokensTextToChips(titleRef.current, "", labelMap());
    if (bodyRef.current) bodyRef.current.innerHTML = "";

    // din LS
    try {
      const raw = localStorage.getItem(keySnapshot);
      const parsed: TemplateState | null = raw ? JSON.parse(raw) : null;
      const base = parsed || EMPTY;
      if (!cancelled && keySnapshot === storageKey) {
        setTpl(base);
        const { title, body } = deriveFromBlocks(base.blocks);
        if (titleRef.current) tokensTextToChips(titleRef.current, title, labelMap());
        if (bodyRef.current) bodyRef.current.innerHTML = tokensToChipsHTML(body, labelMap());
      }
    } catch {
      if (!cancelled && keySnapshot === storageKey) {
        setTpl(EMPTY);
        if (titleRef.current) tokensTextToChips(titleRef.current, "", labelMap());
        if (bodyRef.current) bodyRef.current.innerHTML = "";
      }
    }

    // de pe server
    (async () => {
      try {
        const q = activeId ? `id=${encodeURIComponent(activeId)}` : `property=${encodeURIComponent(propertyId)}`;
        const res = await fetch(`/api/reservation-message/template?${q}`, { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        const t = j?.template;
        if (!t) return;
        const blocks: Block[] = (t.blocks as any[]).map((b:any)=>({ id: uid(), type: b.type, text: b.text ?? "" }));
        const fields: ManualField[] = (t.fields as any[]).map((f:any)=>({ uid: uid(), key: f.key, label: f.label, defaultValue: (f as any).default_value ?? null }));
        const next: TemplateState = { status: (t.status || "draft"), blocks, fields } as TemplateState;
        if (!cancelled && keySnapshot === storageKey) {
          setTpl(next);
          try { localStorage.setItem(keySnapshot, JSON.stringify(next)); } catch {}
          const { title, body } = deriveFromBlocks(blocks);
          if (titleRef.current) tokensTextToChips(titleRef.current, title, labelMap());
          if (bodyRef.current) bodyRef.current.innerHTML = tokensToChipsHTML(body, labelMap());
        }
      } catch {}
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, propertyId, defs.length, hasRoomTypes]);

  /* ---------- Compose/Save/Publish ---------- */
  function deriveFromBlocks(blocks: Block[]): { title: string; body: string } {
    let title = "";
    const paras: string[] = [];
    for (const bl of blocks || []) {
      if (bl.type === "heading" && !title) title = (bl as any).text || "";
      if (bl.type === "paragraph") paras.push(((bl as any).text || ""));
    }
    return { title, body: paras.join("") };
  }
  function composeBlocks(): Block[] {
    const out: Block[] = [];
    const t = titleTextWithTokens(titleRef.current);
    const bHtml = htmlWithTokens(bodyRef.current?.innerHTML || "").trim();
    if (t) out.push({ id: uid(), type: "heading", text: t });
    if (bHtml) out.push({ id: uid(), type: "paragraph", text: bHtml });
    return out;
  }

  async function syncToServer(status: "draft"|"published") {
    try {
      setSaving("Saving…");
      const blk = composeBlocks();
      const { title } = deriveFromBlocks(blk);
      const payload: any = {
        id: activeId || undefined,
        property_id: propertyId,
        title,
        status,
        blocks: blk.map((b:any)=>({ type:b.type, text: b.text || null })),
        fields: tpl.fields.map((f)=>({ key: f.key, label: f.label, default_value: (f.defaultValue ?? null) })),
      };
      const res = await fetch("/api/reservation-message/template", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
      const j = await res.json().catch(()=>({}));
      if (!res.ok || !j?.ok) { setSaving("Error"); return; }
      if (!activeId && j?.template_id) setActiveId(String(j.template_id));
      // refresh list
      try {
        const rl = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(propertyId||"")}`, { cache: "no-store" });
        const jl = await rl.json().catch(()=>({}));
        const items = Array.isArray(jl?.items) ? jl.items : [];
        setTemplates(items.map((x:any)=>({ id:String(x.id), title:String(x.title||""), status:(x.status||"draft"), updated_at:String(x.updated_at||"") })));
      } catch {}
      setSaving("Synced"); setTimeout(()=>setSaving("Idle"), 800);
    } catch { setSaving("Error"); }
  }

  function saveDraft() { if (!propertyId) return; syncToServer("draft"); }
  function publish()  { if (!propertyId) return; syncToServer("published"); }

  /* ---------- Format toolbar ---------- */
  function focusBody() { try { bodyRef.current?.focus(); } catch {} }
  function applyBold() { focusBody(); document.execCommand("bold"); }
  function applyItalic() { focusBody(); document.execCommand("italic"); }
  function applyUnderline() { focusBody(); document.execCommand("underline"); }
  function applyLink() {
    const url = prompt("Link URL (https://...)");
    if (!url) return;
    focusBody();
    document.execCommand("createLink", false, url);
  }

  /* ---------- UI Styles ---------- */
  const card: React.CSSProperties = { background:"var(--panel)", border:"1px solid var(--border)", borderRadius:12, padding:16 };
  const input: React.CSSProperties = { padding:10, background:"var(--card)", color:"var(--text)", border:"1px solid var(--border)", borderRadius:8, width:"100%", boxSizing:"border-box", fontFamily:"inherit" };
  const btn: React.CSSProperties = { padding:"8px 12px", borderRadius:10, border:"1px solid var(--border)", background:"var(--card)", color:"var(--text)", fontWeight:700, cursor:"pointer" };
  const btnPri: React.CSSProperties = { ...btn, background:"var(--primary)", color:"#0c111b" };

  /* ---------- Inserare variabile în editor (CHIP, fără acolade) ---------- */
  const [focusedInput, setFocusedInput] = useState<null | "title" | "body">(null);
  function insertVarIntoFocused(key: string, label: string) {
    if (focusedInput === "title" && titleRef.current) insertChip(titleRef.current, key, label);
    else if (focusedInput === "body" && bodyRef.current) insertChip(bodyRef.current, key, label);
  }

  /* ---------- Custom template vars (doar în mesajul curent) ---------- */
  function addFieldFromName(name: string) {
    const label = name.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (!key) return;
    let def: string | null | undefined = null;
    try {
      const ans = prompt("Valoare implicită (opțional)");
      if (ans !== null) def = ans;
    } catch {}
    setTpl((prev) => {
      if (prev.fields.some((f) => f.key === key)) return prev;
      return { ...prev, fields: [...prev.fields, { uid: uid(), key, label, defaultValue: def }] };
    });
  }
  function removeFieldByUid(uidVal: string) {
    setTpl((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.uid !== uidVal) }));
  }

  /* ----------------------------- Render ----------------------------- */
  return (
    <div style={{ display: "grid", gap: 12, fontFamily: "Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}>
      <PlanHeaderBadge title="Automatic Messages" slot="header-right" />

      {/* Property selector + Room Variables */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Property</label>
        <select className="sb-select" value={propertyId} onChange={(e)=>setPropertyId((e.target as HTMLSelectElement).value)} style={{ minWidth: 220 }}>
          {properties.map((p)=> (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
        <div style={{ flex: 1 }} />
        <button className="sb-btn" onClick={()=>setRVOpen(true)}>Room variables</button>
      </div>

      {/* Variables row: built-ins + defs + custom (doar când editezi un template) */}
      {activeId && (
        <section style={card}>
          <h2 style={{ marginTop: 0 }}>Variables</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <small style={{ color: "var(--muted)" }}>Inserează:</small>
            {BUILTIN_VARS.map((v)=>(
              <button key={v.key} style={btn} onClick={()=>insertVarIntoFocused(v.key, v.label)} title={v.label}>{v.label}</button>
            ))}
            {hasRoomTypes && (
              <button key="room_type" style={btn} onClick={()=>insertVarIntoFocused("room_type", "Room type")} title="Room type">Room type</button>
            )}
            {/* Definiții globale per proprietate */}
            {defs.map((d)=>(
              <button key={d.id} style={btn} onClick={()=>insertVarIntoFocused(d.key, d.label)} title={d.label}>{d.label}</button>
            ))}
            {/* Variabile ad-hoc pentru mesajul curent */}
            {tpl.fields.map((f)=>(
              <span key={f.uid} className="rm-token" style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                <button style={btn} onClick={()=>insertVarIntoFocused(f.key, f.label)} title={f.label}>{f.label}</button>
                {typeof f.defaultValue === "string" && <small style={{ color:"var(--muted)" }}>= {f.defaultValue || '""'}</small>}
                <button
                  style={{ ...btn, border: "1px solid var(--border)" }}
                  onClick={()=>{
                    try {
                      const cur = typeof f.defaultValue === "string" ? f.defaultValue : "";
                      const ans = prompt("Setează valoarea implicită", cur);
                      if (ans !== null) {
                        setTpl(prev => ({ ...prev, fields: prev.fields.map(x => x.uid === f.uid ? { ...x, defaultValue: ans } : x) }));
                      }
                    } catch {}
                  }}
                  title="Set default value"
                >
                  ✎
                </button>
                <button style={{ ...btn, border: "1px solid var(--danger)" }} onClick={()=>removeFieldByUid(f.uid)} title="Remove">×</button>
              </span>
            ))}
            <AddVarInline onAdd={(name)=>addFieldFromName(name)} disabled={!isAdmin} />
          </div>
        </section>
      )}

      {/* Templates header + grid */}
      <section className="sb-card" style={{ padding:12, border:"1px solid var(--border)", borderRadius:12 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:8, flexWrap:"wrap" }}>
          <strong>Templates</strong>
          <button className="sb-btn sb-btn--primary" onClick={async ()=>{
            if (!propertyId) return;
            const t = prompt("Message title");
            if (!t) return;
            try {
              const res = await fetch("/api/reservation-message/template", {
                method:"POST", headers:{ "Content-Type":"application/json" },
                body: JSON.stringify({ property_id: propertyId, title: t, status: "draft", blocks: [{ type:"heading", text: t }], fields: [] })
              });
              const j = await res.json().catch(()=>({}));
              if (!res.ok || !j?.template_id) throw new Error(j?.error || "Create failed");
              setActiveId(String(j.template_id));
              const rl = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(propertyId)}`, { cache: "no-store" });
              const jl = await rl.json().catch(()=>({}));
              const items = Array.isArray(jl?.items) ? jl.items : [];
              setTemplates(items.map((x:any)=>({ id:String(x.id), title:String(x.title||""), status:(x.status||"draft"), updated_at:String(x.updated_at||"") })));
            } catch (e:any) { alert(e?.message || "Failed"); }
          }}>Add template</button>
        </div>

        {loadingList ? (
          <div style={{ color:"var(--muted)" }}>Loading…</div>
        ) : templates.length === 0 ? (
          <div className="sb-card" style={{ padding: 16, textAlign:"center" }}>
            <div style={{ fontWeight:700, marginBottom: 6 }}>No templates yet</div>
            <div style={{ color:"var(--muted)", marginBottom: 10 }}>Create your first template for this property.</div>
            <button className="sb-btn sb-btn--primary" onClick={async ()=>{
              if (!propertyId) return;
              const t = prompt("Message title") || "Reservation details";
              try {
                const res = await fetch("/api/reservation-message/template", {
                  method:"POST", headers:{ "Content-Type":"application/json" },
                  body: JSON.stringify({ property_id: propertyId, title: t, status: "draft", blocks: [{ type:"heading", text: t }], fields: [] })
                });
                const j = await res.json().catch(()=>({}));
                if (!res.ok || !j?.template_id) throw new Error(j?.error || "Create failed");
                setActiveId(String(j.template_id));
                const rl = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(propertyId)}`, { cache: "no-store" });
                const jl = await rl.json().catch(()=>({}));
                const items = Array.isArray(jl?.items) ? jl.items : [];
                setTemplates(items.map((x:any)=>({ id:String(x.id), title:String(x.title||""), status:(x.status||"draft"), updated_at:String(x.updated_at||"") })));
              } catch (e:any) { alert(e?.message || "Failed"); }
            }}>Create your first template</button>
          </div>
        ) : (
          <>
            <div style={{ display:"grid", gap:10, gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))" }}>
              {templates.map(t => (
                <div
                  key={t.id}
                  className="sb-card"
                  onClick={() => setActiveId(t.id)}
                  style={{ padding:12, border:"1px solid var(--border)", borderRadius:12, display:"grid", gap:6, cursor:"pointer" }}
                  role="button"
                  tabIndex={0}
                >
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                    <strong
                      style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}
                      dangerouslySetInnerHTML={{ __html: titleToChips(t.title || "(Untitled)", labelMap()) }}
                    />
                    <span className="sb-badge" style={{
                      background: t.status==='published' ? 'var(--primary)' : 'var(--card)',
                      color: t.status==='published' ? '#0c111b' : 'var(--muted)', whiteSpace:"nowrap"
                    }}>{t.status}</span>
                  </div>
                  <small style={{ color:"var(--muted)" }}>Updated: {new Date(t.updated_at).toLocaleString()}</small>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    <button className="sb-btn" onClick={(e)=>{ e.stopPropagation(); setActiveId(t.id); }}>Edit</button>
                    <button className="sb-btn" onClick={async (e)=>{
                      e.stopPropagation();
                      try {
                        const r = await fetch(`/api/reservation-message/template?id=${encodeURIComponent(t.id)}`, { cache:"no-store" });
                        const j = await r.json().catch(()=>({}));
                        const temp = j?.template; if (!temp) return;
                        const blocks = (temp.blocks||[]).map((b:any)=>({ type:b.type, text:b.text??null }));
                        const fields = (temp.fields||[]).map((f:any)=>({ key:f.key, label:f.label, default_value: (f.default_value ?? null) }));
                        const res = await fetch("/api/reservation-message/template", {
                          method:"POST", headers:{ "Content-Type":"application/json" },
                          body: JSON.stringify({ property_id: temp.property_id, title: `${t.title} (Copy)`, status: "draft", blocks, fields })
                        });
                        const jj = await res.json().catch(()=>({}));
                        if (!res.ok || !jj?.template_id) throw new Error(jj?.error || "Duplicate failed");
                        setActiveId(String(jj.template_id));
                        const rl = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(temp.property_id)}`, { cache:"no-store" });
                        const jl = await rl.json().catch(()=>({}));
                        const items = Array.isArray(jl?.items) ? jl.items : [];
                        setTemplates(items.map((x:any)=>({ id:String(x.id), title:String(x.title||""), status:(x.status||"draft"), updated_at:String(x.updated_at||"") })));
                      } catch (er:any) { alert(er?.message || "Failed"); }
                    }}>Duplicate</button>
                    <button className="sb-btn" onClick={async (e)=>{
                      e.stopPropagation();
                      if (!confirm("Delete this message?")) return;
                      const r = await fetch(`/api/reservation-message/template?id=${encodeURIComponent(t.id)}`, { method:"DELETE" });
                      if (!r.ok) { alert(await r.text()); return; }
                      const rl = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(propertyId||"")}`, { cache:"no-store" });
                      const jl = await rl.json().catch(()=>({}));
                      const items = Array.isArray(jl?.items) ? jl.items : [];
                      setTemplates(items.map((x:any)=>({ id:String(x.id), title:String(x.title||""), status:(x.status||"draft"), updated_at:String(x.updated_at||"") })));
                      if (activeId === t.id) setActiveId(null);
                    }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
              .rm-token{ display:inline-block; padding:2px 6px; border:1px solid var(--border); background:var(--panel); color:var(--text);
                border-radius:8px; font-weight:800; font-size:12px; margin:0 2px; }
            ` }} />
          </>
        )}
      </section>

      {/* Message composer (doar când e activ un template) */}
      {activeId && (
        <section style={card}>
          <h2 style={{ marginTop: 0 }}>Message</h2>

          <div style={{ display: "grid", gap: 8 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Title</label>
              <ContentEditableStable
                ref={titleRef}
                onFocus={()=>setFocusedInput("title")}
                style={{ ...input, minHeight: 38, direction: "ltr", textAlign: "left" }}
                placeholder="Reservation details"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Message</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                <small style={{ color: "var(--muted)" }}>Formatting:</small>
                <button style={btn} onMouseDown={(e)=>e.preventDefault()} onClick={(e)=>{e.preventDefault(); applyBold();}} disabled={!isAdmin}><strong>B</strong></button>
                <button style={btn} onMouseDown={(e)=>e.preventDefault()} onClick={(e)=>{e.preventDefault(); applyItalic();}} disabled={!isAdmin}><span style={{ fontStyle: "italic" }}>I</span></button>
                <button style={btn} onMouseDown={(e)=>e.preventDefault()} onClick={(e)=>{e.preventDefault(); applyUnderline();}} disabled={!isAdmin}><span style={{ textDecoration: "underline" }}>U</span></button>
                <button style={btn} onMouseDown={(e)=>e.preventDefault()} onClick={(e)=>{e.preventDefault(); applyLink();}} disabled={!isAdmin}>Link</button>
              </div>
              <ContentEditableStable
                ref={bodyRef}
                onFocus={()=>setFocusedInput("body")}
                style={{ ...input, minHeight: 260, lineHeight: 1.5, whiteSpace: "pre-wrap", direction: "ltr", textAlign: "left" }}
                placeholder="Your message..."
              />
              <style dangerouslySetInnerHTML={{ __html: `
                [data-placeholder]:empty:before{ content: attr(data-placeholder); color: var(--muted); }
                .rm-token{ display:inline-block; padding:2px 6px; border:1px solid var(--border); background:var(--panel); color:var(--text);
                  border-radius:8px; font-weight:800; font-size:12px; margin:0 2px; }
              `}}/>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button style={btn} onClick={saveDraft} disabled={!isAdmin}>Save</button>
            <button style={btnPri} onClick={publish} disabled={!isAdmin}>Publish</button>
          </div>
        </section>
      )}

      {/* Drawer Room Variables (nu blochează editorul) */}
      {isRVOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex: 50,
            display:"grid", gridTemplateColumns:"1fr min(560px, 92vw)"
          }}
          onClick={(e)=>{ if (e.target === e.currentTarget) setRVOpen(false); }}
        >
          <section style={{
            background:"var(--panel)", borderLeft:"1px solid var(--border)",
            display:"grid", gridTemplateRows:"auto 1fr auto", maxHeight:"100vh"
          }}>
            {/* Header */}
            <div style={{ padding:14, borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8, justifyContent:"space-between" }}>
              <strong>Room variables</strong>
              <button className="sb-btn" onClick={()=>setRVOpen(false)}>Close</button>
            </div>

            {/* Body (scroll) */}
            <div style={{ padding:14, overflow:"auto", display:"grid", gap:14 }}>
              <div>
                <div style={{ fontWeight:700, marginBottom:6 }}>Definiții globale</div>
                <div style={{ color:"var(--muted)", marginBottom:8, fontSize:13 }}>
                  Creează o <em>definiție</em> (ex: „Room key”). Valoarea per cameră o setezi ulterior (alt ecran).
                </div>

                <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                  <input
                    value={newDefLabel}
                    onChange={(e)=>setNewDefLabel(e.currentTarget.value)}
                    placeholder="ex: Room key"
                    style={{ ...input, width:"auto", minWidth:220 }}
                  />
                  <button className="sb-btn sb-btn--primary" onClick={createDefinition} disabled={creatingDef || !isAdmin}>
                    {creatingDef ? "Creating…" : "Create"}
                  </button>
                  {defError && <small style={{ color:"var(--danger)" }}>{defError}</small>}
                </div>
              </div>

              <div>
                <div style={{ fontWeight:700, marginBottom:8 }}>Definiții existente</div>
                {loadingDefs ? (
                  <div style={{ color:"var(--muted)" }}>Loading…</div>
                ) : defs.length === 0 ? (
                  <div style={{ color:"var(--muted)" }}>Nu există încă.</div>
                ) : (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {defs.map((d)=>(
                      <span key={d.id} className="rm-token" title={d.key}>{d.label}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer (sticky) */}
            <div style={{ padding:12, borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
              <small style={{ color:"var(--muted)" }}>
                {creatingDef ? "Saving…" : (defError ? "Error" : "Ready")}
              </small>
              <div style={{ display:"flex", gap:8 }}>
                <button className="sb-btn" onClick={()=>setRVOpen(false)}>Close</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Sub-componente ----------------------------- */

// ContentEditable care nu re-randă după mount (evită salturi ale cursorului)
const ContentEditableStable = React.memo(
  React.forwardRef<HTMLDivElement, { onFocus?: () => void; style?: React.CSSProperties; placeholder?: string }>(
    function CE({ onFocus, style, placeholder }, ref) {
      return (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onFocus={onFocus}
          style={style}
          data-placeholder={placeholder}
        />
      );
    }
  ),
  () => true
);

// Input inline pentru variabile ad-hoc (doar în mesajul curent)
function AddVarInline({ onAdd, disabled }: { onAdd: (name: string) => void; disabled?: boolean }) {
  const [val, setVal] = useState("");
  function submit() {
    const v = val.trim();
    if (!v) return;
    onAdd(v);
    setVal("");
  }
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <input
        value={val}
        onChange={(e)=>setVal(e.currentTarget.value)}
        onKeyDown={(e)=>{ if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        placeholder="Add variable…"
        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)" }}
        disabled={!!disabled}
      />
      <button onClick={submit} disabled={!!disabled} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--primary)", color: "#0c111b", fontWeight: 700 }}>Add</button>
    </span>
  );
}

/* --------- Render titlu grid cu chip-uri (fără acolade în UI) --------- */
function titleToChips(title: string, labelByKey: Record<string,string>): string {
  const esc = (str: string) => str.replace(/[&<>"']/g, (c) => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c] as string
  ));
  const s = String(title || "");
  return s.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => {
    const lab = esc(labelByKey[k] || k);
    return `<span class="rm-token" data-token="${esc(k)}" data-label="${lab}" contenteditable="false">${lab}</span>`;
  });
}