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

// helpers pentru detecția unor erori comune
function looksEnumHoldError(msg?: string) {
  return !!msg && /invalid input value for enum .*: "hold"/i.test(msg);
}
function looksForeignKeyOrOverlap(msg?: string) {
  return !!msg && /(foreign key|duplicate key|unique|overlap|exclusion)/i.test(msg);
}

// găsește o cameră liberă pentru un tip, în intervalul [start_date, end_date)
// întoarce primul id găsit (sortare alfabetică)
async function findFreeRoomForType(opts: {
  property_id: string;
  room_type_id: string;
  start_date: string; // yyyy-mm-dd
  end_date: string;   // yyyy-mm-dd
}): Promise<string | null> {
  const { property_id, room_type_id, start_date, end_date } = opts;

  // 1) camere candidate (de acel tip, la proprietatea respectivă)
  const rRooms = await admin
    .from("rooms")
    .select("id,name")
    .eq("property_id", property_id)
    .eq("room_type_id", room_type_id)
    .order("name", { ascending: true });

  if (rRooms.error || !rRooms.data || rRooms.data.length === 0) return null;
  const candIds = rRooms.data.map((r) => r.id as string);

  // 2) booking-uri care se suprapun
  const rBusy = await admin
    .from("bookings")
    .select("room_id,start_date,end_date,status")
    .in("room_id", candIds)
    .neq("status", "cancelled")
    .lt("start_date", end_date) // start < newEnd
    .gt("end_date", start_date); // end > newStart

  const busy = new Set<string>();
  if (!rBusy.error) {
    for (const b of rBusy.data ?? []) {
      if (b.room_id) busy.add(String(b.room_id));
    }
  }

  // 3) alege prima cameră liberă
  const free = candIds.find((id) => !busy.has(id));
  return free ?? null;
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

      // selecții din form
      requested_room_id,
      requested_room_type_id, // ← folosim pentru auto-assign dacă room_id nu e setat

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

    if (rProp.error) return NextResponse.json({ error: rProp.error.message }, { status: 500 });
    if (!rProp.data) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const checkInDefault  = rProp.data.check_in_time  ?? "14:00";
    const checkOutDefault = rProp.data.check_out_time ?? "11:00";

    const start_time = clampTime(start_time_client, checkInDefault);
    const end_time   = clampTime(end_time_client,   checkOutDefault);

    // 2) Determină room_id: prioritar cel ales explicit; altfel auto-assign după room_type_id
    let room_id: string | null = requested_room_id ?? null;
    if (!room_id && requested_room_type_id) {
      room_id = await findFreeRoomForType({
        property_id,
        room_type_id: String(requested_room_type_id),
        start_date,
        end_date,
      });
    }

    // 3) Construim payload minim (evităm coloane care pot lipsi în schema ta)
    //    Inserăm fără câmpurile de soft-hold, apoi le setăm prin UPDATE „best-effort”.
    const basePayload: any = {
      property_id,
      room_id: room_id ?? null,
      start_date,
      end_date,
      start_time,
      end_time,
      status: "hold",
      guest_first_name: guest_first_name ?? null,
      guest_last_name:  guest_last_name ?? null,
    };

    // 4) Insert principal, cu fallback la 'pending' dacă enumul 'hold' nu există
    let ins = await admin.from("bookings").insert(basePayload).select("id").single();

    if (ins.error && looksEnumHoldError(ins.error.message)) {
      basePayload.status = "pending";
      ins = await admin.from("bookings").insert(basePayload).select("id").single();
    }

    // Dacă insertul cu room_id pică din cauza FK/overlap, reîncearcă fără room_id
    if (ins.error && room_id && looksForeignKeyOrOverlap(ins.error.message)) {
      const fallbackPayload = { ...basePayload, room_id: null };
      ins = await admin.from("bookings").insert(fallbackPayload).select("id").single();
    }

    if (ins.error) {
      return NextResponse.json({ error: ins.error.message }, { status: 500 });
    }

    const newId = ins.data.id as string;

    // 5) Upgrade opțional: setăm câmpurile de soft-hold dacă schema le are (ignore dacă nu)
    try {
      await admin
        .from("bookings")
        .update({
          is_soft_hold: true,
          hold_status: "active",
          hold_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        } as any)
        .eq("id", newId);
    } catch {
      // ignorăm silențios — dacă lipsesc coloanele, inserția rămâne valabilă
    }

    return NextResponse.json({
      ok: true,
      id: newId,
      auto_assigned_room_id: room_id ?? null,
      start_date,
      end_date,
      start_time,
      end_time,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}