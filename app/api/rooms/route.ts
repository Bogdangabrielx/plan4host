import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const property_id = (body?.property_id ?? "").toString();
  const name = (body?.name ?? "").toString().trim();
  const capacityRaw = body?.capacity;
  const capacity = Number.isFinite(Number(capacityRaw)) ? Math.max(1, parseInt(String(capacityRaw), 10)) : 1;

  if (!property_id) return NextResponse.json({ error: "property_id required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { error, data } = await supabase
    .from("rooms")
    .insert({ property_id, name, capacity })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, room: data });
}
