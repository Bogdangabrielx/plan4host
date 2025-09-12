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
  if ((mode.data as string | null) === "billing_only") redirect("/app/subscription");

  // Cine e userul în cadrul contului (rol + stare)?
  const { data: au } = await supa
    .from("account_users")
    .select("account_id, role, disabled")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const m = (au ?? [])[0] as any;
  if (!m || m.disabled) redirect("/app");

  // Acceptăm noua schemă: admin/editor/viewer (fallback: owner)
  const role: string = (m.role as string) || "viewer";
  const isAdminLike = role === "admin" || role === "owner";
  if (!isAdminLike) redirect("/app");

  // Team e disponibil pe Premium
  const accountId = (m?.account_id as string) || user.id;
  const plan = await supa.rpc("account_effective_plan_slug", { p_account_id: accountId });
  if ((plan.data as string | null)?.toLowerCase?.() !== "premium") redirect("/app/subscription");

  return (
    <AppShell currentPath="/app/team" title="Team">
      <TeamClient />
    </AppShell>
  );
}