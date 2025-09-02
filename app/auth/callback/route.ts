import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/app";

  if (!code) {
    return NextResponse.redirect(new URL(`/auth/login?error=missing_code`, req.url));
  }

  // Setează cookie-ul de sesiune
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const msg = encodeURIComponent(error.message);
    return NextResponse.redirect(new URL(`/auth/login?error=${msg}`, req.url));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
