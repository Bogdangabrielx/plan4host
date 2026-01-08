// app/api/activity/ping/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const supa = createClient();
  const { data } = await supa.auth.getUser();
  const user = data.user;
  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const cutoffIso = new Date(Date.now() - 15_000).toISOString();
  const nowIso = new Date().toISOString();

  const { error } = await supa.rpc("touch_account_activity");
  if (error) {
    // Best-effort fallback if migrations/RPC aren't applied yet.
    let targetAccountId = user.id;
    try {
      const { data: au } = await supa
        .from("account_users")
        .select("account_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      const accountId = (au as any)?.[0]?.account_id as string | undefined;
      if (accountId) targetAccountId = accountId;
    } catch {
      // ignore
    }
    await supa
      .from("accounts")
      .update({ last_activity_at: nowIso })
      .eq("id", targetAccountId as any)
      .or(`last_activity_at.is.null,last_activity_at.lt.${cutoffIso}`);
  }

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
