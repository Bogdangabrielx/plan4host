"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "@/app/app/_components/HeaderContext";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import { usePersistentProperty } from "@/app/app/_components/PropertySelection";

type Property = {
  id: string;
  name: string;
  regulation_pdf_url?: string | null;
  regulation_pdf_uploaded_at?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  presentation_image_url?: string | null;
  presentation_image_uploaded_at?: string | null;
  contact_overlay_position?: 'top'|'center'|'down' | null;
  social_facebook?: string | null;
  social_instagram?: string | null;
  social_tiktok?: string | null;
  social_website?: string | null;
};

type ProviderItem = { slug: string; label: string; logo?: string | null };

const card: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};
const FIELD: React.CSSProperties = {
  width: "100%",
  padding: 10,
  background: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontFamily: "inherit",
};

function Info({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<'below'|'above'>('below');
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: Event) {
      const t = e.target as Node | null;
      if (ref.current && t && !ref.current.contains(t)) setOpen(false);
    }
    function onKey(ev: KeyboardEvent) { if (ev.key === 'Escape') setOpen(false); }
    document.addEventListener('pointerdown', onDoc, true);
    document.addEventListener('keydown', onKey, true);
    // Decide placement (above on small screens if not enough space below)
    try {
      const rect = ref.current?.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 0;
      if (rect) {
        const spaceBelow = vh - rect.bottom;
        const spaceAbove = rect.top;
        const minTooltipH = 140; // approx height
        setPlacement(spaceBelow < minTooltipH && spaceAbove > spaceBelow ? 'above' : 'below');
      }
    } catch {}
    return () => {
      document.removeEventListener('pointerdown', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);
  const posStyle = placement === 'above' ? { bottom: 26, right: 0 } as const : { top: 26, right: 0 } as const;
  return (
    <span ref={ref} style={{ position:'relative', display:'inline-block' }}>
      <button
        type="button"
        aria-label="Info"
        aria-expanded={open}
        onClick={()=>setOpen(v=>!v)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 20, height: 20, borderRadius: 999,
          border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--muted)',
          fontSize: 12, fontWeight: 800, cursor: 'pointer', userSelect: 'none',
          padding: 0, lineHeight: 1
        }}
      >
        i
      </button>
      {open && (
        <div
          role="tooltip"
          style={{
            position:'absolute', zIndex: 10, maxWidth: 360,
            background: 'var(--panel)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 10,
            padding: '8px 10px', boxShadow: '0 10px 30px rgba(0,0,0,.20)',
            ...posStyle,
          }}
        >
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>{text}</div>
        </div>
      )}
    </span>
  );
}

const IMAGE_INFO = "Recommended: 3:1 banner, min 1200×400 (ideal 1800×600), JPG/WebP, under ~500 KB. Keep the subject centered; image is cropped (cover).";
const PDF_INFO = "PDF (House Rules), preferably under 5 MB. A4 portrait recommended; keep text readable.";

