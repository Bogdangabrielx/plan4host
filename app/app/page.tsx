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

  // Redirect sub-users fără 'dashboard' către prima secțiune permisă
  const { data: acc } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!acc) {
    const { data: au } = await supabase
      .from("account_users")
      .select("role,scopes,disabled")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const m = (au ?? [])[0] as any;
    if (m && !m.disabled && m.role !== "admin") {
      const scopes: string[] = (m.scopes as string[] | null) ?? [];
      if (!scopes.includes("dashboard")) {
        const order = ["cleaning", "inbox", "calendar", "channels", "Property Setup"];
        const first = order.find((s) => scopes.includes(s));
        if (first) {
          const path =
            first === "cleaning" ? "/app/cleaning"
            : first === "inbox" ? "/app/guest" // 🔁 Inbox → Guest Overview
            : first === "calendar" ? "/app/calendar"
            : first === "channels" ? "/app/channels"
            : "/app/propertySetup";
          redirect(path);
        }
      }
    }
  }

  const { data: properties = [] } = await supabase
    .from("properties")
    .select("id,name,country_code,timezone,check_in_time,check_out_time")
    .order("created_at", { ascending: true });

  return (
    <AppShell currentPath="/app" title="Dashboard">
      <DashboardClient initialProperties={properties as any[]} />
    </AppShell>
  );
}
