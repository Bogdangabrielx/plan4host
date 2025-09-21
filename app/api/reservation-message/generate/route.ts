// app/api/reservation-message/generate/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

function token() {
  // short url-safe token
  const a = Math.random().toString(36).slice(2, 10);
  const b = Math.random().toString(36).slice(2, 10);
  return `${a}${b}`;
}

export async function POST(req: Request) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user; if (!user) return bad(401, { error: "Not authenticated" });

    const body = await req.json().catch(() => ({}));
    const property_id: string | undefined = body?.property_id;
    const booking_id: string | undefined  = body?.booking_id;
    const manual_values: Record<string,string> = (body?.values || {}) as any;
    if (!property_id || !booking_id) return bad(400, { error: "property_id and booking_id required" });

    // Verify booking belongs to property and is not cancelled
    const rBk = await supa
      .from("bookings")
      .select("id, property_id, end_date, status")
      .eq("id", booking_id)
      .maybeSingle();
    if (rBk.error || !rBk.data) return bad(404, { error: "Booking not found" });
    if ((rBk.data as any).property_id !== property_id) return bad(400, { error: "Booking not in property" });
    if ((rBk.data as any).status === 'cancelled') return bad(400, { error: "Booking cancelled" });

    const endDate = (rBk.data as any).end_date as string; // YYYY-MM-DD
    const expiresAt = endDate ? new Date(`${endDate}T00:00:00Z`) : null;
    if (expiresAt) expiresAt.setUTCDate(expiresAt.getUTCDate() + 1);

    // Upsert message (unique per property+booking)
    // Try to keep existing token if present
    const existing = await supa
      .from("reservation_messages")
      .select("id, token")
      .eq("property_id", property_id)
      .eq("booking_id", booking_id)
      .maybeSingle();

    const set = {
      property_id,
      booking_id,
      token: existing.data?.token || token(),
      status: 'active',
      manual_values: manual_values || {},
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    } as any;

    let up;
    if (existing.data) {
      up = await supa
        .from("reservation_messages")
        .update(set)
        .eq("id", (existing.data as any).id)
        .select("token")
        .single();
    } else {
      up = await supa
        .from("reservation_messages")
        .insert(set)
        .select("token")
        .single();
    }

    if (up.error || !up.data) return bad(400, { error: up.error?.message || "Failed to save message" });
    const tok = (up.data as any).token as string;

    const base = (process.env.NEXT_PUBLIC_APP_URL || '').toString().trim().replace(/\/+$/, '');
    const url = `${base}/r/${tok}`;
    return NextResponse.json({ ok: true, token: tok, url, expires_at: expiresAt ? expiresAt.toISOString() : null });
  } catch (e: any) {
    return bad(500, { error: e?.message || "Unexpected error" });
  }
}

