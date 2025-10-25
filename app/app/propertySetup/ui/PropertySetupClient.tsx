"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
// import PropertySidebar from "./PropertySidebar"; // replaced by top pill selector
import SettingsTab from "./SettingsTab";
import RoomsTab from "./RoomsTab";
import RoomDetailsTab from "./RoomDetailsTab";
import CleaningTab from "./CleaningTab";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import { useHeader } from "@/app/app/_components/HeaderContext";
import { usePersistentProperty } from "@/app/app/_components/PropertySelection";

type Property = { id: string; name: string; check_in_time: string | null; check_out_time: string | null; };
type Room = { id: string; name: string; capacity: number | null; property_id: string; sort_index: number; room_type_id: string | null };
type CheckDef = { id: string; property_id: string; label: string; default_value: boolean; sort_index: number };
type TextDef  = { id: string; property_id: string; label: string; placeholder: string | null; sort_index: number };
type TaskDef  = { id: string; property_id: string; label: string; sort_index: number };
type RoomType = { id: string; property_id: string; name: string };

type Plan = "basic" | "standard" | "premium";

export default function PropertySetupClient({ initialProperties }: { initialProperties: Property[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<"Idle" | "Saving…" | "Synced" | "Error">("Idle");
  const [isSmall, setIsSmall] = useState(false);

  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [selectedId, setSelectedId] = usePersistentProperty(properties);

  const [rooms, setRooms]     = useState<Room[]>([]);
  const [checks, setChecks]   = useState<CheckDef[]>([]);
  const [texts, setTexts]     = useState<TextDef[]>([]);
  const [tasks, setTasks]     = useState<TaskDef[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);

  const [plan, setPlan] = useState<Plan | null>(null);
  const selected = properties.find(p => p.id === selectedId) || null;
  // First-time guidance modal (after first property creation)
  const [showRoomsGuide, setShowRoomsGuide] = useState<boolean>(false);
  // Cache property presentation images for avatar in the pill
  const [propertyPhotos, setPropertyPhotos] = useState<Record<string, string | null>>({});

  const { setTitle, setPill } = useHeader();
  useEffect(() => { setTitle("Property Setup"); }, [setTitle]);
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const guide = (u.searchParams.get('guide') || '').toLowerCase();
      if (guide === 'rooms') setShowRoomsGuide(true);
    } catch { /* noop */ }
  }, []);

  // Detect small screens (fallback override if CSS not applied yet on device)
  useEffect(() => {
    const detect = () => {
      if (typeof window === "undefined") return;
      try { setIsSmall(window.matchMedia("(max-width: 768px)").matches); } catch { setIsSmall(window.innerWidth < 768); }
    };
    detect();
    window.addEventListener("resize", detect);
    return () => window.removeEventListener("resize", detect);
  }, []);


  // Header pill mirrors page status
  useEffect(() => {
    setPill(
      status === "Saving…" ? "Saving…" :
      status === "Synced"  ? "Synced"  :
      status === "Error"   ? "Error"   : "Idle"
    );
  }, [status, setPill]);

  // Load effective plan for current membership (used for gating Cleaning tab)
  useEffect(() => {
    (async () => {
      const res = await supabase.rpc("account_current_plan");
      const p = (res.data as string | null)?.toLowerCase?.() as Plan | null;
      setPlan((p ?? 'basic') as Plan);
    })();
  }, [supabase]);

  // Role/scopes gating: admin or editor with 'propertySetup' can write
  const [canWrite, setCanWrite] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        const me = j?.me as { role?: string; scopes?: string[]; disabled?: boolean } | undefined;
        if (!me) { setCanWrite(false); return; }
        const sc = new Set((me.scopes || []) as string[]);
        const allowed = !me.disabled && (
          me.role === 'admin' ||
          (me.role === 'editor' && (sc.has('property_setup') || sc.has('propertySetup')))
        );
        setCanWrite(!!allowed);
      } catch { setCanWrite(false); }
    })();
  }, []);

  // Load data for selected property
  useEffect(() => {
    if (!selectedId) return;
    // Load presentation image (once per property id)
    (async () => {
      if (propertyPhotos[selectedId] !== undefined) return;
      try {
        const r = await supabase
          .from('properties')
          .select('presentation_image_url')
          .eq('id', selectedId)
          .maybeSingle();
        const url = (r.data as any)?.presentation_image_url || null;
        setPropertyPhotos(prev => ({ ...prev, [selectedId]: url }));
      } catch {
        setPropertyPhotos(prev => ({ ...prev, [selectedId]: null }));
      }
    })();
    (async () => {
      setStatus("Idle");
      const [r1, r2, r3, r4, r5] = await Promise.all([
        supabase.from("rooms")
          .select("id,name,capacity,property_id,sort_index,room_type_id,created_at")
          .eq("property_id", selectedId)
          .order("sort_index", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase.from("room_detail_checks")
          .select("id,property_id,label,default_value,sort_index")
          .eq("property_id", selectedId)
          .order("sort_index", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase.from("room_detail_text_fields")
          .select("id,property_id,label,placeholder,sort_index")
          .eq("property_id", selectedId)
          .order("sort_index", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase.from("cleaning_task_defs")
          .select("id,property_id,label,sort_index")
          .eq("property_id", selectedId)
          .order("sort_index", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase.from("room_types")
          .select("id,property_id,name,created_at")
          .eq("property_id", selectedId)
          .order("created_at", { ascending: true })
      ]);

      if (r1.error || r2.error || r3.error || r4.error || r5.error) {
        setStatus("Error");
        setRooms([]); setChecks([]); setTexts([]); setTasks([]); setRoomTypes([]);
      } else {
        setRooms((r1.data ?? []) as Room[]);
        setChecks((r2.data ?? []) as CheckDef[]);
        setTexts((r3.data ?? []) as TextDef[]);
        setTasks((r4.data ?? []) as TaskDef[]);
        setRoomTypes((r5.data ?? []) as RoomType[]);
        setStatus("Idle");
      }
    })();
  }, [selectedId, supabase]);

  function startSaving(){ setStatus("Saving…"); }
  function finishSaving(ok:boolean){ setStatus(ok ? "Synced" : "Error"); setTimeout(() => setStatus("Idle"), 800); }

  // SETTINGS
  async function saveTime(field: "check_in_time" | "check_out_time", value: string) {
    if (!canWrite) return;
    if (!selected) return;
    startSaving();
    const { error } = await supabase.from("properties").update({ [field]: value }).eq("id", selected.id);
    if (!error) setProperties(prev => prev.map(p => p.id === selected.id ? { ...p, [field]: value } as any : p));
    finishSaving(!error);
  }

  // ROOMS
  async function addRoom() {
    if (!canWrite) return;
    if (!selected) return;
    startSaving();
    const nextIndex = rooms.length;
    const { data, error } = await supabase
      .from("rooms")
      .insert({ name: `Room ${nextIndex + 1}`, property_id: selected.id, sort_index: nextIndex })
      .select("id,name,capacity,property_id,sort_index,room_type_id")
      .single();
    if (!error && data) setRooms(prev => [...prev, data as Room]);
    finishSaving(!error);
  }
  async function renameRoom(roomId: string, name: string) {
    if (!canWrite) return;
    startSaving();
    const { error } = await supabase.from("rooms").update({ name }).eq("id", roomId);
    if (!error) setRooms(prev => prev.map(r => r.id === roomId ? { ...r, name } : r));
    finishSaving(!error);
  }
  async function deleteRoom(roomId: string) {
    if (!canWrite) return;
    startSaving();
    const { error } = await supabase.from("rooms").delete().eq("id", roomId);
    if (!error) {
      const filtered = rooms.filter(r => r.id !== roomId).sort((a,b) => a.sort_index - b.sort_index);
      const reindexed = filtered.map((r, i) => ({ ...r, sort_index: i }));
      setRooms(reindexed);
      for (const r of reindexed) await supabase.from("rooms").update({ sort_index: r.sort_index }).eq("id", r.id);
    }
    finishSaving(!error);
  }
  async function moveRoom(roomId: string, dir: "up" | "down") {
    if (!canWrite) return;
    const idx = rooms.findIndex(r => r.id === roomId);
    if (idx < 0) return;
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= rooms.length) return;
    startSaving();
    const a = rooms[idx], b = rooms[swapWith];
    const newA = { ...a, sort_index: b.sort_index }, newB = { ...b, sort_index: a.sort_index };
    const clone = rooms.slice(); clone[idx] = newA; clone[swapWith] = newB; clone.sort((x,y) => x.sort_index - y.sort_index);
    setRooms(clone);
    const e1 = (await supabase.from("rooms").update({ sort_index: newA.sort_index }).eq("id", newA.id)).error;
    const e2 = (await supabase.from("rooms").update({ sort_index: newB.sort_index }).eq("id", newB.id)).error;
    finishSaving(!(e1 || e2));
  }

  // ROOM TYPES (create / rename / delete)
  async function addRoomType(name: string) {
    if (!canWrite) return;
    if (!selected) return;
    startSaving();
    const { data, error } = await supabase.from("room_types").insert({ property_id: selected.id, name }).select().single();
    if (!error && data) setRoomTypes(prev => [...prev, data as RoomType]);
    finishSaving(!error);
  }
  async function renameRoomType(id: string, name: string) {
    if (!canWrite) return;
    startSaving();
    const { error } = await supabase.from("room_types").update({ name }).eq("id", id);
    if (!error) setRoomTypes(prev => prev.map(t => t.id === id ? { ...t, name } : t));
    finishSaving(!error);
  }
  async function deleteRoomType(id: string) {
    if (!canWrite) return;
    startSaving();
    const { error } = await supabase.from("room_types").delete().eq("id", id);
    if (!error) {
      setRoomTypes(prev => prev.filter(t => t.id !== id));
      setRooms(prev => prev.map(r => r.room_type_id === id ? { ...r, room_type_id: null } : r)); // reflect ON DELETE SET NULL
    }
    finishSaving(!error);
  }

  // ASSIGN type to room
  async function setRoomType(roomId: string, typeId: string | null) {
    if (!canWrite) return;
    startSaving();
    const { error } = await supabase.from("rooms").update({ room_type_id: typeId }).eq("id", roomId);
    if (!error) setRooms(prev => prev.map(r => r.id === roomId ? { ...r, room_type_id: typeId } : r));
    finishSaving(!error);
  }

  const hasStandardOrBetter = plan === "standard" || plan === "premium";

  return (
    <div style={{ fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      <div style={{ margin: '0 auto', width: 'min(1400px, calc(100vw - 32px))' }}>
        <PlanHeaderBadge title="Property Setup" slot="header-right" />

        {showRoomsGuide && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e)=>{ e.stopPropagation(); /* require OK */ }}
            style={{ position:'fixed', inset:0, zIndex: 240, background:'rgba(0,0,0,0.55)', display:'grid', placeItems:'center', padding:12,
                     paddingTop:'calc(var(--safe-top, 0px) + 12px)', paddingBottom:'calc(var(--safe-bottom, 0px) + 12px)' }}>
            <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(560px, 100%)', background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:16, display:'grid', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <strong>Next steps</strong>
              </div>
              <div style={{ color:'var(--text)' }}>
                Please add your rooms and, if you use them, define room types.
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button className="sb-btn sb-btn--primary" onClick={()=>{ setShowRoomsGuide(false); try { window.dispatchEvent(new CustomEvent('p4h:activateRoomsTab')); } catch {} }}>OK</button>
              </div>
            </div>
          </div>
        )}

        {/* Top property selector pill (desktop + mobile) */}
        <div className="sb-toolbar" style={{ gap: isSmall ? 12 : 20, flexWrap: 'wrap', marginBottom: 10, width: '100%', maxWidth: 904, marginInline: 'auto' }}>
          <div
            className="Sb-cardglow"
            style={{
              position: 'relative',
              display: isSmall ? 'grid' : 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: isSmall ? '8px 10px 8px 56px' : '6px 10px 6px 56px',
              borderRadius: 999,
              minHeight: 56,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              width: isSmall ? '100%' : undefined,
              flexBasis: isSmall ? '100%' : 'auto',
              flex: isSmall ? '1 1 100%' : undefined,
            }}
          >
            {selectedId && propertyPhotos[selectedId] ? (
              <img
                src={propertyPhotos[selectedId] as string}
                alt=""
                width={40}
                height={40}
                style={{ position: 'absolute', left: 8, width: 40, height: 40, borderRadius: 999, objectFit: 'cover', border: '2px solid var(--card)' }}
              />
            ) : null}
            <select
              className="sb-select"
              value={selectedId || ''}
              onChange={(e) => setSelectedId((e.target as HTMLSelectElement).value)}
              style={{
                background: 'transparent', border: 0, boxShadow: 'none',
                padding: '10px 12px', minHeight: 44,
                minWidth: isSmall ? '100%' : 220,
                maxWidth: isSmall ? '100%' : 380,
                width: isSmall ? '100%' : 'auto',
                fontFamily: 'inherit', fontWeight: 700,
              }}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content card under the selector (desktop + mobile) */}
        <section
            className="sb-cardglow"
            style={{
              padding: 20,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 904,          // keep previous main width on desktop
              justifySelf: 'center',  // center within the grid track
            }}
          >
            {!selected ? (
              <p>Please select a property above.</p>
            ) : (
              <Tabs
              settings={<SettingsTab property={selected} onChange={(k, v) => saveTime(k, v)} />}
              rooms={
                <RoomsTab
                  rooms={rooms}
                  roomTypes={roomTypes}
                  onAddRoom={addRoom}
                  onRenameRoom={renameRoom}
                  onDeleteRoom={deleteRoom}
                  onMoveRoom={moveRoom}
                  onAddType={addRoomType}
                  onRenameType={renameRoomType}
                  onDeleteType={deleteRoomType}
                  onAssignType={setRoomType}
                  plan={plan}
                />
              }
              roomDetails={
                <RoomDetailsTab
                  checks={checks}
                  texts={texts}
                  onAddCheck={async () => {
                    if (!canWrite) return;
                    if (!selected) return;
                    startSaving();
                    const next = checks.length;
                    const { data, error } = await supabase
                      .from("room_detail_checks")
                      .insert({ property_id: selected.id, label: `Checklist item ${next + 1}`, default_value: false, sort_index: next })
                      .select("id,property_id,label,default_value,sort_index")
                      .single();
                    if (!error && data) setChecks(prev => [...prev, data as CheckDef]);
                    finishSaving(!error);
                  }}
                  onRenameCheck={async (id, label) => {
                    if (!canWrite) return;
                    startSaving();
                    const { error } = await supabase.from("room_detail_checks").update({ label }).eq("id", id);
                    if (!error) setChecks(prev => prev.map(c => c.id === id ? { ...c, label } : c));
                    finishSaving(!error);
                  }}
                  onToggleCheckDefault={async (id, v) => {
                    if (!canWrite) return;
                    startSaving();
                    const { error } = await supabase.from("room_detail_checks").update({ default_value: v }).eq("id", id);
                    if (!error) setChecks(prev => prev.map(c => c.id === id ? { ...c, default_value: v } : c));
                    finishSaving(!error);
                  }}
                  onDeleteCheck={async (id) => {
                    if (!canWrite) return;
                    startSaving();
                    const { error } = await supabase.from("room_detail_checks").delete().eq("id", id);
                    if (!error) {
                      const filtered = checks.filter(c => c.id !== id).sort((a,b)=>a.sort_index-b.sort_index);
                      const reindexed = filtered.map((c,i)=>({ ...c, sort_index: i }));
                      setChecks(reindexed);
                      for (const c of reindexed) await supabase.from("room_detail_checks").update({ sort_index: c.sort_index }).eq("id", c.id);
                    }
                    finishSaving(!error);
                  }}
                  onMoveCheck={async (id, dir) => {
                    if (!canWrite) return;
                    const idx = checks.findIndex(c => c.id === id); if (idx < 0) return;
                    const swap = dir === "up" ? idx - 1 : idx + 1; if (swap < 0 || swap >= checks.length) return;
                    startSaving();
                    const a = checks[idx], b = checks[swap];
                    const newA = { ...a, sort_index: b.sort_index }, newB = { ...b, sort_index: a.sort_index };
                    const clone = checks.slice(); clone[idx] = newA; clone[swap] = newB; clone.sort((x,y)=>x.sort_index-y.sort_index);
                    setChecks(clone);
                    const e1 = (await supabase.from("room_detail_checks").update({ sort_index: newA.sort_index }).eq("id", newA.id)).error;
                    const e2 = (await supabase.from("room_detail_checks").update({ sort_index: newB.sort_index }).eq("id", newB.id)).error;
                    finishSaving(!(e1||e2));
                  }}
                  onAddText={async () => {
                    if (!canWrite) return;
                    if (!selected) return;
                    startSaving();
                    const next = texts.length;
                    const { data, error } = await supabase
                      .from("room_detail_text_fields")
                      .insert({ property_id: selected.id, label: `Title for Notes Tab ${next + 1}`, placeholder: "", sort_index: next })
                      .select("id,property_id,label,placeholder,sort_index")
                      .single();
                    if (!error && data) setTexts(prev => [...prev, data as TextDef]);
                    finishSaving(!error);
                  }}
                  onRenameText={async (id, label) => {
                    if (!canWrite) return;
                    startSaving();
                    const { error } = await supabase.from("room_detail_text_fields").update({ label }).eq("id", id);
                    if (!error) setTexts(prev => prev.map(t => t.id === id ? { ...t, label } : t));
                    finishSaving(!error);
                  }}
                  onPlaceholderText={async (id, placeholder) => {
                    if (!canWrite) return;
                    startSaving();
                    const { error } = await supabase.from("room_detail_text_fields").update({ placeholder }).eq("id", id);
                    if (!error) setTexts(prev => prev.map(t => t.id === id ? { ...t, placeholder } : t));
                    finishSaving(!error);
                  }}
                  onDeleteText={async (id) => {
                    if (!canWrite) return;
                    startSaving();
                    const { error } = await supabase.from("room_detail_text_fields").delete().eq("id", id);
                    if (!error) {
                      const filtered = texts.filter(t => t.id !== id).sort((a,b)=>a.sort_index-b.sort_index);
                      const reindexed = filtered.map((t,i)=>({ ...t, sort_index: i }));
                      setTexts(reindexed);
                      for (const t of reindexed) await supabase.from("room_detail_text_fields").update({ sort_index: t.sort_index }).eq("id", t.id);
                    }
                    finishSaving(!error);
                  }}
                  onMoveText={async (id, dir) => {
                    if (!canWrite) return;
                    const idx = texts.findIndex(t => t.id === id); if (idx < 0) return;
                    const swap = dir === "up" ? idx - 1 : idx + 1; if (swap < 0 || swap >= texts.length) return;
                    startSaving();
                    const a = texts[idx], b = texts[swap];
                    const newA = { ...a, sort_index: b.sort_index }, newB = { ...b, sort_index: a.sort_index };
                    const clone = texts.slice(); clone[idx] = newA; clone[swap] = newB; clone.sort((x,y)=>x.sort_index-y.sort_index);
                    setTexts(clone);
                    const e1 = (await supabase.from("room_detail_text_fields").update({ sort_index: newA.sort_index }).eq("id", newA.id)).error;
                    const e2 = (await supabase.from("room_detail_text_fields").update({ sort_index: newB.sort_index }).eq("id", newB.id)).error;
                    finishSaving(!(e1||e2));
                  }}
                />
              }
              cleaning={
                plan === null ? (
                  <div style={{ color: "var(--muted)" }}>Loading plan…</div>
                ) : hasStandardOrBetter ? (
                  <CleaningTab
                    tasks={tasks.map(t => ({ id: t.id, label: t.label, sort_index: t.sort_index }))}
                    onAdd={async () => {
                      if (!canWrite || !selected) return;
                      startSaving();
                      const next = tasks.length;
                      const { data, error } = await supabase
                        .from("cleaning_task_defs")
                        .insert({ property_id: selected.id, label: `Task ${next + 1}`, sort_index: next })
                        .select("id,property_id,label,sort_index")
                        .single();
                      if (!error && data) setTasks(prev => [...prev, data as TaskDef]);
                      finishSaving(!error);
                    }}
                    onRename={(id, label) => {
                      if (!canWrite) return Promise.resolve();
                      startSaving();
                      return supabase.from("cleaning_task_defs").update({ label }).eq("id", id).then(({ error }) => {
                        if (!error) setTasks(prev => prev.map(t => t.id === id ? { ...t, label } : t));
                        finishSaving(!error);
                      });
                    }}
                    onDelete={async (id) => {
                      if (!canWrite) return;
                      startSaving();
                      const { error } = await supabase.from("cleaning_task_defs").delete().eq("id", id);
                      if (!error) {
                        const filtered = tasks.filter(t => t.id !== id).sort((a,b)=>a.sort_index-b.sort_index);
                        const reindexed = filtered.map((t,i)=>({ ...t, sort_index: i }));
                        setTasks(reindexed);
                        for (const t of reindexed) await supabase.from("cleaning_task_defs").update({ sort_index: t.sort_index }).eq("id", t.id);
                      }
                      finishSaving(!error);
                    }}
                    onMove={async (id, dir) => {
                      if (!canWrite) return;
                      const idx = tasks.findIndex(t => t.id === id); if (idx < 0) return;
                      const swap = dir === "up" ? idx - 1 : idx + 1; if (swap < 0 || swap >= tasks.length) return;
                      startSaving();
                      const a = tasks[idx], b = tasks[swap];
                      const newA = { ...a, sort_index: b.sort_index }, newB = { ...b, sort_index: a.sort_index };
                      const clone = tasks.slice(); clone[idx] = newA; clone[swap] = newB; clone.sort((x,y)=>x.sort_index-y.sort_index);
                      setTasks(clone);
                      const e1 = (await supabase.from("cleaning_task_defs").update({ sort_index: newA.sort_index }).eq("id", newA.id)).error;
                      const e2 = (await supabase.from("cleaning_task_defs").update({ sort_index: newB.sort_index }).eq("id", newB.id)).error;
                      finishSaving(!(e1||e2));
                    }}
                  />
                ) : (
                  <div
                    style={{
                      background: "var(--panel)",
                      border: "1px dashed var(--border)",
                      borderRadius: 12,
                      padding: 16,
                      display: "grid",
                      gap: 8
                    }}
                  >
                    <h3 style={{ margin: 0 }}>Cleaning tasks</h3>
                    <p style={{ color: "var(--muted)", margin: 0 }}>
                      Available on <strong>Standard</strong> and <strong>Premium</strong> plans.
                    </p>
                    <div>
                      <a
                        href="/app/billing"
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: "var(--primary)",
                          color: "#0c111b",
                          fontWeight: 800,
                          textDecoration: "none"
                        }}
                      >
                        Upgrade plan
                      </a>
                    </div>
                  </div>
                )
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}

function Tabs({ settings, rooms, roomDetails, cleaning, highlightRooms, onTabSelect, activateRooms }:{
  settings: React.ReactNode; rooms: React.ReactNode; roomDetails: React.ReactNode; cleaning: React.ReactNode;
  highlightRooms?: boolean; onTabSelect?: (tab: 'settings'|'rooms'|'roomdetails'|'cleaning') => void; activateRooms?: number;
}) {
  const [tab, setTab] = useState<"settings" | "rooms" | "roomdetails" | "cleaning">("settings");
  const [hl, setHl] = useState<boolean>(false);
  // Prop-driven highlight
  useEffect(() => { if (highlightRooms) setHl(true); }, [highlightRooms]);
  // Event-driven activation + highlight
  useEffect(() => {
    function onActivate() {
      setTab('rooms');
      onTabSelect?.('rooms');
      setHl(true);
    }
    window.addEventListener('p4h:activateRoomsTab', onActivate);
    return () => window.removeEventListener('p4h:activateRoomsTab', onActivate);
  }, [onTabSelect]);
  // Counter-driven activation (if parent passes a tick)
  useEffect(() => {
    if (activateRooms && activateRooms > 0) {
      setTab('rooms');
      onTabSelect?.('rooms');
      setHl(true);
    }
  }, [activateRooms, onTabSelect]);
  return (
    <div style={{ display: "grid", gap: 12}} className="psTabs">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="psTabsBar">
        <button onClick={() => { setTab("settings"); onTabSelect?.('settings'); }}    style={tabBtn(tab === "settings")} className="psTabBtn">Check-in/out Time</button>
        <button
          onClick={() => { setTab("rooms"); onTabSelect?.('rooms'); }}
          style={{
            ...tabBtn(tab === "rooms"),
            ...((hl || highlightRooms) && tab !== 'rooms' ? { border: '2px solid var(--primary)', boxShadow: '0 0 0 4px color-mix(in srgb, var(--primary) 25%, transparent)' } : null),
          }}
          className="psTabBtn"
        >Rooms</button>
        <button onClick={() => { setTab("roomdetails"); onTabSelect?.('roomdetails'); }} style={tabBtn(tab === "roomdetails")} className="psTabBtn">Room details</button>
        <button onClick={() => { setTab("cleaning"); onTabSelect?.('cleaning'); }}    style={tabBtn(tab === "cleaning")} className="psTabBtn">Cleaning</button>
      </div>
      <div>
        {tab === "settings"    && settings}
        {tab === "rooms"       && rooms}
        {tab === "roomdetails" && roomDetails}
        {tab === "cleaning"    && cleaning}
      </div>
      <style jsx>{`
        @media (max-width: 720px) {
          .psTabsBar{
            display: grid !important;
            grid-template-columns: 1fr;
            gap: 8px;
            width: 100%;
          }
          .psTabsBar .psTabBtn{
            width: 100%;
            border-radius: 29px !important;
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
}
function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid var(--card)",
    cursor: "pointer",
    background: active ? "var(--primary)" : "var(--card)",
    color: active ? "#0c111b" : "var(--text)",
    fontWeight: 700
  };
}
