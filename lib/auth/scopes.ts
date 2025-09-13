import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Me = { role: "admin" | "editor" | "viewer"; scopes: string[]; disabled?: boolean };

// Map legacy tokens -> new canonical tokens
const SCOPE_ALIAS: Record<string, string> = {
  // legacy -> new
  inbox: "guest_overview",
  reservations: "calendar",
  propertySetup: "property_setup",
};

function normalizeToken(token: string): string {
  return SCOPE_ALIAS[token] ?? token;
}

// Safer guard: reuse existing Supabase client + user id when provided, to avoid double getUser()
export async function ensureScope(scope: string, supa?: any, actorId?: string) {
  const client = supa ?? createClient();
  let uid = actorId;
  if (!uid) {
    const { data: auth } = await client.auth.getUser();
    const user = auth.user;
    if (!user) redirect("/auth/login");
    uid = user!.id as string;
  }

  // resolve membership first for this user id
  const { data: au } = await client
    .from("account_users")
    .select("account_id, role, scopes, disabled")
    .eq("user_id", uid)
    .order("created_at", { ascending: true });
  const m = (au ?? [])[0] as Me | undefined;

  // Admin of own account: full access
  if (!m) return; // admin (base account user)
  if (m.disabled) redirect("/auth/logout");
  if (m.role === "admin") return;

  const scopesRaw = (m.scopes ?? []) as string[];
  const scopes = new Set(scopesRaw.map(normalizeToken));
  const want = normalizeToken(scope);
  if (scopes.has(want)) return;

  // redirect to first allowed section
  const order = [
    "cleaning",
    "guest_overview",
    "calendar",
    "channels",
    "property_setup",
  ];
  const first = order.find((s) => scopes.has(s));
  if (first) {
    const path = first === 'cleaning' ? '/app/cleaning'
      : first === 'guest_overview' ? '/app/guest'
      : first === 'calendar' ? '/app/calendar'
      : first === 'channels' ? '/app/channels'
      : '/app/propertySetup';
    redirect(path);
  }
  redirect("/app");
}
