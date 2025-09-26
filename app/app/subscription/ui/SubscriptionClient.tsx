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
  variant = "glass", // "glass" | "gradient"
}: {
  initialAccount: any;
  initialPlans: PlanRow[];
  variant?: "glass" | "gradient";
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

  const validUntil = account?.valid_until ? new Date(account.valid_until).toLocaleString() : null;

  const ORDER = new Map([
    ["basic", 0],
    ["standard", 1],
    ["premium", 2],
  ]);
  const sorted = [...plans].sort((a, b) => (ORDER.get(a.slug) ?? 99) - (ORDER.get(b.slug) ?? 99));

  return (
    <section className="subscr" data-variant={variant}>
      {/* fundalul – dacă nu vrei poza, scoate background-image din CSS */}
      <header className="topbar">
        <span className="sb-badge">Current: {planLabel(currentPlanSlug)}</span>
        <small className="until">until {validUntil || "—"}</small>
        {role !== "admin" && <small className="readonly">(read-only)</small>}
      </header>

      <div className="grid">
        {sorted.map((p) => {
          const isCurrent = currentPlanSlug === p.slug;
          const propsStr =
            p.max_properties == null ? "Unlimited properties" : `Up to ${p.max_properties} properties`;
          const roomsStr =
            p.max_rooms_per_property == null
              ? "Unlimited rooms per property"
              : `Up to ${p.max_rooms_per_property} rooms per property`;
          const autoStr = `Automatic sync every ${p.sync_interval_minutes} minutes`;
          const nowStr = p.allow_sync_now
            ? "Instant Sync (Sync now) included"
            : "Instant Sync (Sync now) not included";

          const featureLines: string[] = [];
          try {
            if (Array.isArray(p.features)) {
              for (const f of p.features as any[]) {
                if (typeof f === "string" && f.trim()) featureLines.push(f.trim());
              }
            }
          } catch {}

          return (
            <article
              key={p.slug}
              className="plan-card"
              data-current={isCurrent ? "true" : "false"}
              data-variant={variant}
            >
              <div className="plan-head">
                <h3 className="plan-title">{p.name}</h3>
                {isCurrent ? (
                  <span className="sb-badge badge-current">Current</span>
                ) : (
                  <button
                    className="sb-btn sb-btn--primary choose-btn"
                    disabled={saving !== null || role !== "admin"}
                    onClick={() => setPlan(p.slug)}
                  >
                    {saving === p.slug ? "Applying…" : "Choose plan"}
                  </button>
                )}
              </div>

              <ul className="features">
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
        .subscr {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          padding: clamp(10px, 2vw, 16px);
          font-family: Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;

          /* fundal – poți elimina dacă vrei flat */
          background-image: url("/hotel_room_1456x816");
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          min-height: 60vh;
        }

        .topbar {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .topbar .until,
        .topbar .readonly {
          color: var(--muted);
          font-weight: 600;
        }

        .grid {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        }

        /* ===== CARD – 2 VARIANTE ===== */

        .plan-card {
          position: relative;
          padding: 16px;
          border-radius: 14px;
          color: var(--text);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease,
            background 0.2s ease, opacity 0.2s ease;
          will-change: transform;
          isolation: isolate; /* highlight layer stays inside */
        }

        /* VARIANTA: GLASS TRANSPARENT */
        .plan-card[data-variant="glass"] {
          /* un “sticlos” real: transparent + blur, se vede fundalul */
          background: color-mix(in srgb, var(--panel) 52%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
          backdrop-filter: saturate(120%) blur(10px);
          -webkit-backdrop-filter: saturate(120%) blur(10px);
        }
        .plan-card[data-variant="glass"]::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(
            to bottom right,
            color-mix(in srgb, #fff 10%, transparent),
            transparent 45%
          );
          pointer-events: none;
          z-index: -1;
        }

        /* VARIANTA: GRADIENT PE CARD */
        .plan-card[data-variant="gradient"] {
          background: linear-gradient(
              180deg,
              color-mix(in srgb, var(--primary) 14%, var(--panel)) 0%,
              color-mix(in srgb, var(--primary) 6%, var(--panel)) 100%
            ),
            color-mix(in srgb, var(--panel) 92%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary) 40%, var(--border));
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22),
            0 0 0 1px color-mix(in srgb, var(--primary) 18%, transparent) inset;
        }

        .plan-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.34);
        }

        /* ring/halo pentru planul curent */
        .plan-card[data-current="true"] {
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.34),
            0 0 0 1px color-mix(in srgb, var(--primary) 60%, transparent),
            0 0 0 6px color-mix(in srgb, var(--primary) 16%, transparent);
        }

        .plan-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
        }
        .plan-title {
          margin: 0;
          font-size: 16px;
          line-height: 1.25;
          font-weight: 800;
          letter-spacing: 0.1px;
        }
        .badge-current {
          background: var(--primary);
          color: #0c111b;
          border: 1px solid var(--primary);
          font-weight: 900;
        }
        .choose-btn {
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: 900;
        }
        .choose-btn[disabled] {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .features {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
          font-weight: 600;
          line-height: 1.5;
        }
        .features li {
          display: grid;
          grid-template-columns: 18px 1fr;
          align-items: start;
          gap: 8px;
        }
        .features li::before {
          content: "✓";
          font-weight: 900;
          line-height: 1;
          transform: translateY(1px);
          color: color-mix(in srgb, var(--primary) 85%, #00d4ff);
        }

        /* Small screens */
        @media (max-width: 520px) {
          .subscr {
            border-radius: 12px;
          }
          .plan-card {
            padding: 14px;
          }
          .plan-title {
            font-size: 15px;
          }
        }
      `}</style>
    </section>
  );
}