import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function bad(status: number, body: any) {
  return NextResponse.json(body, { status });
}

type SaveBody = {
  propertyId?: string;
  houseRulesText?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as SaveBody | null;
    const propertyId = (body?.propertyId || "").toString().trim();
    const houseRulesText = (body?.houseRulesText || "").toString();

    if (!propertyId) return bad(400, { error: "propertyId required" });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return bad(500, {
        error: "Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
      });
    }

    const admin = createAdmin(url, serviceKey, {
      auth: { persistSession: false },
    });

    const { error } = await admin
      .from("properties")
      .update({ ai_house_rules_text: houseRulesText || null })
      .eq("id", propertyId);

    if (error) return bad(500, { error: error.message });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}

