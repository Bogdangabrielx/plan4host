// app/api/reservation-message/demo/route.ts
// Creates a short-lived "demo" reservation message link for onboarding preview.
// It creates a temporary booking, generates a reservation_messages token, then marks the booking as cancelled
// so it won't pollute the calendar/overview.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

let adminClient: ReturnType<typeof createAdmin> | null = null;

function getAdmin() {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service credentials");
  adminClient = createAdmin(url, key, { auth: { persistSession: false } });
  return adminClient;
}

function bad(status: number, body: any) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

function token() {
  const a = Math.random().toString(36).slice(2, 10);
  const b = Math.random().toString(36).slice(2, 10);
  return `${a}${b}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function getLocalYMD(tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
    return fmt.format(new Date()); // YYYY-MM-DD
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
}

function addDaysYMD(ymd: string, days: number): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function getLocalHHMM(tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit" });
    const parts = fmt.formatToParts(new Date()).reduce((acc: any, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
    const hh = String(parts.hour || "00").padStart(2, "0");
    const mm = String(parts.minute || "00").padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
}

async function canAccessProperty(userId: string, propertyId: string): Promise<{ ok: boolean; property?: any; error?: string }> {
  const admin = getAdmin();
  const rProp = await admin
    .from("properties")
    .select("id, account_id, admin_id, timezone, check_out_time")
    .eq("id", propertyId)
    .maybeSingle();
  if (rProp.error || !rProp.data) return { ok: false, error: "Property not found" };
  const prop = rProp.data as any;
  if (prop.account_id === userId || prop.admin_id === userId) return { ok: true, property: prop };

  // membership admin
  try {
    const rAu = await admin
      .from("account_users")
      .select("role,disabled")
      .eq("account_id", prop.account_id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);
    const row = (rAu.data ?? [])[0] as any;
    if (row && !row.disabled && row.role === "admin") return { ok: true, property: prop };
  } catch {
    // ignore
  }

  return { ok: false, error: "Forbidden" };
}

export async function POST(req: Request) {
  try {
    const admin = getAdmin();
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user;
    if (!user) return bad(401, { error: "Not authenticated" });

    const body = await req.json().catch(() => ({}));
    const property_id = String(body?.property_id || "").trim();
    if (!property_id) return bad(400, { error: "property_id required" });

    const access = await canAccessProperty(user.id, property_id);
    if (!access.ok) return bad(access.error === "Forbidden" ? 403 : 404, { error: access.error || "Forbidden" });
    const prop = access.property as any;

    // Pick first room for this property
    const rRoom = await admin
      .from("rooms")
      .select("id,name")
      .eq("property_id", property_id)
      .order("created_at", { ascending: true })
      .limit(1);
    const room = (rRoom.data ?? [])[0] as any;
    if (!room?.id) return bad(400, { error: "Please add a room first." });

    const tz = String(prop.timezone || "Europe/Bucharest");
    const today = getLocalYMD(tz);
    const tomorrow = addDaysYMD(today, 1);
    const nowHHMM = getLocalHHMM(tz);
    const endHHMM = String(prop.check_out_time || "11:00");

    // Create booking (visible), then cancel it after token is generated so it won't show in the app.
    const insBooking = await admin
      .from("bookings")
      .insert({
        property_id,
        room_id: String(room.id),
        start_date: today,
        end_date: tomorrow,
        start_time: nowHHMM,
        end_time: endHHMM,
        status: "confirmed",
        source: "onboarding_demo",
        guest_first_name: "John",
        guest_last_name: "Doe",
      } as any)
      .select("id, end_date")
      .single();
    if (insBooking.error || !insBooking.data) return bad(400, { error: insBooking.error?.message || "Could not create demo booking" });
    const booking_id = String((insBooking.data as any).id);

    // Merge room variables (if any) into manual values
    let roomVars: Record<string, string> = {};
    try {
      const rVars = await admin
        .from("room_variables")
        .select("key,value")
        .eq("property_id", property_id)
        .eq("room_id", String(room.id));
      if (!rVars.error && Array.isArray(rVars.data)) {
        for (const row of rVars.data as any[]) {
          const k = String(row.key || "");
          if (!k) continue;
          roomVars[k] = String(row.value ?? "");
        }
      }
    } catch {
      roomVars = {};
    }

    const endDate = String((insBooking.data as any).end_date || tomorrow);
    const expiresAt = new Date(`${endDate}T00:00:00Z`);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 1);

    // Create reservation message token
    const tok = token();
    const insMsg = await admin
      .from("reservation_messages")
      .insert({
        property_id,
        booking_id,
        token: tok,
        status: "active",
        manual_values: roomVars,
        expires_at: expiresAt.toISOString(),
      } as any)
      .select("token")
      .single();
    if (insMsg.error || !insMsg.data) return bad(400, { error: insMsg.error?.message || "Could not create demo link" });

    // Hide demo booking from the app UI (calendar / guest overview)
    try {
      await admin.from("bookings").update({ status: "cancelled" } as any).eq("id", booking_id);
    } catch {
      // ignore
    }

    const base = (process.env.NEXT_PUBLIC_APP_URL || "").toString().trim().replace(/\/+$/, "") || "https://plan4host.com";
    const url = `${base}/r/${tok}`;
    return NextResponse.json({ ok: true, url, token: tok, booking_id, expires_at: expiresAt.toISOString() });
  } catch (e: any) {
    return bad(500, { error: e?.message || "Unexpected error" });
  }
}
