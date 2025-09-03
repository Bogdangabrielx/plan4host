import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function POST(req: Request) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const actor = auth.user;
    if (!actor) return bad(401, { error: "Not authenticated" });

    const body = await req.json().catch(() => ({}));
    const email: string | undefined = body?.email?.trim();
    const password: string | undefined = body?.password;
    const role: string = (body?.role || "member").toLowerCase();
    const scopes: string[] = Array.isArray(body?.scopes) ? body.scopes : [];
    if (!email || !password) return bad(400, { error: "Email and password are required" });
    if (!/^owner|manager|member|viewer$/.test(role)) return bad(400, { error: "Invalid role" });

    // Determine account id (owner id). If actor is owner, accountId = actor.id.
    // If actor is manager, derive from membership.
    let accountId = actor.id as string;
    const { data: maybeAcc } = await supa.from("accounts").select("id").eq("id", actor.id).maybeSingle();
    if (!maybeAcc) {
      const { data: au } = await supa.from("account_users").select("account_id, role, disabled").eq("user_id", actor.id).order("created_at", { ascending: true });
      const row = (au ?? [])[0] as any;
      if (!row) return bad(403, { error: "Not a member of any account" });
      accountId = row.account_id as string;
      if (!(row.role === "owner" || row.role === "manager") || row.disabled) {
        return bad(403, { error: "Only owner/manager can create users" });
      }
    }

    // Plan gating: only standard/premium can manage team
    const { data: acc } = await supa.from("accounts").select("plan, valid_until").eq("id", accountId).maybeSingle();
    const active = !acc?.valid_until || new Date(acc.valid_until as any) > new Date();
    const plan = (acc?.plan as string | undefined)?.toLowerCase?.() ?? "basic";
    if (!active || (plan !== "standard" && plan !== "premium")) {
      return bad(403, { error: "Team is available on Standard and Premium plans" });
    }

    // Admin client
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createAdmin(url, serviceKey, { auth: { persistSession: false } });

    // Create auth user (no invite flow), confirm email immediately
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { disabled: false } });
    if (created.error) {
      return bad(400, { error: created.error.message });
    }
    const newUserId = created.data.user?.id as string;
    if (!newUserId) return bad(500, { error: "Failed to create user" });

    // Attach membership
    const ins = await admin.from("account_users").upsert({ account_id: accountId, user_id: newUserId, role, scopes, disabled: false }, { onConflict: "account_id,user_id" }).select("user_id").single();
    if (ins.error) return bad(400, { error: ins.error.message });

    return NextResponse.json({ ok: true, userId: newUserId });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}

