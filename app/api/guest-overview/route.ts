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
  // Form-urile reale au source='form' sau status temporar hold/pending.
  // NU clasificăm ca "form" doar pe baza form_submitted_at, pentru că iCal/manual pot primi acest timestamp după merge.
  return src === "form" || b?.status === "hold" || b?.status === "pending";
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

    // Rooms & types (ne trebuie pentru a decide regula de matching și pentru label-uri)
    const [rRooms, rTypes] = await Promise.all([
      admin.from("rooms").select("id, room_type_id, name").eq("property_id", property_id),
      admin.from("room_types").select("id, name").eq("property_id", property_id),
    ]);
    const rooms: Room[] = (rRooms.data ?? []) as any[];
    const types: RoomType[] = (rTypes.data ?? []) as any[];
    const hasTypes = (types?.length || 0) > 0;

    const roomById = new Map<string, Room>();
    for (const r of rooms) roomById.set(String(r.id), r);
    const typeNameById = new Map<string, string>();
    for (const t of types) typeNameById.set(String(t.id), t.name ?? "Type");

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

    // Load meta integrări pentru OTA badge
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

    // Funcții utilitare pentru cheie
    function effectiveTypeId(b: BRow): string | null {
      if (b.room_type_id) return String(b.room_type_id);
      if (b.room_id) {
        const r = roomById.get(String(b.room_id));
        if (r?.room_type_id) return String(r.room_type_id);
      }
      return null;
    }
    function groupKey(b: BRow): string {
      const keyId = hasTypes ? (effectiveTypeId(b) ?? "null") : (b.room_id ? String(b.room_id) : "null");
      return `${b.start_date}|${b.end_date}|${keyId}`;
    }

    // Grupare pe (date + type sau room)
    type Group = {
      start_date: string;
      end_date: string;
      key_id: string | null; // type_id sau room_id, după caz
      type_id: string | null;
      type_name: string | null;
      events: BRow[]; // iCal + manuale
      forms: BRow[];
    };
    const groups = new Map<string, Group>();
    // Index global de form-uri pe (start_date|end_date) pentru fallback unic
    const formsByDates = new Map<string, BRow[]>();

    for (const b of bookings) {
      const k = groupKey(b);
      let g = groups.get(k);
      if (!g) {
        const tId = hasTypes ? effectiveTypeId(b) : null;
        const name = tId ? (typeNameById.get(String(tId)) ?? "Type") : null;
        g = { start_date: b.start_date, end_date: b.end_date, key_id: hasTypes ? tId : (b.room_id ? String(b.room_id) : null), type_id: tId, type_name: name, events: [], forms: [] };
        groups.set(k, g);
      }
      if (isFormish(b)) {
        g.forms.push(b);
        const dk = `${b.start_date}|${b.end_date}`;
        const arr = formsByDates.get(dk) || [];
        arr.push(b);
        formsByDates.set(dk, arr);
      } else {
        g.events.push(b);
      }
    }

    // Evaluare stări conform regulilor
    type Item = {
      kind: "green" | "yellow" | "red";
      reason?: string;
      start_date: string;
      end_date: string;
      room_id: string | null;
      room_label: string | null;
      room_type_id: string | null;
      room_type_name: string | null;
      booking_id: string | null; // pentru event rând: id eveniment; pentru form-only: id form
      ota_provider?: string | null;
      ota_color?: string | null;
      ota_logo_url?: string | null;
      guest_first_name?: string | null;
      guest_last_name?: string | null;
      cutoff_ts?: string;
    };
    const items: Item[] = [];
    const now = nowUtc();

    function pickMeta(b: BRow | null | undefined): { provider: string | null; color: string | null; logo_url: string | null } {
      if (!b) return { provider: null, color: null, logo_url: null };
      const intId = b.ota_integration_id || integByBooking.get(String(b.id)) || null;
      if (intId && integMeta.has(String(intId))) {
        const m = integMeta.get(String(intId))!;
        return { provider: m.provider, color: m.color, logo_url: m.logo_url };
      }
      return { provider: b.ota_provider ?? null, color: null, logo_url: null };
    }

    const usedFormsGlobal = new Set<string>();
    for (const [, g] of groups) {
      // sort events/forms pentru pairing stabil
      const events = [...g.events].sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
      const forms = [...g.forms].sort((a, b) => (a.form_submitted_at || a.created_at || "").localeCompare(b.form_submitted_at || b.created_at || ""));

      // folosim marcaje globale pentru a evita reutilizarea unui form în alt grup

      // Perechere 1:1 — pentru fiecare event lipim primul form liber
      for (const ev of events) {
        const evHasMerged = !!ev.form_submitted_at;
        // 1) întâi încearcă form din același grup (cheie exactă)
        let f = forms.find(x => !usedFormsGlobal.has(String(x.id)));

        // 2) dacă nu există în grup, aplică fallback-uri ca în autosync:
        //    - match după room_id (dacă event are room_id)
        //    - match după room_type_id (dacă există types și event are type)
        //    - dacă există exact UN form pe aceleași date în toată proprietatea, îl legăm
        if (!f) {
          const dk = `${g.start_date}|${g.end_date}`;
          const all = (formsByDates.get(dk) || []).filter(x => !usedFormsGlobal.has(String(x.id)));
          if (all.length > 0) {
            // room_id strict
            if (ev.room_id) {
              f = all.find(x => (x.room_id ? String(x.room_id) : null) === String(ev.room_id));
            }
            // type strict (doar când proprietatea are types)
            if (!f && hasTypes) {
              const evType = effectiveTypeId(ev);
              f = all.find(x => effectiveTypeId(x) === evType);
            }
            // unic la nivel de date
            if (!f && all.length === 1) {
              f = all[0];
            }
          }
        }
        if (f) {
          usedFormsGlobal.add(String(f.id));
          const meta = pickMeta(ev);
          const rId = ev.room_id ?? null;
          const r = rId ? roomById.get(String(rId)) : null;
          items.push({
            kind: "green",
            start_date: g.start_date,
            end_date: g.end_date,
            room_id: rId,
            room_label: r?.name ?? (rId ? `#${String(rId).slice(0,4)}` : null),
            room_type_id: g.type_id ?? null,
            room_type_name: g.type_name ?? null,
            booking_id: ev.id,
            ota_provider: meta.provider,
            ota_color: meta.color,
            ota_logo_url: meta.logo_url,
            guest_first_name: f.guest_first_name ?? ev.guest_first_name ?? null,
            guest_last_name:  f.guest_last_name  ?? ev.guest_last_name  ?? null,
          });
        } else {
          // Event fără form (sau form necunoscut)
          if (evHasMerged) {
            // DB indică faptul că a existat un form (form_submitted_at) — tratăm ca GREEN deja pereche
            const meta = pickMeta(ev);
            const rId = ev.room_id ?? null;
            const r = rId ? roomById.get(String(rId)) : null;
            items.push({
              kind: "green",
              start_date: g.start_date,
              end_date: g.end_date,
              room_id: rId,
              room_label: r?.name ?? (rId ? `#${String(rId).slice(0,4)}` : null),
              room_type_id: g.type_id ?? null,
              room_type_name: g.type_name ?? null,
              booking_id: ev.id,
              ota_provider: meta.provider,
              ota_color: meta.color,
              ota_logo_url: meta.logo_url,
              guest_first_name: ev.guest_first_name ?? null,
              guest_last_name:  ev.guest_last_name  ?? null,
            });
            continue;
          }
          const hasName = hasAnyName(ev);
          if (hasName) {
            const meta = pickMeta(ev);
            const rId = ev.room_id ?? null;
            const r = rId ? roomById.get(String(rId)) : null;
            items.push({
              kind: "green",
              start_date: g.start_date,
              end_date: g.end_date,
              room_id: rId,
              room_label: r?.name ?? (rId ? `#${String(rId).slice(0,4)}` : null),
              room_type_id: g.type_id ?? null,
              room_type_name: g.type_name ?? null,
              booking_id: ev.id,
              ota_provider: meta.provider,
              ota_color: meta.color,
              ota_logo_url: meta.logo_url,
              guest_first_name: ev.guest_first_name ?? null,
              guest_last_name:  ev.guest_last_name  ?? null,
            });
          } else {
            // fără nume → galben până la T-3, apoi roșu
            const startDt = ymdToDate(g.start_date);
            const cutoff = addDays(startDt, -3);
            const meta = pickMeta(ev);
            const rId = ev.room_id ?? null;
            const r = rId ? roomById.get(String(rId)) : null;
            const isYellow = now < cutoff;
            items.push({
              kind: isYellow ? "yellow" : "red",
              reason: isYellow ? "waiting_form" : "missing_form",
              start_date: g.start_date,
              end_date: g.end_date,
              room_id: rId,
              room_label: r?.name ?? (rId ? `#${String(rId).slice(0,4)}` : null),
              room_type_id: g.type_id ?? null,
              room_type_name: g.type_name ?? null,
              booking_id: ev.id,
              ota_provider: meta.provider,
              ota_color: meta.color,
              ota_logo_url: meta.logo_url,
              cutoff_ts: isYellow ? cutoff.toISOString() : undefined,
            });
          }
        }
      }

      // Form-only rânduri rămase
      for (const f of forms) {
        if (usedFormsGlobal.has(String(f.id))) continue;
        const ts = f.form_submitted_at ? new Date(f.form_submitted_at) : (f.created_at ? new Date(f.created_at) : now);
        const deadline = new Date(ts.getTime() + 2 * 60 * 60 * 1000);
        const rId = f.room_id ?? null;
        const r = rId ? roomById.get(String(rId)) : null;
        const isYellow = now < deadline;
        items.push({
          kind: isYellow ? "yellow" : "red",
          reason: isYellow ? "waiting_ical" : "no_ota_found",
          start_date: g.start_date,
          end_date: g.end_date,
          room_id: rId,
          room_label: r?.name ?? (rId ? `#${String(rId).slice(0,4)}` : null),
          room_type_id: g.type_id ?? null,
          room_type_name: g.type_name ?? null,
          booking_id: f.id,
          guest_first_name: f.guest_first_name ?? null,
          guest_last_name:  f.guest_last_name  ?? null,
          cutoff_ts: isYellow ? deadline.toISOString() : undefined,
        });
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
        booking_id: null,
        ota_provider: im.provider,
        ota_color: im.color,
        ota_logo_url: im.logo_url,
        guest_first_name: null,
        guest_last_name: null,
        cutoff_ts: isYellow ? new Date(created + twoHoursMs).toISOString() : undefined,
      });
    }

    // Sortare: GREEN → YELLOW → RED, apoi cronologic & nume tip / cameră
    const orderKind = (k: string) => (k === "green" ? 0 : k === "yellow" ? 1 : 2);
    items.sort((a, b) => {
      const dk = orderKind(a.kind) - orderKind(b.kind);
      if (dk) return dk;
      if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
      if ((a.room_type_name || "") !== (b.room_type_name || "")) return (a.room_type_name || "").localeCompare(b.room_type_name || "");
      return (a.room_label || "").localeCompare(b.room_label || "");
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
