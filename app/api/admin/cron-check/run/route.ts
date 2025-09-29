// app/api/admin/cron-check/run/route.ts
import { NextResponse } from "next/server";

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
      const key = process.env.CRON_ICAL_KEY || "";
      // Use GET with query key; avoid headers to keep it simple
      endpoint = `${base}/api/cron/ical/cleanup?key=${encodeURIComponent(key)}`;
      init.method = "GET";
    } else if (task === "holds" || task === "soft-holds") {
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

