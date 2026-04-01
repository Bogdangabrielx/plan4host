// app/api/team/user/remove/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { resolveTeamAccountContext } from "@/lib/auth/team-account";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function POST(req: Request) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const actor = auth.user; 
    if (!actor) return bad(401, { error: "Not authenticated" });

    const { userId } = await req.json().catch(() => ({}));
    if (!userId) return bad(400, { error: "userId required" });
    if (userId === actor.id) return bad(403, { error: "Cannot remove yourself" });

    const ctx = await resolveTeamAccountContext(supa as any, String(actor.id));
    if (!ctx.membership || ctx.membership.role !== "admin" || !ctx.accountId) {
      return bad(403, { error: "Forbidden" });
    }
    const accountId = ctx.accountId;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createAdmin(url, serviceKey, { auth: { persistSession: false } });

    // verifică ținta în același cont + să nu fie admin
    const { data: target } = await admin
      .from("account_users")
      .select("account_id, role")
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!target) return bad(404, { error: "Member not found" });
    if (target.role === "admin") return bad(403, { error: "Cannot remove admin" });

    const del = await admin
      .from("account_users")
      .delete()
      .eq("account_id", accountId)
      .eq("user_id", userId);

    if (del.error) return bad(400, { error: del.error.message });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}
