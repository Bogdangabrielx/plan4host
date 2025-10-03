// app/api/cron/ical/cleanup/route.ts
import { NextResponse } from "next/server";
import { createClient as createSb } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function j(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

type UnassignedRow = {
  id: string;
  property_id: string;
  room_type_id: string | null;
  room_id: string | null;
  uid: string | null;
  summary: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  integration_id: string | null;
  created_at: string;
};

type CandidateBooking = {
  id: string;
  room_id: string | null;
  room_type_id: string | null;
  status: string | null;
};

async function handleCleanup(req: Request) {
  try {
    // ── auth: align with autosync ─────────────────────────────────────
    const headerKey = req.headers.get("x-cron-key") || "";
    const isVercelCron = !!req.headers.get("x-vercel-cron");

    const queryKey = (() => {
      try { return new URL(req.url).searchParams.get("key") || ""; }
      catch { return ""; }
    })();

    const auth = req.headers.get("authorization") || "";
    const bearer = auth.replace(/^Bearer\s+/i, "");

    const tokenQ = (() => {
      try { return new URL(req.url).searchParams.get("token") || ""; }
      catch { return ""; }
    })();

    const expected = process.env.CRON_ICAL_KEY || "";
    const keyOk = expected && [headerKey, queryKey, bearer, tokenQ].some(v => v && v === expected);

    if (!isVercelCron && !keyOk) {
      return j(401, { error: "Unauthorized" });
    }

    // ── supabase (service role) ───────────────────────────────────────
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supa = createSb(url, serviceKey, { auth: { persistSession: false } });

    // Load unresolved unassigned events (include room_id!)
    const { data: unassigned, error: eUn } = await supa
      .from("ical_unassigned_events")
      .select("id,property_id,room_type_id,room_id,uid,summary,start_date,end_date,start_time,end_time,integration_id,created_at")
      .eq("resolved", false)
      .order("created_at", { ascending: true });

    if (eUn) return j(500, { error: eUn.message });

    let resolved = 0;
    let mapped = 0;
    let updated = 0;
    let setSourceIcal = 0;
    let setIcalUid = 0;

    const rows: UnassignedRow[] = (unassigned ?? []) as UnassignedRow[];

    for (const ev of rows) {
      const property_id: string = ev.property_id;
      const start_date: string = ev.start_date;
      const end_date: string = ev.end_date;
      const rtId: string | null = ev.room_type_id ?? null;
      const rId: string | null = ev.room_id ?? null;

      // find candidate bookings with same interval, not cancelled
      const { data: cands, error: eB } = await supa
        .from("bookings")
        .select("id,room_id,room_type_id,status")
        .eq("property_id", property_id)
        .eq("start_date", start_date)
        .eq("end_date", end_date)
        .neq("status", "cancelled");

      if (eB) continue;

      const candidates: CandidateBooking[] = (cands ?? []) as CandidateBooking[];
      let picked: CandidateBooking | null = null;

      if (candidates.length === 1) {
        picked = candidates[0];
      } else if (candidates.length > 1) {
        // 1) prefer room_id exact
        if (rId) {
          picked = candidates.find((b: CandidateBooking) => String(b.room_id || "") === String(rId)) || null;
        }
        // 2) else prefer room_type_id exact
        if (!picked && rtId) {
          picked = candidates.find((b: CandidateBooking) => String(b.room_type_id || "") === String(rtId)) || null;
        }
      }
      if (!picked) continue;

      // load integration provider (optional)
      let provider: string | null = null;
      if (ev.integration_id) {
        const rI = await supa
          .from("ical_type_integrations")
          .select("provider")
          .eq("id", ev.integration_id)
          .maybeSingle();
        if (!rI.error && rI.data) provider = (rI.data as any).provider ?? null;
      }

      // update booking with OTA linkage + ensure `source='ical'` and set `ical_uid` if present
      const updPayload: any = {
        ota_integration_id: ev.integration_id ?? null,
        ota_provider: provider ?? null,
      };
      if (ev.uid) {
        updPayload.ical_uid = ev.uid;
      }
      // For matched iCal event, force source 'ical'
      updPayload.source = "ical";

      const upd = await supa
        .from("bookings")
        .update(updPayload)
        .eq("id", picked.id);

      if (!upd.error) {
        updated++;
        if (updPayload.source === "ical") setSourceIcal++;
        if (ev.uid) setIcalUid++;
      }

      // upsert UID map if we have a UID
      if (ev.uid) {
        const { data: existingMap } = await supa
          .from("ical_uid_map")
          .select("id")
          .eq("property_id", property_id)
          .eq("uid", ev.uid)
          .limit(1);

        if ((existingMap as any[])?.length > 0) {
          await supa
            .from("ical_uid_map")
            .update({
              booking_id: picked.id,
              room_type_id: rtId,
              room_id: picked.room_id ?? null,
              start_date,
              end_date,
              start_time: ev.start_time ?? null,
              end_time: ev.end_time ?? null,
              integration_id: ev.integration_id ?? null,
              last_seen: new Date().toISOString(),
            })
            .eq("id", (existingMap as any[])[0].id);
          mapped++;
        } else {
          await supa.from("ical_uid_map").insert({
            property_id,
            room_type_id: rtId,
            room_id: picked.room_id ?? null,
            booking_id: picked.id,
            uid: ev.uid,
            source: provider || "ical",
            start_date,
            end_date,
            start_time: ev.start_time ?? null,
            end_time: ev.end_time ?? null,
            integration_id: ev.integration_id ?? null,
            last_seen: new Date().toISOString(),
          } as any);
          mapped++;
        }
      }

      // mark unassigned as resolved
      await supa.from("ical_unassigned_events").update({ resolved: true }).eq("id", ev.id);
      resolved++;
    }

    return j(200, {
      ok: true,
      processed: rows.length,
      resolved,
      mapped,
      updated,
      set_source_ical: setSourceIcal,
      set_ical_uid: setIcalUid,
    });
  } catch (e: any) {
    return j(500, { error: e?.message || String(e) });
  }
}

export async function POST(req: Request) {
  return handleCleanup(req);
}

export async function GET(req: Request) {
  return handleCleanup(req);
}

// Health check, same behavior as autosync (strict x-cron-key)
export async function HEAD(req: Request) {
  const headerKey = req.headers.get("x-cron-key") || "";
  const expected = process.env.CRON_ICAL_KEY || "";
  if (!expected || headerKey !== expected) return new NextResponse(null, { status: 401 });
  return new NextResponse(null, { status: 200 });
}