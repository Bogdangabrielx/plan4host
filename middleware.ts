import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;

  // Redirect authenticated users straight to the app when hitting landing root
  if (p === "/" || p === "/ro") {
    const hasAccess = req.cookies.get("sb-access-token")?.value;
    const hasRefresh = req.cookies.get("sb-refresh-token")?.value;
    if (hasAccess || hasRefresh) {
      return NextResponse.redirect(new URL("/app", req.url));
    }
  }

  const res = NextResponse.next();

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
