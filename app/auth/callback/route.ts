// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const url = new URL(req.url);

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/app/calendar";
  const intent = (url.searchParams.get("intent") || "signin").toLowerCase();

  if (!code) {
    const loginUrl = new URL("/auth/login", url.origin);
    loginUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(loginUrl);
  }

  // schimbă "code" pe sesiune + setează cookie-urile
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const loginUrl = new URL("/auth/login", url.origin);
    loginUrl.searchParams.set("error", encodeURIComponent(error.message));
    return NextResponse.redirect(loginUrl);
  }

  // Decider post-OAuth (signup vs signin)
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    const loginUrl = new URL("/auth/login", url.origin);
    loginUrl.searchParams.set("error", "no_user");
    return NextResponse.redirect(loginUrl);
  }

  // 1) Dacă e membru într-un cont, intră ca sub-user (nu creăm tenant)
  const { data: au } = await supabase
    .from("account_users")
    .select("account_id")
    .eq("user_id", user.id)
    .limit(1);
  if (au && au.length > 0) {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // 2) Dacă are deja accounts(id=user.id), e admin existent
  const { data: acc } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (acc?.id) {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // 3) Intent handling
  if (intent === "signup") {
    // Nou admin: trigger-ul DB handle_new_user a rulat la crearea userului.
    // Dacă nu a rulat (edge), UI va rămâne funcțional și fără cont până la backfill.
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // intent=signin dar nu există nici membership, nici tenant → cere Create account
  const loginUrl = new URL("/auth/login", url.origin);
  loginUrl.searchParams.set("error", "No account found for this email. Please Create account with Google.");
  loginUrl.searchParams.set("mode", "signup");
  return NextResponse.redirect(loginUrl);
}
