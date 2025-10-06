// app/api/reservation-message/templates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function GET(req: NextRequest) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user; if (!user) return bad(401, { error: "Not authenticated" });

    const { searchParams } = new URL(req.url);
    const property_id = searchParams.get("property");
    if (!property_id) return bad(400, { error: "Missing ?property" });

    const r = await supa
      .from("reservation_templates")
      .select("id, property_id, title, status, updated_at")
      .eq("property_id", property_id)
      .order("updated_at", { ascending: false });
    if (r.error) return bad(400, { error: r.error.message });
    return NextResponse.json({ ok: true, items: r.data ?? [] });
  } catch (e: any) {
    return bad(500, { error: e?.message || "Unexpected error" });
  }
}

