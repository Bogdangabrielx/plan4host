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

  // Guest
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_name: string | null; // ← important pt. manual

  // Form / holds
  is_soft_hold?: boolean | null;
  form_submitted_at?: string | null;
  created_at?: string | null;
};

type Room = { id: string; room_type_id: string | null; name: string | null };
type RoomType = { id: string; name: string | null };

function ymdToDate(ymd: string) { return new Date(`${ymd}T00:00:00`); }
function addDays(d: Date, days: number) { const x = new Date(d.getTime()); x.setDate(x.getDate() + days); return x; }
function nowUtc() { return new Date(); }
const safeLower = (s?: string | null) => (s ?? "").toLowerCase();

function isIcalish(b: BRow) {
  const src = safeLower(b.source);
  return !!b.ical_uid || src === "ical" || src === "ota" || src === "airbnb" || src === "booking" || src === "booking.com" || src === "expedia";
}
function isFormish(b: BRow) {
  const src = safeLower(b.source);
  return src === "form" || !!b.is_soft_hold || !!b.form_submitted_at;
}
function hasAnyName(b: Pick<BRow, "guest_first_name"|"guest_last_name"|"guest_name">) {
  const f = (b.guest_first_name ?? "").trim();
  const l = (b.guest_last_name ?? "").trim();
  const gn = (b.guest_name ?? "").trim();
  return (f.length + l.length) > 0 || gn.length > 0;
}
// Derivă tipul din room_id dacă lipsește
function typeFor(b: BRow, roomById: Map<string, Room>) {
  if (b.room_type_id) return String(b.room_type_id);
  if (b.room_id) {
    const r = roomById.get(b.room_id);
    if (r?.room_type_id) return String(r.room_type_id);
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

    const todayYMD = new Date().toISOString().slice(0,10);

    // 1) Booking-uri curente/viitoare, non-cancelled
    const rBookings = await admin
      .from("bookings")
      .select(`
        id, property_id, room_id, room_type_id,
        start_date, end_date, status, source, ical_uid,
        guest_first_name, guest_last_name, guest_name,
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

    // 2) Rooms & roomTypes (pt. label & tip)
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

    // 3) Grupăm pe (start_date, end_date, type_id)
    type Pack = {
      key: string;
      start_date: string;
      end_date: string;
      type_id: string | null;
      type_name: string | null;
      ical?: BRow;
      form?: BRow;
      others: BRow[]; // manual, etc.
    };
    const packs = new Map<string, Pack>();

    for (const b of bookings) {
      const tId = typeFor(b, roomById);
      const key = `${b.start_date}|${b.end_date}|${tId ?? "null"}`;
      let entry = packs.get(key);
      if (!entry) {
        entry = { key, start_date: b.start_date, end_date: b.end_date, type_id: tId, type_name: tId ? (typeNameById.get(tId) ?? "Type") : null, others: [] };
        packs.set(key, entry);
      }
      if (isIcalish(b)) {
        if (!entry.ical) entry.ical = b; else entry.others.push(b);
      } else if (isFormish(b)) {
        if (!entry.form) entry.form = b; else entry.others.push(b);
      } else {
        entry.others.push(b);
      }
    }

    // 4) Determinare stare pentru fiecare pachet
    const items: any[] = [];
    const now = nowUtc();

    for (const [, pk] of packs) {
      const startDt = ymdToDate(pk.start_date);
      const cutoffIcal = addDays(startDt, -3); // iCal waiting window
      const hasIcal = !!pk.ical;
      const hasForm = !!pk.form;

      // name known din ORICARE componentă (form / ical / others)
      const nameKnown =
        (pk.form && hasAnyName(pk.form)) ||
        (pk.ical && hasAnyName(pk.ical)) ||
        pk.others.some(o => hasAnyName(o));

      // alegem un room_id afișabil (prefer iCal, apoi Form, apoi prima „other” cu room)
      const roomId =
        pk.ical?.room_id ??
        pk.form?.room_id ??
        (pk.others.find(o => o.room_id)?.room_id ?? null);

      const room = roomId ? roomById.get(roomId) : null;
      const roomLabel = room?.name ?? (roomId ? `#${String(roomId).slice(0,4)}` : null);

      // cutoff de 2h pentru Form
      let formCutoff: Date | null = null;
      if (pk.form?.form_submitted_at) {
        const s = new Date(pk.form.form_submitted_at);
        if (!isNaN(s.getTime())) formCutoff = new Date(s.getTime() + 2 * 60 * 60 * 1000);
      }

      // 4.a Exact match (iCal + Form)
      if (hasIcal && hasForm) {
        if (roomId || nameKnown) {
          items.push({
            kind: "green",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_id: roomId,
            room_label: roomLabel,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.ical?.id ?? pk.form?.id,
            // trim la UI
            guest_first_name: (pk.form?.guest_first_name ?? pk.ical?.guest_first_name ?? null),
            guest_last_name:  (pk.form?.guest_last_name  ?? pk.ical?.guest_last_name  ?? null),
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
            guest_first_name: pk.form?.guest_first_name ?? pk.ical?.guest_first_name ?? null,
            guest_last_name:  pk.form?.guest_last_name  ?? pk.ical?.guest_last_name  ?? null,
          });
        }
        continue;
      }

      // 4.b NUMAI iCal
      if (hasIcal && !hasForm) {
        if (nameKnown) {
          // dacă cineva a completat manual numele în bookingul iCal
          items.push({
            kind: "green",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_id: roomId,
            room_label: roomLabel,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.ical?.id,
            guest_first_name: pk.ical?.guest_first_name ?? null,
            guest_last_name:  pk.ical?.guest_last_name  ?? null,
          });
        } else if (now < cutoffIcal) {
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

      // 4.c NUMAI Form
      if (hasForm && !hasIcal) {
        // Există în același interval un iCal-only pe alt tip? -> conflict
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
            guest_first_name: pk.form?.guest_first_name ?? null,
            guest_last_name:  pk.form?.guest_last_name  ?? null,
          });
        } else if (nameKnown) {
          // are nume — regula de aur
          items.push({
            kind: "green",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_id: roomId,
            room_label: roomLabel,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.form?.id,
            guest_first_name: pk.form?.guest_first_name ?? null,
            guest_last_name:  pk.form?.guest_last_name  ?? null,
          });
        } else if (formCutoff && now < formCutoff) {
          items.push({
            kind: "yellow",
            reason: "waiting_ical",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.form?.id,
            guest_first_name: pk.form?.guest_first_name ?? null,
            guest_last_name:  pk.form?.guest_last_name  ?? null,
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
            guest_first_name: pk.form?.guest_first_name ?? null,
            guest_last_name:  pk.form?.guest_last_name  ?? null,
          });
        }
        continue;
      }

      // 4.d Nici iCal, nici Form (ex. rezervare manuală)
      if (nameKnown) {
        items.push({
          kind: "green",
          start_date: pk.start_date,
          end_date: pk.end_date,
          room_id: roomId,
          room_label: roomLabel,
          room_type_id: pk.type_id,
          room_type_name: pk.type_name,
          booking_id: pk.others[0]?.id ?? null,
          // nu avem neapărat first/last separat la manual
          guest_first_name: pk.others.find(o => (o.guest_first_name ?? "").trim())?.guest_first_name ?? null,
          guest_last_name:  pk.others.find(o => (o.guest_last_name  ?? "").trim())?.guest_last_name  ?? null,
        });
      } else {
        items.push({
          kind: "red",
          reason: "no_ota_found",
          start_date: pk.start_date,
          end_date: pk.end_date,
          room_id: roomId,
          room_label: roomLabel,
          room_type_id: pk.type_id,
          room_type_name: pk.type_name,
          booking_id: pk.others[0]?.id ?? null,
        });
      }
    }

    // Sortare: GREEN → YELLOW → RED, apoi cronologic & nume tip
    const orderKind = (k: string) => (k === "green" ? 0 : k === "yellow" ? 1 : 2);
    items.sort((a, b) => {
      const dk = orderKind(a.kind) - orderKind(b.kind);
      if (dk) return dk;
      if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
      return (a.room_type_name || "").localeCompare(b.room_type_name || "");
    });

    return NextResponse.json(
      { ok: true, items },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}