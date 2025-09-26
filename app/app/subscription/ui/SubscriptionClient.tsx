// app/app/SubscriptionClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

/** UI plan definition – totul local, nu din DB */
type PlanUI = {
  slug: "basic" | "standard" | "premium";
  name: string;
  bullets: string[];
  syncIntervalMinutes: number;
  allowInstantSync: boolean;
  imgSrc: string; // public/… png
  ctaLabel: string; // fallback label
};

const PLANS: PlanUI[] = [
  {
    slug: "basic",
    name: "BASIC",
    bullets: [
      "Adaptive calendar",
      "Online check-in form",
      "Unlimited properties and rooms listed",
      "Autosync every 60 minutes with iCal",
    ],
    syncIntervalMinutes: 60,
    allowInstantSync: false,
    imgSrc: "/basic.png",
    ctaLabel: "Choose Basic",
  },
  {
    slug: "standard",
    name: "STANDARD",
    bullets: [
      "Adaptive calendar",
      "Online check-in form",
      "Unlimited properties and rooms listed",
      "Autosync every 30 minutes with iCal",
      "Smart cleaning board (Advanced Next-Check-In Priority)",
    ],
    syncIntervalMinutes: 30,
    allowInstantSync: false,
    imgSrc: "/standard.png",
    ctaLabel: "Choose Standard",
  },
  {
    slug: "premium",
    name: "PREMIUM",
    bullets: [
      "Adaptive calendar",
      "Online check-in form",
      "Unlimited properties and rooms listed",
      "Autosync every 10 minutes with iCal + Sync Now Function",
      "Smart cleaning board - Advanced Next-Check-In Priority",
      "Delegate tasks with your team members",
    ],
    syncIntervalMinutes: 10,
    allowInstantSync: true,
    imgSrc: "/premium.png",
    ctaLabel: "Choose Premium",
  },
];

