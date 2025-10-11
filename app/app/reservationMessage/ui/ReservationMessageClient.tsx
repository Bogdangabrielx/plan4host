"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePersistentProperty } from "@/app/app/_components/PropertySelection";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import { useHeader } from "@/app/app/_components/HeaderContext";

/** ---------------- Types ---------------- */
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

type Room = { id: string; name: string };
type VarDef = { id: string; key: string; label: string };

/** ---------------- Consts ---------------- */
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

/** ---------------- Utils ---------------- */
function lsKey(pid: string) { return `p4h:rm:template:${pid}`; }
function uid() { return Math.random().toString(36).slice(2, 10); }
function slugify(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
function escapeHtml(s: string) {
  return (s || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] as string));
}
function mdToHtml(src: string) {
  let s = escapeHtml(src);
  s = s.replace(/\[(.+?)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|\s)\*(.+?)\*(?=\s|$)/g, '$1<em>$2</em>');
  s = s.replace(/\n/g, "<br/>");
  return s;
}
function renderTemplateToHtml(t: TemplateState, vars: Record<string, string>) {
  const out: string[] = [];
  for (const b of t.blocks) {
    if (b.type === "divider") out.push('<hr style="border:1px solid var(--border); opacity:.6;"/>');
    else if (b.type === "heading") out.push(`<h3 style="margin:8px 0 6px;">${escapeHtml(replaceVars(b.text, vars))}</h3>`);
    else if (b.type === "paragraph") out.push(`<p style="margin:6px 0; line-height:1.5;">${mdToHtml(replaceVars(b.text, vars))}</p>`);
  }
  return out.join("\n");
}
function replaceVars(s: string, vars: Record<string, string>) {
  if (!s) return "";
  return s.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => (vars?.[k] ?? `{{${k}}}`));
}

