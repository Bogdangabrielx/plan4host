import AppShell from "./_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./ui/DashboardClient";


export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: properties = [] } = await supabase
    .from("properties")
    .select("id,name,country_code,timezone,check_in_time,check_out_time")
    .order("created_at", { ascending: true });

  return (
    <AppShell title="Dashboard">
      <DashboardClient initialProperties={properties as any[]} />
    </AppShell>
  );
}
