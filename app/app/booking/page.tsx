import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookingClient from "./ui/BookingClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BookingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  if ((user.email || "").toLowerCase() !== "bogdangabriel94@gmail.com") {
    redirect("/app");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <BookingClient />
    </main>
  );
}