/** ---------------- Component ---------------- */
export default function ReservationMessageClient({
  initialProperties,
  isAdmin,
}: {
  initialProperties: Property[];
  isAdmin: boolean;
}) {
  const [properties] = useState<Property[]>(initialProperties);
  const [propertyId, setPropertyId] = usePersistentProperty(properties);
  const [tpl, setTpl] = useState<TemplateState>(EMPTY);
  const [templates, setTemplates] = useState<Array<{ id: string; title: string; status: "draft" | "published"; updated_at: string }>>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [titleText, setTitleText] = useState<string>("");
  const [focusedInput, setFocusedInput] = useState<null | "title" | "body">(null);
  const [saving, setSaving] = useState<"Idle" | "Saving…" | "Synced" | "Error">("Idle");
  const { setPill } = useHeader();
  const titleRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const sb = useMemo(() => createClient(), []);
  const [hasRoomTypes, setHasRoomTypes] = useState(false);

  // Room Variables UI state
  const [rvOpen, setRvOpen] = useState<boolean>(false);
  const [rvTab, setRvTab] = useState<"defs" | "values">("values");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [varDefs, setVarDefs] = useState<VarDef[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [valuesByKey, setValuesByKey] = useState<Record<string, string>>({});
  const [savingRoomValues, setSavingRoomValues] = useState<"Idle" | "Saving…" | "Saved" | "Error">("Idle");
  const [creatingVar, setCreatingVar] = useState<boolean>(false);
  const [newVarName, setNewVarName] = useState<string>("");
  const [rvError, setRvError] = useState<string | null>(null); // <- pentru mesaje clare în modal

  const storageKey = propertyId ? (activeId ? `p4h:rm:template:${activeId}` : lsKey(propertyId)) : "";

  /** --------- Load template list --------- */
  useEffect(() => {
    let alive = true;
    if (!propertyId) { setTemplates([]); setActiveId(null); return; }
    (async () => {
      try {
        setLoadingList(true);
        const res = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(propertyId)}`, { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!alive) return;
        const items = Array.isArray(j?.items) ? j.items : [];
        setTemplates(items.map((x: any) => ({ id: String(x.id), title: String(x.title || ""), status: (x.status || "draft"), updated_at: String(x.updated_at || "") })) as any);
      } finally {
        if (alive) setLoadingList(false);
      }
    })();
    return () => { alive = false; };
  }, [propertyId]);

  /** --------- Load template content (LS + server) --------- */
  useEffect(() => {
    if (!propertyId) return;
    const keySnapshot = storageKey;
    let cancelled = false;

    // clear UI fast
    setTpl(EMPTY);
    setTitleText("");
    if (titleRef.current) tokensTextToChips(titleRef.current, "");
    if (bodyRef.current) bodyRef.current.innerHTML = "";

    // from LS
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
        if (bodyRef.current) bodyRef.current.innerHTML = "";
      }
    }

    // from API
    (async () => {
      try {
        const q = activeId ? `id=${encodeURIComponent(activeId)}` : `property=${encodeURIComponent(propertyId)}`;
        const res = await fetch(`/api/reservation-message/template?${q}`, { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        const t = j?.template;
        if (!t) return;
        const blocks: Block[] = (t.blocks as any[]).map((b) => ({ id: uid(), type: b.type, text: b.text ?? "" }));
        const fields: ManualField[] = (t.fields as any[]).map((f) => ({ uid: uid(), key: f.key, label: f.label, defaultValue: (f as any).default_value ?? null }));
        const next: TemplateState = { status: (t.status || "draft") as any, blocks, fields };
        if (!cancelled && keySnapshot === storageKey) {
          setTpl(next);
          try { localStorage.setItem(keySnapshot, JSON.stringify(next)); } catch {}
          const { title, body } = deriveFromBlocks(blocks);
          if (titleRef.current) tokensTextToChips(titleRef.current, title);
          if (bodyRef.current) bodyRef.current.innerHTML = tokensToChipsHTML(body);
        }
      } catch { /* ignore */ }
    })();

    return () => { cancelled = true; };
  }, [storageKey, propertyId, activeId]);

  /** --------- Detect if property has room types (for room_type chip) --------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!propertyId) { if (alive) setHasRoomTypes(false); return; }
        const r = await sb.from("room_types").select("id").eq("property_id", propertyId).limit(1);
        if (!alive) return;
        setHasRoomTypes((r.data ?? []).length > 0);
      } catch { if (alive) setHasRoomTypes(false); }
    })();
    return () => { alive = false; };
  }, [sb, propertyId]);

  /** --------- Load Rooms + Variable Definitions on property change --------- */
  useEffect(() => {
    if (!propertyId) { setRooms([]); setVarDefs([]); setSelectedRoomId(null); setValuesByKey({}); return; }
    let alive = true;
    (async () => {
      // rooms
      try {
        const r = await sb.from("rooms").select("id,name").eq("property_id", propertyId).order("name", { ascending: true });
        if (!alive) return;
        const rr = (r.data || []).map((x: any) => ({ id: String(x.id), name: String(x.name || "Room") }));
        setRooms(rr);
        setSelectedRoomId(rr[0]?.id || null);
      } catch { if (alive) setRooms([]); }

      // var defs
      try {
        const res = await fetch(`/api/room-variables/definitions?property=${encodeURIComponent(propertyId)}`, { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!alive) return;
        const defs: VarDef[] = Array.isArray(j?.items) ? j.items.map((d: any) => ({ id: String(d.id), key: String(d.key), label: String(d.label || d.key) })) : [];
        setVarDefs(defs);
      } catch {
        if (alive) setVarDefs([]);
      }
    })();
    return () => { alive = false; };
  }, [sb, propertyId]);

  /** --------- Load values for selected room --------- */
  useEffect(() => {
    if (!propertyId || !selectedRoomId) { setValuesByKey({}); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/room-variables/values?property=${encodeURIComponent(propertyId)}&room=${encodeURIComponent(selectedRoomId)}`, { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!alive) return;
        const byKey: Record<string, string> = {};
        const arr: Array<{ key: string; value: string }> = Array.isArray(j?.items) ? j.items : [];
        for (const kv of arr) byKey[String(kv.key)] = String(kv.value ?? "");
        for (const d of varDefs) if (!(d.key in byKey)) byKey[d.key] = "";
        setValuesByKey(byKey);
      } catch {
        if (!alive) return;
        const byKey: Record<string, string> = {};
        for (const d of varDefs) byKey[d.key] = "";
        setValuesByKey(byKey);
      }
    })();
    return () => { alive = false; };
  }, [propertyId, selectedRoomId, varDefs]);

  /** --------- Save/publish actions --------- */
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
  async function syncToServer(status: "draft" | "published", blocks?: Block[]) {
    try {
      setSaving("Saving…");
      const blk = blocks ?? composeBlocks();
      const { title } = deriveFromBlocks(blk);
      const payload: any = {
        id: activeId || undefined,
        property_id: propertyId,
        title,
        status,
        blocks: blk.map((b: any) => ({ type: b.type, text: b.text || null })),
        fields: tpl.fields.map((f) => ({ key: f.key, label: f.label, default_value: f.defaultValue ?? null })),
      };
      const res = await fetch("/api/reservation-message/template", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) { setSaving("Error"); return; }
      if (!activeId && j?.template_id) setActiveId(String(j.template_id));
      try {
        const rl = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(propertyId || "")}`, { cache: "no-store" });
        const jl = await rl.json().catch(() => ({}));
        const items = Array.isArray(jl?.items) ? jl.items : [];
        setTemplates(items.map((x: any) => ({ id: String(x.id), title: String(x.title || ""), status: (x.status || "draft"), updated_at: String(x.updated_at || "") })) as any);
      } catch {}
      setSaving("Synced"); setTimeout(() => setSaving("Idle"), 700);
    } catch { setSaving("Error"); }
  }

  async function onAddNew() {
    if (!propertyId) return;
    const t = prompt("Message title");
    if (!t) return;
    try {
      const res = await fetch("/api/reservation-message/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: propertyId, title: t, status: "draft", blocks: [{ type: "heading", text: t }], fields: [] }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.template_id) throw new Error(j?.error || "Create failed");
      setActiveId(String(j.template_id));
      const rl = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(propertyId)}`, { cache: "no-store" });
      const jl = await rl.json().catch(() => ({}));
      const items = Array.isArray(jl?.items) ? jl.items : [];
      setTemplates(items.map((x: any) => ({ id: String(x.id), title: String(x.title || ""), status: (x.status || "draft"), updated_at: String(x.updated_at || "") })) as any);
    } catch (e: any) { alert(e?.message || "Failed"); }
  }
  async function onDuplicate(id: string, title: string) {
    try {
      const r = await fetch(`/api/reservation-message/template?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      const t = j?.template; if (!t) return;
      const blocks = (t.blocks || []).map((b: any) => ({ type: b.type, text: b.text ?? null }));
      const fields = (t.fields || []).map((f: any) => ({ key: f.key, label: f.label, default_value: f.default_value ?? null }));
      const res = await fetch("/api/reservation-message/template", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: t.property_id, title: `${title} (Copy)`, status: "draft", blocks, fields }),
      });
      const jj = await res.json().catch(() => ({}));
      if (!res.ok || !jj?.template_id) throw new Error(jj?.error || "Duplicate failed");
      setActiveId(String(jj.template_id));
      const rl = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(t.property_id)}`, { cache: "no-store" });
      const jl = await rl.json().catch(() => ({}));
      const items = Array.isArray(jl?.items) ? jl.items : [];
      setTemplates(items.map((x: any) => ({ id: String(x.id), title: String(x.title || ""), status: (x.status || "draft"), updated_at: String(x.updated_at || "") })) as any);
    } catch (e: any) { alert(e?.message || "Failed"); }
  }
  async function onDelete(id: string) {
    if (!confirm("Delete this message?")) return;
    try {
      const r = await fetch(`/api/reservation-message/template?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await r.text());
      const rl = await fetch(`/api/reservation-message/templates?property=${encodeURIComponent(propertyId || "")}`, { cache: "no-store" });
      const jl = await rl.json().catch(() => ({}));
      const items = Array.isArray(jl?.items) ? jl.items : [];
      setTemplates(items.map((x: any) => ({ id: String(x.id), title: String(x.title || ""), status: (x.status || "draft"), updated_at: String(x.updated_at || "") })) as any);
      if (activeId === id) setActiveId(null);
    } catch (e: any) { alert(e?.message || "Failed"); }
  }

  /** --------- Editor helpers --------- */
  function insertVarIntoFocused(token: string) {
    if (focusedInput === "title" && titleRef.current) {
      insertTokenChip(titleRef.current, token.replace(/[{}]/g, ""));
    } else if (focusedInput === "body" && bodyRef.current) {
      insertTokenChip(bodyRef.current, token.replace(/[{}]/g, ""));
    }
  }
  function focusBody() { if (bodyRef.current) { try { bodyRef.current.focus(); } catch {} } }
  function applyBold() { if (focusedInput === "body") { focusBody(); document.execCommand("bold"); } }
  function applyItalic() { if (focusedInput === "body") { focusBody(); document.execCommand("italic"); } }
  function applyUnderline() { if (focusedInput === "body") { focusBody(); document.execCommand("underline"); } }
  function applyLink() {
    const container = focusedInput === "body" ? bodyRef.current : (focusedInput === "title" ? titleRef.current : null);
    if (!container) return;
    const url = prompt("Link URL (https://...)");
    if (!url) return;
    const sel = window.getSelection();
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    const inside = range ? isRangeInside(range, container) : false;
    if (inside && sel && !sel.isCollapsed && sel.toString().trim()) {
      try { container.focus(); document.execCommand("createLink", false, url); } catch {}
    } else {
      const text = prompt("Link text") || url;
      insertAnchorAtCaret(container, url, text);
    }
  }

  /** --------- Custom fields (template-local) --------- */
  function addFieldFromName(name: string) {
    const label = name.trim();
    if (!label) return;
    const key = slugify(label);
    if (!key) return;
    let def: string | null | undefined = null;
    try {
      const ans = prompt("Valoare implicită pentru această variabilă (opțional)");
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

  /** --------- Compose blocks --------- */
  function composeBlocks(): Block[] {
    const blocks: Block[] = [];
    const t = titleTextWithTokens(titleRef.current);
    const bHtml = htmlWithTokens(bodyRef.current?.innerHTML || "").trim();
    if (t) blocks.push({ id: uid(), type: "heading", text: t });
    if (bHtml) blocks.push({ id: uid(), type: "paragraph", text: bHtml });
    return blocks;
  }
  function deriveFromBlocks(blocks: Block[]): { title: string; body: string } {
    let title = "";
    const paras: string[] = [];
    for (const bl of blocks || []) {
      if (bl.type === "heading" && !title) title = (bl as any).text || "";
      if (bl.type === "paragraph") paras.push(((bl as any).text || ""));
    }
    return { title, body: paras.join("") };
  }

  /** --------- Room Variable Definitions (create/delete) --------- */
  async function createDefinition() {
    setRvError(null);
    if (!propertyId || !newVarName.trim()) return;
    const label = newVarName.trim();
    const key = slugify(label);
    if (!key) return;
    try {
      setCreatingVar(true);
      const res = await fetch("/api/room-variables/definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // trimitem și key și label, ca să fim compatibili cu orice variantă de backend
        body: JSON.stringify({ property_id: propertyId, key, label }),
      });

      if (res.status === 404) {
        setRvError("Endpoint-ul pentru definiții lipsește (404). Verifică dacă /app/api/room-variables/definitions/route.ts există în build-ul live.");
        setCreatingVar(false);
        return;
      }

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !(j?.id || j?.definition_id)) {
        throw new Error(j?.error || "Create failed");
      }
      const retId = String(j.id || j.definition_id);
      const retKey = String(j.key || key);
      setVarDefs((prev) => [...prev, { id: retId, key: retKey, label }]);
      setNewVarName("");
    } catch (e: any) {
      setRvError(e?.message || "Create failed");
    } finally {
      setCreatingVar(false);
    }
  }
  async function deleteDefinition(id: string) {
    if (!confirm("Delete this variable for all rooms?")) return;
    setRvError(null);
    try {
      const res = await fetch(`/api/room-variables/definitions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.status === 404) {
        setRvError("Endpoint-ul pentru definiții lipsește (404).");
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setVarDefs((prev) => prev.filter((d) => d.id !== id));
      const def = varDefs.find((d) => d.id === id);
      if (def) setValuesByKey((prev) => { const n = { ...prev }; delete n[def.key]; return n; });
    } catch (e: any) { setRvError(e?.message || "Delete failed"); }
  }

  /** --------- Save Values per Room --------- */
  async function saveValuesForRoom() {
    if (!propertyId || !selectedRoomId) return;
    try {
      setSavingRoomValues("Saving…");
      const payload = { property_id: propertyId, room_id: selectedRoomId, values: valuesByKey };
      const res = await fetch("/api/room-variables/values", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (res.status === 404) {
        setSavingRoomValues("Error");
        setRvError("Endpoint-ul pentru valori lipsește (404).");
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Save failed");
      setSavingRoomValues("Saved");
      setTimeout(() => setSavingRoomValues("Idle"), 800);
    } catch (e: any) {
      setSavingRoomValues("Error");
      setRvError(e?.message || "Save failed");
    }
  }

  /** --------- Styles --------- */
  const card: React.CSSProperties = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 };
  const input: React.CSSProperties = { padding: 10, background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
  const btn: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontWeight: 700, cursor: "pointer" };
  const btnPri: React.CSSProperties = { ...btn, background: "var(--primary)", color: "#0c111b", border: "1px solid var(--border)" };

  useEffect(() => { setPill(saving); }, [saving, setPill]);

  /** --------- Render --------- */
  return (
    <div style={{ display: "grid", gap: 12, fontFamily: "Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}>
      <PlanHeaderBadge title="Automatic Messages" slot="header-right" />

      {/* Property selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Property</label>
        <select className="sb-select" value={propertyId} onChange={(e) => setPropertyId((e.target as HTMLSelectElement).value)} style={{ minWidth: 220 }}>
          {properties.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
        <div style={{ flex: 1 }} />
      </div>

      {/* COLLAPSIBLE: Room Variables */}
      <section className="sb-card" style={{ ...card, padding: 0 }}>
        <button
          onClick={() => setRvOpen((v) => !v)}
          style={{
            width: "100%", textAlign: "left", padding: 14, border: "none",
            background: "transparent", color: "var(--text)", display: "flex",
            justifyContent: "space-between", alignItems: "center", borderRadius: 12, cursor: "pointer",
          }}
        >
          <strong>Room variables</strong>
          <span style={{ opacity: 0.7 }}>{rvOpen ? "▲" : "▼"}</span>
        </button>

        {rvOpen && (
          <div style={{ borderTop: "1px solid var(--border)", padding: 12, display: "grid", gap: 12 }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                style={{ ...btn, background: rvTab === "values" ? "var(--primary)" : "var(--card)", color: rvTab === "values" ? "#0c111b" : "var(--text)" }}
                onClick={() => setRvTab("values")}
              >
                Values (per room)
              </button>
              <button
                style={{ ...btn, background: rvTab === "defs" ? "var(--primary)" : "var(--card)", color: rvTab === "defs" ? "#0c111b" : "var(--text)" }}
                onClick={() => setRvTab("defs")}
              >
                Definitions
              </button>
              {/* status compact în header-ul tab-urilor */}
              {rvError && <span style={{ color: "var(--danger)", fontSize: 12, marginLeft: "auto" }}>{rvError}</span>}
            </div>

            {/* Tab: Values */}
            {rvTab === "values" && (
              <div className="sb-card" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Room</label>
                  <select
                    className="sb-select"
                    value={selectedRoomId || ""}
                    onChange={(e) => setSelectedRoomId(e.currentTarget.value || null)}
                    style={{ minWidth: 220, maxWidth: 360 }}
                  >
                    {rooms.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                  </select>
                </div>

                {varDefs.length === 0 ? (
                  <div className="sb-card" style={{ padding: 16, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>No variables defined</div>
                    <div style={{ color: "var(--muted)" }}>Create one in the <em>Definitions</em> tab.</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {varDefs.map((d) => (
                      <div key={d.id} style={{ display: "grid", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>{d.label}</label>
                          <span className="rm-token" aria-label="Variable key">{d.key}</span>
                        </div>
                        <input
                          value={valuesByKey[d.key] ?? ""}
                          onChange={(e) => {
                            const v = e.currentTarget.value;
                            setValuesByKey((prev) => ({ ...prev, [d.key]: v }));
                          }}
                          placeholder="Value for this room…"
                          style={input}
                        />
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button style={btnPri} onClick={saveValuesForRoom} disabled={!isAdmin || !selectedRoomId || varDefs.length === 0}>
                        Save values
                      </button>
                      <small style={{ color: "var(--muted)", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {savingRoomValues === "Saving…" ? "Saving…" : savingRoomValues === "Saved" ? "Saved" : savingRoomValues === "Error" ? "Error" : ""}
                      </small>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Definitions */}
            {rvTab === "defs" && (
              <div className="sb-card" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gap: 6, maxWidth: 720 }}>
                  <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Add variable</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                    <input
                      value={newVarName}
                      onChange={(e) => { setNewVarName(e.currentTarget.value); setRvError(null); }}
                      placeholder='e.g. "Room Key", "Wifi Password"'
                      style={input}
                      disabled={!isAdmin}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createDefinition(); } }}
                    />
                    <button style={btnPri} onClick={createDefinition} disabled={!isAdmin || creatingVar || !newVarName.trim()}>
                      {creatingVar ? "Adding…" : "Add"}
                    </button>
                  </div>
                  {/* preview cheie generată ca chip, fără acolade */}
                  {newVarName.trim() && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <small style={{ color: "var(--muted)" }}>Key (auto):</small>
                      <span className="rm-token">{slugify(newVarName)}</span>
                    </div>
                  )}
                  {rvError && <small style={{ color: "var(--danger)" }}>{rvError}</small>}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <strong>Existing variables</strong>
                  {varDefs.length === 0 ? (
                    <div className="sb-card" style={{ padding: 16, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 10 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>No variables yet</div>
                      <div style={{ color: "var(--muted)" }}>Add your first one above.</div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 6 }}>
                      {varDefs.map((d) => (
                        <div key={d.id} className="sb-card" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
                          <div style={{ display: "grid", gap: 4 }}>
                            <div style={{ fontWeight: 700 }}>{d.label}</div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <small style={{ color: "var(--muted)" }}>Key:</small>
                              <span className="rm-token">{d.key}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              style={{ ...btn, borderColor: "var(--danger)" }}
                              onClick={() => deleteDefinition(d.id)}
                              disabled={!isAdmin}
                              title="Delete variable"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Variables row: built-ins + GLOBAL ROOM VARS + custom (template-local) — doar când un template e activ */}
      {activeId && (
        <section style={card}>
          <h2 style={{ marginTop: 0 }}>Variables</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <small style={{ color: "var(--muted)" }}>Insert:</small>
            {BUILTIN_VARS.map((v) => (
              <button key={v.key} style={btn} onClick={() => insertVarIntoFocused(`{{${v.key}}}`)} title={v.label}>{v.key}</button>
            ))}
            {hasRoomTypes && (
              <button key="room_type" style={btn} onClick={() => insertVarIntoFocused(`{{room_type}}`)} title="Room type">room_type</button>
            )}
            {/* GLOBAL ROOM VARS */}
            {varDefs.map((v) => (
              <button key={`global:${v.key}`} style={btn} onClick={() => insertVarIntoFocused(`{{${v.key}}}`)} title={v.label}>{v.key}</button>
            ))}
            {/* OLD per-template custom vars (kept) */}
            {tpl.fields.map((f) => (
              <span key={f.uid} className="rm-token" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <button style={btn} onClick={() => insertVarIntoFocused(`{{${f.key}}}`)} title={f.label}>{f.key}</button>
                {typeof f.defaultValue === "string" && (<small style={{ color: "var(--muted)" }}>= {f.defaultValue || '""'}</small>)}
                <button
                  style={{ ...btn, border: "1px solid var(--border)" }}
                  onClick={() => {
                    try {
                      const cur = typeof f.defaultValue === "string" ? f.defaultValue : "";
                      const ans = prompt("Setează valoarea implicită", cur);
                      if (ans !== null) {
                        setTpl((prev) => ({ ...prev, fields: prev.fields.map((x) => x.uid === f.uid ? { ...x, defaultValue: ans } : x) }));
                      }
                    } catch {}
                  }}
                  title="Set default value"
                >
                  ✎
                </button>
                <button style={{ ...btn, border: "1px solid var(--danger)" }} onClick={() => removeFieldByUid(f.uid)} title="Remove">×</button>
              </span>
            ))}
            <AddVarInline onAdd={(name) => addFieldFromName(name)} disabled={!isAdmin} />
          </div>
        </section>
      )}

      {/* Templates header + grid */}
      <section className="sb-card" style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
          <strong>Templates</strong>
          <button className="sb-btn sb-btn--primary" onClick={onAddNew}>Add template</button>
        </div>
        {loadingList ? (
          <div style={{ color: "var(--muted)" }}>Loading…</div>
        ) : templates.length === 0 ? (
          <div className="sb-card" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>No templates yet</div>
            <div style={{ color: "var(--muted)", marginBottom: 10 }}>Create your first template for this property.</div>
            <button className="sb-btn sb-btn--primary" onClick={onAddNew}>Create your first template</button>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="sb-card"
                  onClick={() => setActiveId(t.id)}
                  style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 12, display: "grid", gap: 6, cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <strong
                      style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      dangerouslySetInnerHTML={{ __html: titleToChips(t.title || "(Untitled)") }}
                    />
                    <span className="sb-badge" style={{ background: t.status === "published" ? "var(--primary)" : "var(--card)", color: t.status === "published" ? "#0c111b" : "var(--muted)" }}>{t.status}</span>
                  </div>
                  <small style={{ color: "var(--muted)" }}>Updated: {new Date(t.updated_at).toLocaleString()}</small>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button className="sb-btn" onClick={(e) => { e.stopPropagation(); setActiveId(t.id); }}>Edit</button>
                    <button className="sb-btn" onClick={(e) => { e.stopPropagation(); onDuplicate(t.id, t.title); }}>Duplicate</button>
                    <button className="sb-btn" onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
            <style dangerouslySetInnerHTML={{ __html: `.rm-token{ display:inline-block; padding: 2px 6px; border:1px solid var(--border); background: var(--panel); color: var(--text); border-radius: 8px; font-weight: 800; font-size: 12px; margin: 0 2px; }` }} />
          </>
        )}
      </section>

      {/* Message composer — only when a template is active */}
      {activeId && (
        <section style={card}>
          <h2 style={{ marginTop: 0 }}>Message</h2>

          <div style={{ display: "grid", gap: 8 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Title</label>
              <ContentEditableStable
                ref={titleRef}
                onFocus={() => setFocusedInput("title")}
                style={{ ...input, minHeight: 38, direction: "ltr", textAlign: "left" }}
                placeholder="Reservation details"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Message</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                <small style={{ color: "var(--muted)" }}>Formatting:</small>
                <button style={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); applyBold(); }} disabled={!isAdmin}><strong>B</strong></button>
                <button style={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); applyItalic(); }} disabled={!isAdmin}><span style={{ fontStyle: "italic" }}>I</span></button>
                <button style={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); applyUnderline(); }} disabled={!isAdmin}><span style={{ textDecoration: "underline" }}>U</span></button>
                <button style={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); applyLink(); }} disabled={!isAdmin}>Link</button>
              </div>
              <ContentEditableStable
                ref={bodyRef}
                onFocus={() => setFocusedInput("body")}
                style={{ ...input, minHeight: 260, lineHeight: 1.5, whiteSpace: "pre-wrap", direction: "ltr", textAlign: "left" }}
                placeholder="Your message..."
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
          </div>
        </section>
      )}
    </div>
  );
}

/** ---------------- CE (stable) ---------------- */
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

/** ---------------- Inline Add Var (template-local; kept) ---------------- */
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
        onChange={(e) => setVal(e.currentTarget.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        placeholder="Add variable…"
        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)" }}
        disabled={!!disabled}
      />
      <button onClick={submit} disabled={!!disabled} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--primary)", color: "#0c111b", fontWeight: 700 }}>Add</button>
    </span>
  );
}

/** ---------------- ContentEditable helpers ---------------- */
function insertTokenChip(container: HTMLDivElement, key: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) { container.focus(); return; }
  const range = sel.getRangeAt(0);
  let node: Node | null = range.commonAncestorContainer;
  let inside = false;
  while (node) { if (node === container) { inside = true; break; } node = node.parentNode; }
  if (!inside) { container.focus(); return; }
  const chip = document.createElement("span");
  chip.className = "rm-token";
  chip.setAttribute("data-token", key);
  chip.contentEditable = "false";
  chip.textContent = key;
  range.deleteContents();
  range.insertNode(chip);
  const space = document.createTextNode(" ");
  chip.after(space);
  sel.collapse(space, 1);
}
function isRangeInside(range: Range, container: HTMLElement): boolean {
  let node: Node | null = range.commonAncestorContainer;
  while (node) { if (node === container) return true; node = node.parentNode; }
  return false;
}
function insertAnchorAtCaret(container: HTMLDivElement, url: string, text: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) { container.focus(); return; }
  const range = sel.getRangeAt(0);
  if (!isRangeInside(range, container)) { try { container.focus(); } catch {} }
  const a = document.createElement("a");
  a.href = url; a.target = "_blank"; a.rel = "noreferrer"; a.textContent = text || url;
  range.deleteContents();
  range.insertNode(a);
  const space = document.createTextNode(" ");
  a.after(space);
  sel.collapse(space, 1);
}
function tokensTextToChips(container: HTMLDivElement, text: string) {
  const s = text || "";
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  container.innerHTML = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const before = s.slice(last, m.index);
    if (before) container.appendChild(document.createTextNode(before));
    const chip = document.createElement("span");
    chip.className = "rm-token";
    chip.setAttribute("data-token", m[1]);
    chip.contentEditable = "false";
    chip.textContent = m[1];
    container.appendChild(chip);
    container.appendChild(document.createTextNode(" "));
    last = m.index + m[0].length;
  }
  const tail = s.slice(last);
  if (tail) container.appendChild(document.createTextNode(tail));
}
function titleTextWithTokens(el: HTMLDivElement | null): string {
  if (!el) return "";
  const nodes = Array.from(el.childNodes);
  let out = "";
  for (const n of nodes) {
    if (n.nodeType === 3) out += n.nodeValue || "";
    else if (n instanceof HTMLElement && n.classList.contains("rm-token")) {
      const k = n.getAttribute("data-token") || "";
      out += `{{${k}}}`;
    } else out += (n.textContent || "");
  }
  return out.trim();
}
function tokensToChipsHTML(html: string): string {
  if (!html) return "";
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => `<span class="rm-token" data-token="${k}" contenteditable="false">${k}</span>`);
}
function htmlWithTokens(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  tmp.querySelectorAll("span.rm-token[data-token]").forEach((el) => {
    const k = el.getAttribute("data-token") || "";
    el.replaceWith(document.createTextNode(`{{${k}}}`));
  });
  tmp.querySelectorAll("[contenteditable], [data-placeholder]").forEach((el) => {
    el.removeAttribute("contenteditable");
    el.removeAttribute("data-placeholder");
  });
  return tmp.innerHTML;
}
function markdownToHtmlInline(src: string): string {
  let s = escapeHtml(src || "");
  s = s.replace(/\[(.+?)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+?)__/g, "<u>$1</u>");
  s = s.replace(/(^|\s)\*(.+?)\*(?=\s|$)/g, "$1<em>$2</em>");
  s = s.replace(/\n/g, "<br/>");
  return s;
}
function titleToChips(title: string): string {
  const esc = (str: string) => str.replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;","&gt;":">","\"":"&quot;","'":"&#39;"}[c] as string));
  const s = String(title || "");
  return s.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => `<span class="rm-token" data-token="${esc(k)}" contenteditable="false">${esc(k)}</span>`);
}