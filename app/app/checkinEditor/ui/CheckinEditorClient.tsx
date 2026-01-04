"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "@/app/app/_components/HeaderContext";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import { usePersistentPropertyState } from "@/app/app/_components/PropertySelection";

type Property = {
  id: string;
  name: string;
  regulation_pdf_url?: string | null;
  regulation_pdf_uploaded_at?: string | null;
  ai_house_rules_text?: string | null;
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
  social_location?: string | null;
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
    return () => {
      document.removeEventListener('pointerdown', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);
  return (
    <span ref={ref} style={{ display:'inline-block', width: '100%' }}>
      <button
        type="button"
        aria-label="Info"
        aria-expanded={open ? true : undefined}
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
        <div className="sb-card" style={{
          border: '1px solid var(--border)',
          background: 'var(--panel)',
          color: 'var(--text)',
          borderRadius: 10,
          padding: 10,
          marginTop: 8,
        }}>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--muted)' }}>{text}</div>
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
  const { propertyId, setPropertyId, ready: propertyReady } = usePersistentPropertyState(properties);

  const [status, setStatus] = useState<"Idle" | "Saving…" | "Synced" | "Error">("Idle");
  const [loading, setLoading] = useState(false);
  const loadSeqRef = useRef(0);
  useEffect(() => { setTitle("Check-in Editor"); }, [setTitle]);
  useEffect(() => {
    setPill(
      status === "Saving…" ? "Saving…" :
      !propertyReady       ? "Loading…" :
      loading              ? "Loading…" :
      status === "Synced"  ? "Synced"  :
      status === "Error"   ? "Error"   : "Idle"
    );
  }, [status, loading, propertyReady, setPill]);

  const [prop, setProp] = useState<Property | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSrc, setShowSrc] = useState(false);
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  // House Rules gating
  const [noPdfOpen, setNoPdfOpen] = useState(false);
  const [highlightUpload, setHighlightUpload] = useState(false);
  const uploadBtnRef = useRef<HTMLButtonElement | null>(null);
  // Presentation image prompt
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [imagePromptDismissed, setImagePromptDismissed] = useState(false);
  const imageUploadBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastSavedContact = useRef<{ email: string; phone: string; address: string }>({ email: "", phone: "", address: "" });
  // Onboarding highlight target (contacts / picture / house_rules)
  const [highlightTarget, setHighlightTarget] = useState<"contacts" | "picture" | "house_rules" | null>(null);

  // AI assistant – house rules text source
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalLoading, setAiModalLoading] = useState(false);
  const [aiModalText, setAiModalText] = useState<string>("");
  const [aiModalError, setAiModalError] = useState<string | null>(null);
  const [aiStatusPopupOpen, setAiStatusPopupOpen] = useState(false);
  const [aiStatusPhase, setAiStatusPhase] = useState<"idle" | "reading" | "success" | "failed">("idle");
  const [currentPlan, setCurrentPlan] = useState<"basic" | "standard" | "premium" | null>(null);
  const [aiPremiumPopupOpen, setAiPremiumPopupOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await supabase.rpc("account_current_plan");
        const p = (r.data as string | null)?.toLowerCase?.() as "basic" | "standard" | "premium" | null;
        if (mounted) setCurrentPlan((p ?? "basic") as any);
      } catch {
        if (mounted) setCurrentPlan("basic");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

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
  // Reset prompt dismissal when property changes
  useEffect(() => { setImagePromptDismissed(false); }, [propertyId]);
  // Show prompt on entry if placeholder image is used
  useEffect(() => {
    const isPlaceholder = !!prop?.presentation_image_url && prop.presentation_image_url.includes('/hotel_room_1456x816.jpg');
    if (isPlaceholder && !imagePromptDismissed) setShowImagePrompt(true);
  }, [prop?.presentation_image_url, imagePromptDismissed]);

  async function refresh() {
    if (!propertyId) { setProp(null); return; }
    const seq = (loadSeqRef.current += 1);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("id,name,regulation_pdf_url,regulation_pdf_uploaded_at,ai_house_rules_text,contact_email,contact_phone,contact_address,presentation_image_url,presentation_image_uploaded_at,contact_overlay_position,social_facebook,social_instagram,social_tiktok,social_website,social_location")
        .eq("id", propertyId)
        .maybeSingle();
      if (seq !== loadSeqRef.current) return;
      if (error) { setProp(null); lastSavedContact.current = { email: "", phone: "", address: "" }; }
      else {
        setProp((data ?? null) as Property | null);
        lastSavedContact.current = {
          email: (data?.contact_email ?? "") as string,
          phone: (data?.contact_phone ?? "") as string,
          address: (data?.contact_address ?? "") as string,
        };
      }
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }

  useEffect(() => { if (propertyReady) refresh(); }, [propertyId, supabase, propertyReady]);

  // Read onboarding highlight hint from URL (e.g., ?highlight=contacts|picture|house_rules)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const u = new URL(window.location.href);
      const h = (u.searchParams.get("highlight") || "").toLowerCase();
      if (h === "contacts" || h === "picture" || h === "house_rules") {
        setHighlightTarget(h);
        // Optionally clean param so it doesn't persist forever
        u.searchParams.delete("highlight");
        window.history.replaceState({}, "", u.toString());
      }
    } catch {
      // ignore
    }
  }, []);

  function onPropChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.currentTarget.value;
    if (!next || next === propertyId) return;
    setProp(null);
    setLoading(true);
    setPropertyId(next);
  }

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
        try {
          window.dispatchEvent(new CustomEvent("p4h:onboardingDirty"));
        } catch {
          // ignore
        }
        setStatus('Synced'); setTimeout(() => setStatus('Idle'), 800);
        // After successful upload, offer to extract text for the guest AI assistant
        if (currentPlan === "premium") {
          try {
            await openAiHouseRulesModalFromPdf();
          } catch {
            // Non-fatal; ignore errors here
          }
        }
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
    try {
      window.dispatchEvent(new CustomEvent("p4h:onboardingDirty"));
    } catch {
      // ignore
    }
    setStatus('Synced'); setTimeout(() => setStatus('Idle'), 800);
  }
  async function autoSaveContactField(key: 'email' | 'phone' | 'address', value: string) {
    if (!prop) return;
    const clean = value.trim();
    const last = lastSavedContact.current[key];
    if (clean === last) return;
    setStatus('Saving…');
    const payload: Partial<Property> = {};
    if (key === 'email') payload.contact_email = clean || null;
    if (key === 'phone') payload.contact_phone = clean || null;
    if (key === 'address') payload.contact_address = clean || null;
    const { error } = await supabase.from('properties').update(payload).eq('id', prop.id);
    if (error) { setStatus('Error'); return; }
    lastSavedContact.current = { ...lastSavedContact.current, [key]: clean };
    await refresh();
    try {
      window.dispatchEvent(new CustomEvent("p4h:onboardingDirty"));
    } catch {
      // ignore
    }
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
        try {
          window.dispatchEvent(new CustomEvent("p4h:onboardingDirty"));
        } catch {
          // ignore
        }
        setStatus('Synced'); setTimeout(() => setStatus('Idle'), 800);
      } catch { setStatus('Error'); }
      finally { input.remove(); }
    };
    document.body.appendChild(input);
    input.click();
  }

  async function openAiHouseRulesModalFromPdf() {
    if (!propertyId) return;
    setAiModalOpen(true);
    setAiModalLoading(true);
    setAiModalError(null);
    setAiModalText(prop?.ai_house_rules_text || "");
    setAiStatusPhase("reading");
    setAiStatusPopupOpen(true);
    try {
      const res = await fetch(
        `/api/property/regulation/read-text?propertyId=${encodeURIComponent(
          propertyId,
        )}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.text) {
        if (!prop?.ai_house_rules_text) {
          setAiModalText(String(data.text || ""));
        }
        setAiStatusPhase("success");
      } else {
        setAiModalError("extract_failed");
        setAiStatusPhase("failed");
      }
    } catch {
      setAiModalError("extract_failed");
      setAiStatusPhase("failed");
    } finally {
      setAiModalLoading(false);
    }
  }

  async function saveAiHouseRules() {
    if (!propertyId) return;
    setStatus("Saving…");
    try {
      const res = await fetch("/api/property/ai-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          houseRulesText: aiModalText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Failed to save AI house rules.");
        setStatus("Error");
        return;
      }
      await refresh();
      setStatus("Synced");
      setTimeout(() => setStatus("Idle"), 800);
      setAiModalOpen(false);
    } catch (e: any) {
      alert(e?.message || "Failed to save AI house rules.");
      setStatus("Error");
    }
  }

  return (
    <div style={{ fontFamily: "Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", color: "var(--text)" }}>
      <PlanHeaderBadge title="Check-in Editor" slot="under-title" />
      <div style={{ padding: isNarrow ? "10px 12px 16px" : "16px", display: "grid", gap: 16 }}>
        {/* Controls (same spacing pattern as Guest Overview) */}
        <div className="sb-toolbar" style={{ gap: isNarrow ? 12 : 20, flexWrap: "wrap", marginBottom: 12 }}>
          {/* Property selector (pill with avatar only) */}
          <div
            className="modalCard Sb-cardglow"
            style={{
              position: 'relative',
              display: isNarrow ? 'grid' : 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: isNarrow ? '8px 10px 8px 56px' : '6px 10px 6px 56px',
              borderRadius: 999,
              minHeight: 56,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              width: isNarrow ? '100%' : undefined,
              flexBasis: isNarrow ? '100%': 'auto',
              flex: isNarrow ? '1 1 100%' :undefined
            }}
          >
            {prop?.presentation_image_url ? (
              <img
                src={prop.presentation_image_url}
                alt=""
                width={40}
                height={40}
                style={{ position: 'absolute', left: 8, width: 40, height: 40, borderRadius: 999, objectFit: 'cover', border: '2px solid var(--card)' }}
              />
            ) : null}
            <select
              className="sb-select"
              value={propertyId || ''}
              onChange={onPropChange}
              style={{
                background: 'transparent',
                border: 0,
                boxShadow: 'none',
                padding: '10px 12px',
                minHeight: 44,
                minWidth: isNarrow ? '100%' : 220,
                maxWidth: isNarrow ? '100%' : 380,
                width: isNarrow ? '100%' : 'auto',
                fontFamily: 'inherit',
                fontWeight: 700,
              }}
            >
              {(properties || []).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {isNarrow && <div style={{ flexBasis: "100%", height: 8 }} />}
        </div>

      {prop && (
        <>
          {/* Check-in Link */}
          <section className="sb-cardglow" style={card}>
            <h3 style={{ marginTop: 0 }}>Check-in Link</h3>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <button
                className="sb-btn sb-btn--primary sb-cardglow"
                style={{minWidth: 340, color:"var(--text)", borderColor:"var(--primary)" }}
                onClick={() => {
                  if (!prop?.regulation_pdf_url) { setNoPdfOpen(true); return; }
                  openSourcePicker();
                }}
                title={prop?.regulation_pdf_url ? 'Copy check-in link' : 'Upload House Rules PDF first'}
              >
                {copied ? 'Copied!' : 'Copy check-in link'}
              </button>
              <small style={{ color:'var(--muted)' }}>You can choose a source before copying.</small>
            </div>
          </section>

          {aiModalOpen && (
            <div
              role="dialog"
              aria-modal="true"
              onClick={() => setAiModalOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 240,
                background: "rgba(0,0,0,0.55)",
                display: "grid",
                placeItems: "center",
                padding: 12,
                paddingTop: "calc(var(--safe-top, 0px) + 12px)",
                paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="sb-card"
                style={{
                  position: "relative",
                  width: "min(720px, 100%)",
                  maxHeight: "calc(100dvh - 40px)",
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 16,
                  display: "grid",
                  gridTemplateRows: "auto auto 1fr auto",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <strong>Use House Rules for guest assistant</strong>
                  <button
                    type="button"
                    className="sb-btn"
                    onClick={() => setAiModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  This text will be used as input for the guest AI assistant
                  (arrival details, amenities, etc.). Review it, remove any
                  sensitive information (door codes, passwords, private links),
                  then confirm.
                </div>
                <textarea
                  value={aiModalText}
                  onChange={(e) => setAiModalText(e.currentTarget.value)}
                  rows={16}
                  style={{
                    width: "100%",
                    height: "auto",
                    minHeight: 260,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--text)",
                    padding: 10,
                    resize: "none",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                  }}
                  disabled={aiModalLoading}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {aiModalLoading ? "" : ""}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="sb-btn"
                      onClick={() => setAiModalOpen(false)}
                      disabled={aiModalLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="sb-btn sb-btn--primary"
                      onClick={saveAiHouseRules}
                      disabled={aiModalLoading}
                      style={{
                        background: "linear-gradient(135deg, #00d1ff, #7c3aed)",
                        borderColor: "transparent",
                        color: "#0c111b",
                        fontWeight: 600,
                      }}
                    >
                      {aiModalLoading ? "Saving…" : "Use for AI"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {aiStatusPopupOpen && (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 260,
                background: "rgba(0,0,0,0.45)",
                display: "grid",
                placeItems: "center",
                padding: 12,
                paddingTop: "calc(var(--safe-top, 0px) + 12px)",
                paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
              }}
            >
              <div
                className="sb-card"
                style={{
                  width: "min(420px, 100%)",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background:
                    aiStatusPhase === "reading"
                      ? "linear-gradient(135deg, rgba(0,209,255,0.16), rgba(124,58,237,0.28))"
                      : "var(--panel)",
                  padding: 16,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
                  color: "var(--text)",
                  textAlign: "left",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {aiStatusPhase === "reading"
                    ? "Reading the file…"
                    : aiStatusPhase === "success"
                    ? "Text ready for your guest AI assistant"
                    : "Add info for your guest AI assistant"}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  {aiStatusPhase === "reading"
                    ? "Please wait while we prepare the text that the guest AI assistant will use."
                    : aiStatusPhase === "success"
                    ? "We prepared the text for your guest AI assistant. You can now review and edit it below, then save."
                    : "Please type or paste the details you want the guest AI assistant to know (house rules, arrival instructions, amenities, recommendations, check‑out, etc.), then save."}
                </div>
                {aiStatusPhase !== "reading" && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      className="sb-btn"
                      onClick={() => {
                        setAiStatusPopupOpen(false);
                        setAiStatusPhase("idle");
                      }}
                    >
                      Close
                    </button>
                    {aiStatusPhase === "success" && (
                      <button
                        type="button"
                        className="sb-btn sb-btn--primary"
                        onClick={() => {
                          setAiStatusPopupOpen(false);
                          setAiStatusPhase("idle");
                        }}
                      >
                        Check &amp; edit
                      </button>
                    )}
                    {aiStatusPhase === "failed" && (
                      <button
                        type="button"
                        className="sb-btn sb-btn--primary"
                        onClick={() => {
                          setAiStatusPopupOpen(false);
                          setAiStatusPhase("idle");
                        }}
                      >
                        Fill manually
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {aiPremiumPopupOpen && (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 260,
                background: "rgba(0,0,0,0.55)",
                display: "grid",
                placeItems: "center",
                padding: 12,
                paddingTop: "calc(var(--safe-top, 0px) + 12px)",
                paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
              }}
            >
              <div
                className="sb-card"
                style={{
                  width: "min(420px, 100%)",
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background:
                    "linear-gradient(135deg, rgba(0,209,255,0.25), rgba(124,58,237,0.75))",
                  padding: 16,
                  boxShadow: "0 16px 40px rgba(0,0,0,0.65)",
                  color: "#f9fafb",
                  textAlign: "left",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  Guest AI assistant is a Premium feature
                </div>
                <div style={{ fontSize: 13, opacity: 0.95 }}>
                  To read and prepare House Rules text for the guest AI assistant, you need an active{" "}
                  <strong>Premium</strong> plan. Upgrade your account to unlock AI answers for arrival details,
                  amenities, extras and check-out.
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="sb-btn"
                    onClick={() => setAiPremiumPopupOpen(false)}
                  >
                    Close
                  </button>
                  <a
                    href="/app/subscription?plan=premium&hl=1"
                    className="sb-btn sb-cardglow"
                    style={{
                      background: "#0b1120",
                      borderColor: "rgba(148,163,184,0.6)",
                      color: "#f9fafb",
                      fontWeight: 700,
                    }}
                  >
                    View Premium plans
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* House Rules PDF */}
          <section
            className="sb-cardglow"
            style={{
              ...card,
              ...(highlightTarget === "house_rules"
                ? {
                    boxShadow:
                      "0 0 0 2px color-mix(in srgb, #0ea5e9 70%, transparent)",
                    borderColor: "color-mix(in srgb, #0ea5e9 70%, var(--border))",
                  }
                : null),
            }}
          >
            <h3 style={{ marginTop: 0 }}>House Rules PDF</h3>
            {prop.regulation_pdf_url ? (
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <a href={prop.regulation_pdf_url} target="_blank" rel="noreferrer" className="sb-btn sb-btn--primary">Open</a>
                <button className="sb-btn" onClick={triggerPdfUpload}>Replace PDF</button>
                <button
                  className="sb-btn sb-cardglow"
                  type="button"
                  onClick={() => {
                    if (currentPlan !== "premium") {
                      setAiPremiumPopupOpen(true);
                      return;
                    }
                    openAiHouseRulesModalFromPdf();
                  }}
                  title="Read PDF text and prepare it as source for the guest AI assistant"
                  style={{
                    background:
                      "linear-gradient(135deg, #00d1ff, #7c3aed)",
                    borderColor: "transparent",
                    color: "#0c111b",
                    fontWeight: 600,
                  }}
                >
                  Read &amp; prepare text for AI
                </button>
                <Info text={PDF_INFO} />
                <small style={{ color:'var(--muted)' }}>
                  Uploaded {prop.regulation_pdf_uploaded_at ? new Date(prop.regulation_pdf_uploaded_at).toLocaleString() : ''}
                </small>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span style={{ color:'var(--muted)' }}>No PDF uploaded.</span>
                <button
                  className="sb-btn"
                  onClick={() => { setHighlightUpload(false); triggerPdfUpload(); }}
                  ref={uploadBtnRef}
                  style={{
                    border: highlightUpload ? '2px solid var(--primary)' : undefined,
                    boxShadow: highlightUpload ? '0 0 0 4px color-mix(in srgb, var(--primary) 25%, transparent)' : undefined,
                    transition: 'box-shadow 160ms ease, border-color 160ms ease',
                  }}
                >
                  Upload PDF
                </button>
                <Info text={PDF_INFO} />
              </div>
            )}
          </section>

          {noPdfOpen && (
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e)=>{ e.stopPropagation(); }}
              style={{ position:'fixed', inset:0, zIndex: 240, background:'rgba(0,0,0,0.55)', display:'grid', placeItems:'center', padding:12,
                       paddingTop:'calc(var(--safe-top, 0px) + 12px)', paddingBottom:'calc(var(--safe-bottom, 0px) + 12px)' }}>
              <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(560px, 100%)', background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:16, display:'grid', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <strong>House Rules recommended</strong>
                </div>
                <div style={{ color:'var(--text)', display:'grid', gap:8 }}>
                  <div>
                    It’s best to upload your House Rules so guests see and sign them when they complete check-in and so
                    we can prepare the text that the Guest AI assistant will use to support them.*
                  </div>
                  <small style={{ color:'var(--muted)' }}>
                    You can continue without it, but guests won’t see your rules until you upload them.<br />
                    * Guest AI assistant is available only on Premium plans.
                  </small>
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:8, flexWrap:'wrap' }}>
                  <button
                    className="sb-btn"
                    onClick={() => {
                      setNoPdfOpen(false);
                      openSourcePicker();
                    }}
                  >
                    I will upload later
                  </button>
                  <button
                    className="sb-btn sb-btn--primary"
                    onClick={() => {
                      setNoPdfOpen(false);
                      setHighlightUpload(true);
                      try {
                        uploadBtnRef.current?.focus();
                        uploadBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      } catch {}
                      setTimeout(() => { try { triggerPdfUpload(); } catch {} }, 60);
                    }}
                  >
                    Upload now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contact details */}
          <section
            className="sb-cardglow"
            style={{
              ...card,
              ...(highlightTarget === "contacts"
                ? {
                    boxShadow:
                      "0 0 0 2px color-mix(in srgb, #0ea5e9 70%, transparent)",
                    borderColor: "color-mix(in srgb, #0ea5e9 70%, var(--border))",
                  }
                : null),
            }}
          >
            <h3 style={{ marginTop: 0 }}>Property Contact</h3>
            <form onSubmit={saveContacts} style={{ display:'grid', gap:12, maxWidth:560 }}>
              <div>
                <label style={{ display:'block', marginBottom:6 }}>Email</label>
                <input
                  type="email"
                  value={prop.contact_email ?? ''}
                  onChange={(e) => { const v = e.currentTarget.value; setProp(prev => prev ? { ...prev, contact_email: v } : prev); }}
                  onBlur={(e) => autoSaveContactField('email', e.currentTarget.value)}
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
                  onBlur={(e) => autoSaveContactField('phone', e.currentTarget.value)}
                  placeholder="+40 712 345 678"
                  style={FIELD}
                />
              </div>
              <div>
                <label style={{ display:'block', marginBottom:6 }}>Address</label>
                <input
                  value={prop.contact_address ?? ''}
                  onChange={(e) => { const v = e.currentTarget.value; setProp(prev => prev ? { ...prev, contact_address: v } : prev); }}
                  onBlur={(e) => autoSaveContactField('address', e.currentTarget.value)}
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
                        style={{ ...FIELD, maxWidth: 520 }}
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
          <section
            className="sb-cardglow"
            style={{
              ...card,
              ...(highlightTarget === "picture"
                ? {
                    boxShadow:
                      "0 0 0 2px color-mix(in srgb, #0ea5e9 70%, transparent)",
                    borderColor: "color-mix(in srgb, #0ea5e9 70%, var(--border))",
                  }
                : null),
            }}
          >
            <h3 style={{ marginTop: 0 }}>Presentation Image</h3>
            <div style={{ display:'grid', gap:10 }}>
              {prop.presentation_image_url ? (
                <div style={{ display:'grid', gap:8 }}>
                  <img src={prop.presentation_image_url} alt="Presentation" style={{ width: 420, maxWidth:'100%', height: 240, objectFit:'cover', borderRadius: 12, border:'1px solid var(--border)', background:'#fff' }} />
                  <small style={{ color:'var(--muted)' }}>
                    Uploaded {prop.presentation_image_uploaded_at ? new Date(prop.presentation_image_uploaded_at).toLocaleString() : ''}
                  </small>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <a href={prop.presentation_image_url} target="_blank" rel="noreferrer" className="sb-btn sb-cardglow">Preview</a>
                    <button className="sb-btn sb-cardglow" onClick={triggerImageUpload} ref={imageUploadBtnRef}>Replace image</button>
                    <Info text={IMAGE_INFO} />
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <span style={{ color:'var(--muted)' }}>No image uploaded.</span>
                  <button className="sb-btn sb-cardglow" onClick={triggerImageUpload} ref={imageUploadBtnRef}>Upload image</button>
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
      {showImagePrompt && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e)=>e.stopPropagation()}
          style={{ position:'fixed', inset:0, zIndex: 265, background:'rgba(0,0,0,0.55)', display:'grid', placeItems:'center', padding:12,
                   paddingTop:'calc(var(--safe-top, 0px) + 12px)', paddingBottom:'calc(var(--safe-bottom, 0px) + 12px)' }}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(540px, 100%)', background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:16, display:'grid', gap:12, position:'relative' }}>
            <button
              aria-label="Close"
              onClick={() => { setShowImagePrompt(false); setImagePromptDismissed(true); }}
              style={{ position:'absolute', top:12, right:12, width:28, height:28, borderRadius:999, border:'1px solid var(--border)', background:'var(--card)', cursor:'pointer', fontWeight: 700 }}
            >
              ×
            </button>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingRight:32 }}>
              <strong>Upload a real photo of your property</strong>
            </div>
            <div style={{ color:'var(--text)', display:'grid', gap:8 }}>
              <div>Your current photo is a generic placeholder. Upload your real property photo — it shows up in the personalized check-in form.</div>
              <ul style={{ margin:0, paddingLeft:18, color:'var(--muted)', display:'grid', gap:6 }}>
                <li>Guests see the photo while completing the check-in form.</li>
                <li>With contact details filled in, guests can reach you easily from automated/scheduled messages.</li>
              </ul>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, flexWrap:'wrap' }}>
              <button
                className="sb-btn"
                onClick={() => { setShowImagePrompt(false); setImagePromptDismissed(true); }}
              >
                Ok
              </button>
              <button
                className="sb-btn sb-btn--primary"
                onClick={() => {
                  setShowImagePrompt(false);
                  setImagePromptDismissed(true);
                  try {
                    imageUploadBtnRef.current?.focus();
                    imageUploadBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  } catch {}
                  setTimeout(() => { try { triggerImageUpload(); } catch {} }, 80);
                }}
              >
                Upload now
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
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
  type Key = 'facebook'|'instagram'|'tiktok'|'website'|'location';
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
    if (name === 'location') {
      return `/social_location_${suffix}.png`;
    }
    return `/${name}_${suffix}.png`;
  }

  function getVal(k: Key): string {
    if (!prop) return '';
    if (k === 'facebook') return prop.social_facebook || '';
    if (k === 'instagram') return prop.social_instagram || '';
    if (k === 'tiktok') return prop.social_tiktok || '';
    if (k === 'location') return prop.social_location || '';
    return prop.social_website || '';
  }
  function patchLocal(k: Key, v: string | null) {
    setProp(prev => prev ? {
      ...prev,
      social_facebook: k === 'facebook' ? (v || null) : prev.social_facebook ?? null,
      social_instagram: k === 'instagram' ? (v || null) : prev.social_instagram ?? null,
      social_tiktok: k === 'tiktok' ? (v || null) : prev.social_tiktok ?? null,
      social_website: k === 'website' ? (v || null) : prev.social_website ?? null,
      social_location: k === 'location' ? (v || null) : prev.social_location ?? null,
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
      : k === 'location' ? 'social_location'
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
        {(['facebook','instagram','tiktok','website','location'] as Key[]).map(k => (
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
