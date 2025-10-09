import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const p = req.nextUrl.pathname;

  // Set SSR language cookie based on pathname
  if (p.startsWith("/ro")) {
    res.cookies.set("site_lang", "ro", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  } else {
    res.cookies.set("site_lang", "en", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$).*)"],
};

