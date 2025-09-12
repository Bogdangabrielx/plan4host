// app/api/team/user/list/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function GET() {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const actor = auth.user; 
    if (!actor) return bad(401, { error: "Not authenticated" });

    // determină accountId: prefer membru; fallback cont propriu
    let accountId: string | null = null;
    const { data: auRows } = await supa
      .from("account_users")
      .select("account_id, disabled")
      .eq("user_id", actor.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (auRows?.length && !auRows[0].disabled) {
      accountId = auRows[0].account_id as string;
    } else {
      const { data: acc } = await supa.from("accounts").select("id").eq("id", actor.id).maybeSingle();
      if (acc?.id) accountId = acc.id as string;
    }
    if (!accountId) return NextResponse.json({ ok: true, members: [] });

    // listă cu service client (evită edge-case RLS)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) return bad(500, { error: "Missing service credentials" });
    const admin = createAdmin(url, serviceKey, { auth: { persistSession: false } });

    const { data, error } = await admin
      .from("account_users")
      .select("user_id, role, scopes, disabled, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: true });

    if (error) return bad(400, { error: error.message });

    // atașează email
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