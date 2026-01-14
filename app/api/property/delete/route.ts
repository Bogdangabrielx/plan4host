import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

export const runtime = "nodejs";

function extractSupabaseStoragePath(urlRaw: string, bucket: string): string | null {
  const url = String(urlRaw || "").trim();
  if (!url) return null;
  if (url.startsWith("/")) return null;

  try {
    const u = new URL(url);
    const p = u.pathname || "";
    const re = /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/;
    const m = p.match(re);
    if (!m) return null;
    const foundBucket = m[1] || "";
    const objectPath = m[2] || "";
    if (foundBucket !== bucket) return null;
    return decodeURIComponent(objectPath);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const propertyId = String(body?.property_id || "").trim();
  if (!propertyId) return NextResponse.json({ error: "property_id required" }, { status: 400 });

  // Load current URLs before deleting, but ensure the property belongs to the caller.
  const { data: prop, error: propErr } = await supa
    .from("properties")
    .select("id, account_id, presentation_image_url, regulation_pdf_url")
    .eq("id", propertyId)
    .maybeSingle();

  if (propErr) return NextResponse.json({ error: propErr.message }, { status: 400 });
  if (!prop || (prop as any).account_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete DB records (rooms/bookings/integrations handled by SQL/RPC).
  const { error: delErr } = await supa.rpc("account_delete_property_self", { p_property_id: propertyId });
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

  // Best-effort: remove media/docs from storage.
  try {
    const mediaUrl = String((prop as any).presentation_image_url || "").trim();
    const docsUrl = String((prop as any).regulation_pdf_url || "").trim();

    const byBucket: Record<string, string[]> = {};

    if (mediaUrl && mediaUrl !== "/hotel_room_1456x816.jpg") {
      const p = extractSupabaseStoragePath(mediaUrl, "property-media");
      if (p) byBucket["property-media"] = [...(byBucket["property-media"] || []), p];
    }

    if (docsUrl) {
      const p = extractSupabaseStoragePath(docsUrl, "property-docs");
      if (p) byBucket["property-docs"] = [...(byBucket["property-docs"] || []), p];
    }

    const svc = getServiceSupabase();
    for (const [bucket, paths] of Object.entries(byBucket)) {
      if (!paths.length) continue;
      await svc.storage.from(bucket).remove(paths);
    }
  } catch {
    // ignore (best-effort cleanup)
  }

  return NextResponse.json({ ok: true });
}

