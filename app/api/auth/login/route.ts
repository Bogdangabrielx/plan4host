// /app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json().catch(() => ({}));
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabase = createClient();

    // 1) Sign in
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (signIn.error) {
      return NextResponse.json({ error: signIn.error.message }, { status: 401 });
    }

    const user = signIn.data.user;
    if (!user) {
      return NextResponse.json({ error: "Login succeeded but no user returned." }, { status: 500 });
    }

    // 2) Safety: ensure tenant scaffolding exists (accounts + account_users)
    //    (idempotent: we ignore duplicates)
    const accountId = user.id;

    const { error: accErr } = await supabase
      .from("accounts")
      .upsert({ id: accountId, plan: "basic" }, { onConflict: "id", ignoreDuplicates: true });
    if (accErr) {
      return NextResponse.json({ error: accErr.message }, { status: 400 });
    }

    const { error: auErr } = await supabase
      .from("account_users")
      .upsert(
        { account_id: accountId, user_id: user.id, role: "owner" },
        { onConflict: "account_id,user_id", ignoreDuplicates: true }
      );
    if (auErr) {
      return NextResponse.json({ error: auErr.message }, { status: 400 });
    }

    // Done — session cookie is set by the Supabase server client.
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error." }, { status: 500 });
  }
}
