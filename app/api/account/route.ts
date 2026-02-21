"use server";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

type Payload = {
  name?: string | null;
  company?: string | null;
  phone?: string | null;
};

// Citește profilul direct din tabelul accounts (coloanele name/company/phone).
export async function GET() {
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Rezolvă account_id: titular (accounts.id = user.id) sau membership în account_users
    let accountId = uid;
    const { data: membership, error: memErr } = await supabase
      .from("account_users")
      .select("account_id, role, disabled")
      .eq("user_id", uid)
      .order("created_at", { ascending: true })
      .maybeSingle();
    if (!memErr && membership?.account_id) {
      accountId = membership.account_id as string;
    }

    // Unele baze pot avea coloana scrisă greșit ca "nane" (legacy). Suportăm ambele.
    const trySelect = async () => {
      const primary = await supabase
        .from("accounts")
        .select("name, company, phone")
        .eq("id", accountId)
        .maybeSingle();
      if (!primary.error) return { data: primary.data, column: "name" as const };
      if (primary.error.code === "42703") {
        const alt = await supabase
          .from("accounts")
          .select("nane, company, phone")
          .eq("id", accountId)
          .maybeSingle();
        if (!alt.error) return { data: alt.data, column: "nane" as const };
        return { error: alt.error };
      }
      return { error: primary.error };
    };

    const sel = await trySelect();
    if ("error" in sel) {
      const err = sel.error ?? ({ message: "Select failed (unknown error)" } as any);
      console.error("GET /api/account select failed", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    const data = sel.data as any;

    return NextResponse.json({
      ok: true,
      name: sel.column === "name" ? data?.name ?? null : data?.nane ?? null,
      company: data?.company ?? null,
      phone: data?.phone ?? null,
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

    // Rezolvă account_id: titular sau membership. Doar admin poate edita dacă e membru.
    let accountId = uid;
    const { data: membership, error: memErr } = await supabase
      .from("account_users")
      .select("account_id, role, disabled")
      .eq("user_id", uid)
      .order("created_at", { ascending: true })
      .maybeSingle();
    if (!memErr && membership?.account_id) {
      if (membership.disabled) {
        return NextResponse.json({ error: "User disabled" }, { status: 403 });
      }
      if (membership.role !== "admin") {
        return NextResponse.json({ error: "Only account admins can edit profile." }, { status: 403 });
      }
      // Dacă ești sub-user (account_id != uid), RLS pe accounts va bloca update-ul.
      // Cerem doar titularului contului să editeze profilul.
      if (membership.account_id !== uid) {
        return NextResponse.json({ error: "Only the account owner can update account profile." }, { status: 403 });
      }
      accountId = membership.account_id as string;
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

    // helper: update un câmp; dacă coloana lipsește (42703) ignorăm și contăm ca 0 rânduri
    const svc = getServiceSupabase();
    const updateField = async (field: string, value: string | null) => {
      const { error } = await svc
        .from("accounts")
        .update({ [field]: value })
        .eq("id", accountId);
      if (error?.code === "42703") return { ok: false, skipped: true };
      if (error) return { ok: false, skipped: false, error };
      return { ok: true, touched: true };
    };

    const errors: any[] = [];
    let touched = 0;

    if (typeof nameValue !== "undefined") {
      const r = await updateField("name", nameValue);
      if (!r.ok && r.skipped) {
        // fallback pentru coloana typo "nane"
        const alt = await updateField("nane", nameValue);
        if (!alt.ok && alt.error) errors.push(alt.error);
        if (alt.ok && alt.touched) touched++;
      } else if (!r.ok && r.error) {
        errors.push(r.error);
      } else if (r.ok && r.touched) {
        touched++;
      }
    }
    if (typeof companyValue !== "undefined") {
      const r = await updateField("company", companyValue);
      if (!r.ok && r.error) errors.push(r.error);
      if (r.ok && r.touched) touched++;
    }
    if (typeof phoneValue !== "undefined") {
      const r = await updateField("phone", phoneValue);
      if (!r.ok && r.error) errors.push(r.error);
      if (r.ok && r.touched) touched++;
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
