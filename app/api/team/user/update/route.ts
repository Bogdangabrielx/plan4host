import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function PATCH(req: Request) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const actor = auth.user; if (!actor) return bad(401, { error: "Not authenticated" });
    const body = await req.json().catch(() => ({}));
    const userId: string | undefined = body?.userId;
    const role: string | undefined = body?.role;
    const scopes: string[] | undefined = Array.isArray(body?.scopes) ? body.scopes : undefined;
    const disabled: boolean | undefined = typeof body?.disabled === 'boolean' ? body.disabled : undefined;
    if (!userId) return bad(400, { error: "userId required" });

    // Determine account for actor and verify owner only
    let accountId = actor.id as string;
    const { data: maybeAcc } = await supa.from("accounts").select("id").eq("id", actor.id).maybeSingle();
    if (!maybeAcc) {
      const { data: au } = await supa.from("account_users").select("account_id, role, disabled").eq("user_id", actor.id).order("created_at", { ascending: true });
      const row = (au ?? [])[0] as any;
      if (!row || row.disabled || row.role !== 'owner') return bad(403, { error: "Forbidden" });
      accountId = row.account_id as string;
    }
    // Check target membership
    const { data: target } = await supa.from("account_users").select("account_id").eq("user_id", userId).maybeSingle();
    if (!target || target.account_id !== accountId) return bad(403, { error: "Target user not in your account" });

    // Prepare update
    const patch: any = {};
    if (role) {
      const r = role.toLowerCase();
      if (!/^(member|viewer)$/.test(r)) return bad(400, { error: "Invalid role" });
      patch.role = r;
    }
    if (scopes) patch.scopes = scopes;
    if (typeof disabled === 'boolean') patch.disabled = disabled;
    if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = (await import("@supabase/supabase-js")).createClient(url, serviceKey, { auth: { persistSession: false } });
    const upd = await admin.from("account_users").update(patch).eq("account_id", accountId).eq("user_id", userId);
    if (upd.error) return bad(400, { error: upd.error.message });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}
