// /app/auth/login/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginClient from "./ui/LoginClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function LoginPage() {
  const cookieStore = cookies();
  const theme = (cookieStore.get("app_theme")?.value as "light" | "dark") ?? "light";
  const initialLang = (cookieStore.get("app_lang")?.value as "en" | "ro") === "ro" ? "ro" : "en";

  // If already authenticated (incl. Google), skip login and go to the app
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      redirect("/app");
    }
  } catch {}

  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100dvh",
        // On very small phones (e.g. 330px wide), 16px padding shrinks the auth card too much.
        // Use responsive padding that still caps at 16px on larger screens.
        paddingTop: "calc(clamp(8px, 2vw, 16px) + env(safe-area-inset-top))",
        paddingBottom: "calc(clamp(8px, 2vw, 16px) + env(safe-area-inset-bottom))",
        paddingLeft: "calc(clamp(8px, 2vw, 16px) + env(safe-area-inset-left))",
        paddingRight: "calc(clamp(8px, 2vw, 16px) + env(safe-area-inset-right))",
      }}
    >
      <LoginClient initialTheme={theme} initialLang={initialLang} />
    </main>
  );
}
