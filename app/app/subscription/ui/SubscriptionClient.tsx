"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import styles from "../subscription.module.css";

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
      "Smart cleaning board (Advanced Next-Check-In Priority)",
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
      "Autosync every 10 minutes with iCal + Sync Now Function",
      "Smart cleaning board - Advanced Next-Check-In Priority",
      "Delegate tasks with your team members",
    ],
  },
];

function planLabel(slug: string) {
  const s = slug.toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SubscriptionClient({
  /** kept optional for backward-compat; ignored on purpose */
  initialAccount: _a,
  initialPlans: _p,
}: {
  initialAccount?: any;
  initialPlans?: any[];
}) {
  const supabase = useMemo(() => createClient(), []);

  const [currentPlan, setCurrentPlan] = useState<"basic"|"standard"|"premium">("basic");
  const [validUntil, setValidUntil] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [role, setRole] = useState<"admin"|"member">("admin");

  // Load current plan / validity / role from Supabase (doar pentru status)
  useEffect(() => {
    (async () => {
      try {
        // rol pentru userul curent
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

        // plan curent (RPC)
        const r = await supabase.rpc("account_current_plan");
        const pl = (r.data as string | null)?.toLowerCase?.() || "basic";
        if (pl === "basic" || pl === "standard" || pl === "premium") setCurrentPlan(pl);

        // valid_until (din accounts)
        const { data: acc } = await supabase
          .from("accounts")
          .select("valid_until")
          .order("created_at", { ascending: true })
          .limit(1);
        const vu = acc && acc.length ? acc[0].valid_until : null;
        setValidUntil(vu ? new Date(vu).toLocaleString() : null);
      } catch {
        /* noop */
      }
    })();
  }, [supabase]);

  async function choosePlan(slug: Plan["slug"]) {
    if (role !== "admin") return;
    setSaving(slug);
    try {
      // BASIC = nelimitat (null); altfel 30 zile
      const validDays = slug === "basic" ? null : 30;
      const { error } = await supabase.rpc("account_set_plan_self", {
        p_plan_slug: slug,
        p_valid_days: validDays,
        p_trial_days: null,
      });
      if (!error) {
        setCurrentPlan(slug);
        // refresh valid_until
        const { data: acc } = await supabase
          .from("accounts")
          .select("valid_until")
          .order("created_at", { ascending: true })
          .limit(1);
        const vu = acc && acc.length ? acc[0].valid_until : null;
        setValidUntil(vu ? new Date(vu).toLocaleString() : null);
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className={styles.container}>
      {/* Header: current plan + validity */}
      <div className={styles.headerRow}>
        <span className={styles.badge}>Current: {planLabel(currentPlan)}</span>
        <span className={styles.muted}>{validUntil ? `until ${validUntil}` : "—"}</span>
        {role !== "admin" && <span className={styles.muted}>(read-only)</span>}
      </div>

      {/* Cards */}
      <div className={styles.grid}>
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.slug;
          return (
            <article
              key={p.slug}
              className={styles.card}
              aria-current={isCurrent ? "true" : undefined}
            >
              {/* Header (tier) */}
              <div className={styles.tier}>{p.name}</div>

              {/* PNG price – micșorat și încadrat */}
              <div className={styles.imgWrap}>
                <Image
                  src={p.image}
                  alt={`${p.name} price`}
                  width={240}
                  height={120}
                  className={styles.priceImg}
                  priority={isCurrent}
                />
              </div>

              {/* Bullets (elastic, 1fr) */}
              <ul className={styles.list}>
                {p.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>

              {/* CTA cu înălțime fixă (aliniere perfectă) */}
              <div className={styles.cardActions}>
                {isCurrent ? (
                  <span className={`${styles.currentPill} ${styles.btnDisabled}`}>Current</span>
                ) : (
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    disabled={!!saving || role !== "admin"}
                    onClick={() => choosePlan(p.slug)}
                  >
                    {saving === p.slug ? "Applying…" : `Choose ${planLabel(p.slug)}`}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}