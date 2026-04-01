// app/api/me/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveTeamAccountContext } from "@/lib/auth/team-account";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function bad(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

// Scope-uri implicite pe rol (UI gating; RLS va aplica regulile reale)
const DEFAULT_SCOPES: Record<"admin" | "editor" | "viewer", string[]> = {
  admin: [
    "dashboard",
    "calendar",
    "property_setup",
    "checkin_editor",
    "cleaning",
    "channels",
    "reservation_message",
    "guest_overview",
    "notifications",
    "team",
    "subscription",
  ],
  editor: [
    "dashboard",
    "calendar",
    "property_setup",
    "cleaning",
    "channels",
    "guest_overview",
    "notifications",
    "team",
  ],
  viewer: [
    "dashboard",
    "calendar",
    "cleaning",
    "channels",
    "guest_overview",
    "notifications",
    "team",
  ],
};

export async function GET() {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user;
    if (!user) return bad(401, { error: "Not authenticated" });

    const ctx = await resolveTeamAccountContext(supa as any, String(user.id));
    const member = ctx.membership as
      | {
          account_id: string;
          role: "admin" | "editor" | "viewer";
          scopes: string[] | null;
          disabled: boolean | null;
        }
      | null;

    if (member) {
      // Plan direct din accounts.plan
      const { data: acc } = await supa.from("accounts").select("plan").eq("id", member.account_id).maybeSingle();
      const role = member.role;
      const disabled = !!member.disabled;
      const plan = ((acc?.plan as string | null)?.toLowerCase?.() ?? "basic") as string;
      const scopes =
        Array.isArray(member.scopes) && member.scopes.length > 0
          ? member.scopes
          : DEFAULT_SCOPES[role];

      return NextResponse.json(
        {
          ok: true,
          me: { role, scopes, disabled, plan },
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    // 2) Fallback: titularul propriului cont (admin)
    const { data: accSelf } = await supa.from("accounts").select("plan").eq("id", user.id).maybeSingle();
    const planSelf = ((accSelf?.plan as string | null)?.toLowerCase?.() ?? "basic") as string;
    return NextResponse.json(
      {
        ok: true,
        me: {
          role: "admin" as const,
          scopes: DEFAULT_SCOPES.admin,
          disabled: false,
          plan: planSelf,
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );

    // 3) Nici cont propriu, nici membru într-un cont -> fără context valid
    return bad(403, { error: "No account context" });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}
