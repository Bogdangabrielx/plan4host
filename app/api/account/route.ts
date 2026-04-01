"use server";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { resolveTeamAccountContext } from "@/lib/auth/team-account";

type Payload = {
  name?: string | null;
  company?: string | null;
  phone?: string | null;
};

// Profilul personal vine din account_users; compania rămâne account-level.
export async function GET() {
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const ctx = await resolveTeamAccountContext(supabase as any, String(uid));
    const accountId = ctx.accountId ?? uid;

    const { data: membership, error: memErr } = await supabase
      .from("account_users")
      .select("name, phone, email")
      .eq("account_id", accountId)
      .eq("user_id", uid)
      .maybeSingle();
    if (memErr) {
      console.error("GET /api/account membership select failed", memErr);
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    const { data: accountRow, error: accErr } = await supabase
      .from("accounts")
      .select("company")
      .eq("id", accountId)
      .maybeSingle();
    if (accErr) {
      console.error("GET /api/account account select failed", accErr);
      return NextResponse.json({ error: accErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      name: membership?.name ?? null,
      company: accountRow?.company ?? null,
      phone: membership?.phone ?? null,
      email: membership?.email ?? auth?.user?.email ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Payload;

    const ctx = await resolveTeamAccountContext(supabase as any, String(uid));
    const accountId = ctx.accountId ?? uid;
    const membership = ctx.membership;
    if (membership?.disabled) {
      return NextResponse.json({ error: "User disabled" }, { status: 403 });
    }

    const nameValue = typeof body.name !== "undefined" ? body.name?.trim() || null : undefined;
    const companyValue = typeof body.company !== "undefined" ? body.company?.trim() || null : undefined;
    const phoneValue = typeof body.phone !== "undefined" ? body.phone?.trim() || null : undefined;

    if (
      typeof nameValue === "undefined" &&
      typeof companyValue === "undefined" &&
      typeof phoneValue === "undefined"
    ) {
      return NextResponse.json({ ok: true, updated: false });
    }

    const svc = getServiceSupabase();
    const updateMembershipField = async (field: string, value: string | null) => {
      const { error } = await svc
        .from("account_users")
        .upsert({ account_id: accountId, user_id: uid, [field]: value }, { onConflict: "account_id,user_id" });
      if (error) return { ok: false, skipped: false, error };
      return { ok: true, touched: true };
    };

    const errors: any[] = [];
    let touched = 0;

    if (typeof nameValue !== "undefined") {
      const r = await updateMembershipField("name", nameValue);
      if (!r.ok && r.error) {
        errors.push(r.error);
      } else if (r.ok && r.touched) {
        touched++;
      }
    }
    if (typeof phoneValue !== "undefined") {
      const r = await updateMembershipField("phone", phoneValue);
      if (!r.ok && r.error) errors.push(r.error);
      if (r.ok && r.touched) touched++;
    }
    if (typeof companyValue !== "undefined") {
      if (accountId !== uid) {
        return NextResponse.json({ error: "Only the account owner can update company." }, { status: 403 });
      }
      const { error } = await svc.from("accounts").update({ company: companyValue }).eq("id", accountId);
      if (error) errors.push(error);
      else touched++;
    }

    if (errors.length) {
      const first = errors[0] as any;
      console.error("PATCH /api/account update failed", first);
      return NextResponse.json(
        {
          error: first.message ?? "Update failed",
          code: first.code ?? null,
          details: first.details ?? null,
          hint: first.hint ?? null,
        },
        { status: 500 },
      );
    }

    // Sync numele și în auth.users (display_name) pentru UX consistent.
    let authWarning: string | null = null;
    if (typeof nameValue !== "undefined") {
      const { error: authErr } = await supabase.auth.updateUser({
        data: { full_name: nameValue, display_name: nameValue, name: nameValue },
      });
      if (authErr) {
        authWarning = authErr.message ?? "Could not update auth profile name";
      }
    }

    return NextResponse.json({ ok: true, updated: touched > 0, warning: authWarning });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}
