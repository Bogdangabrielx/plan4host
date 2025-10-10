// app/api/room-variables/definitions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

// mic util: transformă "Room key" -> "room_key"
function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function bad(status: number, body: any) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

// GET /api/room-variables/definitions?property=<id>
// Listează definițiile pentru proprietate
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const property_id = searchParams.get("property");
  if (!property_id) return bad(400, { error: "Missing ?property=<id>" });

  const { data, error } = await admin
    .from("room_variable_definitions")
    .select("id, property_id, key, label, created_at, updated_at")
    .eq("property_id", property_id)
    .order("created_at", { ascending: true });

  if (error) return bad(500, { error: error.message });
  return NextResponse.json({ ok: true, items: data ?? [] }, { headers: { "Cache-Control": "no-store, max-age:0" } });
}

// POST /api/room-variables/definitions
// body: { property_id: string, label: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const property_id = String(body?.property_id || "").trim();
    const label = String(body?.label || "").trim();

    if (!property_id) return bad(400, { error: "Missing property_id" });
    if (!label) return bad(400, { error: "Missing label" });

    const key = slugify(label);
    if (!key) return bad(400, { error: "Invalid label" });

    // insert; dacă există deja (unicitate pe (property_id,key)), nu aruncăm 500
    const ins = await admin
      .from("room_variable_definitions")
      .insert({ property_id, key, label })
      .select("id, property_id, key, label, created_at, updated_at")
      .single();

    if (ins.error) {
      // dacă e duplicat, întoarcem un mesaj clar
      const msg = ins.error.message || "";
      if (/duplicate key value|unique constraint/i.test(msg)) {
        return bad(409, { error: "Definition already exists", key, label });
      }
      return bad(500, { error: msg || "Insert failed" });
    }

    return NextResponse.json({ ok: true, definition: ins.data }, { headers: { "Cache-Control": "no-store, max-age:0" } });
  } catch (e: any) {
    return bad(500, { error: e?.message || "Unexpected error" });
  }
}