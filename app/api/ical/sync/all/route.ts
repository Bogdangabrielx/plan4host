// app/api/ical/sync/all/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseIcsToEvents, toLocalDateTime, type ParsedEvent } from "@/lib/ical/parse";

// ---------- helpers ----------
function j(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

// Upsert 1 eveniment în ical_unassigned_events (folosim tipuri relaxate ca să evităm conflicte TS)
async function upsertUnassigned(
  supabase: any,
  params: {
    property_id: string;
    room_type_id: string;
    room_id?: string | null;
    ev: ParsedEvent;
    propTZ: string;
    integration_id?: string;
  }
) {
  const { property_id, room_type_id, room_id, ev, propTZ, integration_id } = params;

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
      .eq(room_id ? "room_id" : "room_type_id", room_id ? room_id : room_type_id)
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
          integration_id: integration_id ?? null,
          room_id: room_id ?? null,
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
          room_id: room_id ?? null,
          uid: ev.uid,
          summary: ev.summary ?? null,
          start_date: startDateStr,
          end_date: endDateStr,
          start_time: startTimeStr,
          end_time: endTimeStr,
          integration_id: integration_id ?? null,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      return { upserted: "inserted", id: (ins as any)?.id as string | undefined };
    }
  }

  // 2) fallback fără UID
  const _key = digest(
    `${room_type_id}|${startDateStr}|${endDateStr}|${(ev.summary || "").trim().toLowerCase()}`
  );
  const { data: existing2, error: selErr2 } = await supabase
    .from("ical_unassigned_events")
    .select("id")
    .eq("property_id", property_id)
    .eq(room_id ? "room_id" : "room_type_id", room_id ? room_id : room_type_id)
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
        integration_id: integration_id ?? null,
        room_id: room_id ?? null,
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
        room_id: room_id ?? null,
        uid: null,
        summary: ev.summary ?? null,
        start_date: startDateStr,
        end_date: endDateStr,
        start_time: startTimeStr,
        end_time: endTimeStr,
        integration_id: integration_id ?? null,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    return { upserted: "inserted", id: (ins as any)?.id as string | undefined };
  }
}

// ---------- handler ----------
export async function POST(req: Request) {
  try {
    const supabase = createClient();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return j(401, { error: "Not authenticated" });
    }

    const body = await req.json().catch(() => ({}));
    const propertyId: string | undefined = body?.propertyId;
    if (!propertyId) {
      return j(400, { error: "Missing propertyId" });
    }

    // 1) Property + timezone + admin (RLS asigură că userul are acces)
    const { data: prop, error: propErr } = await supabase
      .from("properties")
      .select("id, timezone, admin_id")
      .eq("id", propertyId)
      .single();
    if (propErr || !prop) {
      return j(404, { error: "Property not found" });
    }

    const accountId: string = (prop as any).admin_id as string;
    const propTZ: string = (prop as any).timezone || "UTC";

    // 2) Rate-limit check (sync_now)
    const can = await supabase.rpc("account_can_sync_now_v2", {
      p_account_id: accountId,
      p_event_type: "sync_now",
    });
    if (can.error) {
      return j(400, {
        error: "Policy check failed",
        details: can.error.message,
      });
    }
    if (!can.data?.allowed) {
      // expunem și retry_after_sec (fallback: cooldown_remaining_sec)
      const retry_after_sec =
        (can.data?.cooldown_remaining_sec as number | undefined) ?? 0;
      return j(429, {
        error: "Rate limited",
        reason: can.data?.reason,
        cooldown_remaining_sec: can.data?.cooldown_remaining_sec ?? 0,
        remaining_in_window: can.data?.remaining_in_window ?? 0,
        retry_after_sec,
      });
    }

    // 3) Active feeds pentru această proprietate
    const { data: feeds, error: fErr } = await supabase
      .from("ical_type_integrations")
      .select("id, property_id, room_type_id, room_id, provider, url, is_active")
      .eq("property_id", propertyId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (fErr) return j(400, { error: "Failed to load integrations", details: fErr.message });

    if (!feeds || (feeds as any[]).length === 0) {
      // tot înregistrăm un usage ca să nu se poată apăsa în buclă
      await supabase.rpc("account_register_sync_usage_v2", {
        p_account_id: accountId,
        p_event_type: "sync_now",
      });
      return j(200, { ok: true, message: "No active feeds to import." });
    }

    // 4) Download + parse + upsert
    const results: Array<{
      integrationId: string;
      ok: boolean;
      imported: number;
      error?: string;
    }> = [];

    for (const feed of feeds as any[]) {
      try {
        const res = await fetch(feed.url, { method: "GET" });
        if (!res.ok) {
          results.push({
            integrationId: feed.id,
            ok: false,
            imported: 0,
            error: `Fetch failed (${res.status})`,
          });
          continue;
        }

        const icsText = await res.text();
        const events = parseIcsToEvents(icsText);

        let imported = 0;
        for (const ev of events) {
          if (!ev.start) continue;
          await upsertUnassigned(supabase as any, {
            property_id: propertyId,
            room_type_id: feed.room_type_id as any,
            room_id: (feed as any).room_id ?? null,
            ev,
            propTZ,
            integration_id: feed.id,
          });
          imported++;
        }

        // mark last_sync
        await supabase
          .from("ical_type_integrations")
          .update({ last_sync: new Date().toISOString() })
          .eq("id" as any, feed.id as any);

        results.push({ integrationId: feed.id, ok: true, imported });
      } catch (e: any) {
        results.push({
          integrationId: feed.id,
          ok: false,
          imported: 0,
          error: e?.message || "Unknown error",
        });
      }
    }

    // 5) Register usage
    await supabase.rpc("account_register_sync_usage_v2", {
      p_account_id: accountId,
      p_event_type: "sync_now",
    });

    return j(200, {
      ok: true,
      message: "Sync completed",
      propertyId,
      results,
    });
  } catch (e: any) {
    return j(500, { error: "Server error", details: e?.message || String(e) });
  }
}
