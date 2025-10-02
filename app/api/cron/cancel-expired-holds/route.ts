// app/api/cron/cancel-expired-holds/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET  = (process.env.CRON_SECRET || "").toString();

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function getToken(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("token");
  const h1 = req.headers.get("x-cron-secret");
  const auth = req.headers.get("authorization");
  const bearer = auth?.replace(/^Bearer\s+/i, "");
  return q || h1 || bearer || "";
}

export async function GET(req: Request) {
  // Protecție: acceptă Vercel Cron (x-vercel-cron) sau token în query/header
  const isVercelCron = !!req.headers.get("x-vercel-cron");
  if (CRON_SECRET && !isVercelCron && getToken(req) !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const r = await admin.rpc("cancel_expired_form_holds");
    if (r.error) {
      return NextResponse.json({ ok: false, error: r.error.message }, { status: 500 });
    }
    return NextResponse.json(
      { ok: true, affected: r.data ?? 0 },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
