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

  // dacă e doar billing, nu lăsăm acces la team
  const mode = await supa.rpc("account_access_mode");
  if ((mode.data as string | null) === "billing_only") redirect("/app/subscription");

  // rolul userului în cont
  const { data: au } = await supa
    .from("account_users")
    .select("account_id, role, disabled")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const m = (au ?? [])[0] as { account_id: string; role: string; disabled: boolean } | undefined;
  if (!m || m.disabled) redirect("/app");

  // doar ADMIN poate gestiona echipa
  if (m.role !== "admin") redirect("/app");

  // Team e disponibil doar pe plan Premium
  const accountId = m.account_id;
  const plan = await supa.rpc("account_effective_plan_slug", { p_account_id: accountId });
  if ((plan.data as string | null)?.toLowerCase?.() !== "premium") {
    redirect("/app/subscription");
  }

  return (
    <AppShell currentPath="/app/team" title="Team">
      <TeamClient />
    </AppShell>
  );
}