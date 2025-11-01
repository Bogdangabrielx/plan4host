"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "../subscription.module.css";
import { createClient } from "@/lib/supabase/client";

/** Plan definition sourced from landing (NOT from DB) */
type Plan = {
  slug: "basic" | "standard" | "premium";
  name: string;
  image: string;           // png used on landing for price/visual
  syncIntervalMinutes: number;
  allowSyncNow: boolean;
};

const PLANS: Plan[] = [
  {
    slug: "basic",
    name: "BASIC",
    image: "/basic.png",
    syncIntervalMinutes: 60,
    allowSyncNow: false,
  },
  {
    slug: "standard",
    name: "STANDARD",
    image: "/standard.png",
    syncIntervalMinutes: 30,
    allowSyncNow: false,
  },
  {
    slug: "premium",
    name: "PREMIUM",
    image: "/premium.png",
    syncIntervalMinutes: 10,
    allowSyncNow: true,
  },
];

// Same benefit set as the EN landing page
const BENEFITS: string[] = [
  "Custom digital check-in form",
  "GDPR consent, digital signature and ID copy",
  "QR code for check-in validation",
  "Push and email notifications for each new reservation",
  "Automated, reservation-aware messages",
  "Calendar integrations with multiple platforms (Booking, Airbnb, etc.)",
  "Automatic sync of reservations between platforms",
  "Unlimited properties and rooms in one account",
  "Internal notes for each reservation",
  "Custom checklists per reservation (breakfast included, daily towel change, etc.)",
  "Manage front desk from your phone (confirm/modify reservations)",
  "Export a PDF with each reservation's details",
  "Quick WhatsApp link from each reservation",
  "Prioritize room cleaning based on next check-in",
  "Personalized cleaning task lists",
  "Real-time cleaning status updates",
  "Share daily tasks with team members",
  "Instant sync of reservations in the app calendar with Sync Now button",
];

