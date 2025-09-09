// app/api/checkin/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

// yyyy-mm-dd validator
function isYMD(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// HH:mm normalizer (fallback sigur)
function clampTime(t: unknown, fallback: string): string {
  if (typeof t !== "string") return fallback;
  const m = t.match(/^(\d{1,2}):(\d{1,2})/);
  if (!m) return fallback;
  let hh = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  let mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// helpers pentru detecția unor erori comune
function looksEnumHoldError(msg?: string) {
  return !!msg && /invalid input value for enum .*: "hold"/i.test(msg);
}
function looksForeignKeyOrOverlap(msg?: string) {
  return !!msg && /(foreign key|duplicate key|unique|overlap|exclusion)/i.test(msg);
}

// Validează că room_id aparține proprietății; altfel -> null
async function normalizeRoomId(room_id: any, property_id: string): Promise<string | null> {
  if (!room_id) return null;
  const r = await admin.from("rooms").select("id,property_id,room_type_id").eq("id", room_id).maybeSingle();
  if (r.error || !r.data) return null;
  return r.data.property_id === property_id ? String(r.data.id) : null;
}

// Validează că room_type_id aparține proprietății; altfel -> null
async function normalizeRoomTypeId(room_type_id: any, property_id: string): Promise<string | null> {
  if (!room_type_id) return null;
  const r = await admin.from("room_types").select("id,property_id").eq("id", room_type_id).maybeSingle();
  if (r.error || !r.data) return null;
  return r.data.property_id === property_id ? String(r.data.id) : null;
}

// Dacă avem room_id dar nu avem room_type_id, întoarce type-ul camerei
async function roomTypeFromRoom(room_id: string): Promise<string | null> {
  const r = await admin.from("rooms").select("room_type_id").eq("id", room_id).maybeSingle();
  if (r.error || !r.data) return null;
  return r.data.room_type_id ? String(r.data.room_type_id) : null;
}

// găsește o cameră liberă pentru un tip, în intervalul [start_date, end_date)
async function findFreeRoomForType(opts: {
  property_id: string;
  room_type_id: string;
  start_date: string; // yyyy-mm-dd
  end_date: string;   // yyyy-mm-dd
}): Promise<string | null> {
  const { property_id, room_type_id, start_date, end_date } = opts;

  // 1) camere candidate
  const rRooms = await admin
    .from("rooms")
    .select("id,name")
    .eq("property_id", property_id)
    .eq("room_type_id", room_type_id)
    .order("name", { ascending: true });

  if (rRooms.error || !rRooms.data || rRooms.data.length === 0) return null;
  const candIds = rRooms.data.map((r) => r.id as string);

  // 2) booking-uri care se suprapun (half-open: [start, end))
  const rBusy = await admin
    .from("bookings")
    .select("room_id,start_date,end_date,status")
    .in("room_id", candIds)
    .neq("status", "cancelled")
    .lt("start_date", end_date) // start < newEnd
    .gt("end_date", start_date); // end > newStart

  const busy = new Set<string>();
  if (!rBusy.error) {
    for (const b of rBusy.data ?? []) {
      if (b.room_id) busy.add(String(b.room_id));
    }
  }

  // 3) alege prima cameră liberă
  const free = candIds.find((id) => !busy.has(id));
  return free ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      property_id,
      start_date,
      end_date,

      // guest (vizibile în RoomDetailModal)
      guest_first_name,
      guest_last_name,

      // selecții din form
      requested_room_id,
      requested_room_type_id,

      // opțional din client; dacă lipsesc, folosim orele din propertySetup
      start_time: start_time_client,
      end_time: end_time_client,

      // contact (opționale; le scriem și în bookings, și structurat în booking_contacts)
      email,
      phone,
      address,
      city,
      country,

      // ---- document (formă veche sau nouă) ----
      // v1 (legacy, un singur doc):
      doc_type,          // "id_card" | "passport"
      doc_series,        // string | null (doar pentru id_card)
      doc_number,        // string
      doc_nationality,   // string | null (doar pentru passport)
      doc_file_path,     // string | null (ex: <property>/<folder>/<uuid>.<ext>)
      doc_file_mime,     // string | null (ex: image/jpeg, application/pdf)

      // v2 (nou): listă de documente
      docs,              // Array<{ storage_path, storage_bucket?, mime_type?, size_bytes?, doc_type?, doc_series?, doc_number?, doc_nationality? }>
    } = body ?? {};

    if (!property_id || !isYMD(start_date) || !isYMD(end_date)) {
      return NextResponse.json({ error: "Missing/invalid property_id or dates" }, { status: 400 });
    }
    if (end_date <= start_date) {
      return NextResponse.json({ error: "end_date must be after start_date" }, { status: 400 });
    }

    // 1) Orele din PropertySetup
    const rProp = await admin
      .from("properties")
      .select("id,check_in_time,check_out_time")
      .eq("id", property_id)
      .maybeSingle();

    if (rProp.error) return NextResponse.json({ error: rProp.error.message }, { status: 500 });
    if (!rProp.data) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const checkInDefault  = rProp.data.check_in_time  ?? "14:00";
    const checkOutDefault = rProp.data.check_out_time ?? "11:00";

    const start_time = clampTime(start_time_client, checkInDefault);
    const end_time   = clampTime(end_time_client,   checkOutDefault);

    // 2) Normalize room / room_type
    let room_id: string | null = await normalizeRoomId(requested_room_id, property_id);
    let room_type_id: string | null = await normalizeRoomTypeId(requested_room_type_id, property_id);

    if (!room_type_id && room_id) {
      room_type_id = await roomTypeFromRoom(room_id);
    }

    if (!room_id && room_type_id) {
      room_id = await findFreeRoomForType({ property_id, room_type_id, start_date, end_date });
    }

    // 3) Construcția adresei afișabile (pt. RoomDetailModal)
    const parts = [address, city, country].map(v => (v ?? "").trim()).filter(Boolean);
    const displayAddress = parts.length ? parts.join(", ") : null;

    // 4) Insert booking (status soft)
    const basePayload: any = {
      property_id,
      room_id: room_id ?? null,
      room_type_id: room_type_id ?? null,
      start_date,
      end_date,
      start_time,
      end_time,
      status: "hold",
      guest_first_name: guest_first_name ?? null,
      guest_last_name:  guest_last_name ?? null,
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

    if (ins.error && room_id && looksForeignKeyOrOverlap(ins.error.message)) {
      const fallbackPayload = { ...basePayload, room_id: null };
      ins = await admin.from("bookings").insert(fallbackPayload).select("id").single();
    }

    if (ins.error) {
      return NextResponse.json({ error: ins.error.message }, { status: 500 });
    }

    const newId = ins.data.id as string;

    // 5) Soft-hold (dacă schema permite)
    try {
      await admin
        .from("bookings")
        .update({
          is_soft_hold: true,
          hold_status: "active",
          hold_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        } as any)
        .eq("id", newId);
    } catch {}

    // 6) Contact structurat (best-effort)
    let contact_saved = false;
    if (email || phone || address || city || country) {
      try {
        const up = await admin
          .from("booking_contacts")
          .upsert(
            {
              booking_id: newId,
              email: email ?? null,
              phone: phone ?? null,
              address: address ?? null,
              city: city ?? null,
              country: country ?? null,
            },
            { onConflict: "booking_id" }
          )
          .select("booking_id")
          .single();
        contact_saved = !up.error;
      } catch {
        contact_saved = false;
      }
    }

    // 7) Documente — inserăm în booking_documents (schema ta actuală)
    let documents_saved = 0;

    // Normalize docs[] (v2) sau doc_* (v1)
    const docsArray: Array<any> = Array.isArray(docs) ? docs : [];

    if (!docsArray.length && (doc_type || doc_file_path || doc_file_mime)) {
      // transformă forma v1 într-un doc compatibil
      docsArray.push({
        doc_type,
        doc_series,
        doc_number,
        doc_nationality,
        storage_bucket: "guest_docs",
        storage_path: doc_file_path,
        mime_type: doc_file_mime,
      });
    }

    if (docsArray.length) {
      const rows = docsArray
        .map((d) => {
          const bucket = String(d.storage_bucket || "guest_docs");
          const path = String(d.storage_path || d.path || "");
          if (!path) return null;

          // la tine doc_type e text; păstrăm doar valorile cunoscute, altfel null
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

          // coloane opționale (există în schema ta)
          if (typeof d.doc_series === "string")      r.doc_series = d.doc_series;
          if (typeof d.doc_number === "string")      r.doc_number = d.doc_number;
          if (typeof d.doc_nationality === "string") r.doc_nationality = d.doc_nationality;

          return r;
        })
        .filter(Boolean) as any[];

      if (rows.length) {
        try {
          const insDocs = await admin.from("booking_documents").insert(rows).select("id");
          if (!insDocs.error) documents_saved = insDocs.data?.length ?? 0;
        } catch {
          // ignore (nu oprim flow-ul de submit)
        }
      }
    }

    return NextResponse.json({
      ok: true,
      id: newId,
      auto_assigned_room_id: room_id ?? null,
      room_type_id: room_type_id ?? null,
      start_date,
      end_date,
      start_time,
      end_time,
      contact_saved,
      documents_saved,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}