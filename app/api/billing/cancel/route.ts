// app/api/billing/cancel/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const cancel = Boolean(body?.cancel ?? true);
  const { error } = await supabase.rpc("account_cancel_at_period_end_self", { p_cancel: cancel });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, cancel_at_period_end: cancel });
}

