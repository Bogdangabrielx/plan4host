import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

const ALLOWED = new Set(["email", "phone", "address", "city", "country"]);

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const r = await admin.from("booking_contacts").select("*").eq("booking_id", id).maybeSingle();
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });
  return NextResponse.json({ contact: r.data ?? null });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch {}
  const payload: Record<string, any> = { booking_id: id };
  for (const k of Object.keys(body)) {
    if (ALLOWED.has(k) && body[k] !== undefined) payload[k] = body[k];
  }
  const up = await admin.from("booking_contacts").upsert(payload, { onConflict: "booking_id" }).select("*").single();
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, contact: up.data });
}