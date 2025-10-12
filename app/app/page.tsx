import AppShell from "./_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./ui/DashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Billing-only guard: admin can access Subscription only
  const mode = await supabase.rpc("account_access_mode");
  if ((mode.data as string | null) === "billing_only") {
    redirect("/app/subscription");
  }

  // Redirect root "/app" to Calendar for all authenticated users
  redirect("/app/calendar");

  // Unreachable: kept for reference if redirect is removed later
  // return (
  //   <AppShell currentPath="/app" title="Dashboard">
  //     <DashboardClient initialProperties={[]} />
  //   </AppShell>
  // );
}
