"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../subscription.module.css";

type PlanRow = {
  slug: "basic" | "standard" | "premium";
  name: string;
  image: string;
  features: string[];
  sync_interval_minutes: number;
  allow_sync_now: boolean;
  max_properties: number | null;
  max_rooms_per_property: number | null;
};

const PLANS: PlanRow[] = [
  {
    slug: "basic",
    name: "BASIC",
    image: "/basic.png",
    features: [
      "Adaptive calendar",
      "Online check-in form",
      "Unlimited properties & rooms",
      "Autosync every 60 minutes with iCal",
    ],
    sync_interval_minutes: 60,
    allow_sync_now: false,
    max_properties: null,
    max_rooms_per_property: null,
  },
  {
    slug: "standard",
    name: "STANDARD",
    image: "/standard.png",
    features: [
      "Adaptive calendar",
      "Online check-in form",
      "Unlimited properties & rooms",
      "Autosync every 30 minutes with iCal",
      "Smart cleaning board (Advanced Next-Check-In Priority)",
    ],
    sync_interval_minutes: 30,
    allow_sync_now: false,
    max_properties: null,
    max_rooms_per_property: null,
  },
  {
    slug: "premium",
    name: "PREMIUM",
    image: "/premium.png",
    features: [
      "Adaptive calendar",
      "Online check-in form",
      "Unlimited properties & rooms",
      "Autosync every 10 minutes with iCal + Sync Now Function",
      "Smart cleaning board - Advanced Next-Check-In Priority",
      "Delegate tasks with your team members",
    ],
    sync_interval_minutes: 10,
    allow_sync_now: true,
    max_properties: null,
    max_rooms_per_property: null,
  },
];

export default function SubscriptionClient() {
  const supabase = useMemo(() => createClient(), []);
  const [currentPlanSlug, setCurrentPlanSlug] = useState<PlanRow["slug"]>("basic");
  const [validUntil, setValidUntil] = useState<string | null>(null);
  const [role, setRole] = useState<"admin" | "member">("admin");
  const [saving, setSaving] = useState<PlanRow["slug"] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // role (fallback admin)
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (uid) {
          // dacă ai tabelul account_users, poți rafina aici
          setRole("admin");
        }

        // plan curent (din rpc simplă, dacă o ai; altfel poți păstra "basic")
        const r = await supabase.rpc("account_current_plan");
        const pl = (r?.data as string | null)?.toLowerCase() as PlanRow["slug"] | null;
        if (pl) setCurrentPlanSlug(pl);

        const acc = await supabase
          .from("accounts")
          .select("valid_until")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (acc?.data?.valid_until) {
          setValidUntil(new Date(acc.data.valid_until as any).toLocaleString());
        }
      } catch {
        /* noop */
      }
    })();
  }, [supabase]);

  async function applyPlan(slug: PlanRow["slug"]) {
    if (role !== "admin") return;
    setSaving(slug);
    try {
      // dacă nu ai RPC-ul, comentează apelul și doar setează local:
      await supabase.rpc("account_set_plan_self", {
        p_plan_slug: slug,
        p_valid_days: slug === "basic" ? null : 30,
        p_trial_days: null,
      });

      // refresh
      const r = await supabase.rpc("account_current_plan");
      const pl = (r?.data as string | null)?.toLowerCase() as PlanRow["slug"] | null;
      if (pl) setCurrentPlanSlug(pl);

      const acc = await supabase
        .from("accounts")
        .select("valid_until")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (acc?.data?.valid_until) {
        setValidUntil(new Date(acc.data.valid_until as any).toLocaleString());
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.topbar}>
        <div className={styles.status}>
          <span className={styles.badge}>
            Current: {currentPlanSlug.toUpperCase()}
          </span>
          <small className={styles.valid}>
            {validUntil ? `until ${validUntil}` : "—"}
          </small>
          {role !== "admin" && <small className={styles.readonly}>(read-only)</small>}
        </div>
      </header>

      <section className={styles.grid}>
        {PLANS.map((p) => {
          const isCurrent = p.slug === currentPlanSlug;
          return (
            <article key={p.slug} className={styles.planCard} data-current={isCurrent ? "true" : "false"}>
              {/* 1) Header */}
              <div className={styles.cardHead}>
                <div className={styles.tier}>{p.name}</div>
                {isCurrent && <span className={styles.pill}>Current</span>}
              </div>

              {/* 2) Image (înălțime fixă → aliniere perfectă între carduri) */}
              <div className={styles.planImage} aria-hidden>
                <img src={p.image} alt="" />
              </div>

              {/* 3) Feature list (flex 1fr) */}
              <ul className={styles.features}>
                {p.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>

              {/* 4) CTA jos (aliniat între carduri) */}
              <div className={styles.ctaRow}>
                {isCurrent ? (
                  <button className={`${styles.btn} ${styles.btnDisabled}`} disabled>
                    Selected
                  </button>
                ) : (
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => applyPlan(p.slug)}
                    disabled={!!saving}
                    title="Apply this plan"
                  >
                    {saving === p.slug ? "Applying…" : "Choose plan"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}