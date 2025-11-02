// app/api/billing/upgrade-now/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getPriceIdForPlan } from "@/lib/stripe/server";

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
    .select('stripe_subscription_id')
    .eq('id', uid)
    .maybeSingle();

  const subId = acc?.stripe_subscription_id as string | undefined;
  if (!subId) {
    // No active subscription to update — fallback to Checkout
    return NextResponse.json({ fallback: 'checkout' }, { status: 409 });
  }

  const stripe = getStripe();
  try {
    const sub = await stripe.subscriptions.retrieve(subId, { expand: ['items'] } as any);
    const itemId = (sub as any)?.items?.data?.[0]?.id as string | undefined;
    if (!itemId) throw new Error('No subscription item to update');

    // Force immediate upgrade: reset anchor to now, no proration/credit
    await stripe.subscriptions.update(subId, {
      items: [{ id: itemId, price: priceId }],
      billing_cycle_anchor: 'now',
      proration_behavior: 'none',
      cancel_at_period_end: false,
      payment_behavior: 'error_if_incomplete',
    } as any);

    return NextResponse.json({ ok: true });
  } catch (e:any) {
    // If requires_action or off-session fails, instruct client to use Checkout
    return NextResponse.json({ error: e?.message || 'Upgrade failed', fallback: 'checkout' }, { status: 400 });
  }
}

