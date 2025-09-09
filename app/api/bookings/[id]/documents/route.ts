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

    // 1) Citește documentele. Select include coloane pentru ambele versiuni de schemă.
    const r = await admin
      .from("booking_documents")
      .select(`
        id,
        property_id,
        doc_type,
        doc_series,
        doc_number,
        doc_nationality,
        storage_bucket,
        storage_path,
        mime_type,
        size_bytes,
        original_name,
        uploaded_at,
        file_path,      -- fallback (schemă veche)
        file_mime       -- fallback (schemă veche)
      `)
      .eq("booking_id", booking_id)
      .order("uploaded_at", { ascending: false });

    if (r.error) {
      return NextResponse.json({ error: r.error.message }, { status: 500 });
    }

    // 2) Creează linkuri semnate (10 minute). Fallback la schema veche.
    const items = await Promise.all(
      (r.data ?? []).map(async (d: any) => {
        const bucket =
          (d.storage_bucket as string | null) ??
          "guest_docs";

        const path =
          (d.storage_path as string | null) ??
          (d.file_path as string | null) ??
          null;

        const mime =
          (d.mime_type as string | null) ??
          (d.file_mime as string | null) ??
          null;

        let signedUrl: string | null = null;
        if (path) {
          try {
            const signed = await admin.storage.from(bucket).createSignedUrl(path, 60 * 10); // 10 min
            signedUrl = signed.data?.signedUrl || null;
          } catch {
            signedUrl = null;
          }
        }

        return {
          id: d.id as string,
          doc_type: (d.doc_type as string | null) ?? null,
          doc_series: (d.doc_series as string | null) ?? null,
          doc_number: (d.doc_number as string | null) ?? null,
          doc_nationality: (d.doc_nationality as string | null) ?? null,
          mime_type: mime,
          size_bytes: (d.size_bytes as number | null) ?? null,
          original_name: (d.original_name as string | null) ?? null,
          uploaded_at: d.uploaded_at as string,
          path,
          url: signedUrl,
        };
      })
    );

    return NextResponse.json({ ok: true, documents: items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}