export default function CheckinEditorClient({ initialProperties }: { initialProperties: Array<{ id: string; name: string }> }) {
  const supabase = useMemo(() => createClient(), []);
  const { setTitle, setPill } = useHeader();

  const [properties] = useState(initialProperties);
  const [propertyId, setPropertyId] = usePersistentProperty(properties);

  const [status, setStatus] = useState<"Idle" | "Saving…" | "Synced" | "Error">("Idle");
  useEffect(() => { setTitle("Check-in Editor"); }, [setTitle]);
  useEffect(() => { setPill(status === 'Saving…' ? 'Saving…' : status === 'Synced' ? 'Synced' : status === 'Error' ? 'Error' : 'Idle'); }, [status, setPill]);

  const [prop, setProp] = useState<Property | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSrc, setShowSrc] = useState(false);
  const [providers, setProviders] = useState<ProviderItem[]>([]);

  // Responsive helper: treat phones/narrow screens differently for layout
  const [isNarrow, setIsNarrow] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(max-width: 560px)')?.matches ?? false;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia?.('(max-width: 560px)');
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    try { mq?.addEventListener('change', onChange); } catch { mq?.addListener?.(onChange as any); }
    setIsNarrow(mq?.matches ?? false);
    return () => {
      try { mq?.removeEventListener('change', onChange); } catch { mq?.removeListener?.(onChange as any); }
    };
  }, []);

  async function refresh() {
    if (!propertyId) { setProp(null); return; }
    const { data, error } = await supabase
      .from("properties")
      .select("id,name,regulation_pdf_url,regulation_pdf_uploaded_at,contact_email,contact_phone,contact_address,presentation_image_url,presentation_image_uploaded_at,contact_overlay_position,social_facebook,social_instagram,social_tiktok,social_website")
      .eq("id", propertyId)
      .maybeSingle();
    if (error) { setProp(null); }
    else setProp((data ?? null) as Property | null);
  }

  useEffect(() => { refresh(); }, [propertyId, supabase]);

  function onPropChange(e: React.ChangeEvent<HTMLSelectElement>) { setPropertyId(e.currentTarget.value); }

  async function triggerPdfUpload() {
    if (!propertyId) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files?.[0] || null;
      if (!file) { input.remove(); return; }
      setStatus('Saving…');
      try {
        const fd = new FormData();
        fd.append('propertyId', propertyId);
        fd.append('file', file);
        const res = await fetch('/api/property/regulation/upload', { method: 'POST', body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { alert(j?.error || 'Upload failed'); setStatus('Error'); return; }
        await refresh();
        setStatus('Synced'); setTimeout(() => setStatus('Idle'), 800);
      } catch { setStatus('Error'); }
      finally { input.remove(); }
    };
    document.body.appendChild(input);
    input.click();
  }

  async function saveContacts(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!prop) return;
    // Require overlay position selection
    if (!prop.contact_overlay_position) { alert('Please select the overlay position for the property banner.'); return; }
    setStatus('Saving…');
    const { error } = await supabase
      .from('properties')
      .update({
        contact_email: prop.contact_email ?? null,
        contact_phone: prop.contact_phone ?? null,
        contact_address: prop.contact_address ?? null,
        contact_overlay_position: prop.contact_overlay_position ?? null,
      })
      .eq('id', prop.id);
    if (error) { setStatus('Error'); return; }
    setStatus('Synced'); setTimeout(() => setStatus('Idle'), 800);
  }

  // Build absolute check-in link for selected property
  function getCheckinBase(): string {
    const v1 = (process.env.NEXT_PUBLIC_CHECKIN_BASE || "").toString().trim();
    if (v1) return v1.replace(/\/+$/, "");
    const v2 = (process.env.NEXT_PUBLIC_APP_URL || "").toString().trim();
    if (v2) return v2.replace(/\/+$/, "");
    if (typeof window !== "undefined" && window.location?.origin) return window.location.origin.replace(/\/+$/, "");
    return "";
  }
  function buildCheckinLink(propertyId: string): string {
    const base = getCheckinBase();
    try {
      const u = new URL(base);
      const normalizedPath = u.pathname.replace(/\/+$/, "");
      u.pathname = `${normalizedPath}/checkin`;
      u.search = new URLSearchParams({ property: propertyId }).toString();
      return u.toString();
    } catch {
      return `${base}/checkin?property=${encodeURIComponent(propertyId)}`;
    }
  }
  function sourceSlug(p?: string | null): string {
    const s = (p || '').toString().trim().toLowerCase();
    if (!s) return '';
    if (s.includes('booking')) return 'booking';
    if (s.includes('airbnb')) return 'airbnb';
    if (s.includes('expedia')) return 'expedia';
    if (s.includes('trivago')) return 'trivago';
    if (s.includes('lastminute')) return 'lastminute';
    if (s.includes('travelminit')) return 'travelminit';
    return s.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  function providerBuiltinLogo(provider?: string | null): string | null {
    const p = (provider || '').toLowerCase();
    if (p.includes('booking')) return '/booking.png';
    if (p.includes('airbnb')) return '/airbnb.png';
    if (p.includes('expedia')) return '/expedia.png';
    if (p.includes('trivago')) return '/trivago.png';
    if (p.includes('lastminute')) return '/lastminute.png';
    if (p.includes('travelminit')) return '/travelminit.png';
    return null;
  }
  function providerLabel(p: string): string {
    const s = p.toLowerCase();
    if (s === 'booking' || s.includes('booking')) return 'Booking.com';
    if (s === 'airbnb' || s.includes('airbnb')) return 'Airbnb';
    if (s === 'expedia' || s.includes('expedia')) return 'Expedia';
    if (s === 'trivago' || s.includes('trivago')) return 'Trivago';
    if (s === 'lastminute' || s.includes('lastminute')) return 'Lastminute';
    if (s === 'travelminit' || s.includes('travelminit')) return 'Travelminit';
    return p;
  }
  async function openSourcePicker() {
    if (!propertyId) return;
    setShowSrc(true);
    try {
      const r = await supabase
        .from('ical_type_integrations')
        .select('provider,logo_url,is_active')
        .eq('property_id', propertyId as string);
      const seen = new Set<string>();
      const out: ProviderItem[] = [
        { slug: 'manual', label: 'Manual', logo: '/P4H_ota.png' },
      ];
      if (!r.error && Array.isArray(r.data)) {
        for (const row of r.data as any[]) {
          const prov = String(row.provider || '').trim(); if (!prov) continue;
          const slug = sourceSlug(prov);
          if (seen.has(slug)) continue;
          seen.add(slug);
          const builtin = providerBuiltinLogo(prov);
          out.push({ slug, label: providerLabel(prov), logo: row.logo_url || builtin });
        }
      }
      setProviders(out);
    } catch {
      setProviders([{ slug: 'manual', label: 'Manual', logo: '/P4H_ota.png' }]);
    }
  }
  async function pickProvider(slug: string) {
    if (!prop) return;
    const base = buildCheckinLink(prop.id);
    const url = slug ? `${base}${base.includes('?') ? '&' : '?'}source=${encodeURIComponent(slug)}` : base;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { prompt('Copy this link:', url); }
    setShowSrc(false);
  }

  async function triggerImageUpload() {
    if (!propertyId) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files?.[0] || null;
      if (!file) { input.remove(); return; }
      setStatus('Saving…');
      try {
        const fd = new FormData();
        fd.append('propertyId', propertyId);
        fd.append('file', file);
        const res = await fetch('/api/property/profile/upload', { method: 'POST', body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { alert(j?.error || 'Upload failed'); setStatus('Error'); return; }
        await refresh();
        setStatus('Synced'); setTimeout(() => setStatus('Idle'), 800);
      } catch { setStatus('Error'); }
      finally { input.remove(); }
    };
    document.body.appendChild(input);
    input.click();
  }

  return (
    <div style={{ display:'grid', gap:16 }}>
      <PlanHeaderBadge title="Check-in Editor" slot="header-right" />
      {/* Property selector */}
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Select Property</h2>
        <select value={propertyId || ''} onChange={onPropChange} style={FIELD}>
          {(properties || []).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </section>

      {prop && (
        <>
          {/* Check-in Link */}
          <section style={card}>
            <h3 style={{ marginTop: 0 }}>Check-in Link</h3>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <button className="sb-btn sb-btn--primary" onClick={openSourcePicker} disabled={!prop?.regulation_pdf_url} title={prop?.regulation_pdf_url ? 'Copy check-in link' : 'Upload House Rules PDF first'}>
                {copied ? 'Copied!' : 'Copy check-in link'}
              </button>
              <small style={{ color:'var(--muted)' }}>You can choose a source before copying.</small>
            </div>
          </section>

          {/* House Rules PDF */}
          <section style={card}>
            <h3 style={{ marginTop: 0 }}>House Rules PDF</h3>
            {prop.regulation_pdf_url ? (
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <a href={prop.regulation_pdf_url} target="_blank" rel="noreferrer" className="sb-btn sb-btn--primary">Open</a>
                <button className="sb-btn" onClick={triggerPdfUpload}>Replace PDF</button>
                <Info text={PDF_INFO} />
                <small style={{ color:'var(--muted)' }}>
                  Uploaded {prop.regulation_pdf_uploaded_at ? new Date(prop.regulation_pdf_uploaded_at).toLocaleString() : ''}
                </small>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span style={{ color:'var(--muted)' }}>No PDF uploaded.</span>
                <button className="sb-btn" onClick={triggerPdfUpload}>Upload PDF</button>
                <Info text={PDF_INFO} />
              </div>
            )}
          </section>

          {/* Contact details */}
          <section style={card}>
            <h3 style={{ marginTop: 0 }}>Property Contact</h3>
            <form onSubmit={saveContacts} style={{ display:'grid', gap:12, maxWidth:560 }}>
              <div>
                <label style={{ display:'block', marginBottom:6 }}>Email</label>
                <input
                  type="email"
                  value={prop.contact_email ?? ''}
                  onChange={(e) => { const v = e.currentTarget.value; setProp(prev => prev ? { ...prev, contact_email: v } : prev); }}
                  placeholder="example@hotel.com"
                  style={FIELD}
                />
              </div>
              <div>
                <label style={{ display:'block', marginBottom:6 }}>Phone</label>
                <input
                  type="tel"
                  value={prop.contact_phone ?? ''}
                  onChange={(e) => { const v = e.currentTarget.value; setProp(prev => prev ? { ...prev, contact_phone: v } : prev); }}
                  placeholder="+40 712 345 678"
                  style={FIELD}
                />
              </div>
              <div>
                <label style={{ display:'block', marginBottom:6 }}>Address</label>
                <input
                  value={prop.contact_address ?? ''}
                  onChange={(e) => { const v = e.currentTarget.value; setProp(prev => prev ? { ...prev, contact_address: v } : prev); }}
                  placeholder="Street, city, optional details"
                  style={FIELD}
                />
              </div>
              {/* Overlay selector + Save: desktop on one row; mobile stacked with full-width Save */}
              {isNarrow ? (
                <div style={{ display:'grid', gap:8 }}>
                  <div>
                    <label style={{ display:'block', marginBottom:6 }}>Overlay position on banner</label>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <select
                        value={prop.contact_overlay_position ?? ''}
                        onChange={(e)=>{ const v = (e.currentTarget.value || '') as any; setProp(prev => prev ? { ...prev, contact_overlay_position: (v || null) } : prev); }}
                        style={{ ...FIELD, maxWidth: 240 }}
                      >
                        <option value="">- select -</option>
                        <option value="top">top</option>
                        <option value="center">center</option>
                        <option value="down">down</option>
                      </select>
                      <Info text={'These contact details are shown on top of your banner image as a glass card. Choose where to place it: at the top, centered, or near the bottom.'} />
                    </div>
                  </div>
                  <div>
                    <button type="submit" className="sb-btn sb-btn--primary" style={{ width:'100%' }}>Save</button>
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <label style={{ display:'block', margin:0 }}>Overlay position on banner</label>
                    <select
                      value={prop.contact_overlay_position ?? ''}
                      onChange={(e)=>{ const v = (e.currentTarget.value || '') as any; setProp(prev => prev ? { ...prev, contact_overlay_position: (v || null) } : prev); }}
                      style={{ ...FIELD, maxWidth: 240 }}
                    >
                      <option value="">- select -</option>
                      <option value="top">top</option>
                      <option value="center">center</option>
                      <option value="down">down</option>
                    </select>
                    <Info text={'These contact details are shown on top of your banner image as a glass card. Choose where to place it: at the top, centered, or near the bottom.'} />
                  </div>
                  <div>
                    <button type="submit" className="sb-btn sb-btn--primary">Save</button>
                  </div>
                </div>
              )}

              {/* Social links quick editor */}
              <SocialLinksEditor prop={prop} setProp={setProp} supabase={supabase} setStatus={setStatus} />
            </form>
          </section>

          {/* Presentation Image */}
          <section style={card}>
            <h3 style={{ marginTop: 0 }}>Presentation Image</h3>
            <div style={{ display:'grid', gap:10 }}>
              {prop.presentation_image_url ? (
                <div style={{ display:'grid', gap:8 }}>
                  <img src={prop.presentation_image_url} alt="Presentation" style={{ width: 420, maxWidth:'100%', height: 240, objectFit:'cover', borderRadius: 12, border:'1px solid var(--border)', background:'#fff' }} />
                  <small style={{ color:'var(--muted)' }}>
                    Uploaded {prop.presentation_image_uploaded_at ? new Date(prop.presentation_image_uploaded_at).toLocaleString() : ''}
                  </small>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <a href={prop.presentation_image_url} target="_blank" rel="noreferrer" className="sb-btn">Open full</a>
                    <button className="sb-btn" onClick={triggerImageUpload}>Replace image</button>
                    <Info text={IMAGE_INFO} />
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <span style={{ color:'var(--muted)' }}>No image uploaded.</span>
                  <button className="sb-btn" onClick={triggerImageUpload}>Upload image</button>
                  <Info text={IMAGE_INFO} />
                </div>
              )}
            </div>
          </section>
        </>
      )}
      {/* Source picker modal */}
      {showSrc && (
        <div role="dialog" aria-modal="true" onClick={()=>setShowSrc(false)}
          style={{ position:'fixed', inset:0, zIndex: 260, background:'rgba(0,0,0,.55)', display:'grid', placeItems:'center', padding:12 }}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(520px, 100%)', padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <strong>Select Check‑in Source</strong>
              <button className="sb-btn" onClick={()=>setShowSrc(false)}>Close</button>
            </div>
            <div style={{ display:'grid', gap:8 }}>
              {providers.map(p => (
                <button key={p.slug} className="sb-btn" onClick={()=>pickProvider(p.slug)} style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'flex-start' }}>
                  {p.logo ? (
                    <img src={p.logo} alt="" width={18} height={18} style={{ borderRadius:4 }} />
                  ) : (
                    <span aria-hidden>🔗</span>
                  )}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SocialLinksEditor({ prop, setProp, supabase, setStatus }: {
  prop: Property;
  setProp: React.Dispatch<React.SetStateAction<Property | null>>;
  supabase: ReturnType<typeof createClient>;
  setStatus: React.Dispatch<React.SetStateAction<"Idle" | "Saving…" | "Synced" | "Error">>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  type Key = 'facebook'|'instagram'|'tiktok'|'website';
  const [active, setActive] = useState<Key | null>(null);
  const [draft, setDraft] = useState<string>("");

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark') return true; if (attr === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
  });
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    try { m?.addEventListener('change', onChange); } catch { m?.addListener?.(onChange); }
    const root = document.documentElement;
    const mo = new MutationObserver(() => {
      const t = root.getAttribute('data-theme');
      if (t === 'dark') setIsDark(true); else if (t === 'light') setIsDark(false);
    });
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { try { m?.removeEventListener('change', onChange); } catch { m?.removeListener?.(onChange); } mo.disconnect(); };
  }, []);

  function icon(name: Key) {
    const suffix = isDark ? 'fordark' : 'forlight';
    return `/${name}_${suffix}.png`;
  }

  function getVal(k: Key): string {
    if (!prop) return '';
    if (k === 'facebook') return prop.social_facebook || '';
    if (k === 'instagram') return prop.social_instagram || '';
    if (k === 'tiktok') return prop.social_tiktok || '';
    return prop.social_website || '';
  }
  function patchLocal(k: Key, v: string | null) {
    setProp(prev => prev ? {
      ...prev,
      social_facebook: k === 'facebook' ? (v || null) : prev.social_facebook ?? null,
      social_instagram: k === 'instagram' ? (v || null) : prev.social_instagram ?? null,
      social_tiktok: k === 'tiktok' ? (v || null) : prev.social_tiktok ?? null,
      social_website: k === 'website' ? (v || null) : prev.social_website ?? null,
    } : prev);
  }
  async function save(k: Key, val: string) {
    if (!prop) return;
    setStatus('Saving…');
    const update: Record<string, string | null> = {};
    const normalized = (val || '').trim() || null;
    update[
      k === 'facebook' ? 'social_facebook'
      : k === 'instagram' ? 'social_instagram'
      : k === 'tiktok' ? 'social_tiktok'
      : 'social_website'
    ] = normalized;
    const { error } = await supabase.from('properties').update(update).eq('id', prop.id);
    if (error) { setStatus('Error'); return; }
    patchLocal(k, normalized);
    setStatus('Synced'); setTimeout(() => setStatus('Idle'), 800);
  }

  async function commitActive() {
    if (!active) return;
    const current = getVal(active);
    if ((current || '') === (draft || '')) return; // no change
    await save(active, draft);
  }

  function onPick(k: Key) {
    // save previous draft before switching
    commitActive();
    setActive(k);
    setDraft(getVal(k));
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node | null;
      if (containerRef.current && t && !containerRef.current.contains(t)) {
        commitActive();
      }
    }
    document.addEventListener('mousedown', onDoc, true);
    return () => document.removeEventListener('mousedown', onDoc, true);
  }, [active, draft]);

  return (
    <div ref={containerRef}>
      <label style={{ display:'block', marginBottom:6 }}>Social Links</label>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        {(['facebook','instagram','tiktok','website'] as Key[]).map(k => (
          <button
            key={k}
            type="button"
            onClick={() => onPick(k)}
            title={k.charAt(0).toUpperCase() + k.slice(1)}
            style={{ background:'transparent', border:'none', padding:0, cursor:'pointer', lineHeight:0, outline:'none' }}
          >
            <img src={icon(k)} alt={k} width={24} height={24} />
          </button>
        ))}
      </div>
      {active && (
        <div style={{ marginTop:8 }}>
          <input
            autoFocus
            placeholder={`Paste ${active} URL`}
            value={draft}
            onChange={(e)=>setDraft(e.currentTarget.value)}
            onBlur={()=>commitActive()}
            style={FIELD}
          />
          <small style={{ color:'var(--muted)' }}>
            Tip: Clear the field to remove the link. It saves automatically on click away.
          </small>
        </div>
      )}
    </div>
  );
}
