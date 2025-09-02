import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const url = new URL(req.url);

  const next = url.searchParams.get("next") || "/app";
  const wantConsent = url.searchParams.get("consent") === "1";
  const prompt = wantConsent ? "consent select_account" : "select_account";

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://plan4host.com";
  const redirectTo = `${APP_URL}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { prompt },
    },
  });

  if (error || !data?.url) {
    const msg = encodeURIComponent(error?.message ?? "OAuth start failed");
    return NextResponse.redirect(new URL(`/auth/login?error=${msg}`, APP_URL));
  }

  return NextResponse.redirect(data.url);
}