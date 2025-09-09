// app/api/checkin/upload/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

function safeExt(name: string, mime: string) {
  const n = (name || "").toLowerCase();
  if (n.endsWith(".png")) return "png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "jpg";
  if (n.endsWith(".webp")) return "webp";
  if (n.endsWith(".pdf")) return "pdf";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return mime.split("/")[1] || "bin";
  return "bin";
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const f = form.get("file") as File | null;
    const property = String(form.get("property") || "");
    const booking  = form.get("booking") ? String(form.get("booking")) : null;

    if (!f) return NextResponse.json({ error: "Missing file" }, { status: 400 });
    if (!property) return NextResponse.json({ error: "Missing property" }, { status: 400 });

    const ab = await f.arrayBuffer();
    const buf = Buffer.from(ab);
    const ext = safeExt(f.name, f.type || "");
    const key = `${property}/${booking || "unassigned"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const up = await admin.storage.from("guest_docs").upload(key, buf, {
      contentType: f.type || "application/octet-stream",
      upsert: false,
    });
    if (up.error) return NextResponse.json({ error: up.error.message }, { status: 400 });

    return NextResponse.json({ ok: true, path: up.data.path });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}