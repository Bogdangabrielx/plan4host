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
  const [pmOpen, setPmOpen] = useState<boolean>(false);
  const [pmLoading, setPmLoading] = useState<boolean>(false);
  const [pmCard, setPmCard] = useState<{brand?:string; last4?:string; exp_month?:number; exp_year?:number} | null>(null);
  const [downgradeConfirmOpen, setDowngradeConfirmOpen] = useState<boolean>(false);
  const [payResultOpen, setPayResultOpen] = useState<boolean>(false);
  const [payResultSuccess, setPayResultSuccess] = useState<boolean>(false);
  const [payResultPlan, setPayResultPlan] = useState<string>("");

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
  const [planConfirmPhase, setPlanConfirmPhase] = useState<'intro'|'confirmDate'>('intro');
  const [payNowConfirmOpen, setPayNowConfirmOpen] = useState<boolean>(false);
  const [upgradeBusy, setUpgradeBusy] = useState<boolean>(false);
  const [scheduleBusy, setScheduleBusy] = useState<boolean>(false);

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
    confirmEmail: "",
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
    confirmEmail: "",
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
    // If subscription is not active, go straight to Checkout (reactivate/new subscription)
    if (!isActive) {
      startCheckout(slug);
      return;
    }
    // With profile: branching by relation
    const order = { basic: 1, standard: 2, premium: 3 } as const;
    const rel = slug === currentPlan ? 'same' : (order[slug] > order[currentPlan] ? 'upgrade' : 'downgrade');
    // Downgrade: show confirm then redirect to Stripe Billing Portal to schedule at renewal
    if (rel === 'downgrade') {
      setPlanToSchedule(slug);
      setDowngradeConfirmOpen(true);
      return;
    }
    setPlanRelation(rel);
    setPlanToSchedule(slug);
    setPlanConfirmPhase('intro');
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

  async function openPaymentMethod() {
    setPmOpen(true); setPmLoading(true); setPmCard(null);
    try {
      const res = await fetch('/api/billing/payment-method');
      const j = await res.json();
      if (res.ok) setPmCard(j?.card || null);
    } catch {}
    finally { setPmLoading(false); }
  }

  async function openStripePortal() {
    try {
      const res = await fetch('/api/billing/portal', { method:'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed to open Stripe Portal');
      const url = j?.url as string | undefined;
      if (url) window.location.assign(url);
    } catch (e:any) {
      alert(e?.message || 'Could not open Stripe customer portal.');
    }
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

  // Start Stripe Checkout for immediate activation
  async function startCheckout(slug: Plan["slug"]) {
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: slug })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Checkout failed');
      const url = j?.url as string | undefined;
      if (url) window.location.assign(url);
      else throw new Error('Missing checkout URL');
    } catch (e:any) {
      alert(e?.message || 'Could not start checkout');
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

  // Detect Checkout redirects for pay result feedback
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const success = u.searchParams.get('success');
      const canceled = u.searchParams.get('canceled');
      const plan = u.searchParams.get('plan') || '';
      if (success === '1') {
        setPayResultPlan(planLabel(plan));
        setPayResultSuccess(true);
        setPayResultOpen(true);
      } else if (canceled === '1') {
        setPayResultPlan(planLabel(plan));
        setPayResultSuccess(false);
        setPayResultOpen(true);
      }
    } catch {}
  }, []);

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
        {/* We no longer display scheduled next plan; handled via Stripe Portal */}
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
                  isActive ? (
                    <div style={{ display:'flex', alignItems:'center', gap: 5 }}>
                      <span className={`${styles.currentBadge} sb-cardglow`}>Active plan</span>
                      <button
                        className={`sb-cardglow ${styles.btn} ${styles.btnChoose} ${styles.focusable}`}
                        onClick={() => setManageOpen(true)}
                        style={{ fontSize:13, color: "var(--text)",border:'1px solid var(--border)', background:'transparent',borderRadius:21 }}
                      >
                        Manage Account
                      </button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
                      <button
                        className={`sb-cardglow ${styles.btn} ${styles.btnChoose} ${styles.focusable}`}
                        disabled={!!saving || role !== "admin"}
                        onClick={() => choosePlan(p.slug)}
                        data-animate={highlightPlan === p.slug ? true : undefined}
                        data-plan={p.slug}
                      >
                        {saving === p.slug ? "Applying…" : `I want ${planLabel(p.slug)}`}
                      </button>
                      <button
                        className={`sb-cardglow ${styles.btn} ${styles.btnChoose} ${styles.focusable}`}
                        onClick={() => setManageOpen(true)}
                        style={{ fontSize:13, color: "var(--text)",border:'1px solid var(--border)', background:'transparent',borderRadius:21 }}
                      >
                        Manage Account
                      </button>
                    </div>
                  )
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
                  aria-label="Manage subscription in Stripe"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/billing/portal', { method:'POST' });
                      const j = await res.json();
                      if (!res.ok) throw new Error(j?.error || 'Failed to open Stripe Portal');
                      const url = j?.url as string | undefined;
                      if (url) window.location.assign(url);
                      else throw new Error('Missing Stripe Portal URL');
                    } catch (e:any) {
                      alert(e?.message || 'Could not open Stripe customer portal.');
                    }
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width:16, height:16, marginRight:6 }}>
                    <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-1-9V7h2v6h-2Z" fill="currentColor"/>
                  </svg>
                  Manage subscription
                </button>

                <button
                  className={`${styles.btn} ${styles.btnGhost} sb-cardglow`}
                  title="See payment method"
                  aria-label="See payment method"
                  onClick={openPaymentMethod}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width:16, height:16, marginRight:6 }}>
                    <path d="M3 6h18v12H3z" fill="none" stroke="currentColor" strokeWidth="2"/>
                    <path d="M3 10h18" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  See payment method
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

      {/* Payment method modal */}
      {pmOpen && (
        <div
          role="dialog"
          aria-modal
          aria-labelledby="pm-title"
          onClick={() => setPmOpen(false)}
          style={{ position:'fixed', inset:0, zIndex:9999, display:'grid', placeItems:'center', padding:12, background:"color-mix(in srgb, var(--bg) 55%, transparent)", backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)' }}
        >
          <div className="modalCard" onClick={(e)=>e.stopPropagation()} style={{ width:'min(560px, 100%)', border:'1px solid var(--border)', borderRadius:16, padding:16, display:'grid', gap:12, background:'var(--panel)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 id="pm-title" style={{ margin:0 }}>Payment method</h3>
              <button aria-label="Close" className={`${styles.iconBtn} ${styles.focusable}`} onClick={()=>setPmOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6L18 18M6 18L18 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {pmLoading ? (
              <div style={{ color:'var(--muted)' }}>Loading…</div>
            ) : pmCard ? (
              <div style={{ display:'grid', gap:12 }}>
                <div className={styles.pmCard}>
                  <div className={styles.pmBrand}>{pmCard.brand?.toUpperCase?.() || 'CARD'}</div>
                  <div />
                  <div className={styles.pmDigits}>•••• {pmCard.last4 || '••••'}</div>
                </div>
                <div style={{ color:'var(--muted)', fontSize:12 }}>
                  Expires {pmCard.exp_month?.toString().padStart(2,'0') || '--'}/{pmCard.exp_year || '----'}
                </div>
              </div>
            ) : (
              <div style={{ color:'var(--muted)' }}>No payment method on file.</div>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={()=>setPmOpen(false)}>Close</button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={async ()=>{
                  try {
                    const res = await fetch('/api/billing/portal', { method:'POST' });
                    const j = await res.json();
                    if (!res.ok) throw new Error(j?.error || 'Failed to open Stripe Portal');
                    const url = j?.url as string | undefined;
                    if (url) window.location.assign(url);
                  } catch (e:any) {
                    alert(e?.message || 'Could not open Stripe customer portal.');
                  }
                }}
              >Change payment method</button>
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
                  <label style={{ color:'var(--muted)' }}>{billingEditMode ? 'Email (managed by Stripe)' : 'Email'}</label>
                  <input
                    className={styles.input}
                    type="email"
                    placeholder="you@example.com"
                    value={formB2C.email}
                    onChange={e=>setFormB2C(s=>({...s, email:e.target.value}))}
                    readOnly={billingEditMode}
                  />
                </div>
                {!billingEditMode && (
                  <div style={{ display:'grid', gap:6 }}>
                    <label style={{ color:'var(--muted)' }}>Confirm email</label>
                    <input
                      className={styles.input}
                      type="email"
                      placeholder="retype your email"
                      value={formB2C.confirmEmail}
                      onChange={e=>setFormB2C(s=>({...s, confirmEmail:e.target.value}))}
                      onPaste={(e)=>e.preventDefault()}
                    />
                    {formB2C.confirmEmail && formB2C.email.trim() !== formB2C.confirmEmail.trim() && (
                      <span style={{ color:'var(--danger)', fontSize:12 }}>Emails do not match</span>
                    )}
                  </div>
                )}
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
                  <label style={{ color:'var(--muted)' }}>{billingEditMode ? 'Billing email (managed by Stripe)' : 'Billing email'}</label>
                  <input
                    className={styles.input}
                    type="email"
                    placeholder="billing@example.com"
                    value={formB2B.email}
                    onChange={e=>setFormB2B(s=>({...s, email:e.target.value}))}
                    readOnly={billingEditMode}
                  />
                </div>
                {!billingEditMode && (
                  <div style={{ display:'grid', gap:6 }}>
                    <label style={{ color:'var(--muted)' }}>Confirm billing email</label>
                    <input
                      className={styles.input}
                      type="email"
                      placeholder="retype billing email"
                      value={formB2B.confirmEmail}
                      onChange={e=>setFormB2B(s=>({...s, confirmEmail:e.target.value}))}
                      onPaste={(e)=>e.preventDefault()}
                    />
                    {formB2B.confirmEmail && formB2B.email.trim() !== formB2B.confirmEmail.trim() && (
                      <span style={{ color:'var(--danger)', fontSize:12 }}>Emails do not match</span>
                    )}
                  </div>
                )}
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

            {(() => {
              const email = buyerType==='b2c' ? formB2C.email : formB2B.email;
              const confirmEmail = buyerType==='b2c' ? formB2C.confirmEmail : formB2B.confirmEmail;
              const emailOk = /.+@.+\..+/.test(email.trim());
              const confirmOk = billingEditMode ? true : (email.trim() !== '' && email.trim() === confirmEmail.trim());
              const postalOk = (buyerType==='b2c' ? formB2C.postalCode : formB2B.postalCode).trim().length === 6;
              const addressOk = (buyerType==='b2c' ? formB2C.street : formB2B.street).trim() !== '' &&
                                (buyerType==='b2c' ? formB2C.city : formB2B.city).trim() !== '' &&
                                (buyerType==='b2c' ? formB2C.county : formB2B.county).trim() !== '';
              const nameOk = buyerType==='b2c' ? (formB2C.fullName.trim().length >= 2) : (formB2B.legalName.trim().length >= 2);
              const taxOk = buyerType==='b2b' ? (formB2B.taxId.trim().length >= 2) : true;
              const canSubmit = emailOk && confirmOk && postalOk && addressOk && nameOk && taxOk;
              return (
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
                    disabled={!canSubmit}
                    onClick={async ()=>{
                      const ok = await saveBillingProfile();
                      if (!ok) return;
                      setBillingFormOpen(false);
                      setBillingEditMode(false);
                      await refreshBillingStatus();
                      if (selectedPlan) {
                        const plan = selectedPlan; setSelectedPlan(null);
                        startCheckout(plan);
                      }
                    }}
                  >{billingEditMode ? 'Save changes' : 'Save & Continue'}</button>
                </div>
              );
            })()}
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
            {/* Content variations */}
            {planRelation === 'downgrade' ? (
              planConfirmPhase === 'intro' ? (
                <>
                  <div style={{ color:'var(--muted)' }}>
                    <p style={{ margin:0 }}>You are about to downgrade to <strong>{planLabel(planToSchedule)}</strong>.</p>
                  </div>
                  <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                    <button className={`sb-cardglow ${styles.btn} ${styles.btnGhost}`} onClick={()=>setPlanConfirmOpen(false)}>Cancel</button>
                    <button className={`sb-cardglow ${styles.btn} ${styles.btnPrimary}`} style={{ color:'var(--text)' }} onClick={()=>setPlanConfirmPhase('confirmDate')}>Downgrade</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ color:'var(--muted)' }}>
                    <p style={{ margin:0 }}>The new plan will start {validUntil ? <>on <strong>{validUntil}</strong></> : 'at the end of your current period'}.</p>
                  </div>
                  <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={()=>setPlanConfirmPhase('intro')}>Back</button>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={async ()=>{
                        try {
                          const res = await fetch('/api/billing/schedule', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ plan: planToSchedule }) });
                          if (!res.ok) throw new Error((await res.json())?.error || 'Failed to apply change');
                          await refreshBillingStatus();
                          setPlanConfirmOpen(false);
                        } catch (e:any) {
                          alert(e?.message || 'Could not change plan.');
                        }
                      }}
                    >Confirm</button>
                  </div>
                </>
              )
            ) : (
              <>
                <div style={{ color:'var(--muted)' }}>
                  {planRelation === 'upgrade' && (
                    <p style={{ margin:0 }}>Ready to upgrade your experience?</p>
                  )}
                  {planRelation === 'same' && (
                    <p style={{ margin:0 }}>You already have <strong>{planLabel(currentPlan)}</strong>. No change required.</p>
                  )}
                </div>
                <div style={{ display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap' }}>
                  {planRelation === 'upgrade' && (
                    <>
                      <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        disabled={upgradeBusy || scheduleBusy}
                        onClick={()=> setPayNowConfirmOpen(true)}
                      >{upgradeBusy ? 'Processing…' : 'Pay now'}</button>
                      <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        disabled={upgradeBusy || scheduleBusy}
                        onClick={async ()=>{
                          try {
                            setScheduleBusy(true);
                            const res = await fetch('/api/billing/schedule', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ plan: planToSchedule }) });
                            if (!res.ok) throw new Error((await res.json())?.error || 'Failed to apply change');
                            await refreshBillingStatus();
                            setPlanConfirmOpen(false);
                          } catch (e:any) {
                            alert(e?.message || 'Could not change plan.');
                          } finally {
                            setScheduleBusy(false);
                          }
                        }}
                      >{scheduleBusy ? 'Scheduling…' : 'Upgrade at renewal'}</button>
                    </>
                  )}
                  {planRelation !== 'upgrade' && (
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      disabled={planRelation==='same' || scheduleBusy}
                      onClick={async ()=>{
                        try {
                          setScheduleBusy(true);
                          const res = await fetch('/api/billing/schedule', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ plan: planToSchedule }) });
                          if (!res.ok) throw new Error((await res.json())?.error || 'Failed to apply change');
                          await refreshBillingStatus();
                          setPlanConfirmOpen(false);
                        } catch (e:any) {
                          alert(e?.message || 'Could not change plan.');
                        } finally {
                          setScheduleBusy(false);
                        }
                      }}
                    >{scheduleBusy ? 'Applying…' : 'Confirm'}</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pay now confirm (upgrade) */}
      {payNowConfirmOpen && (
        <div
          role="dialog"
          aria-modal
          aria-labelledby="paynow-title"
          onClick={() => setPayNowConfirmOpen(false)}
          style={{ position:'fixed', inset:0, zIndex:9999, display:'grid', placeItems:'center', padding:12, background:"color-mix(in srgb, var(--bg) 55%, transparent)", backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)' }}
        >
          <div className="modalCard" onClick={(e)=>e.stopPropagation()} style={{ width:'min(520px, 100%)', border:'1px solid var(--border)', borderRadius:16, padding:16, display:'grid', gap:12, background:'var(--panel)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 id="paynow-title" style={{ margin:0 }}>Confirm upgrade</h3>
              <button aria-label="Close" className={`${styles.iconBtn} ${styles.focusable}`} onClick={()=>setPayNowConfirmOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M6 18L18 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <div style={{ color:'var(--muted)' }}>
              <p style={{ margin:0 }}>We will cancel your current subscription immediately and start <strong>{planToSchedule ? planLabel(planToSchedule) : 'the new plan'}</strong> now.</p>
              <p style={{ margin:'4px 0 0' }}>No refunds or credits are provided for the remaining period.</p>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={upgradeBusy}
                onClick={async ()=>{
                  if (!planToSchedule) return;
                  try {
                    setUpgradeBusy(true);
                    const res = await fetch('/api/billing/upgrade-now', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ plan: planToSchedule }) });
                    const j = await res.json();
                    if (res.ok && j?.ok) {
                      setPayNowConfirmOpen(false);
                      setPlanConfirmOpen(false);
                      await refreshBillingStatus();
                      setPayResultPlan(planLabel(planToSchedule));
                      setPayResultSuccess(true);
                      setPayResultOpen(true);
                      return;
                    }
                    if (j?.fallback === 'checkout') {
                      setPayNowConfirmOpen(false);
                      setPlanConfirmOpen(false);
                      startCheckout(planToSchedule);
                      return;
                    }
                    throw new Error(j?.error || 'Upgrade failed');
                  } catch (e:any) {
                    alert(e?.message || 'Could not upgrade');
                  } finally {
                    setUpgradeBusy(false);
                  }
                }}
              >{upgradeBusy ? 'Processing…' : 'OK'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Downgrade confirm modal */}
      {downgradeConfirmOpen && (
        <div
          role="dialog"
          aria-modal
          aria-labelledby="downgrade-title"
          onClick={() => setDowngradeConfirmOpen(false)}
          style={{ position:'fixed', inset:0, zIndex:9999, display:'grid', placeItems:'center', padding:12, background:"color-mix(in srgb, var(--bg) 55%, transparent)", backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)' }}
        >
          <div className="modalCard" onClick={(e)=>e.stopPropagation()} style={{ width:'min(560px, 100%)', border:'1px solid var(--border)', borderRadius:16, padding:16, display:'grid', gap:12, background:'var(--panel)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 id="downgrade-title" style={{ margin:0 }}>Plan change</h3>
              <button aria-label="Close" className={`${styles.iconBtn} ${styles.focusable}`} onClick={()=>setDowngradeConfirmOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M6 18L18 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <div style={{ color:'var(--muted)' }}>
              <p style={{ margin:0 }}>You are about to downgrade to <strong>{planToSchedule ? planLabel(planToSchedule) : 'the selected plan'}</strong>.</p>
              <p style={{ margin:'4px 0 0' }}>You’ll continue to enjoy <strong>{planLabel(currentPlan)}</strong> benefits until <strong>{validUntil ?? '—'}</strong>.</p>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className={`sb-cardglow ${styles.btn} ${styles.btnPrimary}`} style={{ color:'var(--text)' }} onClick={async ()=>{ setDowngradeConfirmOpen(false); try { const r = await fetch('/api/billing/portal',{method:'POST'}); const j = await r.json(); if (!r.ok) throw new Error(j?.error||'Failed to open Stripe Portal'); const url = j?.url as string|undefined; if (url) window.location.assign(url);} catch(e:any){ alert(e?.message||'Could not open Stripe Portal.'); } }}>Downgrade</button>
            </div>
          </div>
        </div>
      )}

      {/* Pay result feedback */}
      {payResultOpen && (
        <div
          role="dialog"
          aria-modal
          aria-labelledby="payresult-title"
          onClick={() => { setPayResultOpen(false); window.location.reload(); }}
          style={{ position:'fixed', inset:0, zIndex:9999, display:'grid', placeItems:'center', padding:12, background:"color-mix(in srgb, var(--bg) 55%, transparent)", backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)' }}
        >
          <div className="modalCard" onClick={(e)=>e.stopPropagation()} style={{ width:'min(520px, 100%)', border:'1px solid var(--border)', borderRadius:16, padding:16, display:'grid', gap:12, background:'var(--panel)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 id="payresult-title" style={{ margin:0 }}>{payResultSuccess ? 'Upgrade successful' : 'Payment failed'}</h3>
              <button aria-label="Close" className={`${styles.iconBtn} ${styles.focusable}`} onClick={()=>{ setPayResultOpen(false); window.location.reload(); }}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M6 18L18 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <div style={{ color:'var(--muted)' }}>
              {payResultSuccess ? (
                <p style={{ margin:0 }}>Congrats! You are now enjoying <strong>{payResultPlan || 'your new plan'}</strong> access.</p>
              ) : (
                <p style={{ margin:0 }}>Unfortunately, the payment could not be completed. Please use “Manage subscription” to update your payment method.</p>
              )}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={()=>{ setPayResultOpen(false); window.location.reload(); }}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
