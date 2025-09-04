// app/app/cleaning/page.tsx
import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CleaningClient from "./ui/CleaningClient";
import { ensureScope } from "@/lib/auth/scopes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CleaningPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  await ensureScope("cleaning", supabase, user.id);

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
    <AppShell currentPath="/app/cleaning" title="Cleaning Board">
      <CleaningClient initialProperties={properties} />
    </AppShell>
  );
}
