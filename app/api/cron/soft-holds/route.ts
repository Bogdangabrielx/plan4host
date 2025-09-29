import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * CRON endpoint (GET/POST) pentru managementul soft-hold-urilor:
 * - promovează soft-hold-urile care au primit iCal (has_ical/ical_uid/ota_* setate)
 * - expiră soft-hold-urile trecute de hold_expires_at
 *
 * Autorizare:
 * - Acceptă automat apelurile programate Vercel (header 'x-vercel-cron')
 * - Pentru apeluri manuale, necesită 'X-Cron-Key: <CRON_SECRET>'
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET   = process.env.CRON_SECRET || ""; // opțional

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function hasIcalOrHintClause() {
  return [
    "has_ical.eq.true",
    "ical_uid.not.is.null",
    "ota_event_id.not.is.null",
    "ota_reservation_id.not.is.null",
    "source.eq.ical",
  ].join(",");
}

async function handler(req: Request) {
  // Acceptă implicit apelurile venite din Vercel Cron
  const triggeredByVercelCron =
    req.headers.has("x-vercel-cron") || req.headers.get("x-vercel-cron") === "1";

  // Dacă există CRON_SECRET, cere-l DOAR pentru apeluri manuale (non-Vercel Cron)
  if (CRON_SECRET && !triggeredByVercelCron) {
    const key = req.headers.get("x-cron-key") || "";
    if (key !== CRON_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const nowIso = new Date().toISOString();

    // 1) PROMOTE: soft-hold care au primit indicator iCal -> devin reale
    const promote = await admin
      .from("bookings")
      .update({ is_soft_hold: false, hold_status: "promoted" })
      .eq("is_soft_hold", true)
      .neq("status", "cancelled")
      .or(hasIcalOrHintClause())
      .select("id");

    if (promote.error) {
      return NextResponse.json({ ok: false, step: "promote", error: promote.error.message }, { status: 500 });
    }

    // 2) EXPIRE: soft-hold trecute de termen -> eliberăm capacitatea
    const expire = await admin
      .from("bookings")
      .update({ is_soft_hold: false, hold_status: "expired" })
      .eq("is_soft_hold", true)
      .neq("status", "cancelled")
      .lte("hold_expires_at", nowIso)
      .select("id");

    if (expire.error) {
      return NextResponse.json({ ok: false, step: "expire", error: expire.error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      promoted: promote.data?.length ?? 0,
      expired: expire.data?.length ?? 0,
      at: nowIso,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

export const GET  = handler;
export const POST = handler;
