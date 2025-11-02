// app/api/billing/status/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account, error } = await supabase
    .from("accounts")
    .select("plan, valid_until, trial_ends_at, current_period_start, current_period_end, cancel_at_period_end, pending_plan, pending_effective_at, status, stripe_customer_id")
    .eq("id", uid)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: profile } = await supabase
    .from("account_billing_profiles")
    .select("buyer_type")
    .eq("account_id", uid)
    .maybeSingle();

  return NextResponse.json({ account: account ?? null, buyer_type: profile?.buyer_type ?? null });
}
