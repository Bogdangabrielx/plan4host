// app/api/billing/portal/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

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

  const { data: acc, error } = await supabase
    .from('accounts')
    .select('stripe_customer_id')
    .eq('id', uid)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const customerId = acc?.stripe_customer_id as string | undefined;
  if (!customerId) {
    return NextResponse.json({ error: 'No Stripe customer available for this account.' }, { status: 400 });
  }

  const stripe = getStripe();
  const return_url = `${getBaseUrl(req)}/app/subscription`;
  const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url });
  return NextResponse.json({ url: session.url });
}

