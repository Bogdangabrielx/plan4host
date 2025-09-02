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

// Hash util pt. fallback key (evenimente fără UID)
import crypto from "crypto";
function digest(s: string) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

// Format helpers
function fmtDate(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  return f.format(d); // YYYY-MM-DD
}
function fmtTime(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit" });
  return f.format(d); // HH:MM
}

// tip auxiliar pentru selecturi care întorc doar id
type RowId = { id: string };

// Upsert în ical_unassigned_events
async function upsertUnassigned(
  supabase: ReturnType<typeof createClient>,
  params: {
    property_id: string;
    room_type_id: string;
    ev: ParsedEvent;
    propTZ: string;
  }
) {
  const { property_id, room_type_id, ev, propTZ } = params;

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
      .limit(1)
      .returns<RowId[]>();
    if (selErr) throw selErr;

    if (existing && existing.length > 0) {
      const id: string = (existing[0] as RowId).id;
      const { error: updErr } = await supabase
        .from("ical_unassigned_events")
        .update({
          summary: ev.summary ?? null,
          start_date: startDateStr,
          end_date: endDateStr,
          start_time: startTimeStr,
          end_time: endTimeStr,
        })
        .eq("id", id);
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
        .returns<RowId>()
        .single();
      if (insErr) throw insErr;
      return { upserted: "inserted", id: ins?.id };
    }
  }

  // 2) Fallback fără UID
  const _key = digest(
    `${room_type_id}|${startDateStr}|${endDateStr}|${(ev.summary || "").trim().toLowerCase()}`
  );
  const { data: existing, error: selErr2 } = await supabase
    .from("ical_unassigned_events")
    .select("id")
    .eq("property_id", property_id)
    .eq("room_type_id", room_type_id)
    .eq("start_date", startDateStr)
    .eq("end_date", endDateStr)
    .eq("summary", ev.summary ?? null)
    .limit(1)
    .returns<RowId[]>();
  if (selErr2) throw selErr2;

  if (existing && existing.length > 0) {
    const id: string = (existing[0] as RowId).id;
    const { error: updErr } = await supabase
      .from("ical_unassigned_events")
      .update({
        start_time: startTimeStr,
        end_time: endTimeStr,
      })
      .eq("id", id);
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
      .returns<RowId>()
      .single();
    if (insErr) throw insErr;
    return { upserted: "inserted", id: ins?.id };
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return j(401, { error: "Not authenticated" });

    const body = await req.json().catch(() => ({}));
    const propertyId: string | undefined = body?.propertyId;
    if (!propertyId) return j(400, { error: "Missing propertyId" });

    // Property (RLS asigură ownership)
    const { data: prop, error: propErr } = await supabase
      .from("properties")
      .select("id, timezone, owner_id")
      .eq("id", propertyId)
      .single();
    if (propErr || !prop) return j(404, { error: "Property not found" });

    const accountId: string = prop.owner_id;
    const propTZ: string = prop.timezone || "UTC";

    // Rate-limit check (sync_now)
    const can = await supabase.rpc("account_can_sync_now", {
      p_account_id: accountId,
      p_event_type: "sync_now",
    });
    if (can.error) {
      return j(400, { error: "Policy check failed", details: can.error.message });
    }
    if (!can.data?.allowed) {
      return j(429, {
        error: "Rate limited",
        reason: can.data?.reason,
        cooldown_remaining_sec: can.data?.cooldown_remaining_sec ?? 0,
        remaining_in_window: can.data?.remaining_in_window ?? 0,
      });
    }

    // Active feeds
    const { data: feeds, error: fErr } = await supabase
      .from("ical_type_integrations")
      .select("id, property_id, room_type_id, provider, url, is_active")
      .eq("property_id", propertyId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (fErr) return j(400, { error: "Failed to load integrations", details: fErr.message });

    if (!feeds || feeds.length === 0) {
      // înregistrăm totuși usage ca să nu se abuzeze de buton
      await supabase.rpc("account_register_sync_usage", {
        p_account_id: accountId,
        p_event_type: "sync_now",
      });
      return j(200, { ok: true, message: "No active feeds to import." });
    }

    const results: Array<{ integrationId: string; ok: boolean; imported: number; error?: string }> = [];

    for (const feed of feeds) {
      try {
        const res = await fetch(feed.url, { method: "GET" });
        if (!res.ok) {
          results.push({ integrationId: feed.id, ok: false, imported: 0, error: `Fetch failed (${res.status})` });
          continue;
        }

        const icsText = await res.text();
        const events = parseIcsToEvents(icsText);

        let imported = 0;
        for (const ev of events) {
          if (!ev.start) continue;
          await upsertUnassigned(supabase, {
            property_id: propertyId,
            room_type_id: feed.room_type_id,
            ev,
            propTZ,
          });
          imported++;
        }

        await supabase
          .from("ical_type_integrations")
          .update({ last_sync: new Date().toISOString() })
          .eq("id", feed.id);

        results.push({ integrationId: feed.id, ok: true, imported });
      } catch (e: any) {
        results.push({ integrationId: feed.id, ok: false, imported: 0, error: e?.message || "Unknown error" });
      }
    }

    await supabase.rpc("account_register_sync_usage", {
      p_account_id: accountId,
      p_event_type: "sync_now",
    });

    return j(200, { ok: true, message: "Sync completed", propertyId, results });
  } catch (e: any) {
    return j(500, { error: "Server error", details: e?.message || String(e) });
  }
}