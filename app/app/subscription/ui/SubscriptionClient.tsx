// app/app/SubscriptionClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type PlanSlug = "basic" | "standard" | "premium";
type PlanUI = {
  slug: PlanSlug;
  name: string;
  bullets: string[];
  syncIntervalMinutes: number;
  allowInstantSync: boolean;
  imgSrc: string; // /public/*.png
  ctaLabel: string;
};

const PLANS: PlanUI[] = [
  {
    slug: "basic",
    name: "BASIC",
    bullets: [
      "Adaptive calendar",
      "Online check-in form",
      "Unlimited properties and rooms",
      "Autosync every 60 minutes (iCal)",
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
      "Unlimited properties and rooms",
      "Autosync every 30 minutes (iCal)",
      "Smart cleaning board (Next-Check-In Priority)",
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
      "Unlimited properties and rooms",
      "Autosync every 10 minutes (iCal) + Sync Now",
      "Smart cleaning board (Advanced Priority)",
      "Team members & task delegation",
    ],
    syncIntervalMinutes: 10,
    allowInstantSync: true,
    imgSrc: "/premium.png",
    ctaLabel: "Choose Premium",
  },
];

export default function SubscriptionClient() {
  const supabase = useMemo(() => createClient(), []);
  const [currentPlan, setCurrentPlan] = useState<PlanSlug>("basic");
  const [validUntil, setValidUntil] = useState<string | null>(null);
  const [role, setRole] = useState<"admin" | "member" | "viewer">("admin");
  const [saving, setSaving] = useState<PlanSlug | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id as string | undefined;

      if (uid) {
        const { data: au } = await supabase
          .from("account_users")
          .select("role")
          .eq("user_id", uid)
          .maybeSingle();
        if (au?.role) setRole((au.role as any) || "admin");
      }

      const r = await supabase.rpc("account_current_plan");
      const pl = (r.data as string | null)?.toLowerCase?.() || "basic";
      if (pl === "basic" || pl === "standard" || pl === "premium") setCurrentPlan(pl);

      const { data: acc } = await supabase.from("accounts").select("valid_until").limit(1);
      const vu = acc?.[0]?.valid_until ? new Date(acc[0].valid_until).toLocaleString() : null;
      setValidUntil(vu);
    })();
  }, [supabase]);

  async function choosePlan(slug: PlanSlug) {
    if (role !== "admin") return;
    setSaving(slug);
    const validDays = slug === "basic" ? null : 30;

    const { error } = await supabase.rpc("account_set_plan_self", {
      p_plan_slug: slug,
      p_valid_days: validDays,
      p_trial_days: null,
    });

    if (!error) {
      const r = await supabase.rpc("account_current_plan");
      const pl = (r.data as string | null)?.toLowerCase?.() || "basic";
      if (pl === "basic" || pl === "standard" || pl === "premium") setCurrentPlan(pl);

      const { data: acc } = await supabase.from("accounts").select("valid_until").limit(1);
      const vu = acc?.[0]?.valid_until ? new Date(acc[0].valid_until).toLocaleString() : null;
      setValidUntil(vu);
    }
    setSaving(null);
  }

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <section className="subWrap" aria-labelledby="sub-title">
      <header className="head">
        <div className="titleCol">
          <h2 id="sub-title">Subscription</h2>
          <p className="meta">
            Current: <strong>{cap(currentPlan)}</strong>
            {validUntil && <span className="muted"> • valid until {validUntil}</span>}
            {role !== "admin" && <span className="muted"> • read-only</span>}
          </p>
        </div>
      </header>

      <div className="grid">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.slug;
          return (
            <article key={p.slug} className="card" data-current={isCurrent ? "true" : "false"}>
              {/* Accent header bar */}
              <div className="accent">
                <span className="tier">{p.name}</span>
                {isCurrent && <span className="badge">Current</span>}
              </div>

              {/* Body */}
              <div className="body">
                <ul className="list">
                  {p.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                  <li>Auto-sync every {p.syncIntervalMinutes} minutes</li>
                  <li>{p.allowInstantSync ? "Instant Sync (Sync now) included" : "Instant Sync (Sync now) not included"}</li>
                </ul>

                <div className="imgWrap" aria-hidden="true">
                  <Image
                    src={p.imgSrc}
                    alt=""
                    width={640}
                    height={380}
                    sizes="(max-width: 960px) 100vw, 33vw"
                    className="img"
                    priority={p.slug === "premium"}
                  />
                </div>
              </div>

              {/* Footer / CTA */}
              <div className="cta">
                {isCurrent ? (
                  <button className="btn ghost" disabled aria-pressed="true">
                    Current plan
                  </button>
                ) : (
                  <button
                    className="btn primary"
                    onClick={() => choosePlan(p.slug)}
                    disabled={!!saving || role !== "admin"}
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

      <style jsx>{`
        .subWrap {
          display: grid;
          gap: 18px;
          max-width: 1100px;
          margin: 0 auto;
          padding-bottom: 8px;
          font-family: Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        }

        .head {
          display: flex;
          align-items: end;
          justify-content: space-between;
        }
        .titleCol h2 {
          margin: 0;
          letter-spacing: 0.2px;
        }
        .meta {
          margin: 6px 0 0;
          color: var(--muted);
        }
        .muted {
          color: var(--muted);
        }

        .grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(12, 1fr);
        }
        @media (max-width: 960px) {
          .grid {
            grid-template-columns: repeat(6, 1fr);
          }
        }
        @media (max-width: 720px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }

        .card {
          grid-column: span 4;
          display: grid;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: clip;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
          transition: box-shadow 0.2s ease, transform 0.12s ease, border-color 0.2s ease;
        }
        .card:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
        }
        .card[data-current="true"] {
          border-color: color-mix(in srgb, var(--primary) 70%, transparent);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.24), 0 0 0 1px color-mix(in srgb, var(--primary) 30%, transparent) inset;
        }

        /* Accent bar sus — altă formă, clar boxed */
        .accent {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background:
            linear-gradient(90deg,
              color-mix(in srgb, var(--primary) 22%, transparent),
              transparent 60%);
          border-bottom: 1px solid var(--border);
        }
        .tier {
          font-weight: 900;
          letter-spacing: 1px;
          font-size: 12.5px;
          padding: 6px 10px;
          border-radius: 999px;
          color: #0c111b;
          background: var(--primary);
          border: 1px solid var(--primary);
        }
        .badge {
          font-size: 12px;
          font-weight: 800;
          color: var(--text);
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--primary) 60%, var(--border));
          background: color-mix(in srgb, var(--primary) 18%, var(--panel));
        }

        .body {
          display: grid;
          gap: 12px;
          padding: 14px;
        }
        .list {
          margin: 0;
          padding-left: 18px;
          list-style: disc;
          display: grid;
          gap: 8px;
          color: var(--text);
        }

        .imgWrap {
          display: grid;
          place-items: center;
          padding: 4px 0 2px;
        }
        .img {
          width: 100%;
          height: auto;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--card);
        }

        .cta {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px 14px;
          border-top: 1px solid var(--border);
          background: color-mix(in srgb, var(--panel) 90%, transparent);
        }

        .btn {
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: 900;
          cursor: pointer;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--text);
          transition: transform 0.1s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }
        .btn:hover {
          transform: translateY(-0.5px);
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.16);
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: default;
          transform: none;
        }
        .btn.primary {
          border-color: var(--primary);
          background: var(--primary);
          color: #0c111b;
        }
        .btn.ghost {
          background: transparent;
        }
      `}</style>
    </section>
  );
}