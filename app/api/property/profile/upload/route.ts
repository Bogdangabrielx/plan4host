import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "property-media";

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function ensureBucketPublic() {
  const got = await admin.storage.getBucket(BUCKET);
  if (got.error) {
    const created = await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: "15MB" });
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
    const propertyId = String(form.get("propertyId") || "");
    const file = form.get("file") as File | null;

    if (!propertyId) {
      return NextResponse.json({ error: "Missing propertyId" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    const mime = file.type || "";
    if (!mime.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 415 });
    }

    // Check property exists
    const prop = await admin.from("properties").select("id,name").eq("id", propertyId).maybeSingle();
    if (prop.error) return NextResponse.json({ error: prop.error.message }, { status: 500 });
    if (!prop.data) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    await ensureBucketPublic();

    const ext = (() => {
      const m = mime.toLowerCase();
      if (m.includes("jpeg")) return "jpg";
      if (m.includes("png")) return "png";
      if (m.includes("webp")) return "webp";
      if (m.includes("gif")) return "gif";
      if (m.includes("avif")) return "avif";
      return "img";
    })();
    const fname = slugify(file.name || "image") || "image";
    const key = `${propertyId}/${Date.now()}-${fname}.${ext}`;

    const upload = await admin.storage.from(BUCKET).upload(key, file, {
      contentType: mime,
      cacheControl: "3600",
      upsert: true,
    });
    if (upload.error) {
      if (/bucket/i.test(upload.error.message)) {
        await ensureBucketPublic();
        const retry = await admin.storage.from(BUCKET).upload(key, file, {
          contentType: mime,
          cacheControl: "3600",
          upsert: true,
        });
        if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 });
      } else {
        return NextResponse.json({ error: upload.error.message }, { status: 500 });
      }
    }

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(key);
    const publicUrl = pub?.publicUrl || "";

    // Update properties
    const upd = await admin
      .from("properties")
      .update({ presentation_image_url: publicUrl, presentation_image_uploaded_at: new Date().toISOString() })
      .eq("id", propertyId)
      .select("id")
      .maybeSingle();
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

    // Best-effort cleanup: remove older images under <propertyId>/ except the new one
    try {
      const keyName = key.split('/').pop() || '';
      const listed = await admin.storage.from(BUCKET).list(propertyId, { limit: 1000 });
      const files = (listed.data ?? []).map((it: any) => String(it.name || ""));
      const toRemove = files
        .filter((name: string) => name !== keyName)
        .map((name: string) => `${propertyId}/${name}`);
      if (toRemove.length) {
        await admin.storage.from(BUCKET).remove(toRemove);
      }
    } catch {}

    return NextResponse.json({ ok: true, url: publicUrl, key });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST with multipart/form-data" }, { status: 405 });
}

