// app/app/propertySetup/page.tsx
import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureScope } from "@/lib/auth/scopes";
import propertySetupClient from "./ui/PropertySetupClient";
import PropertySetupClient from "./ui/PropertySetupClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function propertySetupPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const mode = await supabase.rpc("account_access_mode");
  if ((mode.data as string | null) === 'billing_only') redirect('/app/subscription');
  await ensureScope("propertySetup", supabase, user.id);

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
    <AppShell currentPath="/app/properySetup" title="Property Setup">
      <PropertySetupClient initialProperties={properties} />
    </AppShell>
  );
}
