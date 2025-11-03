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

        // Capture any previous subscription id before updating
        let oldSubId: string | undefined;
        try {
          const { data: prev } = await supabase
            .from('accounts')
            .select('stripe_subscription_id')
            .eq('id', accountId as any)
            .maybeSingle();
          oldSubId = prev?.stripe_subscription_id as string | undefined;
        } catch {}

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

        // Variant B: cancel previous subscription immediately (no refund/proration)
        try {
          if (oldSubId && oldSubId !== subscriptionId) {
            await stripe.subscriptions.cancel(oldSubId);
          }
        } catch {}
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
        const cps = toISO(sub.current_period_start ?? sub?.items?.data?.[0]?.current_period_start ?? null);
        const cpe = toISO(sub.current_period_end ?? sub?.items?.data?.[0]?.current_period_end ?? null);
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
        const cps = toISO(sub.current_period_start ?? sub?.items?.data?.[0]?.current_period_start ?? null);
        const cpe = toISO(sub.current_period_end ?? sub?.items?.data?.[0]?.current_period_end ?? null);
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
        const subId: string | undefined = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id;
        let cps: string | null = null;
        let cpe: string | null = null;
        let cancelAtPeriodEnd = false;
        if (subId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subId);
            cps = toISO((sub as any).current_period_start ?? (sub as any)?.items?.data?.[0]?.current_period_start ?? null);
            cpe = toISO((sub as any).current_period_end ?? (sub as any)?.items?.data?.[0]?.current_period_end ?? null);
            cancelAtPeriodEnd = !!sub.cancel_at_period_end;
          } catch {}
        }
        // Fallback to invoice line period if subscription fetch failed
        if (!cpe && inv?.lines?.data?.[0]?.period?.end) {
          cpe = toISO(inv.lines.data[0].period.end);
        }
        const updatePayload: any = { status: 'active' };
        if (cps) updatePayload.current_period_start = cps;
        if (cpe) updatePayload.current_period_end = cpe, updatePayload.valid_until = cpe;
        updatePayload.cancel_at_period_end = cancelAtPeriodEnd;

        // Prefer match by subscription id when available, else by customer id
        let updated = null as any;
        if (subId) {
          const res = await supabase.from("accounts").update(updatePayload).eq("stripe_subscription_id", subId as any).select("id").maybeSingle();
          updated = res?.data;
        }
        if (!updated) {
          await supabase.from("accounts").update(updatePayload).eq("stripe_customer_id", customerId as any);
        }

        // ---- Persist invoice snapshot (transaction log) ----
        try {
          // Resolve account id from customer
          const { data: accRow } = await supabase
            .from('accounts')
            .select('id')
            .eq('stripe_customer_id', customerId as any)
            .maybeSingle();
          const accountId = accRow?.id as string | undefined;
          if (accountId) {
            // Determine billed price/plan (prefer non-proration line)
            let priceId: string | null = null;
            try {
              const lines = Array.isArray(inv?.lines?.data) ? inv.lines.data : [];
              const nonProration = lines.find((l: any) => !!l?.price && !l?.proration);
              const lineWithPrice = nonProration || lines.find((l: any) => !!l?.price);
              const p = lineWithPrice?.price;
              priceId = typeof p === 'string' ? p : p?.id || null;
            } catch {}
            if (!priceId && subId) {
              try {
                const sub = await stripe.subscriptions.retrieve(subId, { expand: ['items'] } as any);
                const item = (sub as any)?.items?.data?.[0];
                const p = item?.price;
                priceId = typeof p === 'string' ? p : p?.id || null;
              } catch {}
            }

            const planSlug = getPlanSlugForPriceId(priceId || undefined);
            const paymentIntentId: string | undefined = typeof inv.payment_intent === 'string' ? inv.payment_intent : inv.payment_intent?.id;

            // Optionally fetch charge id for audit
            let chargeId: string | undefined;
            try {
              if (paymentIntentId) {
                const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
                const ch = (pi as any)?.latest_charge;
                chargeId = typeof ch === 'string' ? ch : ch?.id;
              }
            } catch {}

            const customerTaxId = Array.isArray(inv?.customer_tax_ids) && inv.customer_tax_ids.length
              ? (inv.customer_tax_ids[0]?.value as string | undefined)
              : undefined;

            const row: any = {
              account_id: accountId,
              stripe_invoice_id: inv.id,
              stripe_payment_intent_id: paymentIntentId || null,
              stripe_charge_id: chargeId || null,
              stripe_customer_id: customerId || null,
              stripe_subscription_id: subId || null,
              number: inv.number || null,
              status: inv.status || 'paid',
              currency: inv.currency,
              subtotal: inv.subtotal ?? null,
              tax: inv.tax ?? null,
              total: inv.total ?? 0,
              price_id: priceId || null,
              plan_slug: planSlug || null,
              period_start: cps,
              period_end: cpe,
              hosted_invoice_url: inv.hosted_invoice_url || null,
              invoice_pdf_url: inv.invoice_pdf || null,
              customer_name: inv.customer_name || null,
              customer_email: inv.customer_email || null,
              customer_tax_id: customerTaxId || null,
              customer_address: inv.customer_address || null,
            };
            await supabase.from('billing_invoices').upsert(row as any, { onConflict: 'stripe_invoice_id' } as any);
          }
        } catch {}
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as any;
        const customerId: string | undefined = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
        await supabase.from("accounts").update({ status: 'past_due' }).eq("stripe_customer_id", customerId as any);
        // Also log failed invoice for traceability
        try {
          const { data: accRow } = await supabase
            .from('accounts')
            .select('id')
            .eq('stripe_customer_id', customerId as any)
            .maybeSingle();
          const accountId = accRow?.id as string | undefined;
          if (accountId) {
            const paymentIntentId: string | undefined = typeof inv.payment_intent === 'string' ? inv.payment_intent : inv.payment_intent?.id;
            const row: any = {
              account_id: accountId,
              stripe_invoice_id: inv.id,
              stripe_payment_intent_id: paymentIntentId || null,
              stripe_customer_id: customerId || null,
              stripe_subscription_id: (typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id) || null,
              number: inv.number || null,
              status: inv.status || 'failed',
              currency: inv.currency,
              subtotal: inv.subtotal ?? null,
              tax: inv.tax ?? null,
              total: inv.total ?? 0,
              period_end: (inv?.lines?.data?.[0]?.period?.end ? toISO(inv.lines.data[0].period.end) : null),
              hosted_invoice_url: inv.hosted_invoice_url || null,
              invoice_pdf_url: inv.invoice_pdf || null,
              customer_name: inv.customer_name || null,
              customer_email: inv.customer_email || null,
              customer_address: inv.customer_address || null,
            };
            await supabase.from('billing_invoices').upsert(row as any, { onConflict: 'stripe_invoice_id' } as any);
          }
        } catch {}
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
