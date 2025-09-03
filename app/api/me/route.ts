import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function GET() {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user; if (!user) return bad(401, { error: "Not authenticated" });

    // Owner account?
    const { data: acc } = await supa.from("accounts").select("id,plan,valid_until").eq("id", user.id).maybeSingle();
    if (acc) {
      return NextResponse.json({ ok: true, me: { role: 'owner', scopes: ['dashboard','calendar','configurator','cleaning','channels','inbox','team'], disabled: false, plan: acc.plan } });
    }

    // Otherwise, first membership
    const { data: au } = await supa
      .from("account_users")
      .select("account_id, role, scopes, disabled")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    const m = (au ?? [])[0] as any;
    if (!m) return bad(403, { error: "No membership" });

    // Also return plan of the account for gating in UI if needed
    const { data: acc2 } = await supa.from("accounts").select("plan, valid_until").eq("id", m.account_id).maybeSingle();
    return NextResponse.json({ ok: true, me: { role: m.role, scopes: m.scopes || [], disabled: !!m.disabled, plan: acc2?.plan || 'basic' } });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}
