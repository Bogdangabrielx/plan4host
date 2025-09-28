import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "ota-logos";

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

export async function POST(req: Request) {
  try {
    const { integrationId } = await req.json().catch(() => ({ integrationId: "" }));
    const id = String(integrationId || "").trim();
    if (!id) return NextResponse.json({ error: "Missing integrationId" }, { status: 400 });

    // Best-effort remove. It's safe to call even if the file doesn't exist.
    const path = `integration/${id}.png`;
    const res = await admin.storage.from(BUCKET).remove([path]);
    if (res.error) {
      // If object not found or other non-fatal errors, respond 200 but include message
      const msg = res.error.message || "remove failed";
      return NextResponse.json({ ok: true, removed: false, message: msg });
    }
    return NextResponse.json({ ok: true, removed: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Delete failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST with JSON { integrationId }" }, { status: 405 });
}

