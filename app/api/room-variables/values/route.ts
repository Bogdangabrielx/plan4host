import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET /api/room-variables/values?property=PROPERTY_ID&room=ROOM_ID
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const property = searchParams.get("property");
    const room = searchParams.get("room");

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

    // UI acceptă {key,value}; dacă ai cod care așteaptă {def_key,value}, îl poți map-a aici
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
// body (tolerant):
// { property_id, room_id, values: { [key]: value } }
//   SAU
// { property_id, room_id, items: [{ def_key?: string, key?: string, value: string }, ...] }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const property_id = String(body?.property_id || "");
    const room_id = String(body?.room_id || "");

    if (!property_id || !room_id) {
      return NextResponse.json(
        { ok: false, error: "property_id and room_id required" },
        { status: 400 }
      );
    }

    let rows: Array<{ property_id: string; room_id: string; key: string; value: string }> = [];

    if (body?.values && typeof body.values === "object") {
      for (const [k, v] of Object.entries(body.values)) {
        const key = String(k);
        const value = v == null ? "" : String(v);
        if (!key) continue;
        rows.push({ property_id, room_id, key, value });
      }
    } else if (Array.isArray(body?.items)) {
      for (const item of body.items) {
        const key = String(item?.def_key || item?.key || "");
        const value = item?.value == null ? "" : String(item.value);
        if (!key) continue;
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