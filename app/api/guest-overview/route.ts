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
  ota_integration_id?: string | null;
  ota_provider?: string | null;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_name: string | null;
  form_submitted_at?: string | null;
  created_at?: string | null;
};

type Room = { id: string; room_type_id: string | null; name: string | null };
type RoomType = { id: string; name: string | null };

const safeLower = (s?: string | null) => (s ?? "").toLowerCase();
const nowUtc = () => new Date();

function isIcalish(b: BRow) {
  const src = safeLower(b.source);
  return !!b.ical_uid || ["ical","ota","airbnb","booking","booking.com","expedia","channel_manager"].includes(src);
}
function isFormish(b: any) {
  const src = (b?.source || "").toString().toLowerCase();
  return src === "form" || !!b?.form_submitted_at || b?.status === "hold" || b?.status === "pending";
}
function hasAnyName(b: Pick<BRow,"guest_first_name"|"guest_last_name"|"guest_name">) {
  return !!((b.guest_first_name ?? "").trim() || (b.guest_last_name ?? "").trim() || (b.guest_name ?? "").trim());
}
function typeFor(b: BRow, roomById: Map<string, Room>) {
  if (b.room_type_id) return String(b.room_type_id);
  const r = b.room_id ? roomById.get(b.room_id) : null;
  return r?.room_type_id ? String(r.room_type_id) : null;
}

