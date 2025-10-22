import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckinEditorClient from "./ui/CheckinEditorClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CheckinEditorPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Block app access when billing is required; allow only Subscription page
  const mode = await supabase.rpc("account_access_mode");
  if ((mode.data as string | null) === "billing_only") redirect("/app/subscription");

  // Load properties for selector
  let properties: Array<{ id: string; name: string }> = [];
  try {
    const { data } = await supabase
      .from("properties")
      .select("id,name")
      .order("created_at", { ascending: true });
    properties = (data ?? []) as any[];
  } catch {}

  return (
    <AppShell currentPath="/app/checkinEditor" title="Check-in Editor">
      <CheckinEditorClient initialProperties={properties} />
    </AppShell>
  );
}
