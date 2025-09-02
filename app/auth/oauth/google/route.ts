import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const url = new URL(req.url);

  // Poți trece next=/app/calendar etc.
  const next = url.searchParams.get("next") || "/app";

  // Dacă vrei să forțezi și consimțământul, apelează ruta cu ?consent=1
  const wantConsent = url.searchParams.get("consent") === "1";
  const prompt = wantConsent ? "consent select_account" : "select_account";

  const origin = url.origin;
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { prompt }, // 👈 AICI: select_account (sau consent + select_account)
    },
  });

  if (error || !data?.url) {
    const msg = encodeURIComponent(error?.message ?? "OAuth start failed");
    return NextResponse.redirect(new URL(`/auth/login?error=${msg}`, req.url));
  }

  return NextResponse.redirect(data.url);
}
