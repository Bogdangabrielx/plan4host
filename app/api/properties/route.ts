import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = (body?.name ?? "").toString().trim();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const country_code = (body?.country_code ?? "").toString().trim() || null;
  const timezone = (body?.timezone ?? "").toString().trim() || null;
  const check_in_time = (body?.check_in_time ?? "").toString().trim() || null;
  const check_out_time = (body?.check_out_time ?? "").toString().trim() || null;

  const insertRow: any = {
    name,
    account_id: user.id,
    admin_id: user.id,
    country_code,
    timezone,
    check_in_time,
    check_out_time,
    // Seed a default presentation image so selectors show a photo immediately
    presentation_image_url: "/hotel_room_1456x816.jpg",
    presentation_image_uploaded_at: new Date().toISOString(),
  };

  const { error, data } = await supabase
    .from("properties")
    .insert(insertRow)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, property: data });
}
