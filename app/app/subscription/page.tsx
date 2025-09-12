// app/app/subscription/page.tsx
import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubscriptionClient from "./ui/SubscriptionClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SubscriptionPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Admin-only access: if user is member of another account (not their own), redirect back
  const { data: au } = await supabase
    .from("account_users")
    .select("account_id, role, disabled")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  const m = (au ?? [])[0] as any;
  if (m && m.account_id !== user.id) {
    redirect('/app');
  }

  // Load current plan details and available billing plans
  const { data: acc } = await supabase
    .from("accounts")
    .select("id, plan, valid_until, trial_used")
    .eq("id", user.id)
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
