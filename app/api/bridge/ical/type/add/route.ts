import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const { propertyId, roomTypeId, provider, url } = await req.json();
  if (!propertyId || !roomTypeId || !provider || !url) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const ins = await supabase.from("ical_type_integrations").insert({
    property_id: propertyId, room_type_id: roomTypeId, provider, url
  });
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
