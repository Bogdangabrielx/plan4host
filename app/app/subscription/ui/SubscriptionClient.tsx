"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PlanRow = {
  slug: string;
  name: string;
  description: string | null;
  max_properties: number | null;
  max_rooms_per_property: number | null;
  sync_interval_minutes: number;
  allow_sync_now: boolean;
  features?: any;
};

export default function SubscriptionClient({
  initialAccount,
  initialPlans,
}: {
  initialAccount: any;
  initialPlans: PlanRow[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [plans] = useState<PlanRow[]>(initialPlans);
  const [account, setAccount] = useState<any>(initialAccount);
  const [currentPlanSlug, setCurrentPlanSlug] = useState<string>(() =>
    (initialAccount?.plan || "basic").toString().toLowerCase()
  );
  const [role, setRole] = useState<string>("admin");
  const [saving, setSaving] = useState<string | null>(null);

  const planLabel = (s: string | null | undefined) => {
    const t = (s || "").toString().toLowerCase();
    if (!t) return "—";
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id as string | undefined;
      if (!uid) return;

      const { data: au } = await supabase
        .from("account_users")
        .select("role,disabled")
        .eq("account_id", uid)
        .eq("user_id", uid)
        .maybeSingle();
      if (au) setRole((au as any).role || "admin");

      const r = await supabase.rpc("account_current_plan");
      const pl = (r.data as string | null)?.toLowerCase?.() || "basic";
      setCurrentPlanSlug(pl);
    })();
  }, [supabase]);

  async function setPlan(slug: string) {
    if (role !== "admin") return;
    setSaving(slug);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id as string | undefined;
    if (!uid) {
      setSaving(null);
      return;
    }

    const validDays = slug === "basic" ? null : 30;
    const { error } = await supabase.rpc("account_set_plan_self", {
      p_plan_slug: slug,
      p_valid_days: validDays,
      p_trial_days: null,
    });

    if (!error) {
      const { data: acc } = await supabase
        .from("accounts")
        .select("id,valid_until,trial_used")
        .eq("id", uid)
        .maybeSingle();
      if (acc) setAccount((prev: any) => ({ ...(prev || {}), ...acc }));

      const r = await supabase.rpc("account_current_plan");
      const pl = (r.data as string | null)?.toLowerCase?.() || "basic";
      setCurrentPlanSlug(pl);
    }
    setSaving(null);
  }

  const validUntil = account?.valid_until
    ? new Date(account.valid_until).toLocaleString()
    : null;

  // BASIC → STANDARD → PREMIUM
  const ORDER = new Map([
    ["basic", 0],
    ["standard", 1],
    ["premium", 2],
  ]);
  const sorted = [...plans].sort(
    (a, b) => (ORDER.get(a.slug) ?? 99) - (ORDER.get(b.slug) ?? 99)
  );

  return (
    <section className="subs">
      <header className="subs__head">
        <div className="subs__title">
          <h2>Subscription</h2>
          <p className="subs__hint">
            Pick the plan that fits your workflow. You can switch anytime.
          </p>
        </div>

        <div className="subs__meta">
          <span className="badge">
            Current: {planLabel(currentPlanSlug)}
          </span>
          <small className="muted">
            until {validUntil || "—"}
          </small>
          {role !== "admin" && (
            <small className="muted">· read-only</small>
          )}
        </div>
      </header>

      <div className="subs__grid">
        {sorted.map((p) => {
          const isCurrent = currentPlanSlug === p.slug;

          const propsStr =
            p.max_properties == null
              ? "Unlimited properties"
              : `Up to ${p.max_properties} properties`;
          const roomsStr =
            p.max_rooms_per_property == null
              ? "Unlimited rooms per property"
              : `Up to ${p.max_rooms_per_property} rooms per property`;
          const autoStr = `Automatic sync every ${p.sync_interval_minutes} minutes`;
          const nowStr = p.allow_sync_now
            ? "Instant Sync (Sync now) included"
            : "Instant Sync (Sync now) not included";

          const featureLines: string[] = [];
          if (Array.isArray(p.features)) {
            for (const f of p.features as any[]) {
              if (typeof f === "string" && f.trim()) featureLines.push(f.trim());
            }
          }

          return (
            <article
              key={p.slug}
              className="plan"
              data-current={isCurrent ? "true" : "false"}
              data-accent={p.slug}
            >
              <header className="plan__head">
                <div>
                  <h3 className="plan__title">{p.name}</h3>
                  {p.description ? (
                    <p className="plan__desc">{p.description}</p>
                  ) : null}
                </div>

                {isCurrent ? (
                  <span className="badge badge--current">Current</span>
                ) : (
                  <button
                    className="btn btn--primary"
                    onClick={() => setPlan(p.slug)}
                    disabled={saving !== null || role !== "admin"}
                    aria-disabled={saving !== null || role !== "admin"}
                  >
                    {saving === p.slug ? (
                      <span className="btn__spinner" aria-hidden />
                    ) : null}
                    {saving === p.slug ? "Applying…" : "Choose plan"}
                  </button>
                )}
              </header>

              <ul className="plan__list">
                <li>{propsStr}</li>
                <li>{roomsStr}</li>
                <li>{autoStr}</li>
                <li>{nowStr}</li>
                {featureLines.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <style jsx>{`
        /* Layout */
        .subs {
          display: grid;
          gap: 16px;
          padding: clamp(8px, 1.6vw, 16px);
          font-family: Switzer, system-ui, -apple-system, Segoe UI, Roboto,
            Helvetica, Arial, sans-serif;
          color: var(--text);
        }

        .subs__head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }

        .subs__title h2 {
          margin: 0 0 4px 0;
          font-size: clamp(18px, 2.2vw, 22px);
          line-height: 1.2;
          letter-spacing: -0.01em;
        }
        .subs__hint {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
        }

        .subs__meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .muted {
          color: var(--muted);
          font-weight: 600;
        }

        /* Grid */
        .subs__grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          align-items: stretch;
        }

        /* Card */
        .plan {
          --accent: var(--primary);
          position: relative;
          display: grid;
          gap: 12px;
          padding: clamp(14px, 2vw, 18px);
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
          transition: transform 0.18s ease, box-shadow 0.18s ease,
            border-color 0.18s ease;
        }
        .plan[data-accent="basic"] {
          --accent: color-mix(in srgb, var(--primary) 60%, #8abf7f);
        }
        .plan[data-accent="standard"] {
          --accent: color-mix(in srgb, var(--primary) 80%, #5aa8ff);
        }
        .plan[data-accent="premium"] {
          --accent: color-mix(in srgb, var(--primary) 80%, #f1c759);
        }

        .plan::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 14px;
          pointer-events: none;
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 26%, transparent) inset;
          opacity: 0.9;
        }

        .plan:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.18);
          border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
        }
        .plan:focus-within {
          border-color: color-mix(in srgb, var(--accent) 60%, var(--border));
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 16%, transparent);
        }

        .plan[data-current="true"] {
          border-color: color-mix(in srgb, var(--accent) 60%, var(--border));
          box-shadow:
            0 10px 26px rgba(0,0,0,0.18),
            0 0 0 4px color-mix(in srgb, var(--accent) 16%, transparent);
        }

        .plan__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .plan__title {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.1px;
        }
        .plan__desc {
          margin: 6px 0 0 0;
          color: var(--muted);
          font-size: 13px;
          max-width: 42ch;
        }

        .plan__list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
          font-weight: 600;
          line-height: 1.5;
        }
        .plan__list li {
          display: grid;
          grid-template-columns: 18px 1fr;
          gap: 8px;
          align-items: start;
        }
        .plan__list li::before {
          content: "✓";
          font-weight: 900;
          line-height: 1;
          transform: translateY(1px);
          color: color-mix(in srgb, var(--accent) 85%, #00d4ff);
        }

        /* Buttons & badges */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--text);
          font-weight: 900;
          cursor: pointer;
          transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease,
            background 0.12s ease;
        }
        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.16);
        }
        .btn:active {
          transform: translateY(0);
          box-shadow: none;
        }
        .btn[disabled],
        .btn[aria-disabled="true"] {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn--primary {
          border-color: var(--primary);
          background: var(--primary);
          color: #0c111b;
        }

        .btn__spinner {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid #0c111b;
          border-right-color: transparent;
          display: inline-block;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--text);
          font-size: 12px;
          font-weight: 800;
        }
        .badge--current {
          background: var(--primary);
          color: #0c111b;
          border-color: var(--primary);
        }

        /* Motion safety */
        @media (prefers-reduced-motion: reduce) {
          .plan,
          .btn {
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}