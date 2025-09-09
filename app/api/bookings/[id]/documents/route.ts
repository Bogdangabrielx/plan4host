// app/api/bookings/[id]/documents/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// Asigurăm runtime Node pentru Supabase Storage
export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Poți seta un fallback explicit din .env (altfel "checkin")
const DEFAULT_DOCS_BUCKET =
  (process.env.NEXT_PUBLIC_DEFAULT_DOCS_BUCKET || "checkin").toString();

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ——— Helper: determină bucket + objectPath din coloanele (noi/legacy) ———
function resolveBucketAndPath(row: any): { bucket: string | null; objectPath: string | null } {
  // Schema nouă
  let bucket: string | null = row?.storage_bucket ?? null;
  let objectPath: string | null = row?.storage_path ?? null;

  // Schema veche (file_path poate fi "bucket/dir/file" sau doar "dir/file")
  const legacyPath: string | null = row?.file_path ?? null;

  // Dacă nu avem bucket din schema nouă, încercăm să-l „smulgem” din legacyPath
  if (!bucket && legacyPath) {
    const m = legacyPath.match(/^([^/]+)\/(.+)$/);
    if (m) {
      bucket = m[1];
      objectPath = m[2];
    } else {
      // Nu e prefix cu bucket în path → folosim fallback
      bucket = DEFAULT_DOCS_BUCKET;
      objectPath = legacyPath;
    }
  }

  // Dacă încă nu avem objectPath dar avem storage_path lipsă → ultim fallback
  if (!objectPath && legacyPath) objectPath = legacyPath;
  if (!bucket) bucket = DEFAULT_DOCS_BUCKET;

  return { bucket, objectPath };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const booking_id = params.id;
    if (!booking_id) {
      return NextResponse.json({ error: "Missing booking id" }, { status: 400 });
    }

    // 1) Citim metadatele documentelor (compatibil cu ambele scheme)
    const r = await admin
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
        original_name,
        uploaded_at,
        file_path,      -- legacy
        file_mime       -- legacy
      `)
      .eq("booking_id", booking_id)
      .order("uploaded_at", { ascending: false });

    if (r.error) {
      return NextResponse.json({ error: r.error.message }, { status: 500 });
    }

    // 2) Semnăm URL-urile (10 min)
    const documents = await Promise.all(
      (r.data ?? []).map(async (d: any) => {
        const { bucket, objectPath } = resolveBucketAndPath(d);

        const effectiveMime: string | null =
          (d.mime_type as string | null) ??
          (d.file_mime as string | null) ??
          null;

        let signedUrl: string | null = null;
        if (bucket && objectPath) {
          try {
            const signed = await admin.storage
              .from(bucket)
              .createSignedUrl(objectPath, 60 * 10); // 10 minute
            signedUrl = signed.data?.signedUrl ?? null;
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
          mime_type: effectiveMime,
          size_bytes: (d.size_bytes as number | null) ?? null,
          original_name: (d.original_name as string | null) ?? null,
          uploaded_at: d.uploaded_at as string,
          path: objectPath,       // doar calea din bucket (compat cu UI)
          url: signedUrl,         // ← folosit în RoomDetailModal ca „View file”
        };
      })
    );

    // Evităm orice cache
    return NextResponse.json(
      { ok: true, documents },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}