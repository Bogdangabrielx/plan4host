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

// erori cunoscute
function looksEnumHoldError(msg?: string) {
  return !!msg && /invalid input value for enum .*: "hold"/i.test(msg);
}
function looksForeignKeyOrOverlap(msg?: string) {
  return !!msg && /(foreign key|duplicate key|unique|overlap|exclusion)/i.test(msg);
}

// room_id valid doar dacă aparține proprietății
async function normalizeRoomId(room_id: any, property_id: string): Promise<string | null> {
  if (!room_id) return null;
  const r = await admin.from("rooms").select("id,property_id").eq("id", room_id).maybeSingle();
  if (r.error || !r.data) return null;
  return r.data.property_id === property_id ? String(r.data.id) : null;
}

// auto-assign: prima cameră liberă pentru un tip în [start_date, end_date)
async function findFreeRoomForType(opts: {
  property_id: string;
  room_type_id: string;
  start_date: string;
  end_date: string;
}): Promise<string | null> {
  const { property_id, room_type_id, start_date, end_date } = opts;

  const rRooms = await admin
    .from("rooms")
    .select("id,name")
    .eq("property_id", property_id)
    .eq("room_type_id", room_type_id)
    .order("name", { ascending: true });

  if (rRooms.error || !rRooms.data || rRooms.data.length === 0) return null;
  const candIds = rRooms.data.map((r) => r.id as string);

  const rBusy = await admin
    .from("bookings")
    .select("room_id,start_date,end_date,status")
    .in("room_id", candIds)
    .neq("status", "cancelled")
    .lt("start_date", end_date)
    .gt("end_date", start_date);

  const busy = new Set<string>();
  if (!rBusy.error) for (const b of rBusy.data ?? []) if (b.room_id) busy.add(String(b.room_id));

  return candIds.find((id) => !busy.has(id)) ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      property_id,
      start_date,
      end_date,

      // guest
      guest_first_name,
      guest_last_name,

      // selecții
      requested_room_id,
      requested_room_type_id,

      // times (fallback la CI/CO)
      start_time: start_time_client,
      end_time: end_time_client,

      // contact (opționale)
      email,
      phone,
      address,
      city,
      country,
    } = body ?? {};

    if (!property_id || !isYMD(start_date) || !isYMD(end_date)) {
      return NextResponse.json({ error: "Missing/invalid property_id or dates" }, { status: 400 });
    }
    if (end_date <= start_date) {
      return NextResponse.json({ error: "end_date must be after start_date" }, { status: 400 });
    }

    // 1) CI/CO din proprietate
    const rProp = await admin
      .from("properties")
      .select("id,check_in_time,check_out_time")
      .eq("id", property_id)
      .maybeSingle();

    if (rProp.error) return NextResponse.json({ error: rProp.error.message }, { status: 500 });
    if (!rProp.data) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const checkInDefault  = rProp.data.check_in_time  ?? "14:00";
    const checkOutDefault = rProp.data.check_out_time ?? "11:00";

    const start_time = clampTime(start_time_client, checkInDefault);
    const end_time   = clampTime(end_time_client,   checkOutDefault);

    // 2) determină room_id: explicit validat, altfel auto-assign pe tip
    let room_id: string | null = await normalizeRoomId(requested_room_id, property_id);
    if (!room_id && requested_room_type_id) {
      room_id = await findFreeRoomForType({
        property_id,
        room_type_id: String(requested_room_type_id),
        start_date,
        end_date,
      });
    }

    // 3) insert minimal
    const basePayload: any = {
      property_id,
      room_id: room_id ?? null,
      start_date,
      end_date,
      start_time,
      end_time,
      status: "hold", // fallback la 'pending' dacă enumul nu există
      guest_first_name: guest_first_name ?? null,
      guest_last_name:  guest_last_name  ?? null,
    };

    let ins = await admin.from("bookings").insert(basePayload).select("id").single();
    if (ins.error && looksEnumHoldError(ins.error.message)) {
      basePayload.status = "pending";
      ins = await admin.from("bookings").insert(basePayload).select("id").single();
    }
    if (ins.error && room_id && looksForeignKeyOrOverlap(ins.error.message)) {
      const fallbackPayload = { ...basePayload, room_id: null };
      ins = await admin.from("bookings").insert(fallbackPayload).select("id").single();
    }
    if (ins.error || !ins.data) {
      return NextResponse.json({ error: ins.error?.message || "Insert failed" }, { status: 500 });
    }

    const bookingId = ins.data.id as string;

    // 4) best-effort UPDATE pentru câmpurile care pot lipsi în schema ta
    const compositeAddress = [address, city, country].filter(Boolean).join(", ").trim() || null;

    const updates: any = {
      is_soft_hold: true,
      hold_status: "active",
      hold_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      form_submitted_at: new Date().toISOString(),
      source: "form",
      guest_email: email ?? null,
      guest_phone: phone ?? null,
      guest_address: compositeAddress,
    };
    if (requested_room_type_id) updates.room_type_id = String(requested_room_type_id);

    try {
      await admin.from("bookings").update(updates).eq("id", bookingId);
    } catch {
      // ignorăm dacă lipsesc coloanele — insertul rămâne valid
    }

    // 5) opțional: normalizat și în booking_contacts (dacă ai tabela + unique(booking_id))
    let contact_saved = false;
    if (email || phone || address || city || country) {
      try {
        const up = await admin
          .from("booking_contacts")
          .upsert(
            {
              booking_id: bookingId,
              email: email ?? null,
              phone: phone ?? null,
              address: address ?? null,
              city: city ?? null,
              country: country ?? null,
            },
            { onConflict: "booking_id" }
          )
          .select("booking_id")
          .single();
        contact_saved = !up.error;
      } catch {
        contact_saved = false;
      }
    }

    return NextResponse.json({
      ok: true,
      id: bookingId,
      property_id,
      auto_assigned_room_id: room_id ?? null,
      start_date,
      end_date,
      start_time,
      end_time,
      contact_saved,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}