// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const url = new URL(req.url);

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/app";

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

  // succes: mergi la next (ex: /app sau /app/calendar)
  const redirectUrl = new URL(next, url.origin);
  return NextResponse.redirect(redirectUrl);
}