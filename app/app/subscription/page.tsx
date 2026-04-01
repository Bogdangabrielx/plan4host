// app/app/subscription/page.tsx
import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubscriptionClient from "./ui/SubscriptionClient";
import { resolveTeamAccountContext } from "@/lib/auth/team-account";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SubscriptionPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const ctx = await resolveTeamAccountContext(supabase as any, String(user.id));
  if (!ctx.ownAccountId || ctx.accountId !== ctx.ownAccountId || (ctx.membership && ctx.membership.role !== "admin")) {
    redirect("/app");
  }

  // Load current plan details and available billing plans
  const { data: acc } = await supabase
    .from("accounts")
    .select("id, plan, valid_until, trial_used")
    .eq("id", ctx.ownAccountId)
    .maybeSingle();

  const { data: plans } = await supabase
    .from("billing_plans")
    .select("slug,name,description,max_properties,max_rooms_per_property,sync_interval_minutes,allow_sync_now,features")
    .order("slug", { ascending: true });

  return (
    <AppShell currentPath="/app/subscription" title="Subscription">
      <SubscriptionClient initialAccount={acc as any} initialPlans={(plans ?? []) as any[]} />
    </AppShell>
  );
}
