import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const data = url.searchParams.get("data");
  const sizeParam = url.searchParams.get("size") || "320";

  if (!data) {
    return new NextResponse("Missing data", { status: 400 });
  }

  const size = Number.parseInt(sizeParam, 10);
  const clampedSize = Number.isFinite(size) && size > 0 && size <= 1024 ? size : 320;

  const remote = `https://api.qrserver.com/v1/create-qr-code/?ecc=H&size=${clampedSize}x${clampedSize}&data=${encodeURIComponent(
    data,
  )}`;

  try {
    const res = await fetch(remote);
    if (!res.ok) {
      return new NextResponse("Failed to generate QR", { status: 502 });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "image/png",
        "Content-Disposition": 'attachment; filename="qr-code.png"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Failed to generate QR", { status: 502 });
  }
}

