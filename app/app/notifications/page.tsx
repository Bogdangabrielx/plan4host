import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { redirectForBillingOnly } from "@/lib/billing/access";
import NotificationsClient from "./ui/NotificationsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NotificationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await redirectForBillingOnly(supabase, user.id);

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
