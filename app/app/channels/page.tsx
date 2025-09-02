import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChannelsClient from "./ui/ChannelsClient";
import TitleSetter from "./ui/TitleSetter";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function ChannelsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: props = [] } = await supabase
    .from("properties")
    .select("id,name,timezone")
    .order("created_at", { ascending: true });

  const properties = (props ?? []).map((p: any) => ({
    id: p.id as string,
    name: p.name as string,
    timezone: p.timezone ?? null,
  }));

  return (
    <AppShell currentPath="/app/channels">
      {/* Setează titlul în header */}
      <TitleSetter />
      <ChannelsClient initialProperties={properties} />
    </AppShell>
  );
}


