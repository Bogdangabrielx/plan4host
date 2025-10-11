import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// -- helper: supabase server client (service role dacă există)
function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET /api/room-variables/definitions?property=PROPERTY_ID
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const property = searchParams.get("property");
    if (!property) {
      return NextResponse.json(
        { ok: false, error: "property required" },
        { status: 400 }
      );
    }

    const s = sb();
    const { data, error } = await s
      .from("room_variable_definitions")
      .select("id,key,label")
      .eq("property_id", property)
      .order("label", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

// POST /api/room-variables/definitions
// body: { property_id: string, label: string, key?: string }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // Method override pentru host-uri unde DELETE nu e permis
    if (body?._method === "DELETE") {
      return DELETE(
        new Request(req.url, {
          method: "DELETE",
          body: JSON.stringify(body),
          headers: { "content-type": "application/json" },
        })
      );
    }

    const property_id = String(body?.property_id || "");
    const label = String(body?.label || "");
    let key: string = String(body?.key || "");

    if (!property_id || !label) {
      return NextResponse.json(
        { ok: false, error: "property_id and label required" },
        { status: 400 }
      );
    }
    if (!key) {
      key = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    }

    const s = sb();

    // upsert idempotent: dacă există (property_id,key) îl actualizează cu label nou și returnează id,key,label
    const { data, error } = await s
      .from("room_variable_definitions")
      .upsert(
        [{ property_id, key, label }],
        { onConflict: "property_id,key" } // IMPORTANT: constraint unic
      )
      .select("id,key,label")
      .limit(1);

    if (error) throw error;
    const row = data?.[0];

    return NextResponse.json(
      { ok: true, id: row?.id, key: row?.key, label: row?.label },
      { status: 201 } // created/idempotent
    );
  } catch (e: any) {
    // dacă ajunge totuși aici cu duplicate key, răspundem 200 cu selectul existent ca să nu spargem UI
    const msg = String(e?.message || "");
    if (/duplicate key|unique constraint/i.test(msg)) {
      try {
        const body = await req.json().catch(() => ({}));
        const property_id = String(body?.property_id || "");
        const key = String(body?.key || "");
        if (property_id && key) {
          const s = sb();
          const { data } = await s
            .from("room_variable_definitions")
            .select("id,key,label")
            .eq("property_id", property_id)
            .eq("key", key)
            .limit(1)
            .maybeSingle();
          if (data) {
            return NextResponse.json({ ok: true, ...data }, { status: 200 });
          }
        }
      } catch {}
    }
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/room-variables/definitions?id=DEF_ID&property=PROPERTY_ID
// sau body: { id, property_id }
export async function DELETE(req: Request) {
  try {
    let id = "";
    let property_id = "";

    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      id = String(body?.id || "");
      property_id = String(body?.property_id || body?.property || "");
    } else {
      const { searchParams } = new URL(req.url);
      id = String(searchParams.get("id") || "");
      property_id = String(searchParams.get("property") || "");
    }

    if (!id || !property_id) {
      return NextResponse.json(
        { ok: false, error: "id and property required" },
        { status: 400 }
      );
    }

    const s = sb();
    // aflăm cheie ca să curățăm și valorile din room_variables
    const { data: def, error: errDef } = await s
      .from("room_variable_definitions")
      .select("key")
      .eq("id", id)
      .eq("property_id", property_id)
      .maybeSingle();

    if (errDef) throw errDef;
    if (!def?.key) {
      return NextResponse.json(
        { ok: false, error: "definition not found" },
        { status: 404 }
      );
    }

    // ștergem valorile aferente acestei chei pentru toate camerele din proprietate
    const { error: errVals } = await s
      .from("room_variables")
      .delete()
      .eq("property_id", property_id)
      .eq("key", def.key);

    if (errVals) throw errVals;

    // ștergem definiția
    const { error: errDel } = await s
      .from("room_variable_definitions")
      .delete()
      .eq("id", id)
      .eq("property_id", property_id);

    if (errDel) throw errDel;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}