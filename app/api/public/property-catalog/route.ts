// app/api/public/property-catalog/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("property");

    if (!propertyId) {
      return NextResponse.json({ error: "Missing ?property" }, { status: 400 });
    }

    // 1) Property — acum includem și check_in_time / check_out_time (și păstrăm câmpurile vechi)
    const rProp = await admin
      .from("properties")
      .select("id,name,regulation_pdf_url,check_in_time,check_out_time,timezone,contact_email,contact_phone,contact_address,presentation_image_url")
      .eq("id", propertyId)
      .maybeSingle();

    if (rProp.error) {
      return NextResponse.json({ error: rProp.error.message }, { status: 500 });
    }
    if (!rProp.data) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // 2) Room types (dacă există)
    const rTypes = await admin
      .from("room_types")
      .select("id,name")
      .eq("property_id", propertyId)
      .order("name", { ascending: true });

    if (rTypes.error) {
      return NextResponse.json({ error: rTypes.error.message }, { status: 500 });
    }

    // 3) Rooms (fallback când nu există types)
    const rRooms = await admin
      .from("rooms")
      .select("id,name,room_type_id")
      .eq("property_id", propertyId)
      .order("name", { ascending: true });

    if (rRooms.error) {
      return NextResponse.json({ error: rRooms.error.message }, { status: 500 });
    }

    // răspuns compatibil înapoi + noile câmpuri pentru „match perfect”
    return NextResponse.json({
      property: {
        id: rProp.data.id,
        name: rProp.data.name,
        regulation_pdf_url: rProp.data.regulation_pdf_url ?? null,
        check_in_time: rProp.data.check_in_time ?? null,
        check_out_time: rProp.data.check_out_time ?? null,
        timezone: rProp.data.timezone ?? null,
        contact_email: rProp.data.contact_email ?? null,
        contact_phone: rProp.data.contact_phone ?? null,
        contact_address: rProp.data.contact_address ?? null,
        presentation_image_url: rProp.data.presentation_image_url ?? null,
      },
      room_types: rTypes.data ?? [],
      rooms: rRooms.data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
