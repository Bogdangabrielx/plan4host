 // app/api/team/user/password/route.ts


import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { resolveTeamAccountContext } from "@/lib/auth/team-account";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function PATCH(req: Request) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const actor = auth.user; 
    if (!actor) return bad(401, { error: "Not authenticated" });

    const { userId, newPassword } = await req.json().catch(() => ({}));
    if (!userId || !newPassword) return bad(400, { error: "userId and newPassword required" });

    const ctx = await resolveTeamAccountContext(supa as any, String(actor.id));
    if (!ctx.membership || ctx.membership.role !== "admin" || !ctx.accountId) {
      return bad(403, { error: "Forbidden" });
    }
    const accountId = ctx.accountId;

    // Use admin client for membership check to avoid RLS pitfalls when actor is admin
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createAdmin(url, serviceKey, { auth: { persistSession: false } });

    const { data: target } = await admin
      .from("account_users")
      .select("role, account_id")
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!target) return bad(404, { error: "Target user not in your account" });
    if ((target as any).role === "admin") return bad(403, { error: "Cannot change password for admin" });
    if (userId === actor.id) return bad(403, { error: "Use /auth/change-password for your own account" });

    const upd = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (upd.error) return bad(400, { error: upd.error.message });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}
