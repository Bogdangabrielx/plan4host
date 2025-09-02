import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InboxClient from "./ui/InboxClient";

export default async function InboxPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: props = [] } = await supabase
    .from("properties")
    .select("id,name")
    .order("created_at", { ascending: true });

  const properties = (props ?? []).map((p: any) => ({
    id: p.id as string,
    name: p.name as string,
  }));

  return (
    <AppShell currentPath="/app/inbox" initialTitle="Inbox">
      <InboxClient initialProperties={properties} />
    </AppShell>
  );
}
