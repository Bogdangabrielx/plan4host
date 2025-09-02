import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  if (!propertyId) return NextResponse.json({ items: [], roomsByType: {} });

  const { data: items } = await supabase
    .from("ical_unassigned_events")
    .select("id,property_id,room_type_id,uid,summary,start_date,end_date,start_time,end_time,created_at")
    .eq("property_id", propertyId)
    .eq("resolved", false)
    .order("created_at", { ascending: false });

  // rooms by type
  const { data: types } = await supabase
    .from("room_types").select("id").eq("property_id", propertyId);

  const roomsByType: Record<string, any[]> = {};
  if (types?.length) {
    const typeIds = types.map(t => t.id);
    const { data: rooms } = await supabase
      .from("rooms").select("id,name,room_type_id").in("room_type_id", typeIds);
    for (const r of (rooms ?? [])) {
      (roomsByType[r.room_type_id] = roomsByType[r.room_type_id] || []).push(r);
    }
    for (const k of Object.keys(roomsByType)) {
      roomsByType[k].sort((a,b) => a.name.localeCompare(b.name));
    }
  }

  return NextResponse.json({ items: items ?? [], roomsByType });
}
