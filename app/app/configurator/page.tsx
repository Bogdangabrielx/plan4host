import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfiguratorClient from "./ui/ConfiguratorClient";

export default async function ConfiguratorPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: props = [] } = await supabase
    .from("properties")
    .select("id,name,check_in_time,check_out_time")
    .order("created_at", { ascending: true });

  const properties = (props ?? []).map((p: any) => ({
    id: p.id as string,
    name: p.name as string,
    check_in_time: p.check_in_time ?? null,
    check_out_time: p.check_out_time ?? null,
  }));

  return (
    <AppShell currentPath="/app/configurator" initialTitle="Configurator">
      <ConfiguratorClient initialProperties={properties} />
    </AppShell>
  );
}
