import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "ota-logos";

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function ensureBucketPublic() {
  // Create if missing; set public if needed
  const got = await admin.storage.getBucket(BUCKET);
  if (got.error) {
    const created = await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: "1048576", allowedMimeTypes: ["image/png"] });
    if (created.error) throw new Error(`Failed to create bucket: ${created.error.message}`);
    return;
  }
  if (got.data && got.data.public !== true) {
    const upd = await admin.storage.updateBucket(BUCKET, { public: true });
    if (upd.error) throw new Error(`Failed to update bucket: ${upd.error.message}`);
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const integrationId = String(form.get("integrationId") || "").trim();
    const file = form.get("file") as File | null;

    if (!integrationId) return NextResponse.json({ error: "Missing integrationId" }, { status: 400 });
    if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
    if (file.type !== "image/png") return NextResponse.json({ error: "PNG required" }, { status: 415 });

    // basic dimension check is handled on client; keep server simple
    await ensureBucketPublic();

    const key = `integration/${integrationId}.png`;
    const upload = await admin.storage.from(BUCKET).upload(key, file, {
      contentType: "image/png",
      cacheControl: "3600",
      upsert: true,
    });
    if (upload.error) {
      // Ensure bucket exists (race) and retry once
      if (/bucket/i.test(upload.error.message)) {
        await ensureBucketPublic();
        const retry = await admin.storage.from(BUCKET).upload(key, file, { contentType: "image/png", cacheControl: "3600", upsert: true });
        if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 });
      } else {
        return NextResponse.json({ error: upload.error.message }, { status: 500 });
      }
    }

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(key);
    const publicUrl = pub?.publicUrl ? `${pub.publicUrl}?v=${Date.now()}` : ""; // cache-bust

    // Update integration row
    const upd = await admin
      .from("ical_type_integrations")
      .update({ logo_url: publicUrl })
      .eq("id", integrationId)
      .select("id")
      .maybeSingle();
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

    return NextResponse.json({ ok: true, url: publicUrl, key });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST with multipart/form-data" }, { status: 405 });
}

