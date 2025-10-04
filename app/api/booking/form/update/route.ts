import { NextResponse } from "next/server";
import { createClient as createRls } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function j(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/booking/form/update
 * body: { booking_id, start_date, end_date, room_id?, room_type_id? }
 * Rules:
 * - must be authenticated and have access to the property's booking via RLS
 * - booking must be a *form-only* booking (source='form')
 * - updates only allowed for start_date, end_date, and ONE of room_id / room_type_id
 * - room_id / room_type_id must belong to the same property
 */
export async function POST(req: Request) {
  try {
    const rls = createRls();
    const { data: auth } = await rls.auth.getUser();
    if (!auth?.user) return j(401, { error: "Not authenticated" });

    const body = await req.json().catch(() => ({}));
    const booking_id = String(body?.booking_id || "").trim();
    const start_date = String(body?.start_date || "").trim();
    const end_date = String(body?.end_date || "").trim();
    const room_id = body?.room_id ? String(body.room_id).trim() : null;
    const room_type_id = body?.room_type_id ? String(body.room_type_id).trim() : null;

    if (!booking_id) return j(400, { error: "booking_id required" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) return j(400, { error: "start_date must be YYYY-MM-DD" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end_date)) return j(400, { error: "end_date must be YYYY-MM-DD" });
    if (end_date < start_date) return j(400, { error: "end_date cannot be before start_date" });

    // Only one of room_id / room_type_id is allowed
    if (room_id && room_type_id) {
      return j(400, { error: "Provide only one of room_id or room_type_id." });
    }

    // Load booking via RLS (access enforced)
    const { data: bk, error: eBk } = await rls
      .from("bookings")
      .select("id, property_id, source, room_id, room_type_id")
      .eq("id", booking_id)
      .maybeSingle();

    if (eBk || !bk) return j(404, { error: "Booking not found" });

    // Must be form-only booking
    const src = (bk as any).source?.toString().toLowerCase();
    if (src !== "form") {
      return j(409, { error: "Only form-only bookings can be edited here." });
    }

    const property_id = (bk as any).property_id as string;

    // Verify chosen room_id / room_type_id belongs to the same property (if provided)
    if (room_id) {
      const { data: room, error: eRoom } = await rls
        .from("rooms")
        .select("id")
        .eq("id", room_id)
        .eq("property_id", property_id)
        .maybeSingle();
      if (eRoom || !room) return j(400, { error: "Invalid room_id for this property." });
    }
    if (room_type_id) {
      const { data: rt, error: eRT } = await rls
        .from("room_types")
        .select("id")
        .eq("id", room_type_id)
        .eq("property_id", property_id)
        .maybeSingle();
      if (eRT || !rt) return j(400, { error: "Invalid room_type_id for this property." });
    }

    // To avoid partial RLS issues when flipping fields, use admin after access check
    const admin = createAdmin(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Prepare update payload
    const update: Record<string, any> = {
      start_date,
      end_date,
    };

    // Honor the rule "if property has room types → keep editing by type; else by room"
    // The caller already sends only one. We also clear the other side to avoid mismatched states.
    if (room_type_id !== null) {
      update.room_type_id = room_type_id || null;
      update.room_id = null; // clear room
    } else if (room_id !== null) {
      update.room_id = room_id || null;
      update.room_type_id = null; // clear type
    }

    const rUp = await admin.from("bookings").update(update).eq("id", booking_id);
    if (rUp.error) return j(500, { error: rUp.error.message });

    return j(200, { ok: true, booking_id, start_date, end_date, room_id: update.room_id ?? null, room_type_id: update.room_type_id ?? null });
  } catch (e: any) {
    return j(500, { error: e?.message || "Server error" });
  }
}