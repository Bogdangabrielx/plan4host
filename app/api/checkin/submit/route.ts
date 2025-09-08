import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

type Payload = {
  propertyId?: string;
  roomTypeId?: string | null;
  roomId?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  startDate?: string;
  endDate?: string;
  consentRegulation?: boolean;
  consentGdpr?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Payload;

    const {
      propertyId,
      roomTypeId,
      roomId,
      firstName,
      lastName,
      email,
      phone,
      address,
      startDate,
      endDate,
      consentRegulation,
      consentGdpr,
    } = body;

    if (!propertyId) return bad(400, { error: "propertyId required" });
    if (!firstName || !lastName || !email) return bad(400, { error: "name and email are required" });
    if (!startDate || !endDate) return bad(400, { error: "dates required" });
    if (!consentRegulation || !consentGdpr) return bad(400, { error: "consents required" });

    if (!roomTypeId && !roomId) return bad(400, { error: "roomTypeId or roomId required" });

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!SUPABASE_URL || !SERVICE_KEY) return bad(500, { error: "Missing service credentials" });
    const admin = createAdmin(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // Validate property exists
    const prop = await admin.from("properties").select("id").eq("id", propertyId).maybeSingle();
    if (prop.error || !prop.data) return bad(404, { error: "Property not found" });

    // Optional: validate room/roomType belongs to property
    if (roomTypeId) {
      const rt = await admin.from("room_types").select("id,property_id").eq("id", roomTypeId).maybeSingle();
      if (rt.error || !rt.data || rt.data.property_id !== propertyId) return bad(400, { error: "Invalid room type" });
    }
    if (roomId) {
      const rr = await admin.from("rooms").select("id,property_id").eq("id", roomId).maybeSingle();
      if (rr.error || !rr.data || rr.data.property_id !== propertyId) return bad(400, { error: "Invalid room" });
    }

    const ins = await admin
      .from("guest_checkin_forms")
      .insert({
        property_id: propertyId,
        room_type_id: roomTypeId || null,
        room_id: roomId || null,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        address: address || null,
        start_date: startDate,
        end_date: endDate,
        consent_regulation: !!consentRegulation,
        consent_gdpr: !!consentGdpr,
        source: 'public_form',
      })
      .select("id,created_at")
      .maybeSingle();
    if (ins.error || !ins.data) return bad(500, { error: ins.error?.message || "Insert failed" });

    return NextResponse.json({ ok: true, id: ins.data.id });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}

