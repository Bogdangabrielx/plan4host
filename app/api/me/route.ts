// app/api/me/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function bad(status: number, body: any) {
  return NextResponse.json(body, { status });
}

/**
 * Returnează profilul UI:
 * {
 *   role: "admin" | "editor" | "viewer",
 *   scopes: string[],
 *   disabled: boolean,
 *   plan: "basic" | "standard" | "premium"
 * }
 *
 * Reguli:
 * - Dacă user-ul e listat în `account_users`, folosim acel rând (role/scopes/disabled) + planul contului.
 * - Dacă NU există rând în `account_users`, atunci e "contul de bază" => role="admin", disabled=false, scopes „full”,
 *   iar account_id = user.id (și citim planul din `accounts`).
 */
export async function GET() {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user;
    if (!user) return bad(401, { error: "Not authenticated" });

    // 1) Caută întâi context ca sub-user într-un cont existent
    const { data: au, error: eAu } = await supa
      .from("account_users")
      .select("account_id, role, scopes, disabled")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (eAu) return bad(500, { error: eAu.message });

    const member = (au ?? [])[0] as
      | { account_id: string; role: "admin" | "editor" | "viewer"; scopes: string[] | null; disabled: boolean | null }
      | undefined;

    if (member) {
      const { data: acc2, error: eAcc2 } = await supa
        .from("accounts")
        .select("plan")
        .eq("id", member.account_id)
        .maybeSingle();

      if (eAcc2) return bad(500, { error: eAcc2.message });

      return NextResponse.json({
        ok: true,
        me: {
          role: member.role,
          scopes: Array.isArray(member.scopes) ? member.scopes : [],
          disabled: !!member.disabled,
          plan: (acc2?.plan as string | undefined) ?? "basic",
        },
      });
    }

    // 2) Fallback: utilizatorul este titularul contului propriu (contul „de bază”)
    const { data: acc, error: eAcc } = await supa
      .from("accounts")
      .select("id, plan")
      .eq("id", user.id)
      .maybeSingle();

    if (eAcc) return bad(500, { error: eAcc.message });

    if (acc) {
      // admin = acces total; scopes pot fi folosite în UI pentru gating fin
      const adminScopes = [
        "dashboard",
        "calendar",
        "propertySetup",
        "cleaning",
        "channels",
        "inbox",
        "team",
        "subscription",
      ];
      return NextResponse.json({
        ok: true,
        me: {
          role: "admin",
          scopes: adminScopes,
          disabled: false,
          plan: (acc.plan as string | undefined) ?? "basic",
        },
      });
    }

    // 3) Nici cont propriu, nici membru într-un cont -> fără context valid
    return bad(403, { error: "No account context" });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}