// app/api/guest-overview/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

type BRow = {
  id: string;
  property_id: string;
  room_id: string | null;
  room_type_id: string | null;
  start_date: string; // yyyy-mm-dd
  end_date: string;   // yyyy-mm-dd
  status: string | null;
  source: string | null;
  ical_uid: string | null;
  guest_first_name: string | null;
  guest_last_name: string | null;
  is_soft_hold?: boolean | null;
  form_submitted_at?: string | null;
  created_at?: string | null;
};

type Room = { id: string; room_type_id: string | null; name: string | null };
type RoomType = { id: string; name: string | null };

function ymdToDate(ymd: string) {
  // interpretăm ca local midnight (suficient pentru praguri -3 zile)
  return new Date(`${ymd}T00:00:00`);
}
function addDays(d: Date, days: number) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + days);
  return x;
}
function nowUtc() { return new Date(); }

function safeLower(s?: string | null) {
  return (s ?? "").toLowerCase();
}

// Heuristică: considerăm “iCal-like” orice sursă indică feed (ical) sau are ical_uid
function isIcalish(b: BRow) {
  const src = safeLower(b.source);
  return !!b.ical_uid || src === "ical" || src === "ota" || src === "airbnb" || src === "booking" || src === "booking.com" || src === "expedia";
}
// Heuristică: considerăm “Form-only” dacă vine din form sau e soft_hold setat
function isFormish(b: BRow) {
  const src = safeLower(b.source);
  return src === "form" || !!b.is_soft_hold || !!b.form_submitted_at;
}

