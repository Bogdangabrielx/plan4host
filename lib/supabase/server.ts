import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-side Supabase client pentru App Router.
 * - Citirea cookie-urilor funcționează oriunde.
 * - Scrierea cookie-urilor este permisă DOAR în Route Handlers / Server Actions.
 *   Ca să nu crape în RSC, învelim set/remove în try/catch.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // În RSC, Next ar arunca „Cookies can only be modified...”
        // Îl suprimăm: în Route Handlers/Actions scrierea va reuși.
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          /* noop in RSC */
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch {
          /* noop in RSC */
        }
      }
    }
  });
}
