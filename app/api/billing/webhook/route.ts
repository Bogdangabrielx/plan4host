// app/api/billing/webhook/route.ts
import { NextResponse } from "next/server";
import { getStripe, getPlanSlugForPriceId } from "@/lib/stripe/server";
import { getServiceSupabase } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toISO(sec?: number | null) {
  return sec ? new Date(sec * 1000).toISOString() : null;
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const rawBody = await req.text();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err?.message}` }, { status: 400 });
  }

  const supabase = getServiceSupabase() as any;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const accountId: string | undefined = session.client_reference_id || session.metadata?.account_id;
        const customerId: string | undefined = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscriptionId: string | undefined = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        const planSlug: string | undefined = session.metadata?.plan_slug;
        if (!accountId || !subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const cps = toISO(sub.current_period_start);
        const cpe = toISO(sub.current_period_end);

        const update: any = {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: sub.status,
          current_period_start: cps,
          current_period_end: cpe,
          cancel_at_period_end: sub.cancel_at_period_end || false,
          valid_until: cpe, // keeps existing gating compatible
        };
        const p = String(planSlug || "").toLowerCase();
        if (p && ["basic","standard","premium"].includes(p)) update.plan = p;

        await supabase.from("accounts").update(update).eq("id", accountId as any);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        const customerId: string | undefined = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        // Resolve account by customer id
        const { data: acc } = await supabase
          .from("accounts")
          .select("id, plan, pending_plan, pending_effective_at")
          .eq("stripe_customer_id", customerId as any)
          .maybeSingle();
        if (!acc) break;
        const cps = toISO(sub.current_period_start);
        const cpe = toISO(sub.current_period_end);
        const updatePayload: any = {
          stripe_subscription_id: sub.id,
          status: sub.status,
          current_period_start: cps,
          current_period_end: cpe,
          cancel_at_period_end: sub.cancel_at_period_end || false,
          valid_until: cpe,
        };

        // Try to map Stripe price → plan slug
        try {
          const item = sub?.items?.data?.[0];
          const priceId = typeof item?.price === 'string' ? item?.price : item?.price?.id;
          const mapped = getPlanSlugForPriceId(priceId);
          if (mapped) {
            updatePayload.plan = mapped;
            // Clear pending if plan is now applied
            updatePayload.pending_plan = null;
            updatePayload.pending_effective_at = null;
          }
        } catch {}

        await supabase.from("accounts").update(updatePayload).eq("id", acc.id);

        // Apply pending plan if boundary reached
        if (acc.pending_plan && acc.pending_effective_at) {
          const now = Date.now();
          const eff = Date.parse(acc.pending_effective_at);
          if (Number.isFinite(eff) && eff <= now) {
            await supabase.from("accounts").update({
              plan: acc.pending_plan,
              pending_plan: null,
              pending_effective_at: null,
            }).eq("id", acc.id);
          }
        }
        break;
      }
      case "customer.subscription.created": {
        const sub = event.data.object as any;
        const customerId: string | undefined = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        // Resolve account by customer id
        const { data: acc } = await supabase
          .from("accounts")
          .select("id")
          .eq("stripe_customer_id", customerId as any)
          .maybeSingle();
        if (!acc) break;
        const cps = toISO(sub.current_period_start);
        const cpe = toISO(sub.current_period_end);
        const item = sub?.items?.data?.[0];
        const priceId = typeof item?.price === 'string' ? item?.price : item?.price?.id;
        const mapped = getPlanSlugForPriceId(priceId);
        await supabase.from("accounts").update({
          stripe_subscription_id: sub.id,
          status: sub.status,
          current_period_start: cps,
          current_period_end: cpe,
          cancel_at_period_end: sub.cancel_at_period_end || false,
          valid_until: cpe,
          plan: mapped ?? undefined,
          pending_plan: null,
          pending_effective_at: null,
        }).eq("id", acc.id);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const customerId: string | undefined = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        await supabase.from("accounts").update({ status: 'canceled' }).eq("stripe_customer_id", customerId as any);
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const inv = event.data.object as any;
        const customerId: string | undefined = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
        await supabase.from("accounts").update({ status: 'active' }).eq("stripe_customer_id", customerId as any);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as any;
        const customerId: string | undefined = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
        await supabase.from("accounts").update({ status: 'past_due' }).eq("stripe_customer_id", customerId as any);
        break;
      }
      default:
        // Ignore other events for now
        break;
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Webhook error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
