import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReservationMessageClient from "./ui/ReservationMessageClient";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReservationMessagePage() {
  type GuestContentLang = "ro" | "el" | "fr" | "de" | "it" | "pt" | "es";
  const cookieStore = cookies();
  const uiLang = cookieStore.get("app_lang")?.value === "ro" ? "ro" : "en";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Billing-only guard: redirect to Subscription if plan is not active
  const mode = await supabase.rpc("account_access_mode");
  if ((mode.data as string | null) === "billing_only") redirect("/app/subscription");

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
  let properties: Array<{
    id: string;
    name: string;
    guest_secondary_language?: "ro" | "el" | "fr" | "de" | "it" | "pt" | "es" | null;
  }> = [];
  const allowedGuestLangs = new Set<GuestContentLang>(["ro", "el", "fr", "de", "it", "pt", "es"]);
  try {
    const { data } = await supabase
      .from("properties")
      .select("id,name,guest_secondary_language")
      .order("created_at", { ascending: true });
    properties = (data ?? []).map((row: any) => ({
      id: String(row.id),
      name: String(row.name || ""),
      guest_secondary_language: allowedGuestLangs.has(String(row.guest_secondary_language || "") as GuestContentLang)
        ? (String(row.guest_secondary_language) as GuestContentLang)
        : "ro",
    }));
  } catch {}

  return (
    <AppShell currentPath="/app/reservationMessage" title={uiLang === "ro" ? "Mesaje automate" : "Automatic Messages"}>
      <ReservationMessageClient initialProperties={properties} isAdmin={isAdmin} initialLang={uiLang} />
    </AppShell>
  );
}
