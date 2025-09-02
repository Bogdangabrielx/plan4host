import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const name = (body?.name ?? "").toString().trim();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const { error, data } = await supabase
    .from("properties")
    .insert({ name, account_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, property: data });
}
