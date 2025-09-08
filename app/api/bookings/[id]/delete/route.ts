// app/api/bookings/[id]/delete/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Dacă ai ON DELETE CASCADE pe tabelele child, e suficient un singur delete:
  // altfel, ștergem manual child-urile înainte (best-effort).
  try {
    await admin.from("booking_check_values").delete().eq("booking_id", id);
  } catch {}
  try {
    await admin.from("booking_text_values").delete().eq("booking_id", id);
  } catch {}
  try {
    await admin.from("booking_contacts").delete().eq("booking_id", id);
  } catch {}

  const del = await admin.from("bookings").delete().eq("id", id).select("id").maybeSingle();
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 400 });
  if (!del.data) return NextResponse.json({ error: "Not found or already deleted" }, { status: 404 });

  return NextResponse.json({ ok: true });
}