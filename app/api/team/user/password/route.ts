import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function PATCH(req: Request) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const actor = auth.user; if (!actor) return bad(401, { error: "Not authenticated" });
    const { userId, newPassword } = await req.json().catch(() => ({}));
    if (!userId || !newPassword) return bad(400, { error: "userId and newPassword required" });

    // Validate actor is OWNER of the account that contains userId
    // Find account for actor
    let accountId = actor.id as string;
    const { data: maybeAcc } = await supa.from("accounts").select("id").eq("id", actor.id).maybeSingle();
    if (!maybeAcc) {
      const { data: au } = await supa.from("account_users").select("account_id, role, disabled").eq("user_id", actor.id).order("created_at", { ascending: true });
      const row = (au ?? [])[0] as any;
      if (!row || row.disabled || row.role !== 'owner') return bad(403, { error: "Forbidden" });
      accountId = row.account_id as string;
    }
    // Check that target user is member of same account
    const { data: target } = await supa.from("account_users").select("account_id").eq("user_id", userId).maybeSingle();
    if (!target || target.account_id !== accountId) return bad(403, { error: "Target user not in your account" });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createAdmin(url, serviceKey, { auth: { persistSession: false } });
    const upd = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (upd.error) return bad(400, { error: upd.error.message });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}
