import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const actor = auth.user;
    if (!actor) return bad(401, { error: "Not authenticated" });

    const form = await req.formData();
    const propertyId = (form.get("propertyId") as string | null) || undefined;
    const file = form.get("file") as File | null;
    if (!propertyId || !file) return bad(400, { error: "propertyId and file are required" });

    const ct = file.type || "";
    if (!/^application\/pdf$/i.test(ct)) return bad(400, { error: "Only PDF files are allowed" });

    // Verify actor is owner/manager or has dashboard/configurator scope on the property's account
    const prop = await supa.from("properties").select("id, owner_id").eq("id", propertyId).maybeSingle();
    if (prop.error || !prop.data) return bad(404, { error: "Property not found" });

    // Membership of actor on this account
    const { data: au } = await supa
      .from("account_users")
      .select("account_id, role, scopes, disabled")
      .eq("user_id", actor.id)
      .eq("account_id", prop.data.owner_id)
      .order("created_at", { ascending: true });
    const m = (au ?? [])[0] as any;

    let allowed = false;
    if (actor.id === prop.data.owner_id) {
      allowed = true; // owner of account
    } else if (m && !m.disabled) {
      const role = (m.role || "").toLowerCase();
      const scopes: string[] = (m.scopes || []) as string[];
      allowed = role === "owner" || role === "manager" || scopes.includes("dashboard") || scopes.includes("configurator");
    }
    if (!allowed) return bad(403, { error: "Not allowed" });

    // Admin client for storage + DB update
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) return bad(500, { error: "Missing service credentials" });
    const admin = createAdmin(url, serviceKey, { auth: { persistSession: false } });

    const bucket = "property-docs";
    const path = `${propertyId}/regulation.pdf`;
    const arr = Buffer.from(await file.arrayBuffer());

    // Upload with upsert
    const up = await admin.storage.from(bucket).upload(path, arr, { contentType: "application/pdf", upsert: true });
    if (up.error) return bad(400, { error: up.error.message });

    // Public URL
    const pub = admin.storage.from(bucket).getPublicUrl(path);
    const publicUrl = (pub.data?.publicUrl as string | undefined) || null;

    // Save on property for easy retrieval later (public URL)
    const upd = await admin
      .from("properties")
      .update({ regulation_pdf_path: path, regulation_pdf_url: publicUrl, regulation_pdf_uploaded_at: new Date().toISOString() })
      .eq("id", propertyId)
      .select("regulation_pdf_url,regulation_pdf_uploaded_at")
      .maybeSingle();
    if (upd.error) return bad(400, { error: upd.error.message });

    return NextResponse.json({ ok: true, url: publicUrl, uploaded_at: upd.data?.regulation_pdf_uploaded_at });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}

