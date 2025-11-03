// app/api/billing/schedule/clear/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export async function POST() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Cancel Stripe schedule if present
  try {
    // Resolve current account id
    let accountId: string | null = null;
    try {
      const self = await supabase.rpc('_account_self_with_boundary');
      const row = Array.isArray(self.data) ? self.data[0] : null;
      accountId = (row as any)?.account_id || null;
    } catch {}
    if (!accountId) accountId = auth.user.id;

    const { data: acc } = await supabase
      .from('accounts')
      .select('stripe_schedule_id')
      .eq('id', accountId)
      .maybeSingle();
    const sched = (acc as any)?.stripe_schedule_id as string | undefined;
    if (sched) {
      try { await getStripe().subscriptionSchedules.cancel(sched as any); } catch {}
      try { await supabase.from('accounts').update({ stripe_schedule_id: null }).eq('id', accountId as any); } catch {}
    }
  } catch {}
  const { error } = await supabase.rpc("account_clear_scheduled_plan_self");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
