// app/api/billing/schedule/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getPriceIdForPlan } from "@/lib/stripe/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const plan = String(body?.plan || "").toLowerCase();
  if (!plan || !["basic", "standard", "premium"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // 1) Schedule at DB-level for UI (badge etc.)
  const { error: rpcErr } = await supabase.rpc("account_schedule_plan_self", { p_plan_slug: plan });
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 400 });

  // 2) Mirror to Stripe using a Subscription Schedule (apply at renewal)
  try {
    const uid = auth.user.id;
    // Resolve current account id (owner or member)
    let accountId: string | null = null;
    try {
      const self = await supabase.rpc('_account_self_with_boundary');
      const row = Array.isArray(self.data) ? self.data[0] : null;
      accountId = (row as any)?.account_id || null;
    } catch {}
    if (!accountId) {
      // fallback: assume own account
      accountId = uid;
    }

    const { data: acc } = await supabase
      .from('accounts')
      .select('stripe_subscription_id, stripe_schedule_id')
      .eq('id', accountId)
      .maybeSingle();

    const subId = (acc as any)?.stripe_subscription_id as string | undefined;
    const existingScheduleId = (acc as any)?.stripe_schedule_id as string | undefined;
    const newPriceId = getPriceIdForPlan(plan);

    if (!subId || !newPriceId) {
      // No active Stripe subscription to schedule against; DB scheduling is enough for now
      return NextResponse.json({ ok: true, db_only: true });
    }

    const stripe = getStripe();
    // Cancel any existing schedule to avoid conflicts
    if (existingScheduleId) {
      try { await stripe.subscriptionSchedules.cancel(existingScheduleId as any); } catch {}
      try { await supabase.from('accounts').update({ stripe_schedule_id: null }).eq('id', accountId as any); } catch {}
    }

    // Read current subscription details
    const sub = await stripe.subscriptions.retrieve(subId, { expand: ['items'] } as any);
    const item = (sub as any)?.items?.data?.[0];
    const currentPriceId = typeof item?.price === 'string' ? item?.price : item?.price?.id;
    const qty = item?.quantity || 1;
    const cpeSec: number | null = (sub as any)?.current_period_end ?? item?.current_period_end ?? null;
    if (!cpeSec) return NextResponse.json({ ok: true, note: 'no_cpe' });

    // Create schedule with two phases: keep current until CPE, then switch to new price
    const schedule = await stripe.subscriptionSchedules.create({
      from_subscription: subId,
      phases: [
        { end_date: cpeSec, items: [{ price: currentPriceId, quantity: qty }], proration_behavior: 'none' },
        { items: [{ price: newPriceId, quantity: qty }], proration_behavior: 'none' },
      ],
      metadata: { account_id: uid, plan_slug: plan },
    } as any);

    // Store schedule id for later clear/update
    try { await supabase.from('accounts').update({ stripe_schedule_id: (schedule as any)?.id || null }).eq('id', accountId as any); } catch {}

    return NextResponse.json({ ok: true, schedule_id: (schedule as any)?.id || null });
  } catch (e: any) {
    // Best-effort: DB is scheduled; Stripe mirroring failed
    return NextResponse.json({ ok: true, stripe_error: e?.message || 'Stripe schedule failed (DB scheduled only)' });
  }
}

export async function GET() {
  // Optional: expose current pending info
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("accounts")
    .select("pending_plan, pending_effective_at")
    .eq("id", uid)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ pending: data ?? null });
}
