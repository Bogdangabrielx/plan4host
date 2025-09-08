// app/api/checkin/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

// yyyy-mm-dd validator
function isYMD(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// HH:mm normalizer (fallback sigur)
function clampTime(t: unknown, fallback: string): string {
  if (typeof t !== "string") return fallback;
  const m = t.match(/^(\d{1,2}):(\d{1,2})/);
  if (!m) return fallback;
  let hh = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  let mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// Trimitem DOAR coloanele sigure din `bookings`
const ALLOWED_BOOKING_KEYS = new Set<string>([
  "property_id",
  "room_id",
  "room_type_id",
  "start_date",
  "end_date",
  "start_time",
  "end_time",
  "status",
  "is_soft_hold",
  "hold_status",
  "hold_expires_at",
  "guest_first_name",
  "guest_last_name",
]);

function pickBookingPayload(obj: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    if (ALLOWED_BOOKING_KEYS.has(k) && obj[k] !== undefined) {
      out[k] = obj[k];
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      property_id,
      start_date,
      end_date,

      // guest (scriem doar numele în bookings)
      guest_first_name,
      guest_last_name,

      // selecții din form
      requested_room_type_id,
      requested_room_id,

      // opțional din client; dacă lipsesc, folosim orele din configurator
      start_time: start_time_client,
      end_time: end_time_client,
    } = body ?? {};

    if (!property_id || !isYMD(start_date) || !isYMD(end_date)) {
      return NextResponse.json({ error: "Missing/invalid property_id or dates" }, { status: 400 });
    }
    if (end_date <= start_date) {
      return NextResponse.json({ error: "end_date must be after start_date" }, { status: 400 });
    }

    // 1) Orele din configurator
    const rProp = await admin
      .from("properties")
      .select("id,check_in_time,check_out_time")
      .eq("id", property_id)
      .maybeSingle();

    if (rProp.error) {
      return NextResponse.json({ error: rProp.error.message }, { status: 500 });
    }
    if (!rProp.data) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const checkInDefault  = rProp.data.check_in_time  ?? "14:00";
    const checkOutDefault = rProp.data.check_out_time ?? "11:00";

    // 2) Normalize times (client → fallback configurator)
    const start_time = clampTime(start_time_client, checkInDefault);
    const end_time   = clampTime(end_time_client,   checkOutDefault);

    // 3) Soft-hold 2h + nume oaspete
    const now = new Date();
    const holdUntilISO = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

    const rawPayload: Record<string, any> = {
      property_id,
      room_id: requested_room_id ?? null,
      room_type_id: requested_room_type_id ?? null,
      start_date,
      end_date,
      start_time,
      end_time,
      status: "hold",
      is_soft_hold: true,
      hold_status: "active",
      hold_expires_at: holdUntilISO,
      guest_first_name: guest_first_name ?? null,
      guest_last_name:  guest_last_name ?? null,
      // ❌ NU trimitem: form_submitted_at, source, email/phone/address/city/country (pot lipsi din schema)
    };

    const payload = pickBookingPayload(rawPayload);

    const rIns = await admin.from("bookings").insert(payload).select("id").single();
    if (rIns.error) {
      return NextResponse.json({ error: rIns.error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      id: rIns.data.id,
      start_date,
      end_date,
      start_time,
      end_time,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}