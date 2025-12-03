import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createAdmin(url, service, { auth: { persistSession: false } });

function bad(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function getLocalHHMM(tz: string | null | undefined): string {
  const timeZone = (tz && tz.trim()) || "Europe/Bucharest";
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(now).reduce((acc: any, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
    const hh = String(parts.hour || "00").padStart(2, "0");
    const mm = String(parts.minute || "00").padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
}

/**
 * POST /api/bookings/start-now
 * body: { booking_id?: string, form_id?: string }
 *
 * Identifies the concrete booking row either by its id (booking_id)
 * or by form_id (linked form_bookings.id), then sets bookings.start_time
 * to the current local time for the property's timezone.
 * The date (start_date) is not changed.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const bookingIdRaw: string = String(body?.booking_id || "").trim();
    const formIdRaw: string = String(body?.form_id || "").trim();

    if (!bookingIdRaw && !formIdRaw) {
      return bad(400, { error: "booking_id or form_id is required" });
    }

    const rBooking = await admin
      .from("bookings")
      .select("id, property_id, form_id")
      .eq(bookingIdRaw ? "id" : "form_id", bookingIdRaw || formIdRaw)
      .maybeSingle();

    if (rBooking.error || !rBooking.data) {
      return bad(404, { error: "Booking not found" });
    }

    const booking_id = (rBooking.data as any).id as string;
    const property_id = (rBooking.data as any).property_id as string;
    const rProp = await admin
      .from("properties")
      .select("id, timezone")
      .eq("id", property_id)
      .maybeSingle();
    if (rProp.error || !rProp.data) {
      return bad(404, { error: "Property not found" });
    }

    const tz = (rProp.data as any).timezone as string | null | undefined;
    const nowHHMM = getLocalHHMM(tz);

    const upd = await admin
      .from("bookings")
      .update({ start_time: nowHHMM })
      .eq("id", booking_id)
      .select("id, start_time")
      .maybeSingle();

    if (upd.error || !upd.data) {
      return bad(400, { error: upd.error?.message || "Failed to update start_time" });
    }

    return NextResponse.json({ ok: true, start_time: (upd.data as any).start_time });
  } catch (e: any) {
    return bad(500, { error: e?.message || "Unexpected error" });
  }
}
