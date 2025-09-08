import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const propertyId = u.searchParams.get("propertyId");
    if (!propertyId) return bad(400, { error: "propertyId required" });

    // Use admin client so this endpoint works without authentication
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) return bad(500, { error: "Missing service credentials" });
    const admin = createAdmin(url, serviceKey, { auth: { persistSession: false } });

    const row = await admin
      .from("properties")
      .select("regulation_pdf_url, regulation_pdf_uploaded_at")
      .eq("id", propertyId)
      .maybeSingle();
    if (row.error || !row.data) return bad(404, { error: "Not found" });

    return NextResponse.json({
      ok: true,
      url: row.data.regulation_pdf_url,
      uploaded_at: row.data.regulation_pdf_uploaded_at,
    });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}
