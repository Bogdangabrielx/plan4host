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

  // If already authenticated (incl. Google), skip login and go to the app
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      redirect("/app");
    }
  } catch {}

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh", padding: 16 }}>
      <LoginClient initialTheme={theme} />
    </main>
  );
}
