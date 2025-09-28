// app/app/channels/ui/ChannelsClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import { useHeader } from "@/app/app/_components/HeaderContext";
import { usePersistentProperty } from "@/app/app/_components/PropertySelection";

/** DB types */
type Property = { id: string; name: string; timezone: string | null };
type Room = { id: string; name: string; property_id: string; room_type_id: string | null };
type RoomType = { id: string; name: string; property_id: string };
type TypeIntegration = {
  id: string;
  property_id: string;
  room_type_id: string;
  provider: string | null;
  url: string;
  is_active: boolean | null;
  last_sync: string | null;
  // optional metadata persisted in DB (migration adds these)
  color?: string | null;
  logo_url?: string | null;
};

/** Mic buton reutilizabil pentru copiere cu feedback */
function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }
  return (
    <button className="sb-btn" onClick={onCopy} aria-live="polite">
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

/** Utils */
function fmtCountdown(total: number) {
  const s = Math.max(0, Math.floor(total));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}m${rs ? ` ${rs}s` : ""}`;
}
function providerBuiltinLogo(provider?: string | null): string | null {
  const p = (provider || "").toLowerCase();
  if (p.includes("booking")) return "/booking.png";
  if (p.includes("airbnb")) return "/airbnb.png";
  if (p.includes("expedia")) return "/expedia.png";
  return null;
}

type HintVariant = "muted" | "warning" | "danger" | "success" | "info";

export default function ChannelsClient({ initialProperties }: { initialProperties: Property[] }) {
  const supabase = useMemo(() => createClient(), []);
  const { setPill } = useHeader();
  const [status, setStatus] = useState<"Idle" | "Loading" | "Saving…" | "Error">("Idle");

  const [properties] = useState<Property[]>(initialProperties);
  const [propertyId, setPropertyId] = usePersistentProperty(properties);
  const [timezone, setTimezone] = useState<string>(initialProperties[0]?.timezone ?? "");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [types, setTypes] = useState<RoomType[]>([]);
  const [integrations, setIntegrations] = useState<TypeIntegration[]>([]);

  const [origin, setOrigin] = useState<string>("");
  useEffect(() => { setOrigin(window.location.origin); }, []);

  // top-level modals (A/B/C)
  const [showRoomsModal, setShowRoomsModal] = useState(false);
  const [showTypesModal, setShowTypesModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // inner modals (detaliu element)
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);
  const [manageTypeId, setManageTypeId] = useState<string | null>(null);

  // PLAN gate (pentru Sync now)
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  // Status pill persistent sub buton
  const [hintText, setHintText] = useState<string>("");
  const [hintVariant, setHintVariant] = useState<HintVariant>("muted");
  const [countdownSec, setCountdownSec] = useState<number | null>(null);
  const [syncBtnText, setSyncBtnText] = useState<string>("Sync now");

  // Role/scopes gating: admin OR editor with 'channels' can write
  const [canWrite, setCanWrite] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        const me = j?.me as { role?: string; scopes?: string[]; disabled?: boolean } | undefined;
        if (!me) { setCanWrite(false); return; }
        const sc = new Set((me.scopes || []) as string[]);
        const allowed = !me.disabled && (me.role === 'admin' || (me.role === 'editor' && sc.has('channels')));
        setCanWrite(!!allowed);
      } catch { setCanWrite(false); }
    })();
  }, []);

  // Countdown tick
  useEffect(() => {
    if (countdownSec === null) return;
    const t = setInterval(() => {
      setCountdownSec((v) => {
        if (v === null) return null;
        if (v <= 1) return null;
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [countdownSec]);

  // Recalculăm textul când countdown-ul se schimbă
  useEffect(() => {
    if (countdownSec === null) return;
    setHintText((old) => {
      if (/Hourly limit/.test(old)) {
        return `Hourly limit — next in ${fmtCountdown(countdownSec)}`;
      }
      if (/Wait /.test(old) || /Please wait/.test(old)) {
        return `Wait ${fmtCountdown(countdownSec)}`;
      }
      return `Wait ${fmtCountdown(countdownSec)}`;
    });
  }, [countdownSec]);

  // Load plan for the CURRENT PROPERTY
  useEffect(() => {
    (async () => {
      if (!propertyId) { setIsPremium(null); return; }
      const rProp = await supabase.from("properties").select("admin_id").eq("id", propertyId).single();
      const accId = (rProp.data as any)?.admin_id as string | undefined;
      if (!accId) { setIsPremium(false); setHintText(""); setHintVariant("muted"); return; }
      const rPlan = await supabase.from("accounts").select("plan").eq("id", accId).maybeSingle();
      const p = ((rPlan.data as any)?.plan as string | null)?.toLowerCase?.() ?? "basic";
      const premium = p === "premium";
      setIsPremium(premium);
      if (premium) {
        setHintText("Ready");
        setHintVariant("success");
      } else {
        setHintText("");
        setHintVariant("muted");
      }
    })();
  }, [supabase, propertyId]);

  useEffect(() => {
    if (!propertyId) return;
    setStatus("Loading");
    (async () => {
      const [rProp, rRooms, rTypes, rInteg] = await Promise.all([
        supabase.from("properties").select("id,timezone").eq("id", propertyId).single(),
        supabase.from("rooms")
          .select("id,name,property_id,room_type_id")
          .eq("property_id", propertyId)
          .order("sort_index", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase.from("room_types")
          .select("id,name,property_id")
          .eq("property_id", propertyId)
          .order("name", { ascending: true }),
        supabase.from("ical_type_integrations")
          .select("id,property_id,room_type_id,provider,url,is_active,last_sync,color,logo_url")
          .eq("property_id", propertyId)
          .order("created_at", { ascending: true }),
      ]);
      if (rProp.error || rRooms.error || rTypes.error || rInteg.error) { setStatus("Error"); return; }
      setTimezone(rProp.data?.timezone || "");
      setRooms((rRooms.data ?? []) as Room[]);
      setTypes((rTypes.data ?? []) as RoomType[]);
      setIntegrations((rInteg.data ?? []) as TypeIntegration[]);
      setStatus("Idle");
    })();
  }, [propertyId, supabase]);

  /* URLs & helpers */
  function roomIcsUrl(id: string) { return `${origin}/api/ical/rooms/${id}.ics`; }
  function typeIcsUrl(id: string) { return `${origin}/api/ical/types/${id}.ics`; }

  /* Integrations CRUD (Import per TYPE) */
  async function addIntegration(roomTypeId: string, provider: string, url: string) {
    if (!canWrite) return;
    if (!propertyId || !roomTypeId || !url.trim()) return;
    setStatus("Saving…");
    const { data, error } = await supabase
      .from("ical_type_integrations")
      .insert({ property_id: propertyId, room_type_id: roomTypeId, provider: provider || null, url: url.trim(), is_active: true })
      .select("id,property_id,room_type_id,provider,url,is_active,last_sync")
      .single();
    if (!error && data) setIntegrations(prev => [...prev, data as TypeIntegration]);
    setStatus(error ? "Error" : "Idle");
  }
  async function deleteIntegration(id: string) {
    if (!canWrite) return;
    setStatus("Saving…");
    const { error } = await supabase.from("ical_type_integrations").delete().eq("id", id);
    if (!error) setIntegrations(prev => prev.filter(x => x.id !== id));
    setStatus(error ? "Error" : "Idle");
  }
  async function toggleActive(integration: TypeIntegration) {
    if (!canWrite) return;
    setStatus("Saving…");
    const next = !integration.is_active;
    const { error, data } = await supabase
      .from("ical_type_integrations")
      .update({ is_active: next })
      .eq("id", integration.id)
      .select("id,property_id,room_type_id,provider,url,is_active,last_sync")
      .single();
    if (!error && data) setIntegrations(prev => prev.map(x => x.id === integration.id ? (data as TypeIntegration) : x));
    setStatus(error ? "Error" : "Idle");
  }

  /* Global Sync Now — ALL */
  async function syncAllNow() {
    const active = integrations.filter(i => !!i.is_active);
    if (!propertyId) return;

    if (isPremium === false) {
      setSyncBtnText("Premium only");
      setTimeout(() => setSyncBtnText("Sync now"), 1400);
      setCountdownSec(null);
      return;
    }
    if (active.length === 0) {
      setHintText("No active feeds");
      setHintVariant("muted");
      setCountdownSec(null);
      return;
    }

    try {
      setStatus("Saving…");
      const res = await fetch("/api/ical/sync/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });

      if (res.status === 429) {
        const j = await res.json().catch(() => ({} as any));
        const reason = j?.reason as string | undefined;
        const cool = (j?.cooldown_remaining_sec ?? 0) as number;
        const retryAfter = (j?.retry_after_sec ?? 0) as number;

        if (reason === "sync_now_only_on_premium") {
          setHintText("Premium only");
          setHintVariant("danger");
          setCountdownSec(null);
          setStatus("Idle");
          return;
        }
        if (reason === "cooldown" && cool > 0) {
          const sec = Math.max(retryAfter || cool, 0);
          setHintText(`Wait ${fmtCountdown(sec)}`);
          setHintVariant("warning");
          setCountdownSec(sec || null);
          setStatus("Idle");
          return;
        }
        if (reason === "hourly_quota") {
          const sec = Math.max(retryAfter, 0);
          setHintText(`Hourly limit — next in ${fmtCountdown(sec)}`);
          setHintVariant("warning");
          setCountdownSec(sec || null);
          setStatus("Idle");
          return;
        }
        setHintText("Rate limited");
        setHintVariant("warning");
        setCountdownSec(null);
        setStatus("Idle");
        return;
      }

      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        if (j?.error === "Premium only" || j?.reason === "sync_now_only_on_premium") {
          setHintText("Premium only");
          setHintVariant("danger");
        } else {
          setHintText("Try again");
          setHintVariant("danger");
        }
        setCountdownSec(null);
        setStatus("Error");
        return;
      }

      const nowIso = new Date().toISOString();
      setIntegrations(prev => prev.map(x => x.is_active ? { ...x, last_sync: nowIso } : x));
      setHintText("Synced just now");
      setHintVariant("success");
      setCountdownSec(null);
      setStatus("Idle");
    } catch {
      setHintText("Try again");
      setHintVariant("danger");
      setCountdownSec(null);
      setStatus("Error");
    }
  }

  const pillLabel =
    status === "Error" ? "Error" :
    status === "Loading" || status === "Saving…" ? "Syncing…" : "Idle";

  const activeCount = integrations.filter(i => !!i.is_active).length;

  useEffect(() => {
    setPill(pillLabel);
  }, [pillLabel, setPill]);

  return (
    <div style={{ fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      <PlanHeaderBadge title="Channels & iCal" slot="header-right" />
      {/* Toolbar minimalistă */}
      <div className="sb-toolbar" style={{ gap: 12, marginBottom: 8 }}>
        <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800,}}>
              Property
            </label>
        <select className="sb-select" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} style={{ minWidth: 220, fontFamily: 'inherit' }}>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span className="sb-badge">Timezone: {timezone || "—"}</span>
      </div>

      {/* Card cu acțiuni */}
      <section className="sb-card" style={{ padding: 16, marginTop: 8 }}>
        <h3 style={{ marginTop: 0 }}>Channels & iCal</h3>
        {!timezone && (
          <p style={{ color: "var(--danger)", marginTop: 0 }}>
            Set Country (timezone) in Dashboard to produce valid .ics files.
          </p>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* GLOBAL: Sync Now — ALL */}
            <button
              className="sb-btn sb-btn--primary"
              style={{ opacity: (isPremium === false ? 0.95 : 1) * (activeCount === 0 || status === "Saving…" ? 0.6 : 1) }}
              onClick={syncAllNow}
              disabled={activeCount === 0 || status === "Saving…"}
              title={
                isPremium === false
                  ? "Premium only"
                  : activeCount === 0
                  ? "No active feeds found"
                  : "Sync all active imports now"
              }
            >
              {syncBtnText}
            </button>

            <button className="sb-btn" disabled={!canWrite} onClick={() => { if (!canWrite) return; setShowTypesModal(true); }}>Export</button>
            <button className="sb-btn" disabled={!canWrite} onClick={() => { if (!canWrite) return; setShowImportModal(true); }}>Import</button>
            <button className="sb-btn" disabled={!canWrite} onClick={() => { if (!canWrite) return; setShowRoomsModal(true); }}>Export Room Only</button>
          </div>

          {/* PILLAȘ persistent sub buton */}
          {hintText ? (
            <div>
              <span className="sb-badge">{hintText}</span>
            </div>
          ) : null}
        </div>
      </section>

      {/* ======= MODAL A: EXPORT per ROOM ======= */}
      {showRoomsModal && (
        <Modal title="Export Room Only" onClose={() => { setShowRoomsModal(false); setActiveRoomId(null); }}>
          <div style={tileGrid}>
            {rooms.length === 0 ? (
              <p style={{ color: "var(--text)", gridColumn: "1 / -1" }}>No rooms in this property.</p>
            ) : rooms.map(r => (
              <button
                key={r.id}
                onClick={() => setActiveRoomId(r.id)}
                className="sb-card"
                style={{ ...tile, boxShadow: "0 3px 12px rgba(0,0,0,.12)" }}
                title={r.name}
              >
                <span style={tileTitle}>{r.name}</span>
                <span style={tileSub}>Get link</span>
              </button>
            ))}
          </div>

          {activeRoomId && (() => {
            const room = rooms.find(x => x.id === activeRoomId)!;
            const url = roomIcsUrl(activeRoomId);
            return (
              <InnerModal title={room.name} onClose={() => setActiveRoomId(null)}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <CopyUrlButton url={url} />
                  <a className="sb-btn" href={url} target="_blank" rel="noreferrer">Open</a>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }}>
                  *Use this link if your OTA uses separate listings per room, or for your personal calendar (Google/Apple/Outlook).
                </p>
              </InnerModal>
            );
          })()}
        </Modal>
      )}

      {/* ======= MODAL B: EXPORT per TYPE ======= */}
      {showTypesModal && (
        <Modal title="Export" onClose={() => { setShowTypesModal(false); setActiveTypeId(null); }}>
          <div style={tileGrid}>
            {types.length === 0 ? (
              <p style={{ color: "var(--text)", gridColumn: "1 / -1" }}>No room types defined.</p>
            ) : types.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTypeId(t.id)}
                className="sb-card"
                style={{ ...tile, boxShadow: "0 3px 12px rgba(0,0,0,.12)" }}
                title={t.name}
              >
                <span style={tileTitle}>{t.name}</span>
                <span style={tileSub}>Get link</span>
              </button>
            ))}
          </div>

          {activeTypeId && (() => {
            const t = types.find(x => x.id === activeTypeId)!;
            const url = typeIcsUrl(activeTypeId);
            return (
              <InnerModal title={t.name} onClose={() => setActiveTypeId(null)}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <CopyUrlButton url={url} />
                  <a className="sb-btn" href={url} target="_blank" rel="noreferrer">Open</a>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }}>
                  *Add this URL to your OTA room-type listing.
                </p>
              </InnerModal>
            );
          })()}
        </Modal>
      )}

      {/* ======= MODAL C: IMPORT (pe TYPE) ======= */}
      {showImportModal && (
        <Modal title="Import" onClose={() => { setShowImportModal(false); setManageTypeId(null); }}>
          <div style={tileGrid}>
            {types.length === 0 ? (
              <p style={{ color: "var(--text)", gridColumn: "1 / -1" }}>No room types defined.</p>
            ) : types.map(t => (
              <button
                key={t.id}
                onClick={() => setManageTypeId(t.id)}
                className="sb-card"
                style={{ ...tile, boxShadow: "0 3px 12px rgba(0,0,0,.12)" }}
                title={`Manage ${t.name}`}
              >
                <span style={tileTitle}>{t.name}</span>
                <span style={tileSub}>Manage feeds</span>
              </button>
            ))}
          </div>

          {manageTypeId && (
            <ManageTypeModal
              timezone={timezone}
              typeId={manageTypeId!}
              integrations={integrations.filter(i => i.room_type_id === manageTypeId)}
              onClose={() => setManageTypeId(null)}
              onAdd={(provider, url) => addIntegration(manageTypeId!, provider, url)}
              onDelete={(id) => deleteIntegration(id)}
              onToggle={(ii) => toggleActive(ii)}
              onUpdate={(id, patch) => setIntegrations(prev => prev.map(x => x.id === id ? ({ ...x, ...patch }) as TypeIntegration : x))}
            />
          )}
        </Modal>
      )}
    </div>
  );
}

/* ======= UI helpers & components ======= */

function Modal({ title, children, onClose }:{
  title: string; children: React.ReactNode; onClose: () => void;
}) {
  return (
    <div
      role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40, display: "grid", placeItems: "center", padding: 12, fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, width: "min(980px, calc(100vw - 32px))", maxHeight: "calc(100vh - 32px)", overflow: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="sb-btn" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InnerModal({ title, children, onClose }:{
  title: string; children: React.ReactNode; onClose: () => void;
}) {
  return (
    <div
      role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 50, display: "grid", placeItems: "center", padding: 12, fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, width: "min(720px, calc(100vw - 32px))", maxHeight: "calc(100vh - 32px)", overflow: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="sb-btn" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ManageTypeModal({
  timezone, typeId, integrations, onClose, onAdd, onDelete, onToggle, onUpdate
}:{
  timezone: string | null;
  typeId: string;
  integrations: { id: string; provider: string | null; url: string; is_active: boolean | null; last_sync: string | null; color?: string | null; logo_url?: string | null; }[];
  onClose: () => void;
  onAdd: (provider: string, url: string) => void;
  onDelete: (id: string) => void;
  onToggle: (ii: any) => void;
  onUpdate: (id: string, patch: Partial<TypeIntegration>) => void;
}) {
  const [provider, setProvider] = useState("Booking");
  const [url, setUrl] = useState("");
  const [customProvider, setCustomProvider] = useState("");
  const supa = useMemo(() => createClient(), []);

  // OTA color map (UI-only), persisted per room type
  const [colorMap, setColorMap] = useState<Record<string,string>>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const LS_KEY = `p4h:otaColors:type:${typeId}`;
  function norm(p?: string | null) { return (p || '').toLowerCase().trim(); }
  function defaultColor(p?: string | null) {
    const s = norm(p);
    if (s.includes('airbnb')) return 'rgba(255, 90, 96, 0.81)';
    if (s.includes('booking')) return 'rgba(30, 143, 255, 0.9)';
    if (s.includes('expedia')) return 'rgba(254,203,46,0.81)';
    return 'rgba(139,92,246,0.81)';
  }
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const parsed = raw ? JSON.parse(raw) as Record<string,string> : {};
      setColorMap(parsed || {});
    } catch { setColorMap({}); }
  }, [LS_KEY]);
  function saveColor(p: string, c: string) {
    const key = norm(p);
    setColorMap(prev => {
      const next = { ...prev, [key]: c };
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  /* ===== Logo map (preset or custom uploaded for "Other") ===== */
  const LS_LOGO_KEY = `p4h:otaLogos:type:${typeId}`;
  const [logoMap, setLogoMap] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_LOGO_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string,string>) : {};
      setLogoMap(parsed || {});
    } catch { setLogoMap({}); }
  }, [LS_LOGO_KEY]);
  function saveLogo(providerName: string, dataUrl: string) {
    const key = norm(providerName);
    setLogoMap(prev => {
      const next = { ...prev, [key]: dataUrl };
      try { localStorage.setItem(LS_LOGO_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }
  function logoSrcFor(p?: string | null): string | null {
    const builtin = providerBuiltinLogo(p);
    if (builtin) return builtin;
    const custom = logoMap[norm(p)];
    return custom || null;
  }

  // Single hidden input for picking logos (used for "Other" + per-row change)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoTargetProviderRef = useRef<string>("other");
  const logoTargetIntegrationIdRef = useRef<string | null>(null);
  async function validateAndReadPNG(file: File): Promise<string> {
    if (file.type !== "image/png") throw new Error("PNG required");
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error("Read error"));
      fr.onload = () => resolve(String(fr.result));
      fr.readAsDataURL(file);
    });
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (img.width !== 512 || img.height !== 512) {
          reject(new Error("Image must be exactly 512×512 px"));
        } else {
          resolve();
        }
      };
      img.onerror = () => reject(new Error("Invalid image"));
      img.src = dataUrl;
    });
    return dataUrl;
  }
  async function onPickLogo(files: FileList | null) {
    const target = logoTargetProviderRef.current || "other";
    const targetIntegration = logoTargetIntegrationIdRef.current;
    if (!files || !files[0]) return;
    try {
      const dataUrl = await validateAndReadPNG(files[0]);
      // If we target a concrete integration row, upload via API and update DB logo_url
      if (targetIntegration) {
        const fd = new FormData();
        fd.append("integrationId", targetIntegration);
        // Reconstruct a File from dataUrl to preserve PNG type, or send original file
        // We already validated PNG; we can send the original file directly
        fd.append("file", files[0]);
        const res = await fetch("/api/ical/logo/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `Upload failed (${res.status})`);
        }
        const j = await res.json().catch(() => ({}));
        const url: string | undefined = j?.url;
        if (url) onUpdate(targetIntegration, { logo_url: url });
      } else {
        // Fallback: store per-provider logo in localStorage for header preview
        saveLogo(target, dataUrl);
      }
    } catch (e:any) {
      alert(e?.message || "Upload failed. PNG 512×512 required.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      logoTargetIntegrationIdRef.current = null;
    }
  }
  function triggerLogoPick(targetProviderName: string, integrationId?: string) {
    logoTargetProviderRef.current = targetProviderName;
    logoTargetIntegrationIdRef.current = integrationId || null;
    fileInputRef.current?.click();
  }

  async function persistColor(integrationId: string, c: string) {
    try {
      const { data, error } = await supa
        .from("ical_type_integrations")
        .update({ color: c })
        .eq("id", integrationId)
        .select("id,color,logo_url")
        .single();
      if (!error && data) onUpdate(integrationId, { color: data.color ?? c });
    } catch { /* noop */ }
  }

  return (
    <InnerModal title="Manage imports for room type" onClose={onClose}>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Times interpreted in <strong>{timezone || "—"}</strong>.
      </p>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={label}>Provider</label>
            <select
              className="sb-select"
              value={provider}
              onChange={(e) => setProvider((e.target as HTMLSelectElement).value)}
              style={{ fontFamily: 'inherit' }}
            >
              <option>Booking</option>
              <option>Airbnb</option>
              <option>Expedia</option>
              <option>Other</option>
            </select>
          </div>

          {/* Logo selector / preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={label}>Logo</label>
            {provider !== "Other" ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {(() => {
                  const src = logoSrcFor(provider);
                  return src ? (
                    <img src={src} alt="" width={24} height={24} style={{ borderRadius: 6, }} />
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Preset</span>
                  );
                })()}
                <small style={{ color: "var(--muted)" }}>(preset)</small>
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {logoSrcFor(customProvider || "other") ? (
                  <img
                    src={logoSrcFor(customProvider || "other")!}
                    alt=""
                    width={24}
                    height={24}
                    style={{ borderRadius: 6, border: "1px solid var(--border)" }}
                  />
                ) : (
                  <span className="sb-badge" title="No logo yet">No logo</span>
                )}
                <a
                  href="#upload-logo"
                  onClick={(e) => {
                    e.preventDefault();
                    const targ = (customProvider || "other").trim() || "other";
                    triggerLogoPick(targ);
                  }}
                  style={{ fontSize:6 ,color: "var(--primary)", textDecoration: "underline", cursor: "pointer" }}
                >
                  Upload PNG (512×512)
                </a>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png"
                  hidden
                  onChange={(e) => onPickLogo(e.currentTarget.files)}
                />
              </span>
            )}
          </div>

          {/* color selector for current provider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={label}>Color</label>
            <button
              type="button"
              data-picker="keep"
              onClick={() => setPickerFor('new')}
              title="Choose color"
              style={{ width: 20, height: 20, borderRadius: 999, border: '1px solid var(--border)',
                      background: colorMap[norm(provider === 'Other' ? customProvider || 'other' : provider)] || defaultColor(provider) }}
            />
            {pickerFor === 'new' && (
              <div data-picker="keep" onMouseLeave={() => setPickerFor(null)} style={{ display:'grid', gridTemplateColumns: 'repeat(8, 20px)', gap: 6 }}>
                {[
                  'rgba(30,144,255,0.81)','rgba(255,90,95,0.81)','rgba(254,203,46,0.81)','rgba(34,197,94,0.81)',
                  'rgba(139,92,246,0.81)','rgba(13,148,136,0.81)','rgba(148,163,184,0.81)','rgba(59,130,246,0.81)',
                  'rgba(251,146,60,0.81)','rgba(244,114,182,0.81)'
                ].map((c,i)=>(
                  <button key={i} onClick={()=>{ saveColor(provider==='Other'? (customProvider||'other') : provider, c); setPickerFor(null); }}
                    title="Pick color" style={{ width:20,height:20,borderRadius:999,border:'1px solid var(--border)',background:c }} />
                ))}
              </div>
            )}
          </div>

          {provider === 'Other' && (
            <div style={{ display: "grid", gap: 6 }}>
              <label style={label}>Custom provider name</label>
              <input style={input} value={customProvider} onChange={(e) => setCustomProvider((e.target as HTMLInputElement).value)} placeholder="e.g., Vrbo, Agoda" />
            </div>
          )}

          <div style={{ display: "grid", gap: 6 }}>
            <label style={label}>iCal URL</label>
            <input style={input} value={url} onChange={(e) => setUrl((e.target as HTMLInputElement).value)} placeholder="https://..." />
          </div>

          <div>
            <button
              className="sb-btn sb-btn--primary"
              onClick={() => {
                const prov = provider === 'Other' ? customProvider.trim() : provider;
                if (!prov || !url.trim()) return;
                onAdd(prov, url);
                setUrl("");
                setCustomProvider("");
              }}
              disabled={provider === 'Other' && !customProvider.trim()}
            >
              Add feed
            </button>
          </div>
        </div>
      </div>

      {integrations.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No feeds added yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {integrations.map(ii => {
            const np = norm(ii.provider);
            const builtin = providerBuiltinLogo(ii.provider);
            const logoSrc = ii.logo_url || builtin || null;
            const showLogoButton = !builtin; // allow custom upload only for non-presets

            return (
              <li key={ii.id} className="sb-card" style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: "grid", gap: 4, minWidth: 260 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {logoSrc ? (
                      <img src={logoSrc} alt="" width={18} height={18} style={{ borderRadius: 5, }} />
                    ) : (
                      <span title="Provider color" style={{ width: 14, height: 14, borderRadius: 999, border: '1px solid var(--border)', display:'inline-block', background: (ii.color || colorMap[np] || defaultColor(ii.provider)) }} />
                    )}
                    <strong>{ii.provider || "Unknown"}</strong>
                  </div>
                  <small style={{ color: "var(--muted)", wordBreak: "break-all" }}>{ii.url}</small>
                  {ii.last_sync && <small style={{ color: "var(--muted)" }}>Last sync: {new Date(ii.last_sync).toLocaleString()}</small>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button className="sb-btn" data-picker="keep" onClick={()=> setPickerFor(ii.id)}>Color</button>
                  {pickerFor === ii.id && (
                    <div data-picker="keep" onMouseLeave={() => setPickerFor(null)} style={{ display:'grid', gridTemplateColumns: 'repeat(8, 20px)', gap: 6 }}>
                      {[
                        'rgba(30,144,255,0.81)','rgba(255,90,95,0.81)','rgba(254,203,46,0.81)','rgba(34,197,94,0.81)',
                        'rgba(139,92,246,0.81)','rgba(13,148,136,0.81)','rgba(148,163,184,0.81)','rgba(59,130,246,0.81)',
                        'rgba(251,146,60,0.81)','rgba(244,114,182,0.81)'
                      ].map((c,i)=>(
                        <button key={i} onClick={async ()=>{ saveColor(ii.provider || 'other', c); await persistColor(ii.id, c); setPickerFor(null); }}
                          title="Pick color" style={{ width:20,height:20,borderRadius:999,border:'1px solid var(--border)',background:c }} />
                      ))}
                    </div>
                  )}

                  {showLogoButton && (
                    <>
                      <button
                        className="sb-btn"
                        onClick={() => triggerLogoPick(ii.provider || "other", ii.id)}
                        title="Upload logo (PNG 512×512)"
                      >
                        Logo
                      </button>
                      {/* shared hidden input is already in the form header; reuse it */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png"
                        hidden
                        onChange={(e) => onPickLogo(e.currentTarget.files)}
                      />
                    </>
                  )}

                  <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 12 }}>
                    <input type="checkbox" checked={!!ii.is_active} onChange={() => onToggle(ii)} /> active
                  </label>
                  <button className="sb-btn" onClick={() => onDelete(ii.id)}>Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </InnerModal>
  );
}

/* ======= Styles ======= */
// panel replaced by sb-card

const tileGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: 12,
  alignItems: "stretch",
};

const tile: React.CSSProperties = {
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  gap: 6,
  aspectRatio: "1 / 1",
  minHeight: 140,
  background: "transparent",
  color: "var(--text)",
  borderRadius: 12,
  padding: 12,
  textAlign: "center",
  cursor: "pointer",
  fontWeight: 700,
  border: "1px solid var(--border)",
};

const tileTitle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const tileSub: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.85,
};

// row replaced by sb-card wherever used

const label: React.CSSProperties = { fontSize: 12, color: "var(--muted)" };

const input: React.CSSProperties = {
  padding: "8px 10px",
  background: "var(--bg)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontFamily: 'inherit',
};

// Status pill (unused here, kept in case you want it)
function statusPill(variant: HintVariant): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    fontSize: 12,
    fontWeight: 800,
  };
  switch (variant) {
    case "danger":
      return { ...base, background: "var(--danger)", color: "#0c111b", borderColor: "var(--danger)" };
    case "warning":
      return { ...base, background: "#f7d774", color: "#111", borderColor: "#e1c25c" };
    case "success":
      return { ...base, background: "#4ade80", color: "#0c111b", borderColor: "#22c55e" };
    case "info":
      return { ...base, background: "#60a5fa", color: "#0c111b", borderColor: "#3b82f6" };
    default:
      return { ...base, background: "var(--card)", color: "var(--muted)" };
  }
}
