// app/api/cron/cleanup-id-images/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function GET(req: Request) {
  try {
    // Optional protection with CRON_SECRET
    const urlObj = new URL(req.url);
    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const token = bearer || urlObj.searchParams.get('token') || '';
    const secret = (process.env.CRON_SECRET || '').toString().trim();
    if (secret && token !== secret) return bad(401, { error: 'unauthorized' });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, service, { auth: { persistSession: false } });

    const hours = Number(process.env.RETAIN_ID_IMAGE_HOURS || 72);
    const now = Date.now();
    const thresholdMs = now - hours * 60 * 60 * 1000;
    const thresholdISO = new Date(thresholdMs).toISOString();

    // Fetch candidate documents older than threshold (id docs only)
    const rDocs = await admin
      .from('booking_documents')
      .select('id,storage_bucket,storage_path,booking_id,uploaded_at,doc_type')
      .lt('uploaded_at', thresholdISO)
      .not('doc_type', 'is', null)
      .limit(2000);
    if (rDocs.error) return bad(500, { error: rDocs.error.message });

    const docs = (rDocs.data || []) as Array<{
      id: string;
      storage_bucket: string | null;
      storage_path: string | null;
      booking_id: string | null;
      uploaded_at: string | null;
      doc_type: string | null;
    }>;
    if (docs.length === 0) return NextResponse.json({ ok: true, deleted: 0, scanned: 0 });

    // Load bookings end_date for these documents
    const bookingIds = Array.from(new Set(docs.map(d => d.booking_id).filter(Boolean))) as string[];
    const ended = new Set<string>();
    if (bookingIds.length > 0) {
      const rBookings = await admin
        .from('bookings')
        .select('id,end_date')
        .in('id', bookingIds);
      if (!rBookings.error) {
        const todayISO = new Date(now).toISOString().slice(0, 10); // YYYY-MM-DD
        for (const b of (rBookings.data || []) as Array<{ id: string; end_date: string }>) {
          // consider booking ended if end_date <= today
          if (b?.end_date && b.end_date <= todayISO) ended.add(b.id);
        }
      }
    }

    // Filter docs whose booking has ended (or booking_id missing — be conservative and skip those without booking)
    const toDelete = docs.filter(d => d.booking_id && ended.has(d.booking_id) && d.storage_path);
    if (toDelete.length === 0) return NextResponse.json({ ok: true, deleted: 0, scanned: docs.length });

    // Group by bucket and remove from storage
    type ByBucket = Record<string, string[]>;
    const groups: ByBucket = {};
    const fallbackBucket = (process.env.NEXT_PUBLIC_DEFAULT_DOCS_BUCKET || 'guest_docs').toString();
    for (const d of toDelete) {
      const bucket = (d.storage_bucket || fallbackBucket).toString();
      if (!groups[bucket]) groups[bucket] = [];
      groups[bucket].push(d.storage_path as string);
    }

    let removedFiles = 0;
    for (const [bucket, paths] of Object.entries(groups)) {
      if (paths.length === 0) continue;
      const { error } = await admin.storage.from(bucket).remove(paths);
      if (!error) removedFiles += paths.length;
    }

    // Delete rows
    const ids = toDelete.map(d => d.id);
    const rDel = await admin.from('booking_documents').delete().in('id', ids);
    if (rDel.error) return bad(500, { error: rDel.error.message, removedFiles });

    return NextResponse.json({ ok: true, deleted: ids.length, removedFiles, scanned: docs.length, hours });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}

