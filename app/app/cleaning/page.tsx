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
  const mode = await supabase.rpc("account_access_mode");
  if ((mode.data as string | null) === 'billing_only') redirect('/app/subscription');
  await ensureScope("cleaning", supabase, user.id);

  // Plan gating: on Basic do not fetch any property data, show upgrade prompt in client
  const planRes = await supabase.rpc("account_current_plan");
  const plan = (planRes.data as string | null)?.toLowerCase?.() ?? null;

  let properties: { id: string; name: string; check_in_time: string | null; check_out_time: string | null }[] = [];
  if (plan && plan !== 'basic') {
    const { data: props = [] } = await supabase
      .from("properties")
      .select("id,name,check_in_time,check_out_time")
      .order("created_at", { ascending: true });
    properties = (props ?? []).map((p: any) => ({
      id: p.id as string,
      name: p.name as string,
      check_in_time: p.check_in_time ?? null,
      check_out_time: p.check_out_time ?? null,
    }));
  }

  return (
    <AppShell currentPath="/app/cleaning" title="Cleaning Board">
      <CleaningClient initialProperties={properties} />
    </AppShell>
  );
}
