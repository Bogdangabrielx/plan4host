// app/app/SubscriptionClient.tsx
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
  features?: any; // array de string-uri ideal
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

  useEffect(() => {
    (async () => {
      // rolul
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

      // planul curent (din view/funcție)
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
      // refresh account validity
      const { data: acc } = await supabase
        .from("accounts")
        .select("id,valid_until,trial_used,plan")
        .eq("id", uid)
        .maybeSingle();
      if (acc) setAccount((prev: any) => ({ ...(prev || {}), ...acc }));

      const r = await supabase.rpc("account_current_plan");
      const pl = (r.data as string | null)?.toLowerCase?.() || "basic";
      setCurrentPlanSlug(pl);
    }
    setSaving(null);
  }

  function planLabel(s: string | null | undefined) {
    const t = (s || "").toString().toLowerCase();
    if (!t) return "—";
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  const validUntil = account?.valid_until ? new Date(account.valid_until).toLocaleString() : null;

  // sort BASIC → STANDARD → PREMIUM
  const ORDER = new Map([
    ["basic", 0],
    ["standard", 1],
    ["premium", 2],
  ]);
  const sorted = [...plans].sort(
    (a, b) => (ORDER.get(a.slug) ?? 99) - (ORDER.get(b.slug) ?? 99)
  );

  function PlanCard(p: PlanRow) {
    const isCurrent = currentPlanSlug === p.slug;
    const propsStr =
      p.max_properties == null
        ? "Unlimited properties"
        : `Up to ${p.max_properties} properties`;
    const roomsStr =
      p.max_rooms_per_property == null
        ? "Unlimited rooms / property"
        : `Up to ${p.max_rooms_per_property} rooms / property`;
    const autoStr = `Auto-sync every ${p.sync_interval_minutes} min`;
    const nowStr = p.allow_sync_now ? "Instant Sync enabled" : "Instant Sync not included";

    const lines: string[] = [];
    if (Array.isArray(p.features)) {
      for (const f of p.features) {
        if (typeof f === "string" && f.trim()) lines.push(f.trim());
      }
    }

    // accente per plan
    const accents: Record<string, { a1: string; a2: string; chip: string }> = {
      basic: {
        a1: "color-mix(in srgb, var(--muted) 40%, transparent)",
        a2: "color-mix(in srgb, var(--muted) 0%, transparent)",
        chip: "var(--muted)",
      },
      standard: {
        a1: "color-mix(in srgb, var(--primary) 55%, transparent)",
        a2: "color-mix(in srgb, var(--primary) 10%, transparent)",
        chip: "var(--primary)",
      },
      premium: {
        a1: "color-mix(in srgb, #f59e0b 55%, transparent)", // amber-ish
        a2: "color-mix(in srgb, #f59e0b 10%, transparent)",
        chip: "color-mix(in srgb, #f59e0b 85%, var(--primary))",
      },
    };
    const ax = accents[p.slug] || accents["basic"];

    return (
      <article
        key={p.slug}
        className="planCard"
        data-current={isCurrent ? "true" : "false"}
        aria-current={isCurrent ? "true" : "false"}
        style={
          {
            // gradient border trick (background layer + border layer)
            // card stays neutral on both themes
            ["--g1" as any]: ax.a1,
            ["--g2" as any]: ax.a2,
            ["--chip" as any]: ax.chip,
          } as React.CSSProperties
        }
      >
        <header className="planHead">
          <div className="planTitle">
            <span className="dot" aria-hidden />
            <h3>{p.name}</h3>
          </div>

          <div className="capabilities">
            <span className="cap" title={autoStr}>
              ⟳ {p.sync_interval_minutes}m
            </span>
            <span className={`cap ${p.allow_sync_now ? "capOn" : "capOff"}`} title={nowStr}>
              ⚡ {p.allow_sync_now ? "Instant" : "No Instant"}
            </span>
            {isCurrent && <span className="badge">Current</span>}
          </div>
        </header>

        {p.description && <p className="desc">{p.description}</p>}

        <ul className="benefits">
          <li>{propsStr}</li>
          <li>{roomsStr}</li>
          <li>{autoStr}</li>
          <li>{nowStr}</li>
          {lines.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>

        <div className="ctaRow">
          {isCurrent ? (
            <button className="btn btnGhost" disabled aria-pressed="true">
              Your plan
            </button>
          ) : (
            <button
              className="btn btnPrimary"
              disabled={saving !== null || role !== "admin"}
              onClick={() => setPlan(p.slug)}
              aria-label={`Choose ${p.name} plan`}
            >
              {saving === p.slug ? "Applying…" : "Choose plan"}
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <section className="wrap" aria-labelledby="subscription-title">
      <header className="pageHead">
        <div>
          <h2 id="subscription-title">Subscription</h2>
          <p className="sub">
            Current: <strong>{planLabel(currentPlanSlug)}</strong>
            {validUntil ? <span className="until"> • valid until {validUntil}</span> : null}
            {role !== "admin" && <span className="ro"> • read-only</span>}
          </p>
        </div>
      </header>

      <div className="grid">
        {sorted.map((p) => (
          <PlanCard key={p.slug} {...p} />
        ))}
      </div>

      <style jsx>{`
        .wrap {
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
        .until,
        .ro {
          color: var(--muted);
        }

        .grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(12, 1fr);
        }
        @media (max-width: 720px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }

        /* Card with gradient border and subtle depth */
        .planCard {
          grid-column: span 4;
          position: relative;
          padding: 16px;
          border-radius: 14px;
          border: 1px solid transparent;
          background:
            linear-gradient(var(--card), var(--card)) padding-box,
            linear-gradient(135deg, var(--g1), var(--g2)) border-box;
          box-shadow:
            0 8px 24px rgba(0, 0, 0, 0.22),
            inset 0 0 0 1px color-mix(in srgb, var(--border) 85%, transparent);
          transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .planCard:hover {
          transform: translateY(-1px);
          box-shadow:
            0 12px 28px rgba(0, 0, 0, 0.28),
            inset 0 0 0 1px color-mix(in srgb, var(--border) 75%, transparent);
        }
        @media (max-width: 960px) {
          .planCard {
            grid-column: span 6;
          }
        }
        @media (max-width: 720px) {
          .planCard {
            grid-column: span 12;
          }
        }

        .planHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        .planTitle {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .planTitle h3 {
          margin: 0;
          font-size: 18px;
          letter-spacing: 0.2px;
        }
        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--g1);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--g1) 25%, transparent);
        }

        .capabilities {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .cap {
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          padding: 6px 8px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--panel);
          color: var(--text);
        }
        .capOn {
          border-color: var(--chip);
          background: color-mix(in srgb, var(--chip) 20%, var(--panel));
          color: #0c111b;
        }
        .capOff {
          opacity: 0.8;
        }

        .badge {
          font-size: 12px;
          font-weight: 900;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid var(--chip);
          background: var(--chip);
          color: #0c111b;
        }

        .desc {
          margin: 0 0 6px 0;
          color: var(--muted);
        }

        .benefits {
          margin: 8px 0 0 0;
          padding: 0 0 0 18px;
          color: var(--text);
          display: grid;
          gap: 6px;
        }
        .benefits li {
          line-height: 1.45;
        }

        .ctaRow {
          margin-top: 12px;
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
        .btnPrimary {
          border-color: var(--chip);
          background: var(--chip);
          color: #0c111b;
        }
      `}</style>
    </section>
  );
}