function planLabel(slug: string) {
  const s = slug.toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Benefit rendering helpers (same logic as landing EN) — plan-specific X markers
const basicX = [
  'Prioritize room cleaning',
  'Personalized cleaning task',
  'Real-time cleaning status',
  'Share daily tasks',
  'Instant sync of reservations in the app calendar',
];
const standardX = [
  'Share daily tasks',
  'Instant sync of reservations in the app calendar',
];

export default function SubscriptionClient({
  initialAccount: _a,
  initialPlans: _p,
}: {
  initialAccount?: any;
  initialPlans?: any[];
}) {
  const supabase = useMemo(() => createClient(), []);

  const [currentPlan, setCurrentPlan] = useState<"basic"|"standard"|"premium">("basic");
  const [validUntil, setValidUntil] = useState<string | null>(null);        // localized display
  const [validUntilISO, setValidUntilISO] = useState<string | null>(null);  // raw ISO for comparisons
  const [basePlan, setBasePlan] = useState<"basic"|"standard"|"premium"|null>(null); // accounts.plan from server
  const [trialActive, setTrialActive] = useState<boolean>(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [role, setRole] = useState<"admin"|"member">("admin");
  const [highlightPlan, setHighlightPlan] = useState<null | Plan["slug"]>(null);
  const [pendingSelect, setPendingSelect] = useState<null | Plan["slug"]>(null);
  const [manageOpen, setManageOpen] = useState<boolean>(false);
  const [cancelled, setCancelled] = useState<boolean>(false);

  // Demo-only: billing profile collection UI (no persistence yet)
  type BuyerType = 'b2b' | 'b2c';
  const [profileExists, setProfileExists] = useState<boolean>(false); // assume false for now
  const [selectedPlan, setSelectedPlan] = useState<Plan["slug"] | null>(null);
  const [buyerTypeOpen, setBuyerTypeOpen] = useState<boolean>(false);
  const [buyerType, setBuyerType] = useState<BuyerType | null>(null);
  const [billingFormOpen, setBillingFormOpen] = useState<boolean>(false);
  const [billingEditMode, setBillingEditMode] = useState<boolean>(false);
  const [planConfirmOpen, setPlanConfirmOpen] = useState<boolean>(false);
  const [planToSchedule, setPlanToSchedule] = useState<Plan["slug"] | null>(null);
  const [planRelation, setPlanRelation] = useState<'upgrade'|'downgrade'|'same'|'unknown'>('unknown');

  // Account billing/status snapshot (pending change, cancel flag)
  const [pendingPlan, setPendingPlan] = useState<Plan["slug"] | null>(null);
  const [pendingEffectiveAt, setPendingEffectiveAt] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);

  // Form state (local only, just for preview)
  const [formB2C, setFormB2C] = useState({
    fullName: "",
    street: "",
    city: "",
    county: "",
    postalCode: "",
    country: "RO",
    email: "",
    phone: "",
    cnp: "",
  });
  const [formB2B, setFormB2B] = useState({
    legalName: "",
    taxId: "",
    street: "",
    city: "",
    county: "",
    postalCode: "",
    country: "RO",
    email: "",
    phone: "",
    vatRegistered: false,
    regNo: "",
    iban: "",
  });

  // theme detection + per-plan light-image fallback
  const [isLight, setIsLight] = useState(false);
  const [imgFallback, setImgFallback] = useState<Record<Plan["slug"], boolean>>({
    basic: false,
    standard: false,
    premium: false,
  });

  useEffect(() => {
    const root = document.documentElement;
    const getIsLight = () => {
      const attr = root.getAttribute("data-theme") || (root as any).dataset?.theme;
      if (attr === "light") return true;
      if (attr === "dark") return false;
      return window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false;
    };
    setIsLight(getIsLight());

    const onSys = () => setIsLight(getIsLight());
    const mql = window.matchMedia?.("(prefers-color-scheme: light)");
    mql?.addEventListener?.("change", onSys);

    const mo = new MutationObserver(() => setIsLight(getIsLight()));
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      mql?.removeEventListener?.("change", onSys);
      mo.disconnect();
    };
  }, []);

  // Seed base plan and validity from SSR (fast paint)
  useEffect(() => {
    try {
      const acc = _a as { plan?: string | null; valid_until?: string | null } | undefined;
      if (acc) {
        const bp = (acc.plan || "basic").toLowerCase();
        if (bp === "basic" || bp === "standard" || bp === "premium") setBasePlan(bp as any);
        setValidUntilISO(acc.valid_until ?? null);
        setValidUntil(acc.valid_until ? new Date(acc.valid_until).toLocaleString() : null);
      }
    } catch {}
  }, [_a]);

  // Read highlight from URL (plan=<slug>&hl=1)
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const p = (u.searchParams.get("plan") || "").toLowerCase();
      const hl = u.searchParams.get("hl") || u.searchParams.get("highlight");
      if ((p === "basic" || p === "standard" || p === "premium") && (hl === "1" || /^(true|yes)$/i.test(String(hl)))) {
        setHighlightPlan(p as any);
        // Scroll the target into view on mount for visibility
        setTimeout(() => {
          const el = document.querySelector<HTMLButtonElement>(`button[data-plan="${p}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
      }
    } catch {}
  }, []);

  // load current plan + validity
  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id as string | undefined;

        if (uid) {
          const { data: au } = await supabase
            .from("account_users")
            .select("role,disabled")
            .eq("account_id", uid)
            .eq("user_id", uid)
            .maybeSingle();
          if (au?.role) setRole((au as any).role === "admin" ? "admin" : "member");
        }

        const r = await supabase.rpc("account_current_plan");
        const pl = (r.data as string | null)?.toLowerCase?.() || "basic";
        if (pl === "basic" || pl === "standard" || pl === "premium") {
          setCurrentPlan(pl);
        }

        const { data: acc } = await supabase
          .from("accounts")
          .select("plan, valid_until")
          .order("created_at", { ascending: true })
          .limit(1);

        const vu = acc && acc.length ? acc[0].valid_until : null;
        setValidUntilISO(vu ?? null);
        setValidUntil(vu ? new Date(vu).toLocaleString() : null);
        const bp = acc && acc.length ? (acc[0].plan as string | null) : null;
        if (bp) {
          const s = bp.toLowerCase();
          if (s === "basic" || s === "standard" || s === "premium") setBasePlan(s as any);
        }
      } catch {}
    })();
  }, [supabase]);

  // Check if billing profile exists (DB) — used to decide Buyer Type flow
  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id as string | undefined;
        if (!uid) { setProfileExists(false); return; }
        const { data } = await supabase
          .from('account_billing_profiles')
          .select('account_id')
          .eq('account_id', uid)
          .maybeSingle();
        setProfileExists(!!data);
      } catch {
        setProfileExists(false);
      }
    })();
  }, [supabase]);

  // Determine if free STANDARD trial is currently active
  useEffect(() => {
    try {
      const now = Date.now();
      const vu = validUntilISO ? Date.parse(validUntilISO) : NaN;
      const hasFutureValidity = Number.isFinite(vu) ? vu > now : false;
      // Heuristic: effective plan is STANDARD, but base (accounts.plan) is not STANDARD
      // and validity is in the future → most likely the free trial is active.
      const active = currentPlan === "standard" && basePlan !== "standard" && hasFutureValidity;
      setTrialActive(!!active);
    } catch { setTrialActive(false); }
  }, [currentPlan, basePlan, validUntil]);

  // Lock scroll when modal open
  useEffect(() => {
    if (!pendingSelect) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [pendingSelect]);

  // Lock scroll for demo billing modals as well
  useEffect(() => {
    if (!(buyerTypeOpen || billingFormOpen || manageOpen)) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [buyerTypeOpen, billingFormOpen, manageOpen]);

  // Is current plan active (validity in the future)?
  const isActive = useMemo(() => {
    try {
      const ms = validUntilISO ? Date.parse(validUntilISO) : NaN;
      return Number.isFinite(ms) && ms > Date.now();
    } catch { return false; }
  }, [validUntilISO]);

  function choosePlan(slug: Plan["slug"]) {
    if (role !== "admin") return;
    // Demo: Assume no billing profile exists yet → collect buyer type first
    if (!profileExists) {
      setSelectedPlan(slug);
      setBuyerTypeOpen(true);
      setBuyerType(null);
      return;
    }
    // With profile: for now, only allow scheduling at period end (Stripe pending)
    const order = { basic: 1, standard: 2, premium: 3 } as const;
    const rel = slug === currentPlan ? 'same' : (order[slug] > order[currentPlan] ? 'upgrade' : 'downgrade');
    setPlanRelation(rel);
    setPlanToSchedule(slug);
    setPlanConfirmOpen(true);
  }

  // Open Billing form in edit mode from Manage Account
  async function openBillingEdit() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id as string | undefined;
      if (!uid) return;
      const { data } = await supabase
        .from('account_billing_profiles')
        .select('*')
        .eq('account_id', uid)
        .maybeSingle();
      if (!data) {
        // No profile yet → go through type selection
        setBuyerTypeOpen(true);
        setBuyerType(null);
        setBillingEditMode(false);
        return;
      }
      // Lock to stored buyer_type and prefill form
      const t = (data as any).buyer_type as BuyerType | null;
      if (t === 'b2b') {
        setBuyerType('b2b');
        setFormB2B(s => ({
          ...s,
          legalName: (data as any).legal_name || '',
          taxId: (data as any).tax_id || '',
          street: (data as any).street || '',
          city: (data as any).city || '',
          county: (data as any).county || '',
          postalCode: (data as any).postal_code || '',
          country: (data as any).country || 'RO',
          email: (data as any).email || '',
          phone: (data as any).phone || '',
          vatRegistered: !!(data as any).vat_registered,
          regNo: (data as any).reg_no || '',
          iban: (data as any).iban || '',
        }));
      } else {
        setBuyerType('b2c');
        setFormB2C(s => ({
          ...s,
          fullName: (data as any).full_name || '',
          street: (data as any).street || '',
          city: (data as any).city || '',
          county: (data as any).county || '',
          postalCode: (data as any).postal_code || '',
          country: (data as any).country || 'RO',
          email: (data as any).email || '',
          phone: (data as any).phone || '',
          cnp: (data as any).cnp || '',
        }));
      }
      setBillingEditMode(true);
      setBillingFormOpen(true);
    } catch {}
  }

  async function applyPlan(slug: Plan["slug"]) {
    if (role !== "admin") return;
    setSaving(slug);
    try {
      const validDays = slug === "basic" ? null : 30;
      const { error } = await supabase.rpc("account_set_plan_self", {
        p_plan_slug: slug,
        p_valid_days: validDays,
        p_trial_days: null,
      });
      if (!error) {
        setCurrentPlan(slug);
        const { data: acc } = await supabase
          .from("accounts")
          .select("plan, valid_until")
          .order("created_at", { ascending: true })
          .limit(1);
        const vu = acc && acc.length ? acc[0].valid_until : null;
        setValidUntilISO(vu ?? null);
        setValidUntil(vu ? new Date(vu).toLocaleString() : null);
        const bp = acc && acc.length ? (acc[0].plan as string | null) : null;
        if (bp) {
          const s = bp.toLowerCase();
          if (s === "basic" || s === "standard" || s === "premium") setBasePlan(s as any);
        }
      }
    } finally {
      setSaving(null);
    }
  }

  // Save billing profile via API (inside component)
  async function saveBillingProfile() {
    try {
      const payload: any = { buyer_type: buyerType };
      if (buyerType === 'b2c') {
        payload.full_name = formB2C.fullName;
        payload.street = formB2C.street;
        payload.city = formB2C.city;
        payload.county = formB2C.county;
        payload.postal_code = formB2C.postalCode;
        payload.country = formB2C.country || 'RO';
        payload.email = formB2C.email;
        payload.phone = formB2C.phone;
        if (formB2C.cnp) payload.cnp = formB2C.cnp;
      } else if (buyerType === 'b2b') {
        payload.legal_name = formB2B.legalName;
        payload.tax_id = formB2B.taxId;
        payload.vat_registered = !!formB2B.vatRegistered;
        payload.reg_no = formB2B.regNo;
        payload.iban = formB2B.iban;
        payload.street = formB2B.street;
        payload.city = formB2B.city;
        payload.county = formB2B.county;
        payload.postal_code = formB2B.postalCode;
        payload.country = formB2B.country || 'RO';
        payload.email = formB2B.email;
        payload.phone = formB2B.phone;
      }
      const res = await fetch('/api/billing/profile', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json())?.error || 'Failed to save profile');
      setProfileExists(true);
      return true;
    } catch (e:any) {
      alert(e?.message || 'Could not save billing profile');
      return false;
    }
  }

  // Fetch account billing/status (pending plan, cancel flag)
  async function refreshBillingStatus() {
    try {
      const r = await fetch('/api/billing/status');
      if (!r.ok) return;
      const j = await r.json();
      const acc = j?.account || {};
      const pp = (acc?.pending_plan || '').toLowerCase();
      const pes = acc?.pending_effective_at || null;
      setPendingPlan(pp && (pp==='basic'||pp==='standard'||pp==='premium') ? pp : null);
      setPendingEffectiveAt(pes);
      setCancelAtPeriodEnd(!!acc?.cancel_at_period_end);
    } catch {}
  }

  useEffect(() => { refreshBillingStatus(); }, []);

  return (
    <div className={styles.container}>
      {/* Header bar: current plan */}
      <div className={styles.headerRow}>
        {isActive ? (
          cancelled ? (
            <>
              <span className={`${styles.badge} sb-cardglow`}>Still active until:</span>
              <span className={styles.muted}>{validUntil ? `${validUntil}` : "—"}</span>
            </>
          ) : (
            <>
              <span className={`${styles.badge} sb-cardglow`}>Active now: {planLabel(currentPlan)}</span>
              <span className={styles.muted}>{validUntil ? `until ${validUntil}` : "—"}</span>
            </>
          )
        ) : (
          <>
            <span className={`${styles.badge} sb-cardglow`}>Last active plan: {planLabel(currentPlan)}</span>
            <span className={styles.muted}>{validUntil ? `expired at ${validUntil}` : 'expired'}</span>
          </>
        )}
        {pendingPlan && (
          <span className={`${styles.badge} sb-cardglow`} style={{ borderColor:'var(--border)' }}>
            Scheduled: {planLabel(pendingPlan)} {pendingEffectiveAt ? `on ${new Date(pendingEffectiveAt).toLocaleString()}` : ''}
          </span>
        )}
        {role !== "admin" && <span className={styles.muted}>(read-only)</span>}
      </div>

      {/* Cards */}
      <div className={styles.grid}>
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.slug;

          // theme-aware image (+ fallback)
          const base = p.image.replace(/\.png$/i, "");
          const lightCandidate = `${base}_forlight.png`;
          const useLight = isLight && !imgFallback[p.slug];
          const src = useLight ? lightCandidate : p.image;

          return (
            <article  key={p.slug} className={`${styles.card} sb-cardglow`} aria-current={isCurrent ? "true" : undefined}>
              <div className={styles.tier}>{p.name}</div>

              <ul className={styles.list}>
                {BENEFITS.map((b, i) => {
                  const isSync = b.startsWith('Automatic sync of reservations between platforms');
                  const text = isSync
                    ? `Automatic sync of reservations between platforms (every ${p.syncIntervalMinutes} min)`
                    : b;
                  const x = p.slug === 'premium'
                    ? false
                    : p.slug === 'standard'
                      ? standardX.some(s => b.includes(s))
                      : basicX.some(s => b.includes(s));
                  return (
                    <li key={i} className={styles.liItem}>
                      {x ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'var(--text)' }}>
                          <path d="M6 6L18 18M6 18L18 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M5 12l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      <span>{text}</span>
                    </li>
                  );
                })}
              </ul>

              <div className={styles.imgWrap}>
                <Image
                  src={src}
                  alt={`${p.name} price`}
                  width={150}
                  height={60}
                  className={styles.priceImg}
                  onError={() => setImgFallback((s) => ({ ...s, [p.slug]: true }))}
                />
              </div>

              <div className={styles.cardActions}>
                {isCurrent ? (
                  <div style={{ display:'flex', alignItems:'center', gap: 5 }}>
                    <span className={`${styles.currentBadge} sb-cardglow`}>{isActive ? 'Active plan' : 'Last active plan'}</span>
                    <button
                      className={`sb-cardglow ${styles.btn} ${styles.btnChoose} ${styles.focusable}`}
                      onClick={() => setManageOpen(true)}
                      style={{ fontSize:13, color: "var(--text)",border:'1px solid var(--border)', background:'transparent',borderRadius:21, }}
                    >
                      Manage Account
                    </button>
                  </div>
                ) : (
                  <button
                    className={`sb-cardglow ${styles.btn} ${styles.btnChoose} ${styles.focusable}`}
                    disabled={!!saving || role !== "admin"}
                    onClick={() => choosePlan(p.slug)}
                    data-animate={highlightPlan === p.slug ? true : undefined}
                    data-plan={p.slug}
                  >
                    {saving === p.slug ? "Applying…" : `I want ${planLabel(p.slug)}`}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Manage Account modal */}
      {manageOpen && (
        <div
          role="dialog"
          aria-modal
          aria-labelledby="manage-title"
          onClick={() => setManageOpen(false)}
          style={{ position:'fixed', inset:0, zIndex:9999, display:'grid', placeItems:'center', padding:12, background:"color-mix(in srgb, var(--bg) 55%, transparent)", backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)' }}
        >
          <div className="modalCard" onClick={(e)=>e.stopPropagation()} style={{ width:'min(680px, 100%)', border:'1px solid var(--border)', borderRadius:16, padding:16, display:'grid', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 id="manage-title" style={{ margin:0 }}>Active plan</h3>
              <button aria-label="Close" className={`${styles.iconBtn} ${styles.focusable}`} onClick={()=>setManageOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18M6 18L18 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div style={{ color:'var(--muted)' }}>
              <p style={{ margin:0 }}>Current: <strong>{planLabel(currentPlan)}</strong></p>
              <p style={{ margin:'4px 0 0' }}>
                {trialActive ? 'Trial ends at ' : 'Current period ends at '}<strong>{validUntil ?? '—'}</strong>
              </p>
            </div>

            <div style={{ display:'grid', gap:10, marginTop:4 }}>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <button
                  className={`${styles.btn} ${styles.btnGhost} sb-cardglow`}
                  aria-label="Cancel subscription at period end"
                  onClick={async () => {
                    // Cancel at period end (server action)
                    try {
                      const res = await fetch('/api/billing/cancel', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ cancel: true }) });
                      if (!res.ok) throw new Error(await res.text());
                      setCancelled(true);
                      alert('Subscription will end at the end of the current period.');
                    } catch (e:any) {
                      alert(e?.message || 'Could not cancel subscription.');
                    }
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width:16, height:16, marginRight:6 }}>
                    <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-1-9V7h2v6h-2Z" fill="currentColor"/>
                  </svg>
                  Cancel subscription
                </button>

                {/* Display-only button for now */}
                <button
                  className={`${styles.btn} ${styles.btnGhost} sb-cardglow`}
                  title="Update the default card or payment method"
                  aria-label="Change payment method"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width:16, height:16, marginRight:6 }}>
                    <path d="M3 6h18v12H3z" fill="none" stroke="currentColor" strokeWidth="2"/>
                    <path d="M3 10h18" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Change payment method
                </button>

                <button
                  className={`${styles.btn} ${styles.btnGhost} sb-cardglow`}
                  title="Edit billing details"
                  aria-label="Edit billing details"
                  onClick={openBillingEdit}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width:16, height:16, marginRight:6 }}>
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="none" stroke="currentColor" strokeWidth="1.6"/>
                    <path d="M14.06 6.19l2.12-2.12a2 2 0 1 1 2.83 2.83l-2.12 2.12-2.83-2.83z" fill="none" stroke="currentColor" strokeWidth="1.6"/>
                  </svg>
                  Edit billing details
                </button>

                <button
                  className={`${styles.btn} ${styles.btnDangerGhost}`}
                  aria-label="Delete account permanently"
                  onClick={async () => {
                    const conf = prompt('Type DELETE to confirm account deletion. This removes ALL your data.');
                    if ((conf || '').trim().toUpperCase() !== 'DELETE') return;
                    try {
                      const res = await fetch('/api/account/delete', { method:'POST' });
                      if (!res.ok) throw new Error(await res.text());
                      // redirect to logout
                      window.location.assign('/auth/logout');
                    } catch (e:any) {
                      alert(e?.message || 'Could not delete account.');
                    }
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width:16, height:16, marginRight:6 }}>
                    <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M8 6v-2h8v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M6 6l1 14h10l1-14" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                  Delete account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog while on STANDARD free trial */}
      {pendingSelect && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={() => setPendingSelect(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "grid", placeItems: "center",
            padding: 12,
            background: "color-mix(in srgb, var(--bg) 55%, transparent)",
            backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
          }}
        >
          <div
            className="modalCard"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 16,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 id="confirm-title" style={{ margin: 0 }}>Confirm plan change</h3>
              <button
                className={styles.btn}
                onClick={() => setPendingSelect(null)}
                style={{ padding: '6px 10px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ color: 'var(--muted)' }}>
              <p style={{ margin: 0 }}>
                You are currently on a free 7-day <strong>STANDARD</strong> trial{validUntil ? ` (active until ${validUntil})` : ''}.
              </p>
              <p style={{ margin: '6px 0 0' }}>
                Are you sure you want to activate <strong>{planLabel(pendingSelect)}</strong> now?
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                className={styles.btn}
                onClick={() => setPendingSelect(null)}
                style={{ border: '1px solid var(--border)', background: 'transparent' }}
              >
                Keep trial
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => { const slug = pendingSelect; setPendingSelect(null); if (slug) applyPlan(slug); }}
                disabled={!!saving}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buyer Type modal (demo only) */}
      {buyerTypeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="buyer-type-title"
          onClick={() => setBuyerTypeOpen(false)}
          style={{ position:'fixed', inset:0, zIndex:9999, display:'grid', placeItems:'center', padding:12, background:"color-mix(in srgb, var(--bg) 55%, transparent)", backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)' }}
        >
          <div className="modalCard" onClick={(e)=>e.stopPropagation()} style={{ width:'min(560px, 100%)', border:'1px solid var(--border)', borderRadius:16, padding:16, display:'grid', gap:12, background:'var(--panel)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 id="buyer-type-title" style={{ margin:0 }}>Billing Type</h3>
              <button aria-label="Close" className={`${styles.iconBtn} ${styles.focusable}`} onClick={()=>setBuyerTypeOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18M6 18L18 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <p style={{ color:'var(--muted)', margin:'4px 0 0' }}>Who is paying for this subscription?</p>

            <div style={{ display:'grid', gap:10, gridTemplateColumns:'1fr 1fr' }}>
              <button
                className={`${styles.btn} ${styles.btnChoose}`}
                data-selected={buyerType==='b2b' || undefined}
                onClick={()=>{ setBuyerType('b2b'); setBuyerTypeOpen(false); setBillingFormOpen(true); }}
                style={{ border:'1px solid var(--border)', background:'transparent' }}
              >Business (B2B)</button>
              <button
                className={`${styles.btn} ${styles.btnChoose}`}
                data-selected={buyerType==='b2c' || undefined}
                onClick={()=>{ setBuyerType('b2c'); setBuyerTypeOpen(false); setBillingFormOpen(true); }}
                style={{ border:'1px solid var(--border)', background:'transparent' }}
              >Individual (B2C)</button>
            </div>
          </div>
        </div>
      )}

      {/* Billing Details modal (demo only; shows B2C or B2B based on selection) */}
      {billingFormOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="billing-title"
          onClick={() => setBillingFormOpen(false)}
          style={{ position:'fixed', inset:0, zIndex:9999, display:'grid', placeItems:'center', padding:12, background:"color-mix(in srgb, var(--bg) 55%, transparent)", backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)' }}
        >
          <div className="modalCard" onClick={(e)=>e.stopPropagation()} style={{ width:'min(720px, 100%)', border:'1px solid var(--border)', borderRadius:16, padding:16, display:'grid', gap:12, background:'var(--panel)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 id="billing-title" style={{ margin:0 }}>{buyerType==='b2b' ? 'Billing Details (Business)' : 'Billing Details (Individual)'}</h3>
              <button aria-label="Close" className={`${styles.iconBtn} ${styles.focusable}`} onClick={()=>{ setBillingFormOpen(false); setBillingEditMode(false); }}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18M6 18L18 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {buyerType === 'b2c' ? (
              <div style={{ display:'grid', gap:10 }}>
                <div style={{ display:'grid', gap:6 }}>
                  <label style={{ color:'var(--muted)' }}>Full name</label>
                  <input className={styles.input} placeholder="e.g. Andrei Popescu" value={formB2C.fullName} onChange={e=>setFormB2C(s=>({...s, fullName:e.target.value}))} />
                </div>
                <div style={{ display:'grid', gap:6 }}>
                  <label style={{ color:'var(--muted)' }}>Street & number</label>
                  <input className={styles.input} placeholder="e.g. Str. Lalelelor 12A" value={formB2C.street} onChange={e=>setFormB2C(s=>({...s, street:e.target.value}))} />
                </div>
                <div style={{ display:'grid', gap:10, gridTemplateColumns:'1fr 1fr' }}>
                  <div style={{ display:'grid', gap:6 }}>
                    <label style={{ color:'var(--muted)' }}>City</label>
                    <input className={styles.input} value={formB2C.city} onChange={e=>setFormB2C(s=>({...s, city:e.target.value}))} />
                  </div>
                  <div style={{ display:'grid', gap:6 }}>
                    <label style={{ color:'var(--muted)' }}>County</label>
                    <input className={styles.input} placeholder="Județ / Sector" value={formB2C.county} onChange={e=>setFormB2C(s=>({...s, county:e.target.value}))} />
                  </div>
                </div>
                <div style={{ display:'grid', gap:10, gridTemplateColumns:'1fr 1fr' }}>
                  <div style={{ display:'grid', gap:6 }}>
                    <label style={{ color:'var(--muted)' }}>Postal code</label>
                    <input className={styles.input} inputMode="numeric" pattern="^[0-9]{6}$" placeholder="010101" value={formB2C.postalCode} onChange={e=>setFormB2C(s=>({...s, postalCode:e.target.value.replace(/[^0-9]/g,'').slice(0,6)}))} />
                  </div>
                  <div style={{ display:'grid', gap:6 }}>
                    <label style={{ color:'var(--muted)' }}>Country</label>
                    <input className={styles.input} value={formB2C.country} readOnly />
                  </div>
                </div>
                <div style={{ display:'grid', gap:6 }}>
                  <label style={{ color:'var(--muted)' }}>Email</label>
                  <input className={styles.input} type="email" placeholder="you@example.com" value={formB2C.email} onChange={e=>setFormB2C(s=>({...s, email:e.target.value}))} />
                </div>
                <div style={{ display:'grid', gap:10, gridTemplateColumns:'1fr 1fr' }}>
                  <div style={{ display:'grid', gap:6 }}>
                    <label style={{ color:'var(--muted)' }}>Phone (optional)</label>
                    <input className={styles.input} placeholder="+40 7xx xxx xxx" value={formB2C.phone} onChange={e=>setFormB2C(s=>({...s, phone:e.target.value}))} />
                  </div>
                  <div style={{ display:'grid', gap:6 }}>
                    <label style={{ color:'var(--muted)' }}>National ID (optional)</label>
                    <input className={styles.input} inputMode="numeric" placeholder="13 digits" value={formB2C.cnp} onChange={e=>setFormB2C(s=>({...s, cnp:e.target.value.replace(/[^0-9]/g,'').slice(0,13)}))} />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display:'grid', gap:10 }}>
                <div style={{ display:'grid', gap:6 }}>
                  <label style={{ color:'var(--muted)' }}>Legal name</label>
                  <input className={styles.input} placeholder="e.g. SC Exemplu SRL" value={formB2B.legalName} onChange={e=>setFormB2B(s=>({...s, legalName:e.target.value}))} />
                </div>
                <div style={{ display:'grid', gap:6 }}>
                  <label style={{ color:'var(--muted)' }}>Tax ID (CUI/CIF)</label>
                  <input className={styles.input} inputMode="numeric" placeholder="digits only" value={formB2B.taxId} onChange={e=>setFormB2B(s=>({...s, taxId:e.target.value.replace(/[^0-9]/g,'').slice(0,10)}))} />
                </div>
                <div style={{ display:'grid', gap:6 }}>
                  <label style={{ color:'var(--muted)' }}>Street & number</label>
                  <input className={styles.input} placeholder="e.g. Str. Lalelelor 12A" value={formB2B.street} onChange={e=>setFormB2B(s=>({...s, street:e.target.value}))} />
                </div>
                <div style={{ display:'grid', gap:10, gridTemplateColumns:'1fr 1fr' }}>
                  <div style={{ display:'grid', gap:6 }}>
                    <label style={{ color:'var(--muted)' }}>City</label>
                    <input className={styles.input} value={formB2B.city} onChange={e=>setFormB2B(s=>({...s, city:e.target.value}))} />
                  </div>
                  <div style={{ display:'grid', gap:6 }}>
                    <label style={{ color:'var(--muted)' }}>County</label>
                    <input className={styles.input} placeholder="Județ / Sector" value={formB2B.county} onChange={e=>setFormB2B(s=>({...s, county:e.target.value}))} />
                  </div>
                </div>
                <div style={{ display:'grid', gap:10, gridTemplateColumns:'1fr 1fr' }}>
                  <div style={{ display:'grid', gap:6 }}>
                    <label style={{ color:'var(--muted)' }}>Postal code</label>
                    <input className={styles.input} inputMode="numeric" pattern="^[0-9]{6}$" placeholder="010101" value={formB2B.postalCode} onChange={e=>setFormB2B(s=>({...s, postalCode:e.target.value.replace(/[^0-9]/g,'').slice(0,6)}))} />
                  </div>
                  <div style={{ display:'grid', gap:6 }}>
                    <label style={{ color:'var(--muted)' }}>Country</label>
                    <input className={styles.input} value={formB2B.country} readOnly />
                  </div>
                </div>
                <div style={{ display:'grid', gap:6 }}>
                  <label style={{ color:'var(--muted)' }}>Billing email</label>
                  <input className={styles.input} type="email" placeholder="billing@example.com" value={formB2B.email} onChange={e=>setFormB2B(s=>({...s, email:e.target.value}))} />
                </div>
                <div style={{ display:'grid', gap:10, gridTemplateColumns:'1fr 1fr' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="checkbox" checked={formB2B.vatRegistered} onChange={e=>setFormB2B(s=>({...s, vatRegistered:e.target.checked}))} /> VAT registered in RO
                  </label>
                  <div style={{ display:'grid', gap:6 }}>
                    <label style={{ color:'var(--muted)' }}>Phone (optional)</label>
                    <input className={styles.input} placeholder="+40 7xx xxx xxx" value={formB2B.phone} onChange={e=>setFormB2B(s=>({...s, phone:e.target.value}))} />
                  </div>
                </div>
                <div style={{ display:'grid', gap:10, gridTemplateColumns:'1fr 1fr' }}>
                  <div style={{ display:'grid', gap:6 }}>
                    <label style={{ color:'var(--muted)' }}>Company registration no. (optional)</label>
                    <input className={styles.input} placeholder="e.g. J12/3456/2024" value={formB2B.regNo} onChange={e=>setFormB2B(s=>({...s, regNo:e.target.value}))} />
                  </div>
                  <div style={{ display:'grid', gap:6 }}>
                    <label style={{ color:'var(--muted)' }}>Bank account (IBAN) (optional)</label>
                    <input className={styles.input} placeholder="e.g. RO49AAAA1B31007593840000" value={formB2B.iban} onChange={e=>setFormB2B(s=>({...s, iban:e.target.value}))} />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              {!billingEditMode && (
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={()=>{ setBillingFormOpen(false); setBuyerTypeOpen(true); }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width:16, height:16, marginRight:6 }}>
                    <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Back
                </button>
              )}
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={async ()=>{
                  const ok = await saveBillingProfile();
                  if (!ok) return;
                  setBillingFormOpen(false);
                  setBillingEditMode(false);
                  await refreshBillingStatus();
                  if (selectedPlan) {
                    // Open schedule modal for selected plan
                    const order = { basic: 1, standard: 2, premium: 3 } as const;
                    const rel = selectedPlan === currentPlan ? 'same' : (order[selectedPlan] > order[currentPlan] ? 'upgrade' : 'downgrade');
                    setPlanRelation(rel);
                    setPlanToSchedule(selectedPlan);
                    setPlanConfirmOpen(true);
                    setSelectedPlan(null);
                  }
                }}
              >{billingEditMode ? 'Save changes' : 'Save & Continue'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Plan change (schedule) modal */}
      {planConfirmOpen && planToSchedule && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-change-title"
          onClick={() => setPlanConfirmOpen(false)}
          style={{ position:'fixed', inset:0, zIndex:9999, display:'grid', placeItems:'center', padding:12, background:"color-mix(in srgb, var(--bg) 55%, transparent)", backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)' }}
        >
          <div className="modalCard" onClick={(e)=>e.stopPropagation()} style={{ width:'min(560px, 100%)', border:'1px solid var(--border)', borderRadius:16, padding:16, display:'grid', gap:12, background:'var(--panel)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 id="plan-change-title" style={{ margin:0 }}>Plan change</h3>
              <button aria-label="Close" className={`${styles.iconBtn} ${styles.focusable}`} onClick={()=>setPlanConfirmOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M6 18L18 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <div style={{ color:'var(--muted)' }}>
              {planRelation === 'upgrade' && (
                <p style={{ margin:0 }}>Upgrading to <strong>{planLabel(planToSchedule)}</strong>. For now, we will schedule this change at the end of your current period{validUntil ? ` (on ${validUntil})` : ''}.</p>
              )}
              {planRelation === 'downgrade' && (
                <p style={{ margin:0 }}>Downgrading to <strong>{planLabel(planToSchedule)}</strong> at the end of your current period{validUntil ? ` (on ${validUntil})` : ''}.</p>
              )}
              {planRelation === 'same' && (
                <p style={{ margin:0 }}>You already have <strong>{planLabel(currentPlan)}</strong>. No change required.</p>
              )}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={()=>setPlanConfirmOpen(false)}>Cancel</button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={planRelation==='same'}
                onClick={async ()=>{
                  try {
                    const res = await fetch('/api/billing/schedule', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ plan: planToSchedule }) });
                    if (!res.ok) throw new Error((await res.json())?.error || 'Failed to schedule');
                    await refreshBillingStatus();
                    setPlanConfirmOpen(false);
                    alert('Plan change scheduled.');
                  } catch (e:any) {
                    alert(e?.message || 'Could not schedule plan change.');
                  }
                }}
              >Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
