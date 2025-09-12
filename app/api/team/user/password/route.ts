 // app/api/team/user/password/route.ts


import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function PATCH(req: Request) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const actor = auth.user; 
    if (!actor) return bad(401, { error: "Not authenticated" });

    const { userId, newPassword } = await req.json().catch(() => ({}));
    if (!userId || !newPassword) return bad(400, { error: "userId and newPassword required" });

    // actor trebuie să fie admin al aceluiași cont; nu permitem pentru admin target; nu-ți setezi singur parola aici
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

    const { data: target } = await supa
      .from("account_users")
      .select("role, account_id")
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!target) return bad(404, { error: "Target user not in your account" });
    if (target.role === "admin") return bad(403, { error: "Cannot change password for admin" });
    if (userId === actor.id) return bad(403, { error: "Use /auth/change-password for your own account" });

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