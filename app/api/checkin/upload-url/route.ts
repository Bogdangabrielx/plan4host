import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

export async function POST(req: Request) {
  try {
    const { property_id, file_ext, mime_type } = await req.json().catch(() => ({}));
    if (!property_id) return NextResponse.json({ error: "property_id required" }, { status: 400 });

    const ext = (String(file_ext || "").replace(/[^a-z0-9.]/gi, "").toLowerCase()) || "bin";
    const safeExt = ext.startsWith(".") ? ext.slice(1) : ext;

    // whitelist simplă (poți extinde)
    const allowed = new Set(["jpg","jpeg","png","webp","pdf"]);
    if (!allowed.has(safeExt)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const uuid = crypto.randomUUID();
    const objectPath = `raw/${property_id}/${uuid}.${safeExt}`; // păstrăm într-un subfolder "raw/"

    const { data, error } = await admin.storage
      .from("guest_docs")
      .createSignedUploadUrl(objectPath);

    if (error || !data) return NextResponse.json({ error: error?.message || "Failed to create upload URL" }, { status: 500 });

    return NextResponse.json({
      ok: true,
      path: objectPath,          // îl vei trimite în /checkin/submit
      uploadUrl: data.signedUrl, // faci PUT la acesta cu body=fișier
      token: data.token          // nu e necesar separat; e în URL
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}