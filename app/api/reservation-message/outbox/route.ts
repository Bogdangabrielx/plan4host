// app/api/reservation-message/outbox/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function GET(req: NextRequest) {
  try {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const k = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!u || !k) return bad(500, { error: "Missing Supabase service configuration" });
    const admin = createClient(u, k, { auth: { persistSession: false } });

    const booking = req.nextUrl.searchParams.get("booking");
    if (!booking) return bad(400, { error: "booking param required" });

    const { data, error } = await admin
      .from('email_outbox')
      .select('status, created_at, sent_at, error_message, subject, to_email')
      .eq('booking_id', booking)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) return bad(500, { error: error.message });

    const last = (data && data[0]) ? data[0] : null;
    return NextResponse.json({ ok: true, last });
  } catch (e: any) {
    return bad(500, { error: e?.message || 'Unexpected error' });
  }
}

