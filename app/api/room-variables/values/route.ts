import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function asString(v: any): string {
  return v === undefined || v === null ? "" : String(v);
}

async function readBody(req: Request): Promise<any> {
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      return await req.json();
    }
    // fallback: poate vine ca text/plain sau fără header
    const txt = await req.text();
    try {
      return JSON.parse(txt);
    } catch {
      return {};
    }
  } catch {
    return {};
  }
}

// GET /api/room-variables/values?property=PROPERTY_ID&room=ROOM_ID
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const property = asString(searchParams.get("property"));
    const room = asString(searchParams.get("room"));

    if (!property || !room) {
      return NextResponse.json(
        { ok: false, error: "property and room required" },
        { status: 400 }
      );
    }

    const s = sb();
    const { data, error } = await s
      .from("room_variables")
      .select("key,value")
      .eq("property_id", property)
      .eq("room_id", room)
      .order("key", { ascending: true });

    if (error) throw error;

    const items = (data || []).map((r) => ({ key: r.key, value: r.value }));
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

// POST /api/room-variables/values
// Body acceptat (oricare dintre formate):
//  A) { property_id, room_id, values: { [key]: value } }
//  B) { property_id, room_id, items: [{ def_key?: string, key?: string, value: string }, ...] }
//  + fallback din query (?property=...&room=...) sau headers (x-property-id / x-room-id)
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await readBody(req);

    let property_id =
      asString(body?.property_id) ||
      asString(body?.property) ||
      asString(searchParams.get("property")) ||
      asString(req.headers.get("x-property-id"));

    let room_id =
      asString(body?.room_id) ||
      asString(body?.room) ||
      asString(searchParams.get("room")) ||
      asString(req.headers.get("x-room-id"));

    // normalize: transformă string-urile "null"/"undefined" în gol
    if (property_id === "null" || property_id === "undefined") property_id = "";
    if (room_id === "null" || room_id === "undefined") room_id = "";

    if (!property_id || !room_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "property_id and room_id required",
          debug: {
            bodyKeys: body && typeof body === "object" ? Object.keys(body) : [],
            query: Object.fromEntries(searchParams.entries()),
            ct: req.headers.get("content-type") || "",
          },
        },
        { status: 400 }
      );
    }

    // construim rândurile pentru upsert
    const rows: Array<{
      property_id: string;
      room_id: string;
      key: string;
      value: string;
    }> = [];

    if (body?.values && typeof body.values === "object") {
      for (const [k, v] of Object.entries(body.values)) {
        const key = asString(k);
        if (!key) continue;
        const value = asString(v);
        rows.push({ property_id, room_id, key, value });
      }
    } else if (Array.isArray(body?.items)) {
      for (const it of body.items) {
        const key = asString(it?.def_key || it?.key);
        if (!key) continue;
        const value = asString(it?.value);
        rows.push({ property_id, room_id, key, value });
      }
    }

    // nimic de salvat -> OK
    if (rows.length === 0) {
      return NextResponse.json({ ok: true, saved: 0 });
    }

    const s = sb();
    const { error } = await s
      .from("room_variables")
      .upsert(rows, { onConflict: "property_id,room_id,key" });

    if (error) throw error;

    return NextResponse.json({ ok: true, saved: rows.length });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}