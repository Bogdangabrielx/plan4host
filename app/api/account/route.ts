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

    const { data, error } = await supabase
      .from("accounts")
      .select("name, company, phone")
      .eq("id", uid)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      name: data?.name ?? null,
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

    const updates: Record<string, string | null> = {};
    if (typeof body.name !== "undefined") updates.name = body.name?.trim() || null;
    if (typeof body.company !== "undefined") updates.company = body.company?.trim() || null;
    if (typeof body.phone !== "undefined") updates.phone = body.phone?.trim() || null;

    if (!Object.keys(updates).length) {
      return NextResponse.json({ ok: true, updated: false });
    }

    const { error } = await supabase.from("accounts").update(updates).eq("id", uid);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Opțional: actualizează metadata pentru afișarea numelui
    if (typeof body.name !== "undefined") {
      const displayName = body.name?.trim() || null;
      await supabase.auth.updateUser({
        data: { full_name: displayName, display_name: displayName, name: displayName },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}
