// app/app/team/page.tsx
import AppShell from "@/app/app/_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeamClient from "./ui/TeamClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamPage() {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/auth/login");
  const mode = await supa.rpc("account_access_mode");
  if ((mode.data as string | null) === 'billing_only') redirect('/app/subscription');
  const mode = await supa.rpc("account_access_mode");
  if ((mode.data as string | null) === 'billing_only') redirect('/app/subscription');

  // Owner or manager required; otherwise redirect to app
  const { data: au } = await supa
    .from("account_users")
    .select("role, disabled")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  const m = (au ?? [])[0] as any;
  const role = m?.role || (user ? "owner" : "member");
  if (m?.disabled || (role !== "owner" && role !== "manager")) redirect("/app");

  // Plan must be Premium
  const accountId = m?.account_id || user.id;
  const plan = await supa.rpc("account_effective_plan_slug", { p_account_id: accountId });
  if ((plan.data as string | null)?.toLowerCase?.() !== 'premium') redirect('/app');

  return (
    <AppShell currentPath="/app/team" title="Team">
      <TeamClient />
    </AppShell>
  );
}
