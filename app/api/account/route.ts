"use server";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      accountId = membership.account_id as string;
    }

    const nameValue = typeof body.name !== "undefined" ? body.name?.trim() || null : undefined;
    const companyValue = typeof body.company !== "undefined" ? body.company?.trim() || null : undefined;
    const phoneValue = typeof body.phone !== "undefined" ? body.phone?.trim() || null : undefined;

    const accountErrors: any[] = [];
    const accountWarnings: string[] = [];

    // helper care încearcă update și ignoră coloanele inexistente (42703)
    const saveField = async (field: string, value: string | null) => {
      const { error } = await supabase.from("accounts").update({ [field]: value }).eq("id", accountId);
      if (error?.code === "42703") {
        accountWarnings.push(`Column ${field} missing`);
        return;
      }
      if (error) accountErrors.push(error);
    };

    // nume: încearcă name, apoi nane
    if (typeof nameValue !== "undefined") {
      await saveField("name", nameValue);
      if (accountWarnings.some((w) => w.includes("name"))) {
        // încearcă fallback-ul nane
        const { error } = await supabase.from("accounts").update({ nane: nameValue }).eq("id", accountId);
        if (error?.code !== "42703" && error) accountErrors.push(error);
      }
    }
    if (typeof companyValue !== "undefined") {
      await saveField("company", companyValue);
    }
    if (typeof phoneValue !== "undefined") {
      await saveField("phone", phoneValue);
    }

    // Opțional: actualizează metadata pentru afișarea numelui
    let authError: any = null;
    if (typeof nameValue !== "undefined") {
      const displayName = nameValue;
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName, display_name: displayName, name: displayName },
      });
      if (error) authError = error;
    }

    // Dacă update-ul pe accounts a eșuat dar nu am schimbat company/phone, acceptăm succes parțial (nume în metadata).
    const touchedCompanyOrPhone =
      typeof body.company !== "undefined" || typeof body.phone !== "undefined";
    const accountUpdateError = accountErrors[0] ?? null;
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }
    if (accountUpdateError && touchedCompanyOrPhone) {
      return NextResponse.json({ error: accountUpdateError.message }, { status: 500 });
    }
    if (accountUpdateError && typeof nameValue !== "undefined") {
      return NextResponse.json({ ok: true, warning: "Name saved only in profile metadata." });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}
