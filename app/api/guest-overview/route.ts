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
  guest_name: string | null;
  is_soft_hold?: boolean | null;
  form_submitted_at?: string | null;
  created_at?: string | null;
  hold_status?: "active" | "expired" | null;
  hold_expires_at?: string | null;
};

type Room = { id: string; room_type_id: string | null; name: string | null };
type RoomType = { id: string; name: string | null };

const safeLower = (s?: string | null) => (s ?? "").toLowerCase();
const ymdToDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const addDays = (d: Date, days: number) => { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + days); return x; };
const nowUtc = () => new Date();

function isIcalish(b: BRow) {
  const src = safeLower(b.source);
  return !!b.ical_uid || ["ical","ota","airbnb","booking","booking.com","expedia","channel_manager"].includes(src);
}
function isFormish(b: BRow) {
  const src = safeLower(b.source);
  return src === "form" || !!b.is_soft_hold || !!b.form_submitted_at || b.status === "hold";
}
function hasAnyName(b: Pick<BRow, "guest_first_name"|"guest_last_name"|"guest_name">) {
  const f = (b.guest_first_name ?? "").trim();
  const l = (b.guest_last_name ?? "").trim();
  const gn = (b.guest_name ?? "").trim();
  return (f.length + l.length) > 0 || gn.length > 0;
}
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

    // ——— Guard: cont suspendat? ———
    const rProp = await admin
      .from("properties")
      .select("id,account_id")
      .eq("id", property_id)
      .maybeSingle();
    if (rProp.error) return NextResponse.json({ error: rProp.error.message }, { status: 500 });
    if (!rProp.data)  return NextResponse.json({ error: "Property not found" }, { status: 404 });

    try {
      const susp = await admin.rpc("account_is_suspended", { account_id: rProp.data.account_id as string });
      if (!susp.error && susp.data === true) {
        return NextResponse.json({ error: "Account suspended" }, { status: 403 });
      }
    } catch { /* if RPC missing, we don't block */ }

    const todayYMD = new Date().toISOString().slice(0,10);

    // ——— Bookings: viitoare/curente, non-cancelled ———
    const rBookings = await admin
      .from("bookings")
      .select(`
        id, property_id, room_id, room_type_id,
        start_date, end_date, status, source, ical_uid,
        guest_first_name, guest_last_name, guest_name,
        is_soft_hold, form_submitted_at, created_at,
        hold_status, hold_expires_at
      `)
      .eq("property_id", property_id)
      .neq("status", "cancelled")
      .gte("end_date", todayYMD)
      .order("start_date", { ascending: true });

    if (rBookings.error) {
      return NextResponse.json({ error: rBookings.error.message }, { status: 500 });
    }
    const bookings: BRow[] = (rBookings.data ?? []) as any[];

    // ——— Rooms & types ———
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

    // ——— Grupare pe (start_date, end_date, type_id) ———
    type Pack = {
      key: string;
      start_date: string;
      end_date: string;
      type_id: string | null;
      type_name: string | null;
      ical?: BRow;
      form?: BRow;
      others: BRow[];
    };
    const packs = new Map<string, Pack>();

    for (const b of bookings) {
      const tId = typeFor(b, roomById);
      const key = `${b.start_date}|${b.end_date}|${tId ?? "null"}`;
      let entry = packs.get(key);
      if (!entry) {
        entry = {
          key, start_date: b.start_date, end_date: b.end_date,
          type_id: tId, type_name: tId ? (typeNameById.get(tId) ?? "Type") : null,
          others: []
        };
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

    // ——— Evaluare stări ———
    type Item = {
      kind: "green" | "yellow" | "red";
      reason?: string;
      start_date: string;
      end_date: string;
      room_id: string | null;
      room_label: string | null;
      room_type_id: string | null;
      room_type_name: string | null;
      booking_id: string | null;
      guest_first_name?: string | null;
      guest_last_name?: string | null;
      cutoff_ts?: string;
    };

    const items: Item[] = [];
    const now = nowUtc();

    for (const [, pk] of packs) {
      const startDt = ymdToDate(pk.start_date);
      const cutoffIcal = addDays(startDt, -3); // T-3 zile la check-in
      const hasIcal = !!pk.ical;
      const hasForm = !!pk.form;

      const nameKnown =
        (pk.form && hasAnyName(pk.form)) ||
        (pk.ical && hasAnyName(pk.ical)) ||
        pk.others.some(o => hasAnyName(o));

      const roomId =
        pk.ical?.room_id ??
        pk.form?.room_id ??
        (pk.others.find(o => o.room_id)?.room_id ?? null);

      const room = roomId ? roomById.get(roomId) : null;
      const roomLabel = room?.name ?? (roomId ? `#${String(roomId).slice(0,4)}` : null);

      // Preferăm hold_expires_at; fallback = form_submitted_at + 2h
      const formDeadline =
        (pk.form?.hold_expires_at && !isNaN(new Date(pk.form.hold_expires_at).getTime()))
          ? new Date(pk.form.hold_expires_at)
          : (pk.form?.form_submitted_at ? new Date(new Date(pk.form.form_submitted_at).getTime() + 2*60*60*1000) : null);

      // A) iCal + Form — ok dacă avem ori nume ori cameră
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
            guest_first_name: pk.form?.guest_first_name ?? pk.ical?.guest_first_name ?? null,
            guest_last_name:  pk.form?.guest_last_name  ?? pk.ical?.guest_last_name  ?? null,
          });
        } else {
          items.push({
            kind: "red",
            reason: "room_required_auto_failed",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_id: null,
            room_label: null,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.ical?.id ?? pk.form?.id,
            guest_first_name: pk.form?.guest_first_name ?? pk.ical?.guest_first_name ?? null,
            guest_last_name:  pk.form?.guest_last_name  ?? pk.ical?.guest_last_name  ?? null,
          });
        }
        continue;
      }

      // B) doar iCal
      if (hasIcal && !hasForm) {
        if (nameKnown) {
          items.push({
            kind: "green",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_id: roomId,
            room_label: roomLabel,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.ical?.id ?? null,
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
            booking_id: pk.ical?.id ?? null,
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
            booking_id: pk.ical?.id ?? null,
          });
        }
        continue;
      }

      // C) doar Form
      if (hasForm && !hasIcal) {
        // conflict: există iCal-only pe alt tip în același interval?
        let hasIcalOtherType = false;
        for (const [, pk2] of packs) {
          if (pk2 === pk) continue;
          if (pk2.start_date === pk.start_date && pk2.end_date === pk.end_date && pk2.ical && !pk2.form) {
            hasIcalOtherType = true; break;
          }
        }

        if (hasIcalOtherType) {
          items.push({
            kind: "red",
            reason: "type_conflict",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_id: roomId,
            room_label: roomLabel,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.form?.id ?? null,
            guest_first_name: pk.form?.guest_first_name ?? null,
            guest_last_name:  pk.form?.guest_last_name  ?? null,
          });
        } else if (nameKnown) {
          items.push({
            kind: "green",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_id: roomId,
            room_label: roomLabel,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.form?.id ?? null,
            guest_first_name: pk.form?.guest_first_name ?? null,
            guest_last_name:  pk.form?.guest_last_name  ?? null,
          });
        } else {
          const holdActive = pk.form?.hold_status !== "expired";
          const notExpiredYet = !!formDeadline && now < formDeadline;
          if (holdActive && notExpiredYet) {
            items.push({
              kind: "yellow",
              reason: "waiting_ical",
              start_date: pk.start_date,
              end_date: pk.end_date,
              room_id: roomId,
              room_label: roomLabel,
              room_type_id: pk.type_id,
              room_type_name: pk.type_name,
              booking_id: pk.form?.id ?? null,
              guest_first_name: pk.form?.guest_first_name ?? null,
              guest_last_name:  pk.form?.guest_last_name  ?? null,
              cutoff_ts: formDeadline?.toISOString(),
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
              booking_id: pk.form?.id ?? null,
              guest_first_name: pk.form?.guest_first_name ?? null,
              guest_last_name:  pk.form?.guest_last_name  ?? null,
            });
          }
        }
        continue;
      }

      // D) nici iCal, nici Form (manual)
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

    // —— Output compatibil cu GuestOverviewList (id, status) ——
    const rows = items.map((it) => ({
      id: it.booking_id,                    // folosit de openReservationByBooking
      property_id,
      room_id: it.room_id ?? null,
      start_date: it.start_date,
      end_date: it.end_date,
      status: it.kind,                      // "green" | "yellow" | "red"
      // păstrăm și câteva câmpuri utile dacă vrei un UI mai bogat:
      _room_label: it.room_label,
      _room_type_id: it.room_type_id,
      _room_type_name: it.room_type_name,
      _reason: it.reason ?? null,
      _cutoff_ts: it.cutoff_ts ?? null,
      _guest_first_name: it.guest_first_name ?? null,
      _guest_last_name: it.guest_last_name ?? null,
    }));

    return NextResponse.json(
      { ok: true, items: rows },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}