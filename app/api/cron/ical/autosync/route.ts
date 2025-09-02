// app/api/cron/ical/autosync/route.ts
import { NextResponse } from "next/server";
import { createClient as createSb } from "@supabase/supabase-js";
import { parseIcsToEvents, toLocalDateTime, type ParsedEvent } from "@/lib/ical/parse";

// Ensure Node runtime and no caching for cron
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------- helpers ----------
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

// Hash util (fallback key pentru evenimente fără UID)
import crypto from "crypto";
function digest(s: string) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function fmtDate(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return f.format(d); // YYYY-MM-DD
}
function fmtTime(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  return f.format(d); // HH:MM
}

// Upsert 1 eveniment în ical_unassigned_events (service client)
async function upsertUnassigned(
  supabase: any, // ← tip relaxat ca să evităm conflictele de generice
  params: {
    property_id: string;
    room_type_id: string;
    ev: ParsedEvent;
    propTZ: string;
  }
) {
  const { property_id, room_type_id, ev, propTZ } = params;

  // Normalizare date/time în timezone-ul proprietății
  let startDateStr = ev.start.date;
  let endDateStr = ev.end?.date ?? ev.start.date;

  let startTimeStr: string | null = ev.start.time ?? null;
  let endTimeStr: string | null = ev.end?.time ?? null;

  if (ev.start.absolute) {
    const dStart = toLocalDateTime(ev.start.absolute, propTZ);
    startDateStr = fmtDate(dStart, propTZ);
    startTimeStr = fmtTime(dStart, propTZ);
  }
  if (ev.end?.absolute) {
    const dEnd = toLocalDateTime(ev.end.absolute, propTZ);
    endDateStr = fmtDate(dEnd, propTZ);
    endTimeStr = fmtTime(dEnd, propTZ);
  }
  if (endDateStr < startDateStr) endDateStr = startDateStr;

  // 1) UID path
  if (ev.uid) {
    const { data: existing, error: selErr } = await supabase
      .from("ical_unassigned_events")
      .select("id")
      .eq("property_id", property_id)
      .eq("room_type_id", room_type_id)
      .eq("uid", ev.uid)
      .limit(1);
    if (selErr) throw selErr;

    if (existing && (existing as any[]).length > 0) {
      const id: string = (existing as any[])[0].id;
      const { error: updErr } = await supabase
        .from("ical_unassigned_events")
        .update({
          summary: ev.summary ?? null,
          start_date: startDateStr,
          end_date: endDateStr,
          start_time: startTimeStr,
          end_time: endTimeStr,
        })
        .eq("id" as any, id as any); // forțăm tipul pentru a evita bugul de d.ts
      if (updErr) throw updErr;
      return { upserted: "updated", id };
    } else {
      const { data: ins, error: insErr } = await supabase
        .from("ical_unassigned_events")
        .insert({
          property_id,
          room_type_id,
          uid: ev.uid,
          summary: ev.summary ?? null,
          start_date: startDateStr,
          end_date: endDateStr,
          start_time: startTimeStr,
          end_time: endTimeStr,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      return { upserted: "inserted", id: (ins as any)?.id as string | undefined };
    }
  }

  // 2) fallback fără UID
  // optional fallback key (kept for potential future use)
  digest(`${room_type_id}|${startDateStr}|${endDateStr}|${(ev.summary || "").trim().toLowerCase()}`);
  const { data: existing2, error: selErr2 } = await supabase
    .from("ical_unassigned_events")
    .select("id")
    .eq("property_id", property_id)
    .eq("room_type_id", room_type_id)
    .eq("start_date", startDateStr)
    .eq("end_date", endDateStr)
    .eq("summary", ev.summary ?? null)
    .limit(1);
  if (selErr2) throw selErr2;

  if (existing2 && (existing2 as any[]).length > 0) {
    const id: string = (existing2 as any[])[0].id;
    const { error: updErr } = await supabase
      .from("ical_unassigned_events")
      .update({
        start_time: startTimeStr,
        end_time: endTimeStr,
      })
      .eq("id" as any, id as any);
    if (updErr) throw updErr;
    return { upserted: "updated", id };
  } else {
    const { data: ins, error: insErr } = await supabase
      .from("ical_unassigned_events")
      .insert({
        property_id,
        room_type_id,
        uid: null,
        summary: ev.summary ?? null,
        start_date: startDateStr,
        end_date: endDateStr,
        start_time: startTimeStr,
        end_time: endTimeStr,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    return { upserted: "inserted", id: (ins as any)?.id as string | undefined };
  }
}

// ---------- handler ----------
async function runAutosync(req: Request) {
  try {
    // 1) securitate cron
    const headerKey = req.headers.get("x-cron-key") || "";
    const expected = process.env.CRON_ICAL_KEY || ""; // setează în .env / Vercel
    if (!expected || headerKey !== expected) {
      return j(401, { error: "Unauthorized" });
    }

    // 2) supabase service-role (bypass RLS pentru job)
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createSb(url, serviceKey, { auth: { persistSession: false } });

    // 3) ia toate feed-urile active + property(owner_id, timezone)
    const { data: feeds, error: fErr } = await supabase
      .from("ical_type_integrations")
      .select(`
        id,
        property_id,
        room_type_id,
        provider,
        url,
        is_active,
        last_sync,
        properties:properties!inner(
          id,
          owner_id,
          timezone
        )
      `)
      .eq("is_active", true);

    if (fErr) {
      return j(400, { error: "Load feeds failed", details: fErr.message });
    }

    if (!feeds || (feeds as any[]).length === 0) {
      return j(200, { ok: true, message: "No active feeds." });
    }

    type FeedRow = {
      id: string;
      property_id: string;
      room_type_id: string;
      provider: string | null;
      url: string;
      is_active: boolean | null;
      last_sync: string | null;
      properties: { id: string; owner_id: string; timezone: string | null };
    };

    // group by account
    const byAccount = new Map<string, FeedRow[]>();
    for (const f of (feeds as any[] as FeedRow[])) {
      const acc = f.properties.owner_id;
      if (!byAccount.has(acc)) byAccount.set(acc, []);
      byAccount.get(acc)!.push(f);
    }

    const summary: any[] = [];
    for (const [accountId, rows] of byAccount.entries()) {
      // policy: autosync
      const can = await supabase.rpc("account_can_sync_now", {
        p_account_id: accountId,
        p_event_type: "autosync",
      });

      if (can.error) {
        summary.push({
          accountId,
          ok: false,
          reason: "policy_rpc_failed",
          details: can.error.message,
          processedFeeds: 0,
          importedEvents: 0,
        });
        continue;
      }
      if (!can.data?.allowed) {
        summary.push({
          accountId,
          ok: false,
          reason: can.data?.reason ?? "not_allowed",
          cooldown_remaining_sec: can.data?.cooldown_remaining_sec ?? 0,
          processedFeeds: 0,
          importedEvents: 0,
        });
        continue;
      }

      // allowed -> rulează import pentru toate feed-urile contului
      let importedTotal = 0;
      let processed = 0;

      for (const feed of rows) {
        try {
          const propTZ = feed.properties.timezone || "UTC";
          const res = await fetch(feed.url, { method: "GET" });
          if (!res.ok) {
            summary.push({
              accountId,
              feedId: feed.id,
              ok: false,
              reason: "fetch_failed",
              status: res.status,
            });
            processed++;
            continue;
          }
          const ics = await res.text();
          const events = parseIcsToEvents(ics);

          let imported = 0;
          for (const ev of events) {
            if (!ev.start) continue;
            await upsertUnassigned(supabase, {
              property_id: feed.property_id,
              room_type_id: feed.room_type_id,
              ev,
              propTZ,
            });
            imported++;
          }

          // mark last_sync
          await supabase
            .from("ical_type_integrations")
            .update({ last_sync: new Date().toISOString() })
            .eq("id" as any, feed.id as any);

          importedTotal += imported;
          processed++;
          summary.push({
            accountId,
            feedId: feed.id,
            ok: true,
            imported,
          });
        } catch (e: any) {
          processed++;
          summary.push({
            accountId,
            feedId: feed.id,
            ok: false,
            reason: "exception",
            error: e?.message ?? String(e),
          });
        }
      }

      // înregistrează 1 usage per account pentru acest run (autosync)
      await supabase.rpc("account_register_sync_usage", {
        p_account_id: accountId,
        p_event_type: "autosync",
      });

      summary.push({
        accountId,
        ok: true,
        processedFeeds: processed,
        importedEvents: importedTotal,
      });
    }

    return j(200, { ok: true, summary });
  } catch (e: any) {
    return j(500, { error: "Server error", details: e?.message ?? String(e) });
  }
}

export async function POST(req: Request) {
  return runAutosync(req);
}

// Allow triggering via GET (e.g., Vercel Cron)
export async function GET(req: Request) {
  return runAutosync(req);
}

// Lightweight health check (no work) — still enforces key for safety
export async function HEAD(req: Request) {
  const headerKey = req.headers.get("x-cron-key") || "";
  const expected = process.env.CRON_ICAL_KEY || "";
  if (!expected || headerKey !== expected) return new NextResponse(null, { status: 401 });
  return new NextResponse(null, { status: 200 });
}
