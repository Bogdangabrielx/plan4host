import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QrGeneratorClient from "./ui/QrGeneratorClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_EMAIL = "bogdangabriel94@gmail.com";

export default async function QrPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (!user.email || user.email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
    redirect("/app");
  }

  return (
    <AppShell currentPath="/app/qr" title="QR generator">
      <QrGeneratorClient />
    </AppShell>
  );
}

