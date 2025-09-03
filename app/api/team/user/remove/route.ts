import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function POST(req: Request) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const actor = auth.user; if (!actor) return bad(401, { error: "Not authenticated" });
    const { userId } = await req.json().catch(() => ({}));
    if (!userId) return bad(400, { error: "userId required" });

    // Determine account and verify actor is owner/manager
    let accountId = actor.id as string;
    const { data: maybeAcc } = await supa.from("accounts").select("id").eq("id", actor.id).maybeSingle();
    if (!maybeAcc) {
      const { data: au } = await supa.from("account_users").select("account_id, role, disabled").eq("user_id", actor.id).order("created_at", { ascending: true });
      const row = (au ?? [])[0] as any;
      if (!row || row.disabled || !(row.role === 'owner' || row.role === 'manager')) return bad(403, { error: "Forbidden" });
      accountId = row.account_id as string;
    }

    // Ensure target membership in this account (and do not allow removing the owner)
    const { data: target } = await supa.from("account_users").select("account_id, role").eq("account_id", accountId).eq("user_id", userId).maybeSingle();
    if (!target) return bad(404, { error: "Member not found" });
    if (target.role === 'owner') return bad(403, { error: "Cannot remove owner" });

    const del = await supa.from("account_users").delete().eq("account_id", accountId).eq("user_id", userId);
    if (del.error) return bad(400, { error: del.error.message });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}
