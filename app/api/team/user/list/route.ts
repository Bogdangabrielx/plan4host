import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function GET() {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const actor = auth.user; if (!actor) return bad(401, { error: "Not authenticated" });

    // Determine account id
    let accountId = actor.id as string;
    const { data: maybeAcc } = await supa.from("accounts").select("id").eq("id", actor.id).maybeSingle();
    if (!maybeAcc) {
      const { data: au } = await supa.from("account_users").select("account_id, role, disabled").eq("user_id", actor.id).order("created_at", { ascending: true });
      const row = (au ?? [])[0] as any;
      if (!row || row.disabled || !(row.role === 'owner' || row.role === 'manager')) return bad(403, { error: "Forbidden" });
      accountId = row.account_id as string;
    }

    const { data, error } = await supa
      .from("account_users")
      .select("user_id, role, scopes, disabled, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: true });
    if (error) return bad(400, { error: error.message });

    // Enrich with email via admin API
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createAdmin(url, serviceKey, { auth: { persistSession: false } });
    const members = await Promise.all((data ?? []).map(async (m: any) => {
      try {
        const u = await admin.auth.admin.getUserById(m.user_id);
        return { ...m, email: u.data.user?.email ?? null };
      } catch {
        return { ...m, email: null };
      }
    }));
    return NextResponse.json({ ok: true, members });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}
