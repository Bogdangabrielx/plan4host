import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email } = await req.json().catch(()=>({}));
    if (!email || typeof email !== 'string') return NextResponse.json({ error: 'Email required' }, { status: 400 });
    const supa = createClient();
    const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || '').toString().trim().replace(/\/+$/, '');
    const redirectTo = `${APP_URL || ''}/auth/reset/complete`;
    const { error } = await supa.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

