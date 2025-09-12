// app/api/me/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    "propertySetup",
    "cleaning",
    "channels",
    "inbox",
    "team",
    "subscription",
  ],
  editor: [
    "dashboard",
    "calendar",
    "propertySetup",
    "cleaning",
    "channels",
    "inbox",
    // fără "team" și "subscription"
  ],
  viewer: [
    "dashboard",
    "calendar",
    "cleaning",
    "channels",
    "inbox",
    // poate vezi și propertySetup în read-only; îl poți adăuga dacă vrei în UI
  ],
};

export async function GET() {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user;
    if (!user) return bad(401, { error: "Not authenticated" });

    // 1) Încearcă să găsești user-ul ca membru într-un cont (sub-user)
    const { data: au, error: eAu } = await supa
      .from("account_users")
      .select("account_id, role, scopes, disabled")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (eAu) return bad(500, { error: eAu.message });

    const member = (au ?? [])[0] as
      | {
          account_id: string;
          role: "admin" | "editor" | "viewer";
          scopes: string[] | null;
          disabled: boolean | null;
        }
      | undefined;

    if (member) {
      const { data: acc2, error: eAcc2 } = await supa
        .from("accounts")
        .select("plan")
        .eq("id", member.account_id)
        .maybeSingle();

      if (eAcc2) return bad(500, { error: eAcc2.message });

      const role = member.role;
      const disabled = !!member.disabled;
      const plan = (acc2?.plan as string | undefined) ?? "basic";
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

    // 2) Fallback: utilizatorul este titularul propriului cont (contul de bază)
    const { data: acc, error: eAcc } = await supa
      .from("accounts")
      .select("id, plan")
      .eq("id", user.id)
      .maybeSingle();

    if (eAcc) return bad(500, { error: eAcc.message });

    if (acc) {
      return NextResponse.json(
        {
          ok: true,
          me: {
            role: "admin" as const,
            scopes: DEFAULT_SCOPES.admin,
            disabled: false,
            plan: (acc.plan as string | undefined) ?? "basic",
          },
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    // 3) Nici cont propriu, nici membru într-un cont -> fără context valid
    return bad(403, { error: "No account context" });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}