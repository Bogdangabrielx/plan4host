import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureScope } from "@/lib/auth/scopes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppEntryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Billing-only guard: admin can access Subscription only
  const mode = await supabase.rpc("account_access_mode");
  if ((mode.data as string | null) === "billing_only") {
    redirect("/app/subscription");
  }

  // If user has no properties yet, land on Dashboard (onboarding)
  try {
    const { data: props } = await supabase.from("properties").select("id").limit(1);
    if (!props || props.length === 0) redirect("/app/dashboard");
  } catch {
    redirect("/app/dashboard");
  }

  // Default landing for logged-in users is Calendar; sub-users without scope will be redirected by ensureScope.
  await ensureScope("calendar", supabase, user.id);
  redirect("/app/calendar");
}
