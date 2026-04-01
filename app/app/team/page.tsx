// app/app/team/page.tsx
import AppShell from "@/app/app/_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeamClient from "./ui/TeamClient";
import { cookies } from "next/headers";
import { resolveTeamAccountContext } from "@/lib/auth/team-account";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamPage() {
  const cookieStore = cookies();
  const uiLang = cookieStore.get("app_lang")?.value === "ro" ? "ro" : "en";
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/auth/login");

  // dacă e doar billing, nu lăsăm acces la team
  const mode = await supa.rpc("account_access_mode");
  if ((mode.data as string | null) === "billing_only") redirect("/app/subscription");

  const ctx = await resolveTeamAccountContext(supa as any, String(user.id));
  if (!ctx.membership || ctx.membership.role !== "admin") redirect("/app");

  // Team e disponibil doar pe plan Premium (citit direct din accounts.plan)
  const accountId = ctx.membership.account_id;
  const { data: acc } = await supa
    .from("accounts")
    .select("plan")
    .eq("id", accountId)
    .maybeSingle();
  const plan = (acc?.plan as string | null)?.toLowerCase?.() ?? "basic";
  if (plan !== "premium") redirect("/app/subscription");

  return (
    <AppShell currentPath="/app/team" title={uiLang === "ro" ? "Echipa" : "Team"}>
      <TeamClient />
    </AppShell>
  );
}
