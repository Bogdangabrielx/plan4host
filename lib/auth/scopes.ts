import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Me = { role: string; scopes: string[]; disabled?: boolean };

export async function ensureScope(scope: string) {
  const supa = createClient();
  const { data: auth } = await supa.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/auth/login");

  // resolve membership first
  const { data: au } = await supa
    .from("account_users")
    .select("account_id, role, scopes, disabled")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  const m = (au ?? [])[0] as Me | undefined;

  // owners/managers get full access
  if (!m) return; // owner of own account
  if (m.disabled) redirect("/auth/logout");
  if (m.role === "owner" || m.role === "manager") return;

  const scopes = (m.scopes ?? []) as string[];
  if (scopes.includes(scope)) return;

  // redirect to first allowed section
  const order = ["cleaning","inbox","calendar","channels","configurator"]; // dashboard requires explicit scope
  const first = order.find((s) => scopes.includes(s));
  if (first) {
    const path = first === 'cleaning' ? '/app/cleaning'
      : first === 'inbox' ? '/app/inbox'
      : first === 'calendar' ? '/app/calendar'
      : first === 'channels' ? '/app/channels'
      : '/app/configurator';
    redirect(path);
  }
  redirect("/app");
}

