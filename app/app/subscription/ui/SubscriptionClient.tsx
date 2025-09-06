"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PlanRow = {
  slug: string; name: string; description: string | null;
  max_properties: number | null; max_rooms_per_property: number | null;
  sync_interval_minutes: number; allow_sync_now: boolean;
  features?: any;
};

export default function SubscriptionClient({ initialAccount, initialPlans }:{ initialAccount: any; initialPlans: PlanRow[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [plans] = useState<PlanRow[]>(initialPlans);
  const [account, setAccount] = useState<any>(initialAccount);
  const [role, setRole] = useState<string>("owner");
  const [saving, setSaving] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      // detect membership role for current user
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id as string | undefined;
      if (!uid) return;
      const { data: au } = await supabase
        .from("account_users")
        .select("role,disabled")
        .eq("account_id", uid)
        .eq("user_id", uid)
        .maybeSingle();
      if (au) setRole((au as any).role || "owner");
    })();
  }, [supabase]);

  async function setPlan(slug: string) {
    if (role !== "owner") return;
    setSaving(slug);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id as string | undefined;
    if (!uid) { setSaving(null); return; }

    const validDays = slug === 'basic' ? null : 30;
    const { error } = await supabase.rpc("account_set_plan_self", {
      p_plan_slug: slug,
      p_valid_days: validDays,
      p_trial_days: null,
    });
    if (!error) {
      // refresh account header
      const { data: acc } = await supabase
        .from("accounts")
        .select("id,plan,valid_until,trial_used")
        .eq("id", uid)
        .maybeSingle();
      setAccount(acc as any);
    }
    setSaving(null);
  }

  function planCard(p: PlanRow) {
    const isCurrent = (account?.plan as string | null)?.toLowerCase?.() === p.slug;
    const expanded = !!open[p.slug];
    return (
      <div
        key={p.slug}
        className="sb-card"
        style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 12, display: 'grid', gap: 8 }}
      >
        <button
          onClick={() => setOpen(prev => ({ ...prev, [p.slug]: !prev[p.slug] }))}
          className="sb-btn sb-btn--ghost"
          style={{ justifySelf: 'start', padding: '8px 10px', fontWeight: 900 }}
          aria-expanded={expanded}
        >
          {p.name}
        </button>

        {expanded && (
          <div style={{ color: "var(--muted)", display: 'grid', gap: 8 }}>
            {p.description && <div>{p.description}</div>}
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              <li>Properties: {p.max_properties ?? 'Unlimited'}</li>
              <li>Rooms / property: {p.max_rooms_per_property ?? 'Unlimited'}</li>
              <li>Autosync every {p.sync_interval_minutes} min</li>
              <li>Sync now: {p.allow_sync_now ? 'Yes' : 'No'}</li>
            </ul>
          </div>
        )}

        <div>
          {isCurrent ? (
            <span className="sb-badge">Current</span>
          ) : (
            <button
              className="sb-btn sb-btn--primary"
              disabled={saving !== null || role !== 'owner'}
              onClick={() => setPlan(p.slug)}
            >
              {saving === p.slug ? 'Applying…' : 'Choose plan'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const validUntil = account?.valid_until ? new Date(account.valid_until).toLocaleString() : null;
  const currentPlan = (account?.plan || 'basic').toString();

  // Order BASIC → STANDARD → PREMIUM
  const ORDER = new Map([['basic', 0], ['standard', 1], ['premium', 2]]);
  const sorted = [...plans].sort((a, b) => (ORDER.get(a.slug) ?? 99) - (ORDER.get(b.slug) ?? 99));
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Minimal current plan header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="sb-badge">Current: {currentPlan}</span>
        <small style={{ color: 'var(--muted)' }}>until {validUntil || '—'}</small>
        {role !== 'owner' && (
          <small style={{ color: 'var(--muted)' }}>(read-only)</small>
        )}
      </div>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {sorted.map(planCard)}
      </div>
    </div>
  );
}
