import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookingPreviewClient from "./ui/BookingPreviewClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BookingPreviewPage() {
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
    <AppShell currentPath="/app/booking" title="Booking (preview)">
      <BookingPreviewClient />
    </AppShell>
  );
}

