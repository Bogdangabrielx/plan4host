// app/api/billing/upgrade-now/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getPriceIdForPlan, getPlanSlugForPriceId } from "@/lib/stripe/server";
import { getServiceSupabase } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const plan = String(body?.plan || "").toLowerCase();
  if (!plan || !["basic","standard","premium"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const priceId = getPriceIdForPlan(plan);
  if (!priceId) return NextResponse.json({ error: `Missing price for plan ${plan}` }, { status: 400 });

  const { data: acc } = await supabase
    .from('accounts')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('id', uid)
    .maybeSingle();

  const customerId = acc?.stripe_customer_id as string | undefined;
  const oldSubId = acc?.stripe_subscription_id as string | undefined;
  if (!customerId) {
    // No Stripe customer to charge off-session — fallback to Checkout
    return NextResponse.json({ fallback: 'checkout' }, { status: 409 });
  }

  const stripe = getStripe();
  try {
    // Create a NEW subscription that starts now and attempts to pay immediately
    const created = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      billing_cycle_anchor: 'now',
      cancel_at_period_end: false,
      payment_behavior: 'error_if_incomplete', // if requires_action or no PM -> throw
      expand: ['latest_invoice.payment_intent', 'items'],
    } as any);

    const u: any = created as any;
    const item = u?.items?.data?.[0];
    const newPriceId = typeof item?.price === 'string' ? item?.price : item?.price?.id;
    const mappedPlan = getPlanSlugForPriceId(newPriceId) || plan;
    const cpsSec = u?.current_period_start ?? item?.current_period_start ?? null;
    const cpeSec = u?.current_period_end ?? item?.current_period_end ?? null;
    const cps = cpsSec ? new Date(cpsSec * 1000).toISOString() : null;
    const cpe = cpeSec ? new Date(cpeSec * 1000).toISOString() : null;

    // Cancel previous subscription immediately with no proration/credits
    try {
      if (oldSubId) {
        await stripe.subscriptions.cancel(oldSubId, { prorate: false, invoice_now: false } as any);
      }
    } catch {}

    // Update DB to point to the new subscription and plan
    try {
      const svc = getServiceSupabase();
      await svc.from('accounts').update({
        stripe_subscription_id: u?.id,
        plan: mappedPlan,
        status: u?.status || 'active',
        current_period_start: cps,
        current_period_end: cpe,
        valid_until: cpe,
        cancel_at_period_end: !!u?.cancel_at_period_end,
      }).eq('id', uid as any);
    } catch {}

    return NextResponse.json({ ok: true, plan: mappedPlan, valid_until: cpe });
  } catch (e:any) {
    // If off-session payment fails or requires action, instruct client to use Checkout
    return NextResponse.json({ error: e?.message || 'Upgrade failed', fallback: 'checkout' }, { status: 400 });
  }
}
