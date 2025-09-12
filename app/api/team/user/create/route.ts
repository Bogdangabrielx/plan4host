 // app/api/team/user/create/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

const ALLOWED_SCOPES = new Set(["cleaning","reservations","channels","inbox","calendar","propertySetup"]);
const sanitizeScopes = (arr: any): string[] =>
  (Array.isArray(arr) ? arr : []).filter((s) => typeof s === "string" && ALLOWED_SCOPES.has(s));

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
    const { data: accSelf } = await supa.from("accounts").select("id, plan, valid_until").eq("id", actor.id).maybeSingle();
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
      // plan gating
      const plan = (accSelf.plan as string | undefined)?.toLowerCase?.() ?? "basic";
      const active = !accSelf.valid_until || new Date(accSelf.valid_until as any) > new Date();
      if (!active || plan !== "premium") return bad(403, { error: "Team is available on Premium plan only" });
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

      const { data: acc } = await supa.from("accounts").select("plan, valid_until").eq("id", accountId).maybeSingle();
      const plan = (acc?.plan as string | undefined)?.toLowerCase?.() ?? "basic";
      const active = !acc?.valid_until || new Date(acc!.valid_until as any) > new Date();
      if (!active || plan !== "premium") return bad(403, { error: "Team is available on Premium plan only" });
    }

    // creează utilizator auth
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createAdmin(url, serviceKey, { auth: { persistSession: false } });

    const created = await admin.auth.admin.createUser({
      email, password, email_confirm: true, app_metadata: { disabled: false }
    });
    if (created.error) return bad(400, { error: created.error.message });

    const newUserId = created.data.user?.id as string;
    if (!newUserId) return bad(500, { error: "Failed to create user" });

    // atașează membership (role = editor|viewer; niciodată admin din UI)
    const ins = await admin
      .from("account_users")
      .upsert({ account_id: accountId!, user_id: newUserId, role, scopes, disabled: false }, { onConflict: "account_id,user_id" })
      .select("user_id")
      .single();
    if (ins.error) return bad(400, { error: ins.error.message });

    return NextResponse.json({ ok: true, userId: newUserId });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}