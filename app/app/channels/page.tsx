// app/app/channels/page.tsx
import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChannelsClient from "./ui/ChannelsClient";
import { ensureScope } from "@/lib/auth/scopes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ChannelsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const mode = await supabase.rpc("account_access_mode");
  if ((mode.data as string | null) === 'billing_only') redirect('/app/subscription');
  await ensureScope("channels", supabase, user.id);

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
    <AppShell currentPath="/app/channels" title="Channels & iCal">
      <ChannelsClient initialProperties={properties} />
    </AppShell>
  );
}
