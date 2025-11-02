// app/api/billing/payment-method/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export async function GET() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: acc, error } = await supabase
    .from('accounts')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('id', uid)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const customerId = acc?.stripe_customer_id as string | undefined;
  const subId = acc?.stripe_subscription_id as string | undefined;
  if (!customerId) return NextResponse.json({ card: null });

  const stripe = getStripe();

  try {
    // Try customer default payment method first
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ['invoice_settings.default_payment_method'],
    } as any);
    // @ts-ignore
    const dpm = (customer as any)?.invoice_settings?.default_payment_method;
    if (dpm && dpm.card) {
      return NextResponse.json({
        card: {
          brand: dpm.card.brand,
          last4: dpm.card.last4,
          exp_month: dpm.card.exp_month,
          exp_year: dpm.card.exp_year,
        }
      });
    }
  } catch {}

  try {
    // Fallback: if subscription has a default payment method
    if (subId) {
      const sub = await stripe.subscriptions.retrieve(subId);
      const pmId = (sub as any)?.default_payment_method as string | undefined;
      if (pmId) {
        const pm = await stripe.paymentMethods.retrieve(pmId);
        // @ts-ignore
        const card = (pm as any)?.card;
        if (card) {
          return NextResponse.json({ card: {
            brand: card.brand,
            last4: card.last4,
            exp_month: card.exp_month,
            exp_year: card.exp_year,
          }});
        }
      }
    }
  } catch {}

  try {
    // Last resort: list any card for this customer
    const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
    const pm = list.data?.[0] as any;
    if (pm?.card) {
      return NextResponse.json({ card: {
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
      }});
    }
  } catch {}

  return NextResponse.json({ card: null });
}

