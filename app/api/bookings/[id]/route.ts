// app/api/bookings/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createAdmin(url, service, { auth: { persistSession: false } });

function isYMD(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function clampTime(t: unknown, fallback: string): string {
  if (typeof t !== "string") return fallback;
  const m = t.match(/^(\d{1,2}):(\d{1,2})/);
  if (!m) return fallback;
  let hh = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  let mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function toDateTime(dateStr: string, timeStr: string | null | undefined, fallback: string) {
  const t = timeStr && /^\d\d:\d\d$/.test(timeStr) ? timeStr : fallback;
  return new Date(`${dateStr}T${t}:00`);
}
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

// PATCH /api/bookings/:id  (folosit pentru „Extend until” din RoomDetailModal)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const wantEndDate: string | undefined = body?.end_date;
    const wantEndTime: string | undefined = body?.end_time;
    const wantRoomId: string | undefined = body?.room_id ? String(body.room_id) : undefined;

    // 0) Booking + Property (pt. CI/CO)
    const rBk = await admin
      .from("bookings")
      .select("id,property_id,room_id,start_date,start_time,end_date,end_time,status,source")
      .eq("id", id)
      .maybeSingle();
    if (rBk.error)  return NextResponse.json({ error: rBk.error.message }, { status: 400 });
    if (!rBk.data)  return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const b = rBk.data as {
      id: string;
      property_id: string;
      room_id: string | null;
      start_date: string; start_time: string | null;
      end_date: string;   end_time: string | null;
      status: string | null; source: string | null;
    };

    const rProp = await admin
      .from("properties")
      .select("check_in_time,check_out_time")
      .eq("id", b.property_id)
      .maybeSingle();
    if (rProp.error) return NextResponse.json({ error: rProp.error.message }, { status: 400 });

    const CI = rProp.data?.check_in_time || "14:00";
    const CO = rProp.data?.check_out_time || "11:00";

    // 1) Construiește noile valori (default = cele curente)
    const newEndDate = isYMD(wantEndDate) ? wantEndDate : b.end_date;
    const newEndTime = clampTime(wantEndTime, b.end_time || CO);

    // 2) Validări: end > start & extindere reală (nu scurtare)
    const startDT = toDateTime(b.start_date, b.start_time, CI);
    const oldEndDT = toDateTime(b.end_date, b.end_time, CO);
    const newEndDT = toDateTime(newEndDate, newEndTime, CO);

    if (!(newEndDT > startDT)) {
      return NextResponse.json({ error: "End must be after Start." }, { status: 400 });
    }
    if (!(newEndDT > oldEndDT)) {
      return NextResponse.json({ error: "New end must be after current end." }, { status: 400 });
    }

    // 3) Verifică overlap în aceeași cameră (dacă există cameră alocată)
    if (b.room_id) {
      const rOthers = await admin
        .from("bookings")
        .select("id,start_date,start_time,end_date,end_time,status")
        .eq("room_id", b.room_id)
        // Blochează doar rezervările active (confirmate / checked_in)
        .in("status", ["confirmed", "checked_in"]) 
        .neq("id", id);

      if (rOthers.error) {
        return NextResponse.json({ error: rOthers.error.message }, { status: 400 });
      }

      for (const ob of (rOthers.data ?? []) as Array<{
        id: string; start_date: string; start_time: string | null; end_date: string; end_time: string | null; status: string | null;
      }>) {
        const os = toDateTime(ob.start_date, ob.start_time, CI);
        const oe = toDateTime(ob.end_date, ob.end_time, CO);
        if (overlaps(startDT, newEndDT, os, oe)) {
          return NextResponse.json(
            { error: `Overlap with booking ${ob.id} (${ob.start_date} ${ob.start_time ?? ""} → ${ob.end_date} ${ob.end_time ?? ""})` },
            { status: 409 }
          );
        }
      }
    }

    // 4) Mutare în altă cameră (opțional), cu guard anti-overlap
    let patch: any = { end_date: newEndDate, end_time: newEndTime };
    if (typeof wantRoomId === 'string' && wantRoomId && wantRoomId !== (b.room_id || '')) {
      // a) Validare că noua cameră aparține aceleiași proprietăți
      const rRoom = await admin.from('rooms').select('id, property_id, room_type_id').eq('id', wantRoomId).maybeSingle();
      if (rRoom.error || !rRoom.data) return NextResponse.json({ error: 'Target room not found' }, { status: 404 });
      if ((rRoom.data as any).property_id !== b.property_id) {
        return NextResponse.json({ error: 'Target room is not in the same property' }, { status: 400 });
      }
      // b) Anti-overlap cu rezervări active în camera nouă, pe noul interval
      const rConf = await admin
        .from('bookings')
        .select('id,start_date,start_time,end_date,end_time,status')
        .eq('room_id', wantRoomId)
        .in('status', ['confirmed','checked_in']);
      if (rConf.error) {
        return NextResponse.json({ error: rConf.error.message || 'Conflict check failed' }, { status: 400 });
      }
      for (const ob of (rConf.data ?? []) as Array<{ id:string; start_date:string; start_time:string|null; end_date:string; end_time:string|null; status:string|null }>) {
        if (String(ob.id) === String(id)) continue;
        const os = toDateTime(ob.start_date, ob.start_time, CI);
        const oe = toDateTime(ob.end_date, ob.end_time, CO);
        if (overlaps(startDT, newEndDT, os, oe)) {
          return NextResponse.json({ error: `Target room has an active booking overlap (${ob.start_date} ${ob.start_time ?? ''} → ${ob.end_date} ${ob.end_time ?? ''})` }, { status: 409 });
        }
      }
      // c) Permitem mutarea: setăm room_id și, opțional, sincronizăm room_type_id cu noua cameră
      patch.room_id = wantRoomId;
      patch.room_type_id = (rRoom.data as any).room_type_id ?? null;
    }

    // 5) Persistă
    const upd = await admin
      .from("bookings")
      .update(patch)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (upd.error) {
      const msg = (upd.error as any)?.message || '';
      if (/bookings_no_overlap|exclusion|23P01/i.test(msg)) {
        // Friendly message; we could also include room name if desired, but room name isn't loaded here; client already knows room
        return NextResponse.json({ error: 'Overlaps an existing confirmed reservation on this room.' }, { status: 409 });
      }
      return NextResponse.json({ error: (upd.error as any)?.message || 'Failed to update' }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

// DELETE /api/bookings/:id  (folosit pentru „Confirm release”)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  // 0) Citește booking-ul (ca să vedem dacă e iCal)
  const rGet = await admin
    .from("bookings")
    .select("id,property_id,source,ical_uid")
    .eq("id", id)
    .maybeSingle();

  if (rGet.error) return NextResponse.json({ error: rGet.error.message }, { status: 400 });
  if (!rGet.data)  return NextResponse.json({ error: "Already deleted" }, { status: 404 });

  const { property_id, source, ical_uid } = rGet.data as {
    property_id: string; source: string | null; ical_uid: string | null;
  };

  // 1) Dacă e iCal: suprimă reimportul aceluiași UID
  try {
    if (ical_uid || (source && source.toLowerCase() === "ical")) {
      await admin
        .from("ical_suppressions")
        .upsert({ property_id, ical_uid }, { onConflict: "property_id,ical_uid" });
    }
  } catch {
    // dacă tabela nu există încă, ignorăm
  }

  // 2) Șterge child-urile (best-effort) apoi booking-ul
  try { await admin.from("booking_contacts").delete().eq("booking_id", id); } catch {}
  try { await admin.from("booking_check_values").delete().eq("booking_id", id); } catch {}
  try { await admin.from("booking_text_values").delete().eq("booking_id", id); } catch {}
  // Notă: nu ștergem documentele aici (păstrează trail-ul); ajustează dacă vrei cleanup complet.

  const del = await admin.from("bookings").delete().eq("id", id).select("id").maybeSingle();
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
