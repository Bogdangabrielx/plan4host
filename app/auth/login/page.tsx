// /app/auth/login/page.tsx
import { cookies } from "next/headers";
import LoginClient from "./ui/LoginClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export default function LoginPage() {
  const cookieStore = cookies();
  const theme = (cookieStore.get("app_theme")?.value as "light" | "dark") ?? "light";

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh", padding: 16 }}>
      <LoginClient initialTheme={theme} />
    </main>
  );
}
