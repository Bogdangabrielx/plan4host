import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationsClient from "./ui/NotificationsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NotificationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const mode = await supabase.rpc("account_access_mode");
  if ((mode.data as string | null) === "billing_only") redirect("/app/subscription");

  const { data: props = [] } = await supabase
    .from("properties")
    .select("id,name")
    .order("created_at", { ascending: true });

  const properties = (props ?? []).map((p: any) => ({
    id: p.id as string,
    name: p.name as string,
  }));

  return (
    <AppShell currentPath="/app/notifications" title="Notifications">
      <NotificationsClient properties={properties} />
    </AppShell>
  );
}
