// app/api/bookings/[id]/documents/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const booking_id = params.id;

    // 1) scoatem documentele (schema ta actuală)
    const r = await admin
      .from("booking_documents")
      .select("id,property_id,doc_type,storage_bucket,storage_path,mime_type,size_bytes,original_name,uploaded_at,doc_series,doc_number,doc_nationality")
      .eq("booking_id", booking_id)
      .order("uploaded_at", { ascending: false });

    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });

    // 2) generăm link semnat pentru fiecare
    const items = await Promise.all(
      (r.data ?? []).map(async (d: any) => {
        const bucket = d.storage_bucket || "guest_docs";
        const path = d.storage_path;
        if (!path) {
          return {
            id: d.id,
            doc_type: d.doc_type,
            mime_type: d.mime_type,
            size_bytes: d.size_bytes,
            original_name: d.original_name ?? null,
            uploaded_at: d.uploaded_at,
            doc_series: d.doc_series ?? null,
            doc_number: d.doc_number ?? null,
            doc_nationality: d.doc_nationality ?? null,
            path: null,
            url: null,
          };
        }
        const signed = await admin.storage.from(bucket).createSignedUrl(path, 60 * 10); // 10 min
        const url = signed.data?.signedUrl || null;
        return {
          id: d.id,
          doc_type: d.doc_type,
          mime_type: d.mime_type,
          size_bytes: d.size_bytes,
          original_name: d.original_name ?? null,
          uploaded_at: d.uploaded_at,
          doc_series: d.doc_series ?? null,         // dacă ai aceste coloane
          doc_number: d.doc_number ?? null,
          doc_nationality: d.doc_nationality ?? null,
          path,
          url,
        };
      })
    );

    return NextResponse.json({ ok: true, documents: items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}