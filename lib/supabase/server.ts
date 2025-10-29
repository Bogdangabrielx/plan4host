// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-side Supabase client pentru App Router.
 * - Citirea cookie-urilor funcționează oriunde.
 * - Scrierea cookie-urilor reușește în Route Handlers / Server Actions.
 * - Setăm explicit cookie options potrivite pentru OAuth (sameSite=lax, secure în producție).
 */
export function createClient() {
  const cookieStore = cookies();

  const baseOpts: CookieOptions = {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // keep session cookies alive for a long window (≈90 days)
    maxAge: 60 * 60 * 24 * 90,
  };

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({
            name,
            value,
            ...baseOpts,
            ...options, // permite Supabase să treacă maxAge/exp etc.
          });
        } catch {
          // noop în RSC
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({
            name,
            value: "",
            ...baseOpts,
            ...options,
            maxAge: 0,
          });
        } catch {
          // noop în RSC
        }
      },
    },
  });
}
