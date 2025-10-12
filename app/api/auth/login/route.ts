// /app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = { email?: unknown; password?: unknown };

export async function POST(req: Request) {
  try {
    // 0) Parse + validare input (fără 500 pe body invalid)
    let body: Body = {};
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const email =
      typeof body.email === "string" ? body.email.trim() : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    // 1) Auth
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const status =
        error.status && error.status >= 400 && error.status < 600
          ? error.status
          : 401;
      return NextResponse.json(
        { error: error.message || "Authentication failed." },
        { status }
      );
    }

    const user = data?.user;
    if (!user) {
      return NextResponse.json(
        { error: "Login succeeded but no user returned." },
        { status: 500 }
      );
    }

    // 2) Fără bootstrap în login. Tenantul se creează doar pe signup (admin)
    //    sau de trigger-ul DB la crearea userului (handle_new_user).

    // 3) Succes — UI-ul face redirect dacă găsește x-redirect
    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.headers.set("x-redirect", "/app/calendar");
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: typeof e?.message === "string" ? e.message : "Unexpected error." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
