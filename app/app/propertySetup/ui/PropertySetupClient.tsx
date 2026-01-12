"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
// import PropertySidebar from "./PropertySidebar"; // replaced by top pill selector
import SettingsTab from "./SettingsTab";
import RoomsTab from "./RoomsTab";
import RoomDetailsTab from "./RoomDetailsTab";
	import CleaningTab from "./CleaningTab";
	import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
	import { useHeader } from "@/app/app/_components/HeaderContext";
	import { usePersistentPropertyState } from "@/app/app/_components/PropertySelection";
	import LoadingPill from "@/app/app/_components/LoadingPill";
	import overlayStyles from "@/app/app/_components/AppLoadingOverlay.module.css";

type Property = { id: string; name: string; check_in_time: string | null; check_out_time: string | null; };
type Room = { id: string; name: string; capacity: number | null; property_id: string; sort_index: number; room_type_id: string | null };
type CheckDef = { id: string; property_id: string; label: string; default_value: boolean; sort_index: number };
type TextDef  = { id: string; property_id: string; label: string; placeholder: string | null; sort_index: number };
type TaskDef  = { id: string; property_id: string; label: string; sort_index: number };
type RoomType = { id: string; property_id: string; name: string };

type Plan = "basic" | "standard" | "premium";

export default function PropertySetupClient({ initialProperties }: { initialProperties: Property[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<"Idle" | "Loading" | "Saving…" | "Synced" | "Error">("Idle");
  const loadSeqRef = useRef(0);
  const [isSmall, setIsSmall] = useState(false);
  // Theme-aware icons (light/dark)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
  });

  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const { propertyId: selectedId, setPropertyId: setSelectedId, ready: propertyReady } = usePersistentPropertyState(properties);

  const [rooms, setRooms]     = useState<Room[]>([]);
  const [checks, setChecks]   = useState<CheckDef[]>([]);
  const [texts, setTexts]     = useState<TextDef[]>([]);
  const [tasks, setTasks]     = useState<TaskDef[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);

	  const [plan, setPlan] = useState<Plan | null>(null);
	  const selected = properties.find(p => p.id === selectedId) || null;
	  // First-time guidance modal (after first property creation)
	  const [showRoomsGuide, setShowRoomsGuide] = useState<boolean>(false);
	  const [unitWizardStep, setUnitWizardStep] = useState<"hostType" | "unitCount" | "reward">("hostType");
	  const [unitCountRaw, setUnitCountRaw] = useState<string>("");
	  const [unitWizardError, setUnitWizardError] = useState<string | null>(null);
	  const [unitWizardLoading, setUnitWizardLoading] = useState<boolean>(false);
	  const [unitWizardLoadingStage, setUnitWizardLoadingStage] = useState<0 | 1>(0);
	  const unitWizardLoadingTimerRef = useRef<number | null>(null);
	  const [createdUnits, setCreatedUnits] = useState<string[]>([]);
	  const prevShowRoomsGuideRef = useRef<boolean>(false);
	  const prevWizardPropertyIdRef = useRef<string | null>(null);
	  const [roomTypesGuideTick, setRoomTypesGuideTick] = useState<number>(0);
  // Cache property presentation images for avatar in the pill
  const [propertyPhotos, setPropertyPhotos] = useState<Record<string, string | null>>({});

	  const { setTitle, setPill } = useHeader();
	  useEffect(() => { setTitle("Property Setup"); }, [setTitle]);

	  useEffect(() => {
	    const wasOpen = prevShowRoomsGuideRef.current;
	    const prevPropertyId = prevWizardPropertyIdRef.current;
	    prevShowRoomsGuideRef.current = showRoomsGuide;
	    prevWizardPropertyIdRef.current = selectedId;

	    if (!showRoomsGuide) return;
	    const isOpening = !wasOpen;
	    const isPropertyChange = prevPropertyId !== null && prevPropertyId !== selectedId;
	    if (!isOpening && !isPropertyChange) return;

	    if (unitWizardStep === "reward") return;
	    if (rooms.length > 0) return;

	    setUnitWizardError(null);
	    setCreatedUnits([]);
	    setUnitCountRaw("");
	    setUnitWizardStep("hostType");
	  }, [showRoomsGuide, selectedId, rooms.length, unitWizardStep]);

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

  // Watch for theme changes to swap icons
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onMq = (e: MediaQueryListEvent) => setIsDark(e.matches);
    const ob = new MutationObserver(() => {
      const t = root.getAttribute('data-theme');
      if (t === 'dark') setIsDark(true);
      if (t === 'light') setIsDark(false);
    });
    try { mq?.addEventListener('change', onMq); } catch { mq?.addListener?.(onMq); }
    ob.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { try { mq?.removeEventListener('change', onMq); } catch { mq?.removeListener?.(onMq); } ob.disconnect(); };
  }, []);


  // Header pill mirrors page status
  useEffect(() => {
    setPill(
      !propertyReady       ? "Loading…" :
      status === "Loading" ? "Loading…" :
      status === "Saving…" ? "Saving…" :
      status === "Synced"  ? "Synced"  :
      status === "Error"   ? "Error"   : "Idle"
    );
  }, [status, propertyReady, setPill]);

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
    if (!propertyReady || !selectedId) return;
    const seq = (loadSeqRef.current += 1);
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
      setStatus("Loading");
      setRooms([]); setChecks([]); setTexts([]); setTasks([]); setRoomTypes([]);
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

      if (seq !== loadSeqRef.current) return;
      if (r1.error || r2.error || r3.error || r4.error || r5.error) {
        setStatus("Error");
        setRooms([]); setChecks([]); setTexts([]); setTasks([]); setRoomTypes([]);
      } else {
        const loadedRooms = (r1.data ?? []) as Room[];
        setRooms(loadedRooms);
        setChecks((r2.data ?? []) as CheckDef[]);
        setTexts((r3.data ?? []) as TextDef[]);
        setTasks((r4.data ?? []) as TaskDef[]);
        setRoomTypes((r5.data ?? []) as RoomType[]);
        setStatus("Idle");
        // If this property has no rooms yet, show the rooms guide so the user
        // can choose whether it is a single unit or has multiple rooms.
        if (loadedRooms.length === 0) {
          setShowRoomsGuide(true);
        }
      }
    })();
  }, [selectedId, supabase, propertyReady]);

  function startSaving(){ setStatus("Saving…"); }
  function finishSaving(ok:boolean){ setStatus(ok ? "Synced" : "Error"); setTimeout(() => setStatus("Idle"), 800); }

  async function createUnits(count: number) {
    if (!canWrite) return;
    if (!selected) return;
    if (count < 1) return;
    if ((rooms?.length ?? 0) > 0) return;

    setUnitWizardError(null);
    setUnitWizardLoadingStage(0);
    setShowRoomsGuide(false);
    setUnitWizardLoading(true);

    const start = Date.now();
    const minMs = 900;

    if (unitWizardLoadingTimerRef.current) window.clearTimeout(unitWizardLoadingTimerRef.current);
    unitWizardLoadingTimerRef.current = window.setTimeout(() => setUnitWizardLoadingStage(1), 1100);

    try {
      const rows = Array.from({ length: count }, (_, i) => ({
        property_id: selected.id,
        name: `Unit ${i + 1}`,
        sort_index: i,
      }));

      const { data, error } = await supabase
        .from("rooms")
        .insert(rows as any)
        .select("id,name,capacity,property_id,sort_index,room_type_id");
      if (error) throw error;

      const created = ((data ?? []) as any[])
        .slice()
        .sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0));
      setRooms(created as Room[]);
      setCreatedUnits(created.map((r) => String(r.name || "")).filter(Boolean));

      try {
        window.dispatchEvent(new CustomEvent("p4h:onboardingDirty"));
      } catch {
        // ignore
      }

      const elapsed = Date.now() - start;
      const remaining = Math.max(minMs - elapsed, 0);
      if (remaining) await new Promise<void>((r) => setTimeout(r, remaining));

      setUnitWizardStep("reward");
      setShowRoomsGuide(true);
    } catch (e: any) {
      setUnitWizardError(e?.message || "Could not create units.");
      setUnitWizardStep("unitCount");
      setShowRoomsGuide(true);
    } finally {
      setUnitWizardLoading(false);
      if (unitWizardLoadingTimerRef.current) window.clearTimeout(unitWizardLoadingTimerRef.current);
      unitWizardLoadingTimerRef.current = null;
    }
  }

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
    if (!error && data) {
      setRooms(prev => [...prev, data as Room]);
      try {
        window.dispatchEvent(new CustomEvent("p4h:onboardingDirty"));
      } catch {
        // ignore
      }
    }
    finishSaving(!error);
  }
  async function addRoomNamed(customName: string) {
    if (!canWrite) return;
    if (!selected) return;
    const safe = String(customName || '').trim() || `Room ${rooms.length + 1}`;
    if (rooms.some(r => (r.name || '').trim().toLowerCase() === safe.toLowerCase())) return;
    startSaving();
    const nextIndex = rooms.length;
    const { data, error } = await supabase
      .from("rooms")
      .insert({ name: safe, property_id: selected.id, sort_index: nextIndex })
      .select("id,name,capacity,property_id,sort_index,room_type_id")
      .single();
    if (!error && data) {
      setRooms(prev => [...prev, data as Room]);
      try {
        window.dispatchEvent(new CustomEvent("p4h:onboardingDirty"));
      } catch {
        // ignore
      }
    }
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
    <div style={{ fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', color: "var(--text)" }}>
      <div style={{ padding: isSmall ? "10px 12px 16px" : "16px" }}>
        <PlanHeaderBadge title="Property Setup" slot="under-title" />

        {/* Step 2 — Units setup wizard (only when no rooms exist yet, plus reward screen) */}
        {showRoomsGuide && selected && (rooms.length === 0 || unitWizardStep === "reward") && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => { e.stopPropagation(); }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 240,
              background: 'rgba(0,0,0,0.55)',
              display: 'grid',
              placeItems: 'center',
              padding: 12,
              paddingTop: 'calc(var(--safe-top, 0px) + 12px)',
              paddingBottom: 'calc(var(--safe-bottom, 0px) + 12px)',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="sb-card"
              style={{
                width: 'min(560px, 100%)',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 16,
                display: 'grid',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <strong style={{ fontSize: 16 }}>
                    {unitWizardStep === 'hostType'
                      ? 'How do you host this property?'
                      : unitWizardStep === 'unitCount'
                        ? 'How many units does this property have?'
                        : 'Your units are ready'}
                  </strong>
                  <div style={{ color: 'var(--muted)', fontSize: 'var(--fs-s)', lineHeight: 'var(--lh-s)' }}>
                    {unitWizardStep === 'hostType'
                      ? 'This helps us organize calendars and availability correctly.'
                      : unitWizardStep === 'unitCount'
                        ? 'We’ll create them automatically so you can start right away.'
                        : 'Each unit now has its own calendar and availability.'}
                  </div>
                </div>
                <button
                  aria-label="Close"
                  className="sb-btn sb-cardglow sb-btn--icon"
                  style={{ width: 40, height: 40, borderRadius: 999, display: 'grid', placeItems: 'center', fontWeight: 900 }}
                  onClick={() => setShowRoomsGuide(false)}
                >
                  ×
                </button>
              </div>

              {unitWizardStep === 'hostType' && (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 14,
                      display: 'grid',
                      gap: 6,
                      background: 'color-mix(in srgb, var(--card) 88%, transparent)',
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>Single unit</div>
                    <div style={{ color: 'var(--muted)', fontSize: 'var(--fs-s)', lineHeight: 'var(--lh-s)' }}>
                      Apartment, cabin, or entire place rented as one unit.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="sb-btn sb-btn--primary" onClick={() => void createUnits(1)}>
                        Use single unit
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 14,
                      display: 'grid',
                      gap: 6,
                      background: 'color-mix(in srgb, var(--card) 88%, transparent)',
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>Multiple units</div>
                    <div style={{ color: 'var(--muted)', fontSize: 'var(--fs-s)', lineHeight: 'var(--lh-s)' }}>
                      Guesthouse or hotel with separate units.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className="sb-btn"
                        style={{
                          border: '1px solid var(--primary)',
                          background: 'transparent',
                          color: 'var(--text)',
                          borderRadius: 999,
                          fontWeight: 700,
                        }}
                        onClick={() => setUnitWizardStep('unitCount')}
                      >
                        Set up units
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {unitWizardStep === 'unitCount' && (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ display: 'block' }}>Number of units</label>
                    <input
                      type="number"
                      min={2}
                      inputMode="numeric"
                      placeholder="e.g. 3"
                      value={unitCountRaw}
                      onChange={(e) => setUnitCountRaw(e.currentTarget.value)}
                      style={{
                        width: '100%',
                        padding: 10,
                        background: 'var(--card)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ color: 'var(--muted)', fontSize: 'var(--fs-s)', lineHeight: 'var(--lh-s)' }}>
                      You can rename units and set room types later.
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 6 }}>
                    <button
                      className="sb-btn sb-btn--primary"
                      style={{ width: '100%', minHeight: 44 }}
                      onClick={() => {
                        const n = Math.max(0, Math.floor(Number(unitCountRaw || 0)));
                        if (n < 2) { setUnitWizardError('Please enter 2 or more.'); return; }
                        void createUnits(n);
                      }}
                    >
                      Create units
                    </button>
                    <div style={{ color: 'var(--muted)', fontSize: 'var(--fs-s)', lineHeight: 'var(--lh-s)', textAlign: 'center' }}>
                      Takes a few seconds.
                    </div>
                    {unitWizardError && (
                      <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-s)', lineHeight: 'var(--lh-s)', textAlign: 'center' }}>
                        {unitWizardError}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {unitWizardStep === 'reward' && (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {(createdUnits.length ? createdUnits : ['Unit 1']).map((u) => (
                      <div
                        key={u}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid var(--border)',
                          background: 'color-mix(in srgb, var(--card) 88%, transparent)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span aria-hidden style={{ color: 'var(--success)', fontWeight: 900 }}>✓</span>
                          <span style={{ fontWeight: 800 }}>{u}</span>
                        </div>
                        <span style={{ color: 'var(--muted)', fontSize: 'var(--fs-s)' }}>Calendar ready</span>
                      </div>
                    ))}
                  </div>

                  <button
                    className="sb-btn sb-btn--primary"
                    style={{ width: '100%', minHeight: 44 }}
                    onClick={() => { window.location.href = '/app/channels'; }}
                  >
                    Connect your first calendar
                  </button>
                  <div style={{ color: 'var(--muted)', fontSize: 'var(--fs-s)', lineHeight: 'var(--lh-s)', textAlign: 'center' }}>
                    To automate availability and avoid double bookings.
                  </div>

                  <button
                    className="sb-btn sb-btn--ghost"
                    style={{
                      width: '100%',
                      minHeight: 44,
                      borderRadius: 999,
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--text)',
                      fontWeight: 700,
                      justifyContent: 'center',
                    }}
                    onClick={() => {
                      setShowRoomsGuide(false);
                      try { window.dispatchEvent(new CustomEvent('p4h:activateRoomsTab')); } catch {}
                    }}
                  >
                    Edit unit details
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Units loading overlay (between create and reward) */}
        {unitWizardLoading && (
          <div className={overlayStyles.overlay} role="status" aria-live="polite" aria-label="Setting up your units…" style={{ zIndex: 241 }}>
            <div style={{ display: 'grid', justifyItems: 'center', gap: 12, padding: 12 }}>
              <LoadingPill title="Setting up your units…" />
              <div style={{ display: 'grid', gap: 6, textAlign: 'center' }}>
                <div style={{ color: 'var(--text)', fontSize: 'var(--fs-b)', lineHeight: 'var(--lh-b)', fontWeight: 700 }}>
                  Setting up your units…
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 'var(--fs-s)', lineHeight: 'var(--lh-s)' }}>
                  {unitWizardLoadingStage === 0 ? 'Setting up your units…' : 'Preparing calendars…'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top property selector pill (desktop + mobile) */}
        <div className="sb-toolbar" style={{ gap: isSmall ? 12 : 20, flexWrap: 'wrap', marginBottom: 12, width: '100%', maxWidth: 904, marginInline: 'auto' }}>
          <div
            className="modalCard Sb-cardglow"
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
              onChange={(e) => {
                const next = (e.target as HTMLSelectElement).value;
                if (!next || next === selectedId) return;
                setRooms([]); setChecks([]); setTexts([]); setTasks([]); setRoomTypes([]);
                setStatus("Loading");
                setSelectedId(next);
              }}
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
                  roomTypesGuideTick={roomTypesGuideTick}
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
  // Initialize from URL (?tab=...) or hash (#cleaning)
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const fromQuery = (u.searchParams.get('tab') || '').toLowerCase();
      const fromHash = (u.hash || '').replace(/^#/, '').toLowerCase();
      const candidate = (fromQuery || fromHash) as string;
      if (candidate === 'settings' || candidate === 'rooms' || candidate === 'roomdetails' || candidate === 'cleaning') {
        setTab(candidate as any);
        onTabSelect?.(candidate as any);
      }
    } catch { /* noop */ }
  }, []);
  // Keep URL in sync when tab changes (preserve other params)
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('tab', tab);
      window.history.replaceState({}, '', u.toString());
    } catch { /* noop */ }
  }, [tab]);
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
        <button onClick={() => { setTab("roomdetails"); onTabSelect?.('roomdetails'); }} style={tabBtn(tab === "roomdetails")} className="psTabBtn">Reservation details</button>
        <button onClick={() => { setTab("cleaning"); onTabSelect?.('cleaning'); }}    style={tabBtn(tab === "cleaning")} className="psTabBtn">Cleaning tasks</button>
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
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
        }
        @media (min-width: 1025px) {
          .psTabsBar{
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
            width: 100%;
          }
          .psTabsBar .psTabBtn{
            width: 100%;
            min-height: 44px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-align: center;
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
