// app/api/checkin/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

const DEFAULT_DOCS_BUCKET = (process.env.NEXT_PUBLIC_DEFAULT_DOCS_BUCKET || "guest_docs").toString();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:office@plan4host.com";
try { webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY); } catch {}

async function broadcastNewGuestOverview(adminCli: any, property_id: string, start_date: string, end_date: string) {
  try {
    const rProp = await adminCli.from("properties").select("account_id").eq("id", property_id).maybeSingle();
    if (rProp.error || !rProp.data) return;
    const account_id = (rProp.data as any).account_id as string;

    const rUsers = await adminCli
      .from("account_users")
      .select("user_id,role,disabled")
      .eq("account_id", account_id)
      .eq("disabled", false)
      .eq("role", "admin");
    if (rUsers.error) return;

    const userIds = (rUsers.data || []).map((u: any) => String(u.user_id));
    if (userIds.length === 0) return;

    const { data, error } = await adminCli
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth,user_id")
      .in("user_id", userIds);
    if (error) return;

    const subs = (data || []) as Array<{ endpoint: string; p256dh: string; auth: string; user_id: string }>;
    if (subs.length === 0) return;

    const payload = JSON.stringify({
      title: "New reservation",
      body: `From ${start_date} to ${end_date}`,
      url: `/app/guestOverview?property=${encodeURIComponent(property_id)}`,
      tag: `guest-${property_id}`,
    });

    for (const s of subs) {
      const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any;
      try { await webpush.sendNotification(subscription, payload); }
      catch (e: any) {
        if (e?.statusCode === 410 || e?.statusCode === 404) {
          try { await adminCli.from("push_subscriptions").delete().eq("endpoint", s.endpoint); } catch {}
        }
      }
    }
  } catch {}
}

/* ---------------- utils ---------------- */
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
function looksEnumHoldError(msg?: string) {
  return !!msg && /invalid input value for enum .*: "hold"/i.test(msg);
}

/* ---------------- room/type helpers ---------------- */
async function normalizeRoomId(room_id: any, property_id: string): Promise<string | null> {
  if (!room_id) return null;
  const r = await admin.from("rooms").select("id,property_id,room_type_id").eq("id", room_id).maybeSingle();
  if (r.error || !r.data) return null;
  return r.data.property_id === property_id ? String(r.data.id) : null;
}
async function normalizeRoomTypeId(room_type_id: any, property_id: string): Promise<string | null> {
  if (!room_type_id) return null;
  const r = await admin.from("room_types").select("id,property_id").eq("id", room_type_id).maybeSingle();
  if (r.error || !r.data) return null;
  return r.data.property_id === property_id ? String(r.data.id) : null;
}
async function roomTypeFromRoom(room_id: string | null): Promise<string | null> {
  if (!room_id) return null;
  const r = await admin.from("rooms").select("room_type_id").eq("id", room_id).maybeSingle();
  if (r.error || !r.data) return null;
  return r.data.room_type_id ? String(r.data.room_type_id) : null;
}
async function findFreeRoomForType(opts: { property_id: string; room_type_id: string; start_date: string; end_date: string; }): Promise<string | null> {
  const { property_id, room_type_id, start_date, end_date } = opts;
  const rRooms = await admin
    .from("rooms")
    .select("id,name")
    .eq("property_id", property_id)
    .eq("room_type_id", room_type_id)
    .order("name", { ascending: true });
  if (rRooms.error || !rRooms.data || rRooms.data.length === 0) return null;
  const candIds = rRooms.data.map((r) => String(r.id));

  const rBusy = await admin
    .from("bookings")
    .select("room_id,start_date,end_date,status")
    .in("room_id", candIds)
    .neq("status", "cancelled")
    .lt("start_date", end_date)
    .gt("end_date", start_date);

  const busy = new Set<string>();
  if (!rBusy.error) for (const b of rBusy.data ?? []) if (b.room_id) busy.add(String(b.room_id));

  return candIds.find((id) => !busy.has(id)) ?? null;
}
async function isRoomFree(room_id: string, start_date: string, end_date: string): Promise<boolean> {
  const rBusy = await admin
    .from("bookings")
    .select("id")
    .eq("room_id", room_id)
    .neq("status", "cancelled")
    .lt("start_date", end_date)
    .gt("end_date", start_date);
  return !rBusy.error && (rBusy.data?.length ?? 0) === 0;
}

