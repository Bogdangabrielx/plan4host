// app/api/room-vars/values/route.ts
import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient as createRls } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createAdmin(URL_, SRK, { auth: { persistSession: false } });

type AuthOk = { ok: true; user_id: string; role: "admin" | "member" };
type AuthErr = { ok: false; status: number; error: string };
type Auth = AuthOk | AuthErr;

function bad(status: number, body: any) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

async function authForProperty(property_id: string, requireAdmin = false): Promise<Auth> {
  const rls = createRls();
  const { data } = await rls.auth.getUser();
  const uid = data?.user?.id;
  if (!uid) return { ok: false, status: 401, error: "Not authenticated" };

  const rProp = await admin.from("properties").select("id, admin_id").eq("id", property_id).maybeSingle();
  if (rProp.error) return { ok: false, status: 500, error: rProp.error.message };
  if (!rProp.data) return { ok: false, status: 404, error: "Property not found" };

  const account_id = (rProp.data as any).admin_id as string;
  const rUser = await admin
    .from("account_users")
    .select("role,disabled")
    .eq("account_id", account_id)
    .eq("user_id", uid)
    .maybeSingle();
  if (rUser.error) return { ok: false, status: 500, error: rUser.error.message };
  if (!rUser.data || rUser.data.disabled) return { ok: false, status: 403, error: "Access denied" };

  const role = (rUser.data.role as "admin" | "member") || "member";
  if (requireAdmin && role !== "admin") return { ok: false, status: 403, error: "Admin only" };

  return { ok: true, user_id: uid, role };
}

/**
 * GET /api/room-vars/values?property=...&room_id=...
 * Returnează lista de definiții + valoarea pt camera dată (sau null dacă lipsește)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const property_id = searchParams.get("property") || "";
  const room_id = searchParams.get("room_id") || "";
  if (!property_id) return bad(400, { error: "Missing ?property" });

  const auth = await authForProperty(property_id, false);
  if (!auth.ok) return bad(auth.status, { error: auth.error });

  const defs = await admin
    .from("room_variable_definitions")
    .select("id, key, label, description")
    .eq("property_id", property_id)
    .order("label", { ascending: true });
  if (defs.error) return bad(500, { error: defs.error.message });

  let valuesMap = new Map<string, string | null>();
  if (room_id) {
    const vals = await admin
      .from("room_variable_values")
      .select("def_id, value")
      .eq("property_id", property_id)
      .eq("room_id", room_id);
    if (vals.error) return bad(500, { error: vals.error.message });
    for (const v of vals.data || []) valuesMap.set(String(v.def_id), (v as any).value || null);
  }

  const items = (defs.data || []).map((d: any) => ({
    def_id: String(d.id),
    key: String(d.key),
    label: String(d.label),
    description: d.description ? String(d.description) : null,
    value: valuesMap.get(String(d.id)) ?? null,
  }));

  return NextResponse.json({ ok: true, items }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

/**
 * POST /api/room-vars/values
 * body: { property_id, room_id, def_id? (sau def_key?), value }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const property_id: string = String(body?.property_id || "");
  const room_id: string = String(body?.room_id || "");
  const def_id_raw: string | null = body?.def_id ? String(body.def_id) : null;
  const def_key_raw: string | null = body?.def_key ? String(body.def_key) : null;
  const value: string = typeof body?.value === "string" ? body.value : "";

  if (!property_id || !room_id) return bad(400, { error: "property_id and room_id required" });
  if (!def_id_raw && !def_key_raw) return bad(400, { error: "def_id or def_key required" });

  const auth = await authForProperty(property_id, true);
  if (!auth.ok) return bad(auth.status, { error: auth.error });

  let def_id = def_id_raw;
  if (!def_id && def_key_raw) {
    const r = await admin
      .from("room_variable_definitions")
      .select("id")
      .eq("property_id", property_id)
      .eq("key", def_key_raw)
      .maybeSingle();
    if (r.error) return bad(500, { error: r.error.message });
    if (!r.data) return bad(404, { error: "Definition not found" });
    def_id = String(r.data.id);
  }

  const up = await admin
    .from("room_variable_values")
    .upsert(
      { property_id, room_id, def_id, value },
      { onConflict: "property_id,room_id,def_id" }
    )
    .select("id")
    .single();

  if (up.error) return bad(400, { error: up.error.message });
  return NextResponse.json({ ok: true, id: up.data.id });
}

/**
 * DELETE /api/room-vars/values?property=...&room_id=...&(def_id=... | def_key=...)
 */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const property_id = searchParams.get("property") || "";
  const room_id = searchParams.get("room_id") || "";
  const def_id = searchParams.get("def_id");
  const def_key = searchParams.get("def_key");

  if (!property_id || !room_id) return bad(400, { error: "property and room_id required" });

  const auth = await authForProperty(property_id, true);
  if (!auth.ok) return bad(auth.status, { error: auth.error });

  let dId = def_id || null;
  if (!dId && def_key) {
    const r = await admin
      .from("room_variable_definitions")
      .select("id")
      .eq("property_id", property_id)
      .eq("key", def_key)
      .maybeSingle();
    if (r.error) return bad(500, { error: r.error.message });
    if (!r.data) return bad(404, { error: "Definition not found" });
    dId = String(r.data.id);
  }
  if (!dId) return bad(400, { error: "def_id or def_key required" });

  const del = await admin
    .from("room_variable_values")
    .delete()
    .eq("property_id", property_id)
    .eq("room_id", room_id)
    .eq("def_id", dId);

  if (del.error) return bad(400, { error: del.error.message });
  return NextResponse.json({ ok: true });
}