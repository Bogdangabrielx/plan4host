import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const propertyId = url.searchParams.get("propertyId");
    if (!propertyId) return bad(400, { error: "propertyId required" });

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!SUPABASE_URL || !SERVICE_KEY) return bad(500, { error: "Missing service credentials" });
    const admin = createAdmin(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const rProp = await admin.from("properties").select("id,name").eq("id", propertyId).maybeSingle();
    if (rProp.error || !rProp.data) return bad(404, { error: "Property not found" });

    const rTypes = await admin
      .from("room_types")
      .select("id,name,property_id")
      .eq("property_id", propertyId)
      .order("name", { ascending: true });
    if (rTypes.error) return bad(500, { error: rTypes.error.message });

    let roomsData: any[] = [];
    const types = (rTypes.data ?? []) as any[];
    if (types.length === 0) {
      const rRooms = await admin
        .from("rooms")
        .select("id,name,property_id")
        .eq("property_id", propertyId)
        .order("name", { ascending: true });
      if (rRooms.error) return bad(500, { error: rRooms.error.message });
      roomsData = (rRooms.data ?? []) as any[];
    }

    return NextResponse.json({
      ok: true,
      property: rProp.data,
      roomTypes: types.map((t: any) => ({ id: t.id, name: t.name })),
      rooms: roomsData.map((r: any) => ({ id: r.id, name: r.name })),
    });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}
