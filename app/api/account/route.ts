"use server";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  name?: string | null;
  company?: string | null;
  phone?: string | null;
};

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as Payload;
    const updates: Record<string, string | null> = {};
    if (typeof body.name !== "undefined") {
      updates.name = body.name ? body.name.trim() || null : null;
    }
    if (typeof body.company !== "undefined") {
      updates.company = body.company ? body.company.trim() || null : null;
    }
    if (typeof body.phone !== "undefined") {
      updates.phone = body.phone ? body.phone.trim() || null : null;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ ok: true, updated: false });
    }

    const { error } = await supabase.from("accounts").update(updates).eq("id", auth.user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}
