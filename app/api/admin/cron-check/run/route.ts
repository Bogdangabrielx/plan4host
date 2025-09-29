// app/api/admin/cron-check/run/route.ts
import { NextResponse } from "next/server";
import { createClient as createSb } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function originFrom(req: Request): string {
  const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "plan4host.com").split(",")[0].trim();
  return `${proto}://${host}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const task = (url.searchParams.get("task") || "").toLowerCase();
  const mode = (url.searchParams.get("mode") || "auth").toLowerCase();

  const base = originFrom(req);

  try {
    let endpoint = "";
    let init: RequestInit = { headers: {}, cache: "no-store" as any };

    if (task === "autosync") {
      if (mode === "status") {
        const u = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const k = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const svc = createSb(u, k, { auth: { persistSession: false } });
        const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const totalFeeds = await svc.from("ical_type_integrations").select("id", { count: "exact", head: true });
        const lastLog = await svc
          .from("ical_type_sync_logs")
          .select("status,started_at,finished_at,added_count")
          .order("started_at", { ascending: false })
          .limit(1);
        const succ = await svc
          .from("ical_type_sync_logs")
          .select("id", { count: "exact", head: true })
          .gte("started_at", sinceIso)
          .eq("status", "success");
        const err = await svc
          .from("ical_type_sync_logs")
          .select("id", { count: "exact", head: true })
          .gte("started_at", sinceIso)
          .eq("status", "error");
        return NextResponse.json({ ok: true, status: 200, endpoint: "autosync:status", data: { totalFeeds: totalFeeds.count ?? null, lastRun: lastLog.data?.[0] ?? null, lastHour: { success: succ.count ?? 0, error: err.count ?? 0 } } });
      }
      endpoint = `${base}/api/cron/ical/autosync`;
      const key = process.env.CRON_ICAL_KEY || "";
      if (mode === "auth") {
        init.method = "HEAD";
        (init.headers as any)["x-cron-key"] = key;
      } else if (mode === "get") {
        init.method = "GET";
        (init.headers as any)["x-cron-key"] = key;
      } else {
        init.method = "POST";
        (init.headers as any)["x-cron-key"] = key;
      }
    } else if (task === "cleanup") {
      if (mode === "status") {
        const u = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const k = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const svc = createSb(u, k, { auth: { persistSession: false } });
        const unresolved = await svc.from("ical_unassigned_events").select("id", { count: "exact", head: true }).eq("resolved", false);
        return NextResponse.json({ ok: true, status: 200, endpoint: "cleanup:status", data: { unresolved: unresolved.count ?? 0 } });
      }
      const key = process.env.CRON_ICAL_KEY || "";
      // Use GET with query key; avoid headers to keep it simple
      endpoint = `${base}/api/cron/ical/cleanup?key=${encodeURIComponent(key)}`;
      init.method = "GET";
    } else if (task === "holds" || task === "soft-holds") {
      if (mode === "status") {
        const u = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const k = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const svc = createSb(u, k, { auth: { persistSession: false } });
        const nowIso = new Date().toISOString();
        const pending = await svc
          .from("roomtype_soft_holds")
          .select("id", { count: "exact", head: true })
          .lte("expires_at", nowIso)
          .neq("status", "cancelled");
        return NextResponse.json({ ok: true, status: 200, endpoint: "holds:status", data: { expiredPending: pending.count ?? 0 } });
      }
      const secret = process.env.CRON_SECRET || "";
      endpoint = `${base}/api/cron/cancel-expired-holds?token=${encodeURIComponent(secret)}`;
      init.method = "GET";
    } else {
      return NextResponse.json({ ok: false, error: "Unknown task" }, { status: 400 });
    }

    const res = await fetch(endpoint, init);
    let bodyText = "";
    try { bodyText = await res.text(); } catch {}
    // Attempt to JSON-parse, but fall back to text
    let data: any = null;
    try { data = bodyText ? JSON.parse(bodyText) : null; } catch { data = bodyText || null; }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      endpoint,
      mode,
      data,
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
