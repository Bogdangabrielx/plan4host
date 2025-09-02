import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const { eventId } = await req.json().catch(() => ({}));
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const ev = await supabase
    .from("ical_unassigned_events")
    .select("id,property_id")
    .eq("id", eventId)
    .maybeSingle();
  if (ev.error || !ev.data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const del = await supabase.from("ical_unassigned_events").delete().eq("id", ev.data.id);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
