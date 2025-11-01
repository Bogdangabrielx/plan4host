// app/api/billing/schedule/clear/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await supabase.rpc("account_clear_scheduled_plan_self");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