/* ---------------- STRICT MATCH HELPERS ---------------- */
function datesEqual(a?: string | null, b?: string | null) {
  return !!a && !!b && a === b;
}
async function typeOfBooking(b: { room_type_id: string | null; room_id: string | null }): Promise<string | null> {
  return b.room_type_id ?? (await roomTypeFromRoom(b.room_id ?? null));
}
async function matchesFormCriteria(form: { room_id: string | null; room_type_id: string | null }, event: { room_id: string | null; room_type_id: string | null }): Promise<boolean> {
  if (form.room_id) {
    return !!event.room_id && String(event.room_id) === String(form.room_id);
  }
  if (form.room_type_id) {
    const evType = await typeOfBooking(event);
    return !!evType && String(evType) === String(form.room_type_id);
  }
  return false;
}

/* ---------------- handler ---------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      property_id,
      start_date,
      end_date,

      // guest
      guest_first_name,
      guest_last_name,

      // form selections
      requested_room_id,
      requested_room_type_id,

      // optional times (fallback to property defaults)
      start_time: start_time_client,
      end_time: end_time_client,

      // contact
      email,
      phone,
      address,
      city,
      country,

      // docs v1
      doc_type,
      doc_series,
      doc_number,
      doc_nationality,
      doc_file_path,
      doc_file_mime,

      // docs v2
      docs,
    } = body ?? {};

    if (!property_id) {
      return NextResponse.json({ error: "Missing property_id" }, { status: 400 });
    }

    // property defaults & suspended account check
    const rProp = await admin
      .from("properties")
      .select("id,account_id,check_in_time,check_out_time,timezone")
      .eq("id", property_id)
      .maybeSingle();

    if (rProp.error) return NextResponse.json({ error: rProp.error.message }, { status: 500 });
    if (!rProp.data) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    try {
      const susp = await admin.rpc("account_is_suspended", { account_id: rProp.data.account_id as string });
      if (!susp.error && susp.data === true) {
        return NextResponse.json({ error: "Account suspended" }, { status: 403 });
      }
    } catch {}

    const checkInDefault  = rProp.data.check_in_time  ?? "14:00";
    const checkOutDefault = rProp.data.check_out_time ?? "11:00";
    const start_time = clampTime(start_time_client, checkInDefault);
    const end_time   = clampTime(end_time_client,   checkOutDefault);

    // derive normalized selections
    const form_room_id: string | null = await normalizeRoomId(requested_room_id, property_id);
    let form_room_type_id: string | null =
      (await normalizeRoomTypeId(requested_room_type_id, property_id)) ??
      (await roomTypeFromRoom(form_room_id));

    /* ========= STRICT MATCH cu EXISTING BOOKING (iCal sau manual) =========
       Reguli:
       - dates trebuie să fie egale (ambele perechi)
       - Dacă formularul are room_id -> match doar cu booking cu același room_id
       - altfel, dacă are room_type_id -> match doar cu booking de același type (room_type_id direct sau derivat din room_id)
    */
    let matchedBookingId: string | null = null;
    let matchedIsIcal = false;

    if (isYMD(start_date) && isYMD(end_date) && (form_room_id || form_room_type_id)) {
      // 1) candidate iCal-ish
      const rIcal = await admin
        .from("bookings")
        .select("id,room_id,room_type_id,start_date,end_date,status,source,ical_uid")
        .eq("property_id", property_id)
        .eq("start_date", start_date)
        .eq("end_date", end_date)
        .neq("status", "cancelled")
        .or("source.eq.ical,ical_uid.not.is.null");

      if (!rIcal.error && Array.isArray(rIcal.data) && rIcal.data.length) {
        for (const b of rIcal.data) {
          if (!datesEqual(b.start_date, start_date) || !datesEqual(b.end_date, end_date)) continue;
          if (await matchesFormCriteria({ room_id: form_room_id, room_type_id: form_room_type_id }, { room_id: b.room_id ?? null, room_type_id: b.room_type_id ?? null })) {
            matchedBookingId = String(b.id); matchedIsIcal = true; break;
          }
        }
      }

      // 2) candidate manual (non-ical-ish)
      if (!matchedBookingId) {
        const rManual = await admin
          .from("bookings")
          .select("id,room_id,room_type_id,start_date,end_date,status,source,ical_uid")
          .eq("property_id", property_id)
          .eq("start_date", start_date)
          .eq("end_date", end_date)
          .neq("status", "cancelled");

        if (!rManual.error && Array.isArray(rManual.data) && rManual.data.length) {
          const pool = rManual.data.filter(b => (b.source || "").toLowerCase() !== "ical" && !b.ical_uid);
          for (const b of pool) {
            if (!datesEqual(b.start_date, start_date) || !datesEqual(b.end_date, end_date)) continue;
            if (await matchesFormCriteria({ room_id: form_room_id, room_type_id: form_room_type_id }, { room_id: b.room_id ?? null, room_type_id: b.room_type_id ?? null })) {
              matchedBookingId = String(b.id); matchedIsIcal = false; break;
            }
          }
        }
      }
    }

    if (matchedBookingId) {
      // Nu permite atașarea la o rezervare deja "verde" (locked)
      try {
        const rLock = await admin
          .from("bookings")
          .select("id, room_id, room_type_id, start_date, end_date, guest_first_name, guest_last_name, guest_name, form_submitted_at")
          .eq("id", matchedBookingId)
          .maybeSingle();
        if (!rLock.error && rLock.data) {
          const anyName = ((rLock.data.guest_first_name || '').trim().length + (rLock.data.guest_last_name || '').trim().length) > 0 || (rLock.data.guest_name || '').trim().length > 0;
          const locked = !!rLock.data.form_submitted_at || anyName;
          if (locked) {
            matchedBookingId = null; // eveniment verde -> nu mai acceptă alte formulare
          } else {
            // Gard suplimentar: dacă există DEJA un form booking pe aceleași date și același criteriu (room_id/room_type), nu atașa acest formular
            const evRoom = rLock.data.room_id ? String(rLock.data.room_id) : null;
            const evType = rLock.data.room_type_id ? String(rLock.data.room_type_id) : null;
            let q = admin
              .from('bookings')
              .select('id')
              .eq('property_id', property_id)
              .eq('start_date', rLock.data.start_date)
              .eq('end_date', rLock.data.end_date)
              .neq('status', 'cancelled')
              .eq('source', 'form')
              .limit(1);
            if (evRoom) q = (q as any).eq('room_id', evRoom);
            else if (evType) q = (q as any).eq('room_type_id', evType);
            const existing = await q;
            if (!existing.error && (existing.data?.length || 0) > 0) {
              matchedBookingId = null; // există deja un formular lipit conceptual -> nu suprascrie
            }
          }
        }
      } catch {}
    }

    if (matchedBookingId) {
      // —— MERGE în booking-ul matched —— //
      const updatePayload: any = {
        guest_first_name: guest_first_name ?? null,
        guest_last_name:  guest_last_name  ?? null,
        guest_email:      email ?? null,
        guest_phone:      phone ?? null,
        guest_address:    [address, city, country].map(v => (v ?? "").trim()).filter(Boolean).join(", ") || null,
        form_submitted_at: new Date().toISOString(),
      };
      if (matchedIsIcal) updatePayload.source = "ical";

      await admin.from("bookings").update(updatePayload).eq("id", matchedBookingId);

      // auto-assign room dacă lipsește
      let auto_assigned_room_id: string | null = null;
      const cur = await admin.from("bookings").select("room_id").eq("id", matchedBookingId).maybeSingle();
      if (!cur.error && cur.data && !cur.data.room_id) {
        if (form_room_id && await isRoomFree(form_room_id, start_date, end_date)) {
          await admin.from("bookings").update({ room_id: form_room_id }).eq("id", matchedBookingId);
          auto_assigned_room_id = form_room_id;
        } else if (form_room_type_id) {
          const free = await findFreeRoomForType({ property_id, room_type_id: form_room_type_id, start_date, end_date });
          if (free) {
            await admin.from("bookings").update({ room_id: free }).eq("id", matchedBookingId);
            auto_assigned_room_id = free;
          }
        }
      }

      // contact
      if (email || phone || address || city || country) {
        try {
          await admin
            .from("booking_contacts")
            .upsert(
              { booking_id: matchedBookingId, email: email ?? null, phone: phone ?? null, address: address ?? null, city: city ?? null, country: country ?? null },
              { onConflict: "booking_id" }
            )
            .select("booking_id")
            .single();
        } catch {}
      }

      // documente
      const docsArray: Array<any> = Array.isArray(docs) ? docs : [];
      if (!docsArray.length && (doc_type || doc_file_path || doc_file_mime)) {
        docsArray.push({
          doc_type,
          doc_series,
          doc_number,
          doc_nationality,
          storage_bucket: DEFAULT_DOCS_BUCKET,
          storage_path: doc_file_path,
          mime_type: doc_file_mime,
        });
      }
      let documents_saved = 0;
      if (docsArray.length) {
        const rows = docsArray.map((d) => {
          const bucket = String(d.storage_bucket || DEFAULT_DOCS_BUCKET);
          const path   = String(d.storage_path || d.path || "");
          if (!path) return null;
          const t = (d.doc_type ?? "").toString();
          const typeText = t === "id_card" || t === "passport" ? t : null;
          const r: any = {
            property_id,
            booking_id: matchedBookingId!,
            doc_type: typeText,
            storage_bucket: bucket,
            storage_path: path,
            mime_type: d.mime_type ? String(d.mime_type) : null,
            size_bytes: Number.isFinite(d.size_bytes) ? Number(d.size_bytes) : null,
            uploaded_at: new Date().toISOString(),
          };
          if (typeof d.doc_series === "string")      r.doc_series = d.doc_series;
          if (typeof d.doc_number === "string")      r.doc_number = d.doc_number;
          if (typeof d.doc_nationality === "string") r.doc_nationality = d.doc_nationality;
          return r;
        }).filter(Boolean) as any[];

        if (rows.length) {
          try {
            const insDocs = await admin.from("booking_documents").insert(rows).select("id");
            if (!insDocs.error) documents_saved = insDocs.data?.length ?? 0;
          } catch {}
        }
      }

      return NextResponse.json({
        ok: true,
        id: matchedBookingId,
        updated_existing_booking: true,
        auto_assigned_room_id,
        documents_saved,
      });
    }

    /* ========= FĂRĂ MATCH → creăm „form booking” (va fi galben 2h, apoi roșu) ========= */
    if (!isYMD(start_date) || !isYMD(end_date)) {
      return NextResponse.json({ error: "Missing/invalid dates" }, { status: 400 });
    }
    if (end_date <= start_date) {
      return NextResponse.json({ error: "end_date must be after start_date" }, { status: 400 });
    }

    const displayAddress = [address, city, country].map(v => (v ?? "").trim()).filter(Boolean).join(", ") || null;

    const basePayload: any = {
      property_id,
      room_id: null,
      room_type_id: form_room_type_id ?? null,
      start_date,
      end_date,
      start_time,
      end_time,
      status: "hold",               // fallback la "pending" dacă enum-ul nu conține "hold"
      guest_first_name: guest_first_name ?? null,
      guest_last_name:  guest_last_name  ?? null,
      guest_email:      email ?? null,
      guest_phone:      phone ?? null,
      guest_address:    displayAddress,
      form_submitted_at: new Date().toISOString(),
      source: "form",
    };

    let ins = await admin.from("bookings").insert(basePayload).select("id").single();
    if (ins.error && looksEnumHoldError(ins.error.message)) {
      basePayload.status = "pending";
      ins = await admin.from("bookings").insert(basePayload).select("id").single();
    }
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

    const newId = ins.data.id as string;

    if (email || phone || address || city || country) {
      try {
        await admin
          .from("booking_contacts")
          .upsert(
            { booking_id: newId, email: email ?? null, phone: phone ?? null, address: address ?? null, city: city ?? null, country: country ?? null },
            { onConflict: "booking_id" }
          )
          .select("booking_id")
          .single();
      } catch {}
    }

    const docsArray: Array<any> = Array.isArray(docs) ? docs : [];
    if (!docsArray.length && (doc_type || doc_file_path || doc_file_mime)) {
      docsArray.push({
        doc_type,
        doc_series,
        doc_number,
        doc_nationality,
        storage_bucket: DEFAULT_DOCS_BUCKET,
        storage_path: doc_file_path,
        mime_type: doc_file_mime,
      });
    }
    let documents_saved = 0;
    if (docsArray.length) {
      const rows = docsArray.map((d) => {
        const bucket = String(d.storage_bucket || DEFAULT_DOCS_BUCKET);
        const path   = String(d.storage_path || d.path || "");
        if (!path) return null;
        const t = (d.doc_type ?? "").toString();
        const typeText = t === "id_card" || t === "passport" ? t : null;
        const r: any = {
          property_id,
          booking_id: newId,
          doc_type: typeText,
          storage_bucket: bucket,
          storage_path: path,
          mime_type: d.mime_type ? String(d.mime_type) : null,
          size_bytes: Number.isFinite(d.size_bytes) ? Number(d.size_bytes) : null,
          uploaded_at: new Date().toISOString(),
        };
        if (typeof d.doc_series === "string")      r.doc_series = d.doc_series;
        if (typeof d.doc_number === "string")      r.doc_number = d.doc_number;
        if (typeof d.doc_nationality === "string") r.doc_nationality = d.doc_nationality;
        return r;
      }).filter(Boolean) as any[];

      if (rows.length) {
        try {
          const insDocs = await admin.from("booking_documents").insert(rows).select("id");
          if (!insDocs.error) documents_saved = insDocs.data?.length ?? 0;
        } catch {}
      }
    }

    try { broadcastNewGuestOverview(admin, property_id, start_date, end_date); } catch {}

    return NextResponse.json({
      ok: true,
      id: newId,
      updated_existing_booking: false,
      auto_assigned_room_id: null,
      room_type_id: form_room_type_id ?? null,
      start_date,
      end_date,
      start_time,
      end_time,
      documents_saved,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
