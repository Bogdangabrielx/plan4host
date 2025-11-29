// app/admin/email-updates/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmailUpdatesClient from "./ui/EmailUpdatesClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ADMIN_EMAIL = "bogdangabriel94@gmail.com";

export default async function EmailUpdatesPage() {
  const supa = createClient();
  const {
    data: { user },
  } = await supa.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const email = (user.email || "").toLowerCase();
  if (email !== ADMIN_EMAIL.toLowerCase()) {
    redirect("/app");
  }

  return <EmailUpdatesClient adminEmail={user.email || ""} />;
}

