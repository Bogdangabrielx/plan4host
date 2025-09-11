import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type Body = { email?: unknown; password?: unknown };

export async function POST(req: Request) {
  try {
    // ——— Validare env ———
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Server misconfigured: missing Supabase env vars." },
        { status: 500 }
      );
    }

    // ——— Parse + validare payload ———
    let body: Body = {};
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    // ——— Supabase server client cu cookie binding ———
    const cookieStore = cookies();
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
    });

    // ——— Login ———
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // 400: credențiale greșite; 429: rate limit; 403: user blocat
      const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 401;
      return NextResponse.json({ error: error.message || "Authentication failed." }, { status });
    }

    if (!data?.user) {
      return NextResponse.json(
        { error: "Session could not be initialized. Try again." },
        { status: 500 }
      );
    }

    // ——— Succes: UI-ul citește x-redirect ———
    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.headers.set("x-redirect", "/app");
    return res;
  } catch (e: any) {
    // Orice excepție nevizată devine răspuns clar, nu 500 generic în consolă
    const msg = typeof e?.message === "string" ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// (opțional) respinge metodele non-POST
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}