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
const ymdToDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const addDays = (d: Date, days: number) => { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + days); return x; };
const nowUtc = () => new Date();

function isIcalish(b: BRow) {
  const src = safeLower(b.source);
  return !!b.ical_uid || ["ical","ota","airbnb","booking","booking.com","expedia","channel_manager"].includes(src);
}
function isFormish(b: any) {
  const src = (b?.source || "").toString().toLowerCase();
  return src === "form" || !!b?.form_submitted_at || b?.status === "hold" || b?.status === "pending";
}
function isManual(b: BRow) {
  return !isIcalish(b) && !isFormish(b);
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

    // Guard: cont suspendat?
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
    } catch { /* dacă RPC lipsește, nu blocăm */ }

    const todayYMD = new Date().toISOString().slice(0,10);

    // Bookings: viitoare/curente, non-cancelled
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

    if (rBookings.error) {
      return NextResponse.json({ error: rBookings.error.message }, { status: 500 });
    }
    const bookings: BRow[] = (rBookings.data ?? []) as any[];

    // Unassigned iCal events (pending import)
    const rUnassigned = await admin
      .from("ical_unassigned_events")
      .select("id,property_id,room_type_id,uid,summary,start_date,end_date,start_time,end_time,created_at,integration_id,resolved")
      .eq("property_id", property_id)
      .eq("resolved", false)
      .order("created_at", { ascending: false });
    const unassigned: Array<{
      id: string;
      property_id: string;
      room_type_id: string | null;
      uid: string | null;
      summary: string | null;
      start_date: string;
      end_date: string;
      start_time: string | null;
      end_time: string | null;
      created_at: string | null;
      integration_id: string | null;
    }> = (rUnassigned.data ?? []) as any[];

    // Fallback integrare via uid_map dacă lipsește pe booking
    const needMapFor = bookings.filter(b => !b.ota_integration_id && !!b.id).map(b => b.id);
    const integByBooking = new Map<string, string>();
    if (needMapFor.length > 0) {
      const { data: maps } = await admin
        .from("ical_uid_map")
        .select("booking_id,integration_id")
        .in("booking_id", needMapFor);
      for (const m of (maps ?? [])) {
        if (m && (m as any).booking_id && (m as any).integration_id) {
          integByBooking.set(String((m as any).booking_id), String((m as any).integration_id));
        }
      }
    }

    // Load meta integrări
    const integrationIds = new Set<string>();
    for (const b of bookings) {
      if (b.ota_integration_id) integrationIds.add(String(b.ota_integration_id));
      else if (integByBooking.has(String(b.id))) integrationIds.add(String(integByBooking.get(String(b.id))));
    }
    for (const ev of unassigned) {
      if (ev.integration_id) integrationIds.add(String(ev.integration_id));
    }
    const integMeta = new Map<string, { provider: string | null; color: string | null; logo_url: string | null }>();
    if (integrationIds.size > 0) {
      const { data: ints } = await admin
        .from("ical_type_integrations")
        .select("id,provider,color,logo_url")
        .in("id", Array.from(integrationIds));
      for (const i of (ints ?? [])) {
        integMeta.set(String((i as any).id), {
          provider: (i as any).provider ?? null,
          color: (i as any).color ?? null,
          logo_url: (i as any).logo_url ?? null,
        });
      }
    }

    // Rooms & types
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

    // Grupare pe (start_date, end_date, type_id)
    type Pack = {
      key: string;
      start_date: string;
      end_date: string;
      type_id: string | null;
      type_name: string | null;
      ical?: BRow;
      form?: BRow;
      others: BRow[]; // aici pot exista manuale sau duplicat(e)
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
        entry.others.push(b); // manuale
      }
    }

    // Evaluare stări
    type Item = {
      kind: "green" | "yellow" | "red";
      reason?: string;
      start_date: string;
      end_date: string;
      room_id: string | null;
      room_label: string | null;
      room_type_id: string | null;
      room_type_name: string | null;
      booking_id: string | null; // IMPORTANT: pentru evenimente (manual/ical) e ID-ul evenimentului; pentru form-only e ID-ul formului
      ota_provider?: string | null;
      ota_color?: string | null;
      ota_logo_url?: string | null;
      guest_first_name?: string | null;
      guest_last_name?: string | null;
      cutoff_ts?: string;
    };

    const items: Item[] = [];
    const now = nowUtc();

    const firstManual = (arr: BRow[]) => arr.find(isManual) || null;
    const firstManualWithName = (arr: BRow[]) => arr.find(o => isManual(o) && hasAnyName(o)) || null;

    for (const [, pk] of packs) {
      const startDt = ymdToDate(pk.start_date);
      const cutoffIcal = addDays(startDt, -3); // T-3 zile la check-in
      const hasIcal = !!pk.ical;
      const hasForm = !!pk.form;

      const manual = firstManual(pk.others);
      const manualWithName = firstManualWithName(pk.others);

      const nameKnownIcal = pk.ical ? hasAnyName(pk.ical) : false;
      const nameKnownManual = manual ? hasAnyName(manual) : false;

      const roomId =
        pk.ical?.room_id ??
        manual?.room_id ??
        pk.form?.room_id ??
        null;

      const room = roomId ? roomById.get(roomId) : null;
      const roomLabel = room?.name ?? (roomId ? `#${String(roomId).slice(0,4)}` : null);

      function pickMeta(b: BRow | null | undefined): { provider: string | null; color: string | null; logo_url: string | null } {
        if (!b) return { provider: null, color: null, logo_url: null };
        const intId = b.ota_integration_id || integByBooking.get(String(b.id)) || null;
        if (intId && integMeta.has(String(intId))) {
          const m = integMeta.get(String(intId))!;
          return { provider: m.provider, color: m.color, logo_url: m.logo_url };
        }
        return { provider: b.ota_provider ?? null, color: null, logo_url: null };
      }

      // 1) iCal + Form → VERDE (booking_id = iCal)
      if (hasIcal && hasForm) {
        const meta = pickMeta(pk.ical!);
        items.push({
          kind: "green",
          start_date: pk.start_date,
          end_date: pk.end_date,
          room_id: roomId,
          room_label: roomLabel,
          room_type_id: pk.type_id,
          room_type_name: pk.type_name,
          booking_id: pk.ical!.id, // ← iCal, nu form
          ota_provider: meta.provider,
          ota_color: meta.color,
          ota_logo_url: meta.logo_url,
          guest_first_name: pk.form?.guest_first_name ?? pk.ical?.guest_first_name ?? null,
          guest_last_name:  pk.form?.guest_last_name  ?? pk.ical?.guest_last_name  ?? null,
        });
        continue;
      }

      // 2) doar iCal
      if (hasIcal && !hasForm) {
        const meta = pickMeta(pk.ical!);
        if (nameKnownIcal) {
          items.push({
            kind: "green",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_id: pk.ical?.room_id ?? null,
            room_label: pk.ical?.room_id ? (roomLabel ?? null) : null,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: pk.ical!.id, // ← iCal
            ota_provider: meta.provider,
            ota_color: meta.color,
            ota_logo_url: meta.logo_url,
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
            booking_id: pk.ical!.id, // ← iCal
            ota_provider: meta.provider,
            ota_color: meta.color,
            ota_logo_url: meta.logo_url,
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
            booking_id: pk.ical!.id, // ← iCal
            ota_provider: meta.provider,
            ota_color: meta.color,
            ota_logo_url: meta.logo_url,
          });
        }
        continue;
      }

      // 3) doar Form (poate exista și manual)
      if (hasForm && !hasIcal) {
        // există manual pe același interval?
        if (manual) {
          // dacă manual are nume → VERDE (booking_id = MANUAL)
          if (manualWithName) {
            items.push({
              kind: "green",
              start_date: pk.start_date,
              end_date: pk.end_date,
              room_id: manualWithName.room_id ?? null,
              room_label: manualWithName.room_id ? (roomLabel ?? null) : null,
              room_type_id: pk.type_id,
              room_type_name: pk.type_name,
              booking_id: manualWithName.id, // ← MANUAL, nu form
              guest_first_name: manualWithName.guest_first_name ?? null,
              guest_last_name:  manualWithName.guest_last_name  ?? null,
            });
          } else {
            // manual fără nume → GALBEN “waiting_form”, booking_id = MANUAL
            items.push({
              kind: "yellow",
              reason: "waiting_form",
              start_date: pk.start_date,
              end_date: pk.end_date,
              room_id: manual.room_id ?? null,
              room_label: manual.room_id ? (roomLabel ?? null) : null,
              room_type_id: pk.type_id,
              room_type_name: pk.type_name,
              booking_id: manual.id, // ← MANUAL, nu form (ca să nu mai apară buton de “Edit form booking”)
              guest_first_name: null,
              guest_last_name: null,
            });
          }
        } else {
          // form-only → GALBEN 2h, apoi ROȘU (booking_id = FORM)
          const submittedAt = pk.form?.form_submitted_at || pk.form?.created_at || null;
          const formDeadline = submittedAt ? new Date(new Date(submittedAt).getTime() + 2 * 60 * 60 * 1000) : null;
          const notExpiredYet = !!formDeadline && now < formDeadline;

          if (notExpiredYet) {
            items.push({
              kind: "yellow",
              reason: "waiting_ical",
              start_date: pk.start_date,
              end_date: pk.end_date,
              room_id: pk.form?.room_id ?? null,
              room_label: pk.form?.room_id ? (roomLabel ?? null) : null,
              room_type_id: pk.type_id,
              room_type_name: pk.type_name,
              booking_id: pk.form!.id, // ← FORM
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
              room_id: pk.form?.room_id ?? null,
              room_label: pk.form?.room_id ? (roomLabel ?? null) : null,
              room_type_id: pk.type_id,
              room_type_name: pk.type_name,
              booking_id: pk.form!.id, // ← FORM
              guest_first_name: pk.form?.guest_first_name ?? null,
              guest_last_name:  pk.form?.guest_last_name  ?? null,
            });
          }
        }
        continue;
      }

      // 4) nici iCal, nici Form → doar MANUAL
      if (manual) {
        if (nameKnownManual) {
          items.push({
            kind: "green",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_id: manual.room_id ?? null,
            room_label: manual.room_id ? (roomLabel ?? null) : null,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: manual.id, // ← MANUAL
            guest_first_name: manual.guest_first_name ?? null,
            guest_last_name:  manual.guest_last_name  ?? null,
          });
        } else {
          items.push({
            kind: "yellow",
            reason: "waiting_form",
            start_date: pk.start_date,
            end_date: pk.end_date,
            room_id: manual.room_id ?? null,
            room_label: manual.room_id ? (roomLabel ?? null) : null,
            room_type_id: pk.type_id,
            room_type_name: pk.type_name,
            booking_id: manual.id, // ← MANUAL
          });
        }
      }
    }

    // Unassigned events ca items (yellow < 2h, red >= 2h)
    const nowTs = now.getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    for (const ev of unassigned) {
      const tId = ev.room_type_id ? String(ev.room_type_id) : null;
      const tName = tId ? (typeNameById.get(tId) ?? "Type") : null;
      const im = ev.integration_id && integMeta.has(String(ev.integration_id)) ? integMeta.get(String(ev.integration_id))! : { provider: null, color: null, logo_url: null };
      const created = ev.created_at ? new Date(ev.created_at).getTime() : nowTs;
      const isYellow = (nowTs - created) < twoHoursMs;

      items.push({
        kind: isYellow ? "yellow" : "red",
        reason: isYellow ? "waiting_form" : "missing_form",
        start_date: ev.start_date,
        end_date: ev.end_date,
        room_id: null,
        room_label: null,
        room_type_id: tId,
        room_type_name: tName,
        booking_id: null, // nu e nici booking, nici form
        ota_provider: im.provider,
        ota_color: im.color,
        ota_logo_url: im.logo_url,
        guest_first_name: null,
        guest_last_name: null,
        cutoff_ts: isYellow ? new Date(created + twoHoursMs).toISOString() : undefined,
      });
    }

    // Sortare: GREEN → YELLOW → RED, apoi cronologic & nume tip
    const orderKind = (k: string) => (k === "green" ? 0 : k === "yellow" ? 1 : 2);
    items.sort((a, b) => {
      const dk = orderKind(a.kind) - orderKind(b.kind);
      if (dk) return dk;
      if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
      return (a.room_type_name || "").localeCompare(b.room_type_name || "");
    });

    // Output compatibil cu UI
    const rows = items.map((it) => ({
      id: it.booking_id ?? null,
      property_id,
      room_id: it.room_id ?? null,
      start_date: it.start_date,
      end_date: it.end_date,
      status: it.kind as "green" | "yellow" | "red",
      _room_label: it.room_label ?? null,
      _room_type_id: it.room_type_id ?? null,
      _room_type_name: it.room_type_name ?? null,
      _reason: it.reason ?? null,
      _cutoff_ts: it.cutoff_ts ?? null,
      _ota_provider: it.ota_provider ?? null,
      _ota_color: it.ota_color ?? null,
      _ota_logo_url: it.ota_logo_url ?? null,
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