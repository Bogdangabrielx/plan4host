// app/api/bookings/[id]/documents/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// bucket confirmat la tine
const DEFAULT_BUCKET = (process.env.NEXT_PUBLIC_DEFAULT_DOCS_BUCKET || "guest_docs").toString();

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const booking_id = params.id;
    if (!booking_id) {
      return NextResponse.json({ error: "Missing booking id" }, { status: 400 });
    }

    // Select DOAR coloanele care există în schema ta actuală
    const { data, error } = await admin
      .from("booking_documents")
      .select(`
        id,
        booking_id,
        property_id,
        doc_type,
        doc_series,
        doc_number,
        doc_nationality,
        storage_bucket,
        storage_path,
        mime_type,
        size_bytes,
        uploaded_at
      `)
      .eq("booking_id", booking_id)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const documents = await Promise.all(
      (data ?? []).map(async (d: any) => {
        const bucket = (d.storage_bucket as string | null) || DEFAULT_BUCKET;
        const objectPath = (d.storage_path as string | null) || null;

        let url: string | null = null;
        if (objectPath) {
          try {
            const signed = await admin.storage.from(bucket).createSignedUrl(objectPath, 60 * 10); // 10 min
            url = signed.data?.signedUrl ?? null;
          } catch {
            url = null;
          }
        }

        return {
          id: d.id as string,
          doc_type: d.doc_type as string | null,
          doc_series: d.doc_series as string | null,
          doc_number: d.doc_number as string | null,
          doc_nationality: d.doc_nationality as string | null,
          mime_type: d.mime_type as string | null,
          size_bytes: d.size_bytes as number | null,
          uploaded_at: d.uploaded_at as string,
          path: objectPath,
          url, // ← linkul semnat pentru RoomDetailModal
        };
      })
    );

    return NextResponse.json(
      { ok: true, documents },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}