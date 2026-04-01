 // app/api/team/user/update/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { resolveTeamAccountContext } from "@/lib/auth/team-account";

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

    const ctx = await resolveTeamAccountContext(supa as any, String(actor.id));
    if (!ctx.membership || ctx.membership.role !== "admin" || !ctx.accountId) {
      return bad(403, { error: "Forbidden" });
    }
    const accountId = ctx.accountId;

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

    // plan gating: Premium only for team management
    const { data: accPlan } = await supa.from("accounts").select("plan").eq("id", accountId).maybeSingle();
    const plan = (accPlan?.plan as string | null)?.toLowerCase?.() ?? "basic";
    if (plan !== "premium") return bad(403, { error: "Team is available on Premium plan only" });

    // pregătește patch
    const patch: any = {};
    if (typeof disabled === "boolean") patch.disabled = disabled;

    if (typeof roleRaw === "string") {
      const r = roleRaw.toLowerCase();
      if (!/^(editor|viewer)$/.test(r)) return bad(400, { error: "Invalid role" });
      patch.role = r;
    }
    if (scopesRaw !== undefined) {
      // Canonicalize incoming scopes (UI or external callers)
      const CANON = new Set(["calendar","guest_overview","property_setup","cleaning","channels"]);
      const ALIASES: Record<string, string> = { inbox: "guest_overview", reservations: "calendar", propertySetup: "property_setup" };
      const normalize = (s: string) => ALIASES[s] ?? s;
      const list = Array.isArray(scopesRaw) ? scopesRaw : [];
      const result = new Set<string>();
      for (const x of list) {
        if (typeof x !== 'string') continue;
        const k = normalize(x);
        if (CANON.has(k)) result.add(k);
      }
      patch.scopes = Array.from(result);
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
