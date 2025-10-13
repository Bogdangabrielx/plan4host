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
    } catch {}

    // Room labels
    const { data: roomRows } = await admin
      .from("rooms")
      .select("id,name")
      .eq("property_id", property_id);
    const roomNameById = new Map<string, string>();
    for (const r of (roomRows ?? []) as any[]) roomNameById.set(String(r.id), String(r.name ?? ''));

    // All bookings (past/present/future), non-cancelled → filter to forms only
    const rBookings = await admin
      .from("bookings")
      .select(`
        id, property_id, room_id, room_type_id,
        start_date, end_date, status, source, ota_provider,
        guest_first_name, guest_last_name, guest_name,
        created_at
      `)
      .eq("property_id", property_id)
      .neq("status", "cancelled")
      .order("start_date", { ascending: true });
    if (rBookings.error) return NextResponse.json({ error: rBookings.error.message }, { status: 500 });

    const forms = ((rBookings.data ?? []) as BRow[]).filter(isFormish);

    // Build rows: yellow if no room selected; green once a room_id is set
    const rows = forms.map((f) => {
      const rid = f.room_id ? String(f.room_id) : null;
      const roomLabel = rid ? (roomNameById.get(rid) ?? `#${rid.slice(0,4)}`) : null;
      const status = (rid ? 'green' : 'yellow') as 'green' | 'yellow';
      return {
        id: f.id,
        property_id,
        room_id: rid,
        start_date: f.start_date,
        end_date: f.end_date,
        status,
        _room_label: roomLabel,
        _room_type_id: f.room_type_id ?? null,
        _room_type_name: null,
        _reason: status === 'yellow' ? 'waiting_room' : null,
        _cutoff_ts: null,
        _ota_provider: (f as any).ota_provider ?? null,
        _ota_color: null,
        _ota_logo_url: null,
        _guest_first_name: f.guest_first_name ?? null,
        _guest_last_name: f.guest_last_name ?? null,
      };
    });

    return NextResponse.json({ ok: true, items: rows }, { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