type ItemKind = "green" | "yellow" | "red";
type Item = {
  kind: ItemKind;
  reason?: string | null;
  start_date: string;
  end_date: string;
  room_id: string | null;
  room_label: string | null;
  room_type_id: string | null;
  room_type_name: string | null;
  booking_id: string | null;
  _ota_provider?: string | null;
  _ota_color?: string | null;
  _ota_logo_url?: string | null;
  _guest_first_name?: string | null;
  _guest_last_name?: string | null;
  _cutoff_ts?: string | null;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const property_id = searchParams.get("property");
    if (!property_id) return NextResponse.json({ error: "Missing ?property=<id>" }, { status: 400 });

    // property + suspend
    const rProp = await admin.from("properties").select("id,account_id").eq("id", property_id).maybeSingle();
    if (rProp.error) return NextResponse.json({ error: rProp.error.message }, { status: 500 });
    if (!rProp.data) return NextResponse.json({ error: "Property not found" }, { status: 404 });
    try {
      const susp = await admin.rpc("account_is_suspended", { account_id: rProp.data.account_id as string });
      if (!susp.error && susp.data === true) return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    } catch {}

    const todayYMD = new Date().toISOString().slice(0,10);

    // bookings viitoare/curente
    const rBookings = await admin
      .from("bookings")
      .select(`
        id, property_id, room_id, room_type_id,
        start_date, end_date, status, source, ical_uid, ota_integration_id, ota_provider,
        guest_first_name, guest_last_name, guest_name,
        form_submitted_at, created_at
      `)
      .eq("property_id", property_id)
      .neq("status", "cancelled")
      .gte("end_date", todayYMD)
      .order("start_date", { ascending: true });
    if (rBookings.error) return NextResponse.json({ error: rBookings.error.message }, { status: 500 });
    const bookings: BRow[] = (rBookings.data ?? []) as any[];

    // ICS unassigned
    const rUnassigned = await admin
      .from("ical_unassigned_events")
      .select("id,property_id,room_type_id,uid,summary,start_date,end_date,start_time,end_time,created_at,integration_id,resolved")
      .eq("property_id", property_id)
      .eq("resolved", false);
    const unassigned = rUnassigned.data ?? [];

    // integ by booking (uid map)
    const integByBooking = new Map<string, string>();
    if (bookings.length) {
      const { data: maps } = await admin
        .from("ical_uid_map")
        .select("booking_id,integration_id")
        .in("booking_id", bookings.map(b => b.id));
      for (const m of maps ?? []) integByBooking.set(String(m.booking_id), String(m.integration_id));
    }

    // integ meta
    const integIds = new Set<string>();
    for (const b of bookings) {
      if (b.ota_integration_id) integIds.add(b.ota_integration_id);
      else {
        const mid = integByBooking.get(b.id);
        if (mid) integIds.add(mid);
      }
    }
    for (const u of unassigned) if (u.integration_id) integIds.add(u.integration_id);
    const integMeta = new Map<string, { provider: string | null; color: string | null; logo_url: string | null }>();
    if (integIds.size) {
      const { data } = await admin
        .from("ical_type_integrations")
        .select("id,provider,color,logo_url")
        .in("id", Array.from(integIds));
      for (const i of data ?? []) integMeta.set(String((i as any).id), {
        provider: (i as any).provider ?? null,
        color: (i as any).color ?? null,
        logo_url: (i as any).logo_url ?? null,
      });
    }

    // camere + tipuri
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

    // grupare pe interval + tip
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
      let p = packs.get(key);
      if (!p) {
        p = { key, start_date: b.start_date, end_date: b.end_date, type_id: tId, type_name: tId ? (typeNameById.get(tId) ?? "Type") : null, ical: undefined, form: undefined, others: [] };
        packs.set(key, p);
      }
      if (isIcalish(b)) p.ical = b;
      else if (isFormish(b)) p.form = b;
      else p.others.push(b);
    }

    // evaluare
    const items: Item[] = [];
    const now = nowUtc();

    for (const [, pk] of packs) {
      const hasIcal = !!pk.ical;
      const hasForm = !!pk.form;

      // nume cunoscut pentru (manual)
      const nameKnown =
        (pk.ical && hasAnyName(pk.ical)) ||
        (pk.form && hasAnyName(pk.form)) ||
        pk.others.some(o => hasAnyName(o));

      const roomId =
        pk.ical?.room_id ??
        pk.form?.room_id ??
        (pk.others.find(o => o.room_id)?.room_id ?? null);

      const room = roomId ? roomById.get(roomId) : null;
      const roomLabel = room?.name ?? (roomId ? `#${String(roomId).slice(0,4)}` : null);

      const meta = pk.ical
        ? (() => {
            const mId = pk.ical!.ota_integration_id || integByBooking.get(pk.ical!.id) || null;
            if (mId && integMeta.has(String(mId))) return integMeta.get(String(mId))!;
            return { provider: pk.ical!.ota_provider ?? null, color: null, logo_url: null };
          })()
        : null;

      // 1) iCal + Form => GREEN
      if (hasIcal && hasForm) {
        items.push({
          kind: "green",
          start_date: pk.start_date,
          end_date: pk.end_date,
          room_id: roomId ?? null,
          room_label: roomLabel ?? null,
          room_type_id: pk.type_id ?? null,
          room_type_name: pk.type_name ?? null,
          booking_id: pk.ical?.id ?? pk.form?.id ?? null,
          _ota_provider: meta?.provider ?? null,
          _ota_color: meta?.color ?? null,
          _ota_logo_url: meta?.logo_url ?? null,
          _guest_first_name: pk.form?.guest_first_name ?? pk.ical?.guest_first_name ?? null,
          _guest_last_name: pk.form?.guest_last_name ?? pk.ical?.guest_last_name ?? null,
          _cutoff_ts: null,
        });
        continue;
      }

      // 2) doar iCal => YELLOW (așteaptă form)
      if (hasIcal && !hasForm) {
        items.push({
          kind: "yellow",
          reason: "waiting_form",
          start_date: pk.start_date,
          end_date: pk.end_date,
          room_id: roomId ?? null,
          room_label: roomLabel ?? null,
          room_type_id: pk.type_id ?? null,
          room_type_name: pk.type_name ?? null,
          booking_id: pk.ical?.id ?? null,
          _ota_provider: meta?.provider ?? null,
          _ota_color: meta?.color ?? null,
          _ota_logo_url: meta?.logo_url ?? null,
          _guest_first_name: pk.ical?.guest_first_name ?? null,
          _guest_last_name: pk.ical?.guest_last_name ?? null,
          _cutoff_ts: null,
        });
        continue;
      }

      // 3) doar Form => YELLOW 2h, apoi RED
      if (hasForm && !hasIcal) {
        const submittedAt = pk.form?.form_submitted_at || pk.form?.created_at || null;
        const formDeadline = submittedAt ? new Date(new Date(submittedAt).getTime() + 2 * 60 * 60 * 1000) : null;
        const notExpiredYet = !!formDeadline && now < formDeadline;

        items.push({
          kind: notExpiredYet ? "yellow" as const : "red",
          reason: notExpiredYet ? "waiting_ical" : "no_ota_found",
          start_date: pk.start_date,
          end_date: pk.end_date,
          room_id: roomId ?? null,
          room_label: roomLabel ?? null,
          room_type_id: pk.type_id ?? null,
          room_type_name: pk.type_name ?? null,
          booking_id: pk.form?.id ?? null,
          _ota_provider: null,
          _ota_color: null,
          _ota_logo_url: null,
          _guest_first_name: pk.form?.guest_first_name ?? null,
          _guest_last_name: pk.form?.guest_last_name ?? null,
          _cutoff_ts: formDeadline ? formDeadline.toISOString() : null,
        });
        continue;
      }

      // 4) manual-only: GREEN dacă are nume, altfel YELLOW
      if (!hasIcal && !hasForm) {
        const firstNamed = pk.others.find(o => hasAnyName(o));
        items.push({
          kind: nameKnown ? "green" : "yellow",
          reason: nameKnown ? null : "waiting_form",
          start_date: pk.start_date,
          end_date: pk.end_date,
          room_id: roomId ?? null,
          room_label: roomLabel ?? null,
          room_type_id: pk.type_id ?? null,
          room_type_name: pk.type_name ?? null,
          booking_id: pk.others[0]?.id ?? null,
          _ota_provider: null,
          _ota_color: null,
          _ota_logo_url: null,
          _guest_first_name: firstNamed?.guest_first_name ?? null,
          _guest_last_name: firstNamed?.guest_last_name ?? null,
          _cutoff_ts: null,
        });
      }
    }

    // Unassigned ICS → YELLOW <2h, RED ≥2h
    const nowTs = now.getTime();
    for (const ev of unassigned) {
      const created = ev.created_at ? new Date(ev.created_at).getTime() : nowTs;
      const isYellow = (nowTs - created) < 2 * 60 * 60 * 1000;
      const tId = ev.room_type_id ? String(ev.room_type_id) : null;
      const tName = tId ? (typeNameById.get(tId) ?? "Type") : null;
      const im = ev.integration_id ? integMeta.get(String(ev.integration_id)) : null;

      items.push({
        kind: isYellow ? "yellow" : "red",
        reason: isYellow ? "waiting_form" : "missing_form",
        start_date: ev.start_date,
        end_date: ev.end_date,
        room_id: null,
        room_label: null,
        room_type_id: tId,
        room_type_name: tName,
        booking_id: null,
        _ota_provider: im?.provider ?? null,
        _ota_color: im?.color ?? null,
        _ota_logo_url: im?.logo_url ?? null,
        _guest_first_name: null,
        _guest_last_name: null,
        _cutoff_ts: isYellow ? new Date(created + 2 * 60 * 60 * 1000).toISOString() : null,
      });
    }

    // sort stabil și tipat
    const order: Record<ItemKind, number> = { green: 0, yellow: 1, red: 2 };
    items.sort((a, b) => {
      const dk = order[a.kind] - order[b.kind];
      if (dk) return dk;
      if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
      const ta = a.room_type_name || "";
      const tb = b.room_type_name || "";
      return ta.localeCompare(tb);
    });

    return NextResponse.json(
      { ok: true, items },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}