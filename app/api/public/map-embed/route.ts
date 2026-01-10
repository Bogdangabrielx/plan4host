// app/api/public/map-embed/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "maps.app.goo.gl") return true;
  if (host === "goo.gl") return true;
  if (host === "maps.google.com") return true;
  if (host === "www.google.com") return true;
  if (host === "google.com") return true;
  if (host.endsWith(".google.com")) return true;
  return false;
}

function extractLatLng(url: string): { lat: string; lng: string } | null {
  // 1) /@lat,lng,
  const at = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return { lat: at[1]!, lng: at[2]! };

  // 2) !3dLAT!4dLNG
  const pb = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (pb) return { lat: pb[1]!, lng: pb[2]! };

  try {
    const u = new URL(url);
    const q = u.searchParams.get("q") || u.searchParams.get("query") || u.searchParams.get("ll");
    if (q) {
      const m = q.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
      if (m) return { lat: m[1]!, lng: m[2]! };
    }
  } catch {
    // ignore
  }
  return null;
}

function extractPlaceName(url: string): string | null {
  // /maps/place/<NAME>/
  const m = url.match(/\/maps\/place\/([^/]+)/i);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]!.replace(/\+/g, " "));
  } catch {
    return m[1]!;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = (searchParams.get("url") || "").trim();
    if (!raw) return NextResponse.json({ error: "Missing ?url" }, { status: 400 });
    if (raw.length > 2048) return NextResponse.json({ error: "URL too long" }, { status: 400 });

    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!/^https?:$/.test(target.protocol)) {
      return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
    }
    if (!isAllowedHost(target.hostname)) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
    }

    // Resolve short links / redirects to a canonical URL we can parse.
    const res = await fetch(target.toString(), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        "user-agent": "plan4host-map-embed/1.0",
      },
    });
    const finalUrl = res.url || target.toString();

    const coords = extractLatLng(finalUrl);
    if (coords) {
      return NextResponse.json({
        embed_url: `https://www.google.com/maps?q=${encodeURIComponent(`${coords.lat},${coords.lng}`)}&output=embed`,
        open_url: finalUrl,
      });
    }

    const placeName = extractPlaceName(finalUrl);
    if (placeName) {
      return NextResponse.json({
        embed_url: `https://www.google.com/maps?q=${encodeURIComponent(placeName)}&output=embed`,
        open_url: finalUrl,
      });
    }

    // Last resort: embed a search by the final URL's hostname/path (avoid "custom content" embed errors).
    return NextResponse.json({
      embed_url: null,
      open_url: finalUrl,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

