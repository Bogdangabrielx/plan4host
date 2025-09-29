import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "property-regulations";

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
  // dacă lipsește -> îl creăm; dacă există dar nu e public -> îl facem public
  const got = await admin.storage.getBucket(BUCKET);
  if (got.error) {
    const created = await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: "30MB" });
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
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 415 });
    }

    // Verifică proprietatea (opțional, dar util pentru feedback)
    const prop = await admin.from("properties").select("id,name").eq("id", propertyId).maybeSingle();
    if (prop.error) {
      return NextResponse.json({ error: prop.error.message }, { status: 500 });
    }
    if (!prop.data) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Sigurăm bucket-ul (creează dacă lipsește; face public dacă e privat)
    await ensureBucketPublic();

    // Upload to a deterministic path to replace the previous file (no duplicates kept)
    const key = `${propertyId}/house_rules.pdf`;

    const upload = await admin.storage.from(BUCKET).upload(key, file, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: true,
    });
    if (upload.error) {
      // Dacă primim eroare de bucket (race), mai încercăm o dată după ensure
      if (/bucket/i.test(upload.error.message)) {
        await ensureBucketPublic();
        const retry = await admin.storage.from(BUCKET).upload(key, file, {
          contentType: "application/pdf",
          cacheControl: "3600",
          upsert: true,
        });
        if (retry.error) {
          return NextResponse.json({ error: retry.error.message }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: upload.error.message }, { status: 500 });
      }
    }

    // URL public
    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(key);
    const publicUrl = pub?.publicUrl || "";

    // Scriem în DB
    const upd = await admin
      .from("properties")
      .update({
        regulation_pdf_path: key,
        regulation_pdf_url: publicUrl,
        regulation_pdf_uploaded_at: new Date().toISOString(),
      })
      .eq("id", propertyId)
      .select("id")
      .maybeSingle();
    if (upd.error) {
      return NextResponse.json({ error: upd.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: publicUrl, key });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST with multipart/form-data" }, { status: 405 });
}
