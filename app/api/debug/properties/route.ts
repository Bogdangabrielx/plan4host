// app/api/debug/properties/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = createClient();

  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const { data, error } = await supabase
      .from("properties")
      .select("id,name,admin_id,check_in_time,check_out_time,created_at")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        userId: user.id,
        count: Array.isArray(data) ? data.length : 0,
        properties: Array.isArray(data) ? data : [],
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}

