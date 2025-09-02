import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CalendarClient from "./ui/CalendarClient";

export default async function CalendarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

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

  return (
    <div style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <AppShell currentPath="/app/calendar" title="Calendar">
        <CalendarClient initialProperties={properties} />
      </AppShell>
    </div>
  );
}
