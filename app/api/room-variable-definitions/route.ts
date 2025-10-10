// app/api/room-vars/definitions/route.ts
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

function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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
 * GET /api/room-vars/definitions?property=...
 * Listă definiții pt proprietate
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const property_id = searchParams.get("property") || "";
  if (!property_id) return bad(400, { error: "Missing ?property" });

  const auth = await authForProperty(property_id, false);
  if (!auth.ok) return bad(auth.status, { error: auth.error });

  const r = await admin
    .from("room_variable_definitions")
    .select("id, property_id, key, label, description, created_at, updated_at")
    .eq("property_id", property_id)
    .order("updated_at", { ascending: false });

  if (r.error) return bad(500, { error: r.error.message });
  return NextResponse.json({ ok: true, items: r.data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

/**
 * POST /api/room-vars/definitions
 * body: { property_id, key?, label, description? }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const property_id: string = String(body?.property_id || "");
  const label: string = String(body?.label || "").trim();
  const rawKey: string = String(body?.key || label).trim();
  const description: string | null = body?.description ? String(body.description) : null;

  if (!property_id) return bad(400, { error: "property_id required" });
  if (!label) return bad(400, { error: "label required" });

  const auth = await authForProperty(property_id, true);
  if (!auth.ok) return bad(auth.status, { error: auth.error });

  const key = slugify(rawKey);
  if (!key) return bad(400, { error: "key invalid" });

  // unic pe (property_id, key)
  const ins = await admin
    .from("room_variable_definitions")
    .insert({ property_id, key, label, description })
    .select("id")
    .single();

  if (ins.error) return bad(400, { error: ins.error.message });
  return NextResponse.json({ ok: true, id: ins.data.id });
}

/**
 * PATCH /api/room-vars/definitions
 * body: { id, property_id, key?, label?, description? }
 */
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id: string = String(body?.id || "");
  const property_id: string = String(body?.property_id || "");
  if (!id || !property_id) return bad(400, { error: "id and property_id required" });

  const auth = await authForProperty(property_id, true);
  if (!auth.ok) return bad(auth.status, { error: auth.error });

  const upd: any = {};
  if (typeof body.key === "string" && body.key.trim()) upd.key = slugify(body.key);
  if (typeof body.label === "string" && body.label.trim()) upd.label = body.label.trim();
  if (typeof body.description === "string") upd.description = body.description;

  if (Object.keys(upd).length === 0) return NextResponse.json({ ok: true, updated: 0 });

  const r = await admin.from("room_variable_definitions").update(upd).eq("id", id).eq("property_id", property_id).select("id");
  if (r.error) return bad(400, { error: r.error.message });
  return NextResponse.json({ ok: true, updated: r.data?.length || 0 });
}

/**
 * DELETE /api/room-vars/definitions?id=...&property=...
 */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";
  const property_id = searchParams.get("property") || "";
  if (!id || !property_id) return bad(400, { error: "id and property required" });

  const auth = await authForProperty(property_id, true);
  if (!auth.ok) return bad(auth.status, { error: auth.error });

  // șterge și valorile asociate (on delete cascade dacă ai FK; dacă nu, fă manual)
  const del = await admin.from("room_variable_definitions").delete().eq("id", id).eq("property_id", property_id);
  if (del.error) return bad(400, { error: del.error.message });
  return NextResponse.json({ ok: true });
}