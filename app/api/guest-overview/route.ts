// app/api/guest-overview/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

type FRow = {
  id: string;
  property_id: string;
  room_id: string | null;
  room_type_id: string | null;
  start_date: string; // yyyy-mm-dd
  end_date: string;   // yyyy-mm-dd
  state: string | null;
  guest_first_name: string | null;
  guest_last_name: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
};

type Room = { id: string; room_type_id: string | null; name: string | null };
type RoomType = { id: string; name: string | null };

const ymdToDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const addDays = (d: Date, days: number) => { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + days); return x; };
const nowUtc = () => new Date();

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

    // Load forms from dedicated table (open or linked)
    const rForms = await admin
      .from("form_bookings")
      .select("id,property_id,room_id,room_type_id,start_date,end_date,state,guest_first_name,guest_last_name,created_at,submitted_at,ota_provider_hint")
      .eq("property_id", property_id)
      .order("start_date", { ascending: true });
    if (rForms.error) return NextResponse.json({ error: rForms.error.message }, { status: 500 });
    const forms = (rForms.data ?? []) as FRow[];

    // Provider meta (color + logo) from ical_type_integrations
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
    const providerHints = new Set<string>();
    for (const f of forms as any[]) {
      const hint = (f.ota_provider_hint || "").toString();
      if (hint) providerHints.add(hint);
    }
    const provMetaMap = new Map<string, { color: string | null; logo_url: string | null; name: string }>();
    if (providerHints.size > 0) {
      const rMeta = await admin
        .from("ical_type_integrations")
        .select("provider,color,logo_url")
        .eq("property_id", property_id);
      if (!rMeta.error) {
        const rows = (rMeta.data ?? []) as any[];
        // Build normalized map
        for (const row of rows) {
          const name = (row.provider || "").toString();
          if (!name) continue;
          const key = normalize(name);
          if (!provMetaMap.has(key)) provMetaMap.set(key, { color: row.color || null, logo_url: row.logo_url || null, name });
        }
      }
    }

    // Build rows: yellow if no room selected; green once a room_id is set
    const rows = forms.map((f) => {
      const rid = f.room_id ? String(f.room_id) : null;
      const roomLabel = rid ? (roomNameById.get(rid) ?? `#${rid.slice(0,4)}`) : null;
      const status = (rid || (f.state || '').toLowerCase() === 'linked') ? 'green' : 'yellow';
      const hint = ((f as any).ota_provider_hint || "").toString();
      const norm = hint ? normalize(hint) : "";
      let meta: { color: string | null; logo_url: string | null } | null = null;
      if (norm && provMetaMap.size > 0) {
        // Direct normalized match
        if (provMetaMap.has(norm)) meta = provMetaMap.get(norm)!;
        else {
          // Fuzzy: find first where either includes the other
          for (const [k, v] of provMetaMap.entries()) {
            if (k.includes(norm) || norm.includes(k)) { meta = v; break; }
          }
        }
      }
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
        _ota_provider: hint || null,
        _ota_color: meta ? (meta.color || null) : null,
        _ota_logo_url: meta ? (meta.logo_url || null) : null,
        _guest_first_name: f.guest_first_name ?? null,
        _guest_last_name: f.guest_last_name ?? null,
      };
    });

    return NextResponse.json({ ok: true, items: rows }, { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
