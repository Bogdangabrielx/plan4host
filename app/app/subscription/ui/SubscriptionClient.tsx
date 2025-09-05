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
    const { error } = await supabase.rpc("account_set_plan", {
      p_account_id: uid,
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
    return (
      <div key={p.slug} className="sb-card" style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 12, display: 'grid', gap: 8 }}>
        <strong style={{ fontSize: 18 }}>{p.name}</strong>
        <div style={{ color: "var(--muted)" }}>{p.description || ""}</div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: 'var(--muted)' }}>
          <li>Properties: {p.max_properties ?? 'Unlimited'}</li>
          <li>Rooms / property: {p.max_rooms_per_property ?? 'Unlimited'}</li>
          <li>Autosync every {p.sync_interval_minutes} min</li>
          <li>Sync now: {p.allow_sync_now ? 'Yes' : 'No'}</li>
        </ul>
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
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="sb-card" style={{ padding: 16 }}>
        <strong style={{ fontSize: 18 }}>Current plan: {(account?.plan || 'basic').toString()}</strong>
        <div style={{ color: 'var(--muted)' }}>Valid until: {validUntil || '—'}</div>
        {role !== 'owner' && (
          <div style={{ color: 'var(--danger)', marginTop: 6 }}>Only the owner can change the plan.</div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {plans.map(planCard)}
      </div>
    </div>
  );
}

