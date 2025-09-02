// /app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json().catch(() => ({}));
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabase = createClient();

    // 1) Create auth user
    const signUpRes = await supabase.auth.signUp({ email, password });
    if (signUpRes.error) {
      return NextResponse.json({ error: signUpRes.error.message }, { status: 400 });
    }

    // If email confirmations are enabled, the user may not be signed in yet.
    // So we ensure a session now for a smooth first-run:
    const signInRes = await supabase.auth.signInWithPassword({ email, password });
    if (signInRes.error) {
      // If sign-in fails (e.g., email confirmation required), still return 200 so UI can show a friendly message.
      return NextResponse.json({ ok: true, requiresConfirmation: true });
    }

    const user = signInRes.data.user;
    if (!user) {
      return NextResponse.json({ error: "Could not get user after sign-in." }, { status: 500 });
    }

    // 2) Bootstrap tenant: create accounts row and membership
    //    We use the user's id as the first account id (owner model).
    //    Policies allow this because auth.uid() == id on INSERT for accounts,
    //    and account_users.user_id must be auth.uid().
    const accountId = user.id;

    // Insert or ignore if it already exists (rare retries)
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

    // Done. Cookie with the session is set by supabase server client.
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error." }, { status: 500 });
  }
}
