import { redirect } from "next/navigation";
import { resolveTeamAccountContext } from "@/lib/auth/team-account";

export async function redirectForBillingOnly(supabase: any, userId: string) {
  const mode = await supabase.rpc("account_access_mode");
  if ((mode.data as string | null) !== "billing_only") return;

  const ctx = await resolveTeamAccountContext(supabase as any, userId);
  const isOwnAccount = !!ctx.ownAccountId && ctx.accountId === ctx.ownAccountId;
  const role = ctx.membership?.role ?? (isOwnAccount ? "admin" : null);
  const canManageBilling = isOwnAccount && role === "admin";

  redirect(canManageBilling ? "/app/subscription" : "/app/account-paused");
}
