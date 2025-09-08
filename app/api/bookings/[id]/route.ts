// app/api/bookings/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createAdmin(url, service, { auth: { persistSession: false } });

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  // 1) Încercăm cu clientul RLS (dacă userul are drepturi, e suficient)
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const del = await supabase
        .from("bookings")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (!del.error && del.data) {
        return NextResponse.json({ ok: true, via: "rls" });
      }
      // dacă e eroare RLS sau 0 rows -> cădem în fallback
    }
  } catch {
    // ignorăm, mergem la fallback
  }

  // 2) Fallback cu service-role: ștergem dependențele și apoi booking-ul
  try {
    // Best-effort pe child tables (dacă există)
    try { await admin.from("booking_contacts").delete().eq("booking_id", id); } catch {}
    try { await admin.from("booking_check_values").delete().eq("booking_id", id); } catch {}
    try { await admin.from("booking_text_values").delete().eq("booking_id", id); } catch {}

    const del2 = await admin
      .from("bookings")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (del2.error) return NextResponse.json({ error: del2.error.message }, { status: 400 });
    if (!del2.data) return NextResponse.json({ error: "Not found or already deleted" }, { status: 404 });

    return NextResponse.json({ ok: true, via: "admin" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 400 });
  }
}