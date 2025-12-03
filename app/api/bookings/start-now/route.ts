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
 * body: { booking_id: string, property_id: string }
 *
 * Sets bookings.start_time to the current local time for the property's timezone.
 * The date (start_date) is not changed.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const booking_id: string = String(body?.booking_id || "").trim();
    const property_id: string = String(body?.property_id || "").trim();

    if (!booking_id || !property_id) {
      return bad(400, { error: "booking_id and property_id are required" });
    }

    const [rBooking, rProp] = await Promise.all([
      admin
        .from("bookings")
        .select("id, property_id")
        .eq("id", booking_id)
        .maybeSingle(),
      admin
        .from("properties")
        .select("id, timezone")
        .eq("id", property_id)
        .maybeSingle(),
    ]);

    if (rBooking.error || !rBooking.data) {
      return bad(404, { error: "Booking not found" });
    }
    if (rProp.error || !rProp.data) {
      return bad(404, { error: "Property not found" });
    }
    if ((rBooking.data as any).property_id !== property_id) {
      return bad(400, { error: "Booking does not belong to this property" });
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