export default function SubscriptionClient() {
  const supabase = useMemo(() => createClient(), []);
  const [currentPlanSlug, setCurrentPlanSlug] = useState<"basic" | "standard" | "premium">("basic");
  const [validUntil, setValidUntil] = useState<string | null>(null);
  const [role, setRole] = useState<"admin" | "member" | "viewer">("admin");
  const [saving, setSaving] = useState<string | null>(null);

  // load status (plan curent + valid_until + rol)
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id as string | undefined;

      // rol (dacă ai altă relație account_id, adaptează)
      if (uid) {
        const { data: au } = await supabase
          .from("account_users")
          .select("role")
          .eq("user_id", uid)
          .maybeSingle();
        if (au?.role) setRole((au.role as any) || "admin");
      }

      // planul activ
      const r = await supabase.rpc("account_current_plan");
      const pl = (r.data as string | null)?.toLowerCase?.() || "basic";
      if (pl === "basic" || pl === "standard" || pl === "premium") {
        setCurrentPlanSlug(pl);
      }

      // valid_until
      const { data: acc } = await supabase
        .from("accounts")
        .select("valid_until")
        .limit(1);
      const vu = acc?.[0]?.valid_until ? new Date(acc[0].valid_until).toLocaleString() : null;
      setValidUntil(vu);
    })();
  }, [supabase]);

  async function setPlan(slug: PlanUI["slug"]) {
    if (role !== "admin") return;
    setSaving(slug);
    const validDays = slug === "basic" ? null : 30;
    const { error } = await supabase.rpc("account_set_plan_self", {
      p_plan_slug: slug,
      p_valid_days: validDays,
      p_trial_days: null,
    });

    if (!error) {
      // refresh current plan
      const r = await supabase.rpc("account_current_plan");
      const pl = (r.data as string | null)?.toLowerCase?.() || "basic";
      if (pl === "basic" || pl === "standard" || pl === "premium") {
        setCurrentPlanSlug(pl);
      }
      // refresh valid_until
      const { data: acc } = await supabase
        .from("accounts")
        .select("valid_until")
        .limit(1);
      const vu = acc?.[0]?.valid_until ? new Date(acc[0].valid_until).toLocaleString() : null;
      setValidUntil(vu);
    }
    setSaving(null);
  }

  const labelPlan = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <section className="subscriptionWrap" aria-labelledby="subscription-title">
      {/* Header compact ca în landing */}
      <header className="pageHead">
        <div>
          <h2 id="subscription-title">Subscription</h2>
          <p className="sub">
            Current: <strong>{labelPlan(currentPlanSlug)}</strong>
            {validUntil ? <span className="muted"> • valid until {validUntil}</span> : null}
            {role !== "admin" && <span className="muted"> • read-only</span>}
          </p>
        </div>
      </header>

      {/* Grid 3/2/1 ca în landing */}
      <div className="pricingGrid">
        {PLANS.map((p) => {
          const isCurrent = currentPlanSlug === p.slug;
          return (
            <article key={p.slug} className="priceCard" data-current={isCurrent ? "true" : "false"}>
              <div className="priceTier">{p.name}</div>

              {/* Bullets */}
              <ul className="priceList">
                {p.bullets.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
                <li>⟳ Auto-sync every {p.syncIntervalMinutes} minutes</li>
                <li>{p.allowInstantSync ? "⚡ Instant Sync (Sync now) included" : "Instant Sync (Sync now) not included"}</li>
              </ul>

              {/* Imagine */}
              <div className="imgWrap" aria-hidden="true">
                <Image
                  className="priceImg"
                  src={p.imgSrc}
                  alt=""
                  width={600}
                  height={380}
                  sizes="(max-width: 900px) 100vw, 33vw"
                  priority={p.slug === "premium"}
                />
              </div>

              {/* CTA */}
              <div className="ctaRow">
                {isCurrent ? (
                  <button className="btn btnGhost" disabled aria-pressed="true">
                    Current plan
                  </button>
                ) : (
                  <button
                    className="btn btnChoose"
                    disabled={saving !== null || role !== "admin"}
                    onClick={() => setPlan(p.slug)}
                    aria-label={`Choose ${p.name}`}
                  >
                    {saving === p.slug ? "Applying…" : p.ctaLabel}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* CSS – imită structura din landing (priceCard/priceTier/priceList/btn) */}
      <style jsx>{`
        .subscriptionWrap {
          display: grid;
          gap: 18px;
          max-width: 1100px;
          margin: 0 auto;
          font-family: Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        }
        .pageHead h2 {
          margin: 0;
          letter-spacing: 0.2px;
        }
        .sub {
          margin: 4px 0 0;
          color: var(--muted);
        }
        .muted {
          color: var(--muted);
        }

        .pricingGrid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(12, 1fr);
        }
        @media (max-width: 960px) {
          .pricingGrid {
            grid-template-columns: repeat(6, 1fr);
          }
        }
        @media (max-width: 720px) {
          .pricingGrid {
            grid-template-columns: 1fr;
          }
        }

        .priceCard {
          grid-column: span 4;
          display: grid;
          gap: 10px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .priceCard:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
        }
        .priceCard[data-current="true"] {
          outline: 2px solid color-mix(in srgb, var(--primary) 65%, transparent);
          outline-offset: 0px;
        }

        .priceTier {
          font-weight: 900;
          letter-spacing: 1.2px;
          font-size: 13px;
          padding: 6px 10px;
          border-radius: 999px;
          width: fit-content;
          color: #0c111b;
          background: var(--primary);
          border: 1px solid var(--primary);
        }

        .priceList {
          margin: 0;
          padding-left: 18px;
          list-style: disc;
          color: var(--text);
          display: grid;
          gap: 6px;
        }

        .imgWrap {
          display: grid;
          place-items: center;
          padding: 6px 0;
        }
        .priceImg {
          width: 100%;
          height: auto;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--card);
        }

        .ctaRow {
          display: flex;
          justify-content: flex-end;
        }

        .btn {
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: 900;
          cursor: pointer;
          border: 1px solid var(--border);
          background: var(--panel);
          color: var(--text);
          transition: transform 0.1s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }
        .btn:hover {
          transform: translateY(-0.5px);
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: default;
          transform: none;
        }

        .btnGhost {
          background: transparent;
        }
        .btnChoose {
          border-color: var(--primary);
          background: var(--primary);
          color: #0c111b;
        }
      `}</style>
    </section>
  );
}