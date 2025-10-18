import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createAdmin(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const DEFAULT_BUCKET = (process.env.NEXT_PUBLIC_DEFAULT_DOCS_BUCKET || "guest_docs").toString();

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params?.id;
    if (!id || !/^[-0-9a-f]{36}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid form id" }, { status: 400 });
    }
    const { data, error } = await admin
      .from("form_documents")
      .select("id,doc_type,mime_type,storage_bucket,storage_path,uploaded_at,size_bytes,doc_series,doc_number,doc_nationality")
      .eq("form_id", id)
      .order("uploaded_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    async function signRows(rows: any[], prefix: string) {
      return Promise.all(rows.map(async (d: any) => {
        const bucket = (d.storage_bucket as string | null) || DEFAULT_BUCKET;
        const objectPath = (d.storage_path as string | null) || null;
        let url: string | null = null;
        if (objectPath) {
          try {
            const signed = await admin.storage.from(bucket).createSignedUrl(objectPath, 60 * 10);
            url = signed.data?.signedUrl ?? null;
          } catch { url = null; }
        }
        return {
          id: `${prefix}${String(d.id)}`,
          doc_type: d.doc_type as string | null,
          doc_series: d.doc_series as string | null,
          doc_number: d.doc_number as string | null,
          doc_nationality: d.doc_nationality as string | null,
          mime_type: d.mime_type as string | null,
          size_bytes: (d.size_bytes ?? null) as number | null,
          uploaded_at: String(d.uploaded_at),
          path: objectPath,
          url,
        };
      }));
    }

    let documents = await signRows(data ?? [], "form-");

    // Fallback: if no form documents found, try booking_documents linked via bookings.form_id
    if (!documents.length) {
      try {
        const rLink = await admin
          .from('bookings')
          .select('id')
          .eq('form_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const bid = rLink.data?.id as string | undefined;
        if (bid) {
          const rBD = await admin
            .from('booking_documents')
            .select('id,doc_type,mime_type,storage_bucket,storage_path,uploaded_at,size_bytes,doc_series,doc_number,doc_nationality')
            .eq('booking_id', bid)
            .order('uploaded_at', { ascending: false });
          if (!rBD.error) {
            documents = await signRows(rBD.data || [], "booking-");
          }
        }
      } catch {}
    }

    return NextResponse.json({ documents }, { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
