import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;

  // Redirect authenticated users straight to the app when hitting landing root
  if (p === "/" || p === "/ro") {
    // Robust Supabase cookie detection: sb-access/refresh-token with or without project ref prefix
    const all = req.cookies.getAll?.() || [] as any;
    const hasSbSession = all.some((c: { name: string }) => /^(sb-[^-]+-)?(access|refresh)-token$/.test(c.name))
      || !!req.cookies.get("sb-access-token")?.value
      || !!req.cookies.get("sb-refresh-token")?.value;
    if (hasSbSession) {
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
