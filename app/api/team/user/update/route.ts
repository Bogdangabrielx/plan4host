 // app/api/team/user/update/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

const ALLOWED_SCOPES = new Set(["cleaning","reservations","channels","inbox","calendar","propertySetup"]);
const sanitizeScopes = (arr: any): string[] =>
  (Array.isArray(arr) ? arr : []).filter((s) => typeof s === "string" && ALLOWED_SCOPES.has(s));

export async function PATCH(req: Request) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const actor = auth.user; 
    if (!actor) return bad(401, { error: "Not authenticated" });

    const body = await req.json().catch(() => ({}));
    const userId: string | undefined = body?.userId;
    const roleRaw: string | undefined = body?.role;
    const scopesRaw: any = body?.scopes;
    const disabled: boolean | undefined = typeof body?.disabled === "boolean" ? body.disabled : undefined;
    if (!userId) return bad(400, { error: "userId required" });

    // determină account + cere ca actorul să fie admin
    let accountId: string | null = null;
    const { data: meRow } = await supa
      .from("account_users")
      .select("account_id, role, disabled")
      .eq("user_id", actor.id)
      .order("created_at", { ascending: true })
      .limit(1);
    if (meRow?.length && !meRow[0].disabled && meRow[0].role === "admin") {
      accountId = meRow[0].account_id as string;
    } else {
      const { data: acc } = await supa.from("accounts").select("id").eq("id", actor.id).maybeSingle();
      if (!acc?.id) return bad(403, { error: "Forbidden" });
      accountId = acc.id as string;
      const { data: meAdmin } = await supa
        .from("account_users")
        .select("role, disabled")
        .eq("account_id", accountId)
        .eq("user_id", actor.id)
        .maybeSingle();
      if (!meAdmin || meAdmin.disabled || meAdmin.role !== "admin") return bad(403, { error: "Forbidden" });
    }

    // țintă trebuie să fie în același cont
    const { data: target } = await supa
      .from("account_users")
      .select("role, account_id")
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!target) return bad(404, { error: "Target user not in your account" });
    if (target.role === "admin") return bad(403, { error: "Cannot modify admin user" });
    if (userId === actor.id) return bad(403, { error: "Cannot modify your own membership" });

    // pregătește patch
    const patch: any = {};
    if (typeof disabled === "boolean") patch.disabled = disabled;

    if (typeof roleRaw === "string") {
      const r = roleRaw.toLowerCase();
      if (!/^(editor|viewer)$/.test(r)) return bad(400, { error: "Invalid role" });
      patch.role = r;
    }
    if (scopesRaw !== undefined) {
      patch.scopes = sanitizeScopes(scopesRaw);
    }
    if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createAdmin(url, serviceKey, { auth: { persistSession: false } });

    const upd = await admin
      .from("account_users")
      .update(patch)
      .eq("account_id", accountId)
      .eq("user_id", userId);

    if (upd.error) return bad(400, { error: upd.error.message });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}