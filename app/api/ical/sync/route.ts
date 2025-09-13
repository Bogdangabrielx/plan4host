import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Decision = {
  allowed: boolean;
  reason: string | null;
  cooldown_remaining_sec: number | null;
  remaining_in_window: number | null;
};

function bad(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();

    // Body
    const { integrationId } = (await req.json().catch(() => ({}))) as {
      integrationId?: string;
    };
    if (!integrationId || !/^[0-9a-f-]{36}$/i.test(integrationId)) {
      return bad(400, { error: "Invalid integrationId" });
    }

    // 1) Look up integration (RLS checks access)
    const { data: integ, error: e1 } = await supabase
      .from("ical_type_integrations")
      .select("id, property_id, is_active, provider, url")
      .eq("id", integrationId)
      .single();

    if (e1 || !integ) return bad(404, { error: "Integration not found" });
    if (!integ.is_active) return bad(409, { error: "Integration is inactive" });

    // 2) Get account (admin) for the property
    const { data: prop, error: e2 } = await supabase
      .from("properties")
      .select("id, admin_id")
      .eq("id", integ.property_id)
      .single();

    if (e2 || !prop) return bad(404, { error: "Property not found" });
    const accountId = (prop as any).admin_id as string;

    // 3) Policy check (rate limits & gating)
    const { data: decision, error: eCheck } = await supabase
      .rpc("account_can_sync_now_v2", {
        p_account_id: accountId,
        p_event_type: "sync_now",
      })
      .single<Decision>();

    if (eCheck || !decision) {
      return bad(400, {
        error: "Policy check failed",
        details: eCheck?.message ?? "No decision from account_can_sync_now",
      });
    }

    if (!decision.allowed) {
      const status =
        decision.reason === "sync_now_only_on_premium" ? 403 : 429;
      return bad(status, {
        error: "Rate limited",
        reason: decision.reason,
        cooldown_remaining_sec: decision.cooldown_remaining_sec,
        remaining_in_window: decision.remaining_in_window,
      });
    }

    // 4) Register usage in the window
    await supabase.rpc("account_register_sync_usage_v2", {
      p_account_id: accountId,
      p_event_type: "sync_now",
    });

    // 5) Trigger the actual sync here if vrei (fetch(integ.url) etc.)
    return NextResponse.json(
      {
        ok: true,
        message: "Sync accepted",
        integrationId,
        provider: integ.provider,
        url: integ.url,
      },
      { status: 202 }
    );
  } catch (err: any) {
    return bad(500, { error: "Internal error", details: String(err?.message ?? err) });
  }
}
