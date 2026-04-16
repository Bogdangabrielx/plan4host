import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { redirectForBillingOnly } from "@/lib/billing/access";
import { cookies } from "next/headers";
import CheckinEditorClient from "./ui/CheckinEditorClient";
import { ensureScope } from "@/lib/auth/scopes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CheckinEditorPage() {
  const cookieStore = cookies();
  const uiLang = cookieStore.get("app_lang")?.value === "ro" ? "ro" : "en";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Block app access when billing is required; allow only Subscription page
  await redirectForBillingOnly(supabase, user.id);
  await ensureScope("property_setup", supabase, user.id);

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
    <AppShell currentPath="/app/checkinEditor" title={uiLang === "ro" ? "Editor check-in" : "Check-in Editor"}>
      <CheckinEditorClient initialProperties={properties} />
    </AppShell>
  );
}
