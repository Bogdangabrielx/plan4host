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
  const [currentPlanSlug, setCurrentPlanSlug] = useState<string>(() => (initialAccount?.plan || 'basic').toString().toLowerCase());
  const [role, setRole] = useState<string>("admin");
  const [saving, setSaving] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  function planLabel(s: string | null | undefined) {
    const t = (s || '').toString().toLowerCase();
    if (!t) return '—';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

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
      if (au) setRole((au as any).role || "admin");

      // sync current plan from RPC (account_plan.plan_slug)
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
    if (!uid) { setSaving(null); return; }

    const validDays = slug === 'basic' ? null : 30;
    const { error } = await supabase.rpc("account_set_plan_self", {
      p_plan_slug: slug,
      p_valid_days: validDays,
      p_trial_days: null,
    });
    if (!error) {
      // refresh account validity (for "until")
      const { data: acc } = await supabase
        .from("accounts")
        .select("id,valid_until,trial_used")
        .eq("id", uid)
        .maybeSingle();
      if (acc) setAccount((prev: any) => ({ ...(prev||{}), ...acc }));
      // refresh current plan via RPC (from account_plan)
      const r = await supabase.rpc("account_current_plan");
      const pl = (r.data as string | null)?.toLowerCase?.() || "basic";
      setCurrentPlanSlug(pl);
    }
    setSaving(null);
  }

  function planCard(p: PlanRow) {
    const isCurrent = currentPlanSlug === p.slug;
    const expanded = true; // benefits always visible
    const propsStr = p.max_properties == null ? 'Unlimited properties' : `Up to ${p.max_properties} properties`;
    const roomsStr = p.max_rooms_per_property == null ? 'Unlimited rooms per property' : `Up to ${p.max_rooms_per_property} rooms per property`;
    const autoStr  = `Automatic sync every ${p.sync_interval_minutes} minutes`;
    const nowStr   = p.allow_sync_now ? 'Instant Sync (Sync now) included' : 'Instant Sync (Sync now) not included';
    const featureLines: string[] = [];
    try {
      if (Array.isArray(p.features)) {
        for (const f of p.features as any[]) {
          if (typeof f === 'string' && f.trim()) featureLines.push(f.trim());
        }
      }
    } catch {}
    return (
      <div
        key={p.slug}
        className="glass-card"
        style={{ padding: 16, borderRadius: 12, display: 'grid', gap: 10, fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>{p.name}</h3>
          {isCurrent ? (
            <span className="sb-badge">Current</span>
          ) : (
            <button
              className="sb-btn sb-btn--primary"
              disabled={saving !== null || role !== 'admin'}
              onClick={() => setPlan(p.slug)}
            >
              {saving === p.slug ? 'Applying…' : 'Choose plan'}
            </button>
          )}
        </div>

        <div style={{ color: "var(--muted)", display: 'grid', gap: 8, fontWeight: 600, lineHeight: 1.5 }}>
          {p.description && <div style={{ fontWeight: 600 }}>{p.description}</div>}
          <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
            <li>{propsStr}</li>
            <li>{roomsStr}</li>
            <li>{autoStr}</li>
            <li>{nowStr}</li>
            {featureLines.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const validUntil = account?.valid_until ? new Date(account.valid_until).toLocaleString() : null;
  const currentPlan = currentPlanSlug;

  // Order BASIC → STANDARD → PREMIUM
  const ORDER = new Map([['basic', 0], ['standard', 1], ['premium', 2]]);
  const sorted = [...plans].sort((a, b) => (ORDER.get(a.slug) ?? 99) - (ORDER.get(b.slug) ?? 99));
  return (
    <div style={{
      display: 'grid',
      gap: 12,
      fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      borderRadius: 12,
      padding: 4,
    }}>
      {/* Minimal current plan header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="sb-badge">Current: {planLabel(currentPlan)}</span>
        <small style={{ color: 'var(--muted)' }}>until {validUntil || '—'}</small>
        {role !== 'admin' && (
          <small style={{ color: 'var(--muted)' }}>(read-only)</small>
        )}
      </div>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {sorted.map(planCard)}
      </div>
    </div>
  );
}