// Derivă room_type dacă lipsește, din room_id
function typeFor(b: BRow, roomTypeById: Map<string, string | null>, roomById: Map<string, Room>): string | null {
  if (b.room_type_id) return String(b.room_type_id);
  if (b.room_id) {
    const r = roomById.get(b.room_id);
    if (r && r.room_type_id) return String(r.room_type_id);
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const property_id = searchParams.get("property");
    if (!property_id) {
      return NextResponse.json({ error: "Missing ?property=<id>" }, { status: 400 });
    }

    // today threshold (pentru “doar viitoare/curente”)
    const todayYMD = new Date().toISOString().slice(0,10);

    // 1) Booking-uri relevante (curente/viitoare, non-cancelled) pentru proprietate
    const rBookings = await admin
      .from("bookings")
      .select(`
        id, property_id, room_id, room_type_id,
        start_date, end_date, status, source, ical_uid,
        guest_first_name, guest_last_name,
        is_soft_hold, form_submitted_at, created_at
      `)
      .eq("property_id", property_id)
      .neq("status", "cancelled")
      .gte("end_date", todayYMD)
      .order("start_date", { ascending: true });

    if (rBookings.error) {
      return NextResponse.json({ error: rBookings.error.message }, { status: 500 });
    }
    const bookings: BRow[] = (rBookings.data ?? []) as any[];

    // 2) Rooms & roomTypes (pentru deducerea tipului)
    const [rRooms, rTypes] = await Promise.all([
      admin.from("rooms").select("id, room_type_id, name").eq("property_id", property_id),
      admin.from("room_types").select("id, name").eq("property_id", property_id),
    ]);
    const rooms: Room[] = (rRooms.data ?? []) as any[];
    const types: RoomType[] = (rTypes.data ?? []) as any[];

    const roomById = new Map<string, Room>();
    for (const r of rooms) roomById.set(String(r.id), r);
    const typeNameById = new Map<string, string>();
    for (const t of types) typeNameById.set(String(t.id), t.name ?? "Type");

    // 3) Grupăm pe cheie = (start_date, end_date, type)
    type Pack = {
      key: string;
      start_date: string; end_date: string;
      type_id: string | null;
      type_name: string | null;
      ical?: BRow;
      form?: BRow;
      others: BRow[]; // manual, etc.
    };
    const packs = new Map<string, Pack>();

    for (const b of bookings) {
      const tId = typeFor(b, null as any, roomById); // roomTypeById nu e necesar; îl deducem din roomById
      const key = `${b.start_date}|${b.end_date}|${tId ?? "null"}`;

      let entry = packs.get(key);
      if (!entry) {
        entry = {
          key,
          start_date: b.start_date,
          end_date: b.end_date,
          type_id: tId,
          type_name: tId ? (typeNameById.get(tId) ?? "Type") : null,
          others: [],
        };
        packs.set(key, entry);
      }

      if (isIcalish(b)) {
        // preferăm 1 iCal pe pachet (dacă sunt mai multe, îl păstrăm pe primul)
        if (!entry.ical) entry.ical = b; else entry.others.push(b);
      } else if (isFormish(b)) {
        if (!entry.form) entry.form = b; else entry.others.push(b);
      } else {
        entry.others.push(b);
      }
    }

    // 4) Determinăm starea pentru fiecare pachet
    const items: any[] = [];
    const now = nowUtc();

    for (const [, pk] of packs) {
      const startDt = ymdToDate(pk.start_date);
      const cutoffIcal = addDays(startDt, -3); // Arrival − 3 zile, 00:00
      const hasIcal = !!pk.ical;
      const hasForm = !!pk.form;

      // Datele afișabile
      const guestFirst = (pk.form?.guest_first_name ?? pk.ical?.guest_first_name ?? null) || null;
      const guestLast  = (pk.form?.guest_last_name  ?? pk.ical?.guest_last_name  ?? null) || null;
      const nameKnown = !!(guestFirst || guestLast);

      const roomId = pk.ical?.room_id ?? pk.form?.room_id ?? null;
      const room = roomId ? roomById.get(roomId) : null;
      const roomLabel = room?.name ?? (roomId ? `#${roomId.slice(0,4)}` : null);

      // YELLOW (Form) are fereastră 2h de la submit
      let formCutoff: Date | null = null;
      if (pk.form?.form_submitted_at) {
        const s = new Date(pk.form.form_submitted_at);
        formCutoff = new Date(s.getTime() + 2 * 60 * 60 * 1000);
      }

      // GREEN
      if (hasIcal && hasForm) {
        // Dacă engine-ul nu a reușit assign (room_id lipsă), notăm RED special,
        // dar dacă există nume (manual-resolved ulterior) îl tratăm GREEN.
        if (roomId || nameKnown) {
          items.push({
            kind: "green",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_id: roomId,
            room_label: roomLabel,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.ical?.id ?? pk.form?.id, // prefer iCal id-ul ca principal
            guest_first_name: guestFirst,
            guest_last_name: guestLast,
          });
        } else {
          items.push({
            kind: "red",
            reason: "room_required_auto_failed",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.ical?.id ?? pk.form?.id,
            guest_first_name: guestFirst,
            guest_last_name: guestLast,
          });
        }
        continue;
      }

      // NUMAI iCal
      if (hasIcal && !hasForm) {
        if (now < cutoffIcal) {
          items.push({
            kind: "yellow",
            reason: "waiting_form",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_id: pk.ical?.room_id ?? null,
            room_label: pk.ical?.room_id ? (roomLabel ?? null) : null,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.ical?.id,
            guest_first_name: null,
            guest_last_name: null,
            cutoff_ts: cutoffIcal.toISOString(),
          });
        } else {
          items.push({
            kind: "red",
            reason: "missing_form",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_id: pk.ical?.room_id ?? null,
            room_label: pk.ical?.room_id ? (roomLabel ?? null) : null,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.ical?.id,
          });
        }
        continue;
      }

      // NUMAI Form
      if (hasForm && !hasIcal) {
        // Dacă există în ACELAȘI interval vreun pachet numai-iCal dar cu ALT tip → type_conflict
        // (căutăm alt pack cu aceleași date, dar fără form, cu iCal)
        let hasIcalOtherType = false;
        for (const [, pk2] of packs) {
          if (pk2 === pk) continue;
          if (pk2.start_date === pk.start_date && pk2.end_date === pk.end_date && pk2.ical && !pk2.form) {
            hasIcalOtherType = true;
            break;
          }
        }

        if (hasIcalOtherType) {
          items.push({
            kind: "red",
            reason: "type_conflict",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.form?.id,
            guest_first_name: guestFirst,
            guest_last_name: guestLast,
          });
        } else {
          // Fereastră de 2h de așteptare pentru iCal compatibil
          if (formCutoff && now < formCutoff) {
            items.push({
              kind: "yellow",
              reason: "waiting_ical",
              start_date: pk.start_date,
              end_date: pk.end_date,
              room_type_id: pk.type_id,
              room_type_name: pk.type_name,
              booking_id: pk.form?.id,
              guest_first_name: guestFirst,
              guest_last_name: guestLast,
              cutoff_ts: formCutoff.toISOString(),
            });
          } else {
            items.push({
              kind: "red",
              reason: "no_ota_found",
              start_date: pk.start_date,
              end_date: pk.end_date,
              room_type_id: pk.type_id,
              room_type_name: pk.type_name,
              booking_id: pk.form?.id,
              guest_first_name: guestFirst,
              guest_last_name: guestLast,
            });
          }
        }
        continue;
      }

      // Nici iCal, nici Form (de ex. rezervare manuală fără nume)
      if (!hasIcal && !hasForm) {
        if (nameKnown) {
          items.push({
            kind: "green",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_id: roomId,
            room_label: roomLabel,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.others[0]?.id,
            guest_first_name: guestFirst,
            guest_last_name: guestLast,
          });
        } else {
          // fără nume → tratăm ca RED (trebuie rezolvat manual)
          items.push({
            kind: "red",
            reason: "no_data",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_id: roomId,
            room_label: roomLabel,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.others[0]?.id,
          });
        }
      }
    }

    // Sortare: GREEN → YELLOW → RED, apoi cronologic
    const orderKind = (k: string) => (k === "green" ? 0 : k === "yellow" ? 1 : 2);
    items.sort((a, b) => {
      const dk = orderKind(a.kind) - orderKind(b.kind);
      if (dk) return dk;
      if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
      return (a.room_type_name || "").localeCompare(b.room_type_name || "");
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}