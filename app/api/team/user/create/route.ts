 // app/api/team/user/create/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

// Canonical scope tokens (DB):
//  - calendar, guest_overview, property_setup, cleaning, channels, notifications
const CANON = new Set(["calendar","guest_overview","property_setup","cleaning","channels","notifications"]);
const ALIASES: Record<string, string> = {
  inbox: "guest_overview",
  reservations: "calendar",
  propertySetup: "property_setup",
  notification: "notifications",
};
const normalize = (s: string) => ALIASES[s] ?? s;
const sanitizeScopes = (arr: any): string[] => {
  const input = Array.isArray(arr) ? arr : [];
  const out = new Set<string>();
  for (const x of input) {
    if (typeof x !== 'string') continue;
    const k = normalize(x);
    if (CANON.has(k)) out.add(k);
  }
  return Array.from(out);
};

export async function POST(req: Request) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const actor = auth.user;
    if (!actor) return bad(401, { error: "Not authenticated" });

    const body = await req.json().catch(() => ({}));
    const email: string | undefined = body?.email?.trim();
    const password: string | undefined = body?.password;
    const role: "editor" | "viewer" = (body?.role || "editor").toLowerCase();
    const scopes: string[] = sanitizeScopes(body?.scopes);

    if (!email || !password) return bad(400, { error: "Email and password are required" });
    if (!/^(editor|viewer)$/.test(role)) return bad(400, { error: "Invalid role" });

    // determină account + cere ca actorul să fie admin al contului
    let accountId: string | null = null;
    const { data: accSelf } = await supa.from("accounts").select("id").eq("id", actor.id).maybeSingle();
    if (accSelf?.id) {
      accountId = accSelf.id as string;
      // verifică actorul e admin în contul lui (ar trebui să existe rând admin în account_users)
      const { data: me } = await supa
        .from("account_users")
        .select("role, disabled")
        .eq("account_id", accountId)
        .eq("user_id", actor.id)
        .maybeSingle();
      if (!me || me.disabled || me.role !== "admin") return bad(403, { error: "Only admin can create users" });
      // plan gating: Premium only (direct from accounts.plan)
      const { data: accPlan } = await supa.from("accounts").select("plan").eq("id", accountId).maybeSingle();
      const plan = (accPlan?.plan as string | null)?.toLowerCase?.() ?? "basic";
      if (plan !== "premium") return bad(403, { error: "Team is available on Premium plan only" });
    } else {
      const { data: au } = await supa
        .from("account_users")
        .select("account_id, role, disabled")
        .eq("user_id", actor.id)
        .order("created_at", { ascending: true })
        .limit(1);
      const row = au?.[0] as any;
      if (!row || row.disabled || row.role !== "admin") return bad(403, { error: "Only admin can create users" });
      accountId = row.account_id as string;

      const { data: accPlan } = await supa.from("accounts").select("plan").eq("id", accountId).maybeSingle();
      const plan = (accPlan?.plan as string | null)?.toLowerCase?.() ?? "basic";
      if (plan !== "premium") return bad(403, { error: "Team is available on Premium plan only" });
    }

    // creează utilizator auth
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createAdmin(url, serviceKey, { auth: { persistSession: false } });

    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      // Marcăm contul ca sub-user, pentru a evita bootstrap de tenant în triggerul DB
      app_metadata: { disabled: false, sub_user: true, parent_account_id: accountId },
      user_metadata: { sub_user: true, parent_account_id: accountId },
    });
    if (created.error) return bad(400, { error: created.error.message });

    const newUserId = created.data.user?.id as string;
    if (!newUserId) return bad(500, { error: "Failed to create user" });

    // atașează membership (role = editor|viewer; niciodată admin din UI)
    // ensure default notifications scope
    const finalScopes = Array.from(new Set([...(scopes || []), 'notifications']));

    const ins = await admin
      .from("account_users")
      .upsert({ account_id: accountId!, user_id: newUserId, role, scopes: finalScopes, disabled: false }, { onConflict: "account_id,user_id" })
      .select("user_id")
      .single();
    if (ins.error) return bad(400, { error: ins.error.message });

    return NextResponse.json({ ok: true, userId: newUserId });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}
