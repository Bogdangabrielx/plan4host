import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReservationMessageClient from "./ui/ReservationMessageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReservationMessagePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Determine role: admin if user owns an account (id == user.id) or has admin role in membership
  let isAdmin = false;
  try {
    const { data: acc } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (acc?.id) isAdmin = true;
    if (!isAdmin) {
      const { data: au } = await supabase
        .from("account_users")
        .select("role,disabled")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      const row = (au ?? [])[0] as any;
      if (row && !row.disabled && row.role === "admin") isAdmin = true;
    }
  } catch {}

  // Load properties list for selector
  let properties: Array<{ id: string; name: string }> = [];
  try {
    const { data } = await supabase
      .from("properties")
      .select("id,name")
      .order("created_at", { ascending: true });
    properties = (data ?? []) as any[];
  } catch {}

  return (
    <AppShell currentPath="/app/reservationMessage" title="Automatic Messages">
      <ReservationMessageClient initialProperties={properties} isAdmin={isAdmin} />
    </AppShell>
  );
}
