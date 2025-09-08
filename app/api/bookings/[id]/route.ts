// app/api/bookings/[id]/route.ts (doar DELETE-ul)
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createAdmin(url, service, { auth: { persistSession: false } });

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  // 0) Luăm booking-ul ca să vedem dacă e iCal
  const rGet = await admin
    .from("bookings")
    .select("id,property_id,source,ical_uid")
    .eq("id", id)
    .maybeSingle();

  if (rGet.error) return NextResponse.json({ error: rGet.error.message }, { status: 400 });
  if (!rGet.data)  return NextResponse.json({ error: "Already deleted" }, { status: 404 });

  const { property_id, source, ical_uid } = rGet.data as {
    property_id: string; source: string | null; ical_uid: string | null;
  };

  // 1) Dacă e iCal: mutăm în "mute list" ca să nu mai fie re-importat
  let via: "rls" | "admin" | "muted_ical" = "admin";
  if (ical_uid || (source && source.toLowerCase() === "ical")) {
    await admin
      .from("ical_suppressions")
      .upsert({ property_id, ical_uid }, { onConflict: "property_id,ical_uid" });
    via = "muted_ical";
  }

  // 2) Ștergem child-urile best-effort, apoi booking-ul
  try { await admin.from("booking_contacts").delete().eq("booking_id", id); } catch {}
  try { await admin.from("booking_check_values").delete().eq("booking_id", id); } catch {}
  try { await admin.from("booking_text_values").delete().eq("booking_id", id); } catch {}

  const del = await admin.from("bookings").delete().eq("id", id).select("id").maybeSingle();
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 400 });

  return NextResponse.json({ ok: true, via });
}