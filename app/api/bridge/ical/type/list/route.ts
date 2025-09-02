import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  if (!propertyId) return NextResponse.json({ integrations: [], logs: {} });

  const { data: integrations } = await supabase
    .from("ical_type_integrations")
    .select("id,property_id,room_type_id,provider,url,is_active,last_sync")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: true });

  // group logs by type (via integration -> type)
  const logs: Record<string, any[]> = {};
  if (integrations && integrations.length) {
    const ids = integrations.map(i => i.id);
    const { data: allLogs } = await supabase
      .from("ical_type_sync_logs")
      .select("id,integration_id,started_at,finished_at,status,added_count,updated_count,conflicts")
      .in("integration_id", ids)
      .order("started_at", { ascending: false });

    const byInteg: Record<string, any[]> = {};
    for (const l of (allLogs ?? [])) {
      (byInteg[l.integration_id] = byInteg[l.integration_id] || []).push(l);
    }
    for (const i of integrations) {
      logs[i.room_type_id] = (byInteg[i.id] ?? []).slice(0, 5);
    }
  }

  return NextResponse.json({ integrations, logs });
}
