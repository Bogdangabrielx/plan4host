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
  bullets: string[];
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
    bullets: [
      "Adaptive calendar",
      "Online check-in form",
      "Unlimited properties and rooms listed",
      "Autosync every 60 minutes with iCal",
    ],
  },
  {
    slug: "standard",
    name: "STANDARD",
    image: "/standard.png",
    syncIntervalMinutes: 30,
    allowSyncNow: false,
    bullets: [
      "Adaptive calendar",
      "Online check-in form",
      "Unlimited properties and rooms listed",
      "Autosync every 30 minutes with iCal",
      "Smart cleaning board - ",
      "   (Advanced Next-Check-In Priority)",
    ],
  },
  {
    slug: "premium",
    name: "PREMIUM",
    image: "/premium.png",
    syncIntervalMinutes: 10,
    allowSyncNow: true,
    bullets: [
      "Adaptive calendar",
      "Online check-in form",
      "Unlimited properties and rooms listed",
      "Autosync every 10 minutes with iCal",
      "                + Sync Now Function",
      "Smart cleaning board - ",
      "   (Advanced Next-Check-In Priority)",
      "Delegate tasks with your",
      "                      team members",
    ],
  },
];

function planLabel(slug: string) {
  const s = slug.toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const BENEFIT_ROWS = 9; // exact 15 rânduri înainte de imagine

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

  function choosePlan(slug: Plan["slug"]) {
    if (role !== "admin") return;
    if (trialActive) { setPendingSelect(slug); return; }
    applyPlan(slug);
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

  return (
    <div className={styles.container}>
      {/* Header bar: current plan */}
      <div className={styles.headerRow}>
        <button
          className={styles.btn}
          onClick={() => setManageOpen(true)}
          style={{ border: '1px solid var(--border)', background: 'transparent' }}
        >
          Manage Account
        </button>
        {cancelled ? (
          <>
            <span className={styles.badge}>Until Cancel:</span>
            <span className={styles.muted}>{validUntil ? `${validUntil}` : "—"}</span>
          </>
        ) : (
          <>
            <span className={styles.badge}>Active now: {planLabel(currentPlan)}</span>
            <span className={styles.muted}>{validUntil ? `until ${validUntil}` : "—"}</span>
          </>
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

          // pad bullets to exactly BENEFIT_ROWS
          const padded = Array.from({ length: BENEFIT_ROWS }, (_, i) => p.bullets[i] ?? "");

          return (
            <article key={p.slug} className={styles.card} aria-current={isCurrent ? "true" : undefined}>
              <div className={styles.tier}>{p.name}</div>

              <ul className={styles.list} style={{ ["--rows" as any]: BENEFIT_ROWS }}>
                {padded.map((txt, i) =>
                  txt ? (
                    <li key={i} className={styles.liItem} title={txt}>{txt}</li>
                  ) : (
                    <li key={i} className={`${styles.liItem} ${styles.empty}`} aria-hidden="true">
                      {/* spațiu rezervat rând gol */}
                      &nbsp;
                    </li>
                  )
                )}
              </ul>

              {/* imaginea începe la rândul 16 pentru toate cardurile */}
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
                  <span className={styles.currentBadge}>Active plan</span>
                ) : (
                  <button
                    className={`${styles.btn} ${styles.btnChoose} ${styles.focusable}`}
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
              <button className={styles.btn} onClick={()=>setManageOpen(false)} style={{ border:'1px solid var(--border)', background:'transparent' }}>✕</button>
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
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={async () => {
                    // Cancel at period end (server action)
                    try {
                      const res = await fetch('/api/account/cancel', { method:'POST' });
                      if (!res.ok) throw new Error(await res.text());
                      setCancelled(true);
                      alert('Subscription will end at the end of the current period.');
                    } catch (e:any) {
                      alert(e?.message || 'Could not cancel subscription.');
                    }
                  }}
                >
                  Cancel subscription
                </button>

                <button
                  className={styles.btn}
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
                  style={{ border:'1px solid var(--danger)', color:'var(--danger)', background:'transparent' }}
                >
                  Delete account (danger)
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
    </div>
  );
}
