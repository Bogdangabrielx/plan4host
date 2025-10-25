import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CalendarClient from "./ui/CalendarClient";
import { ensureScope } from "@/lib/auth/scopes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isYMD(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: { date?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const mode = await supabase.rpc("account_access_mode");
  if ((mode.data as string | null) === "billing_only") redirect("/app/subscription");
  await ensureScope("calendar", supabase, user.id);

  const { data: props = [] } = await supabase
    .from("properties")
    .select("id,name,check_in_time,check_out_time")
    .order("created_at", { ascending: true });

  const properties = (props ?? []).map((p: any) => ({
    id: p.id as string,
    name: p.name as string,
    check_in_time: p.check_in_time ?? null,
    check_out_time: p.check_out_time ?? null,
  }));

  // If user has no properties yet, redirect to dashboard
  if (properties.length === 0) redirect("/app");

  // preluăm ?date=YYYY-MM-DD dacă e valid
  const initialDate = isYMD(searchParams?.date) ? (searchParams!.date as string) : undefined;

  return (
    <AppShell currentPath="/app/calendar" title="Calendar">
      <div
        style={{
          backgroundImage: 'var(--bg-media)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          borderRadius: 16,
          padding: 0,
        }}
      >
        <CalendarClient initialProperties={properties} initialDate={initialDate} />
      </div>
    </AppShell>
  );
}
