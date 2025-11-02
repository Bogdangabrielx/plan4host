// app/api/billing/checkout/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getPriceIdForPlan } from "@/lib/stripe/server";

function getBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  try { return new URL(req.url).origin; } catch { return "http://localhost:3000"; }
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const plan = String(body?.plan || "").toLowerCase();
  if (!["basic","standard","premium"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const priceId = getPriceIdForPlan(plan);
  if (!priceId) return NextResponse.json({ error: `Missing price for plan ${plan}` }, { status: 400 });

  // Load billing profile to prefill customer
  const { data: profile } = await supabase
    .from("account_billing_profiles")
    .select("*")
    .eq("account_id", uid)
    .maybeSingle();

  const { data: accountRow } = await supabase
    .from("accounts")
    .select("stripe_customer_id")
    .eq("id", uid)
    .maybeSingle();

  const stripe = getStripe();
  let customerId = accountRow?.stripe_customer_id as string | undefined;

  // Prepare customer data
  const name = profile?.buyer_type === 'b2b' ? (profile as any)?.legal_name : (profile as any)?.full_name;
  const address: any = {
    line1: (profile as any)?.street || undefined,
    city: (profile as any)?.city || undefined,
    state: (profile as any)?.county || undefined,
    postal_code: (profile as any)?.postal_code || undefined,
    country: (profile as any)?.country || 'RO',
  };
  if (!address.line1 && !address.city && !address.state && !address.postal_code) delete address.line1;

  if (customerId) {
    try {
      await stripe.customers.update(customerId, {
        name: name || undefined,
        email: (profile as any)?.email || undefined,
        phone: (profile as any)?.phone || undefined,
        address,
        metadata: { account_id: uid },
      });
    } catch { /* ignore update errors for now */ }
  } else {
    const customer = await stripe.customers.create({
      name: name || undefined,
      email: (profile as any)?.email || undefined,
      phone: (profile as any)?.phone || undefined,
      address,
      metadata: { account_id: uid },
    });
    customerId = customer.id;
    // Best-effort save on account
    try {
      await supabase.from("accounts").update({ stripe_customer_id: customerId }).eq("id", uid);
    } catch {}
  }

  const base = getBaseUrl(req);
  const success_url = `${base}/app/subscription?plan=${plan}&hl=1&success=1`;
  const cancel_url = `${base}/app/subscription?plan=${plan}&hl=1&canceled=1`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: customerId,
    client_reference_id: uid,
    metadata: { account_id: uid, plan_slug: plan },
    billing_address_collection: "auto",
    customer_update: { name: "auto", address: "auto" },
    phone_number_collection: { enabled: true },
    tax_id_collection: { enabled: true },
    success_url,
    cancel_url,
  });

  return NextResponse.json({ url: session.url });
}
