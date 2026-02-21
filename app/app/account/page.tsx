import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountClient from "./AccountClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return <AccountClient />;
}
