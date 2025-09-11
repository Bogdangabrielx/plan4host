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

    // 2) Bootstrap tenant (idempotent, nu dăm fail login pe erori non-critice)

    // 2.a) accounts — folosim default-urile DB (ex. plan='standard', suspended=false)
    //      Evităm să trimitem 'plan' ca text ca să nu lovim enum-uri diferite (plan_t vs plan_tier).
    const { error: accErr } = await supabase
      .from("accounts")
      .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });

    // nu stricăm login-ul dacă bootstrap-ul e blocat de RLS sau concurență
    // (poți loga accErr?.message într-un sistem de logging, dacă ai)

    // 2.b) account_users — verificăm întâi dacă există rândul owner
    const { data: existingAU } = await supabase
      .from("account_users")
      .select("account_id")
      .eq("account_id", user.id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!existingAU) {
      const { error: auErr } = await supabase
        .from("account_users")
        .upsert(
          { account_id: user.id, user_id: user.id, role: "owner" },
          { onConflict: "account_id,user_id", ignoreDuplicates: true }
        );

      // Dacă RLS-ul tău cere Premium pentru INSERT pe account_users, e posibil ca asta să pice.
      // Nu mai propagăm 500 — lăsăm login-ul să continue.
      // (ideal, bootstrap-ul owner se face printr-un RPC SECURITY DEFINER sau la signup)
      void auErr;
    }

    // 3) Succes — UI-ul face redirect dacă găsește x-redirect
    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.headers.set("x-redirect", "/app");
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