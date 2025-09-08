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

    // 1) Property (doar câmpurile necesare pentru form)
    const rProp = await admin
      .from("properties")
      .select("id,name,regulation_pdf_url")
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

    return NextResponse.json({
      property: rProp.data,
      room_types: rTypes.data ?? [],
      rooms: rRooms.data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}