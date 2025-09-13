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

  // preferăm rândul unde utilizatorul este admin, dacă există
  let membership = m;
  const adminRow = (au ?? []).find((row: any) => row.role === "admin" && !row.disabled);
  if (adminRow) membership = adminRow as any;

  if (membership.role !== "admin") redirect("/app");

  // Team e disponibil doar pe plan Premium (citit direct din accounts.plan)
  const accountId = membership.account_id;
  const { data: acc } = await supa
    .from("accounts")
    .select("plan")
    .eq("id", accountId)
    .maybeSingle();
  const plan = (acc?.plan as string | null)?.toLowerCase?.() ?? "basic";
  if (plan !== "premium") redirect("/app/subscription");

  return (
    <AppShell currentPath="/app/team" title="Team">
      <TeamClient />
    </AppShell>
  );
}
