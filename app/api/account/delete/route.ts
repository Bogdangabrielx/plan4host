// app/api/account/delete/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = createClient();
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Preferred: call a server-side RPC that performs a cascading delete for the account
    try {
      const { error } = await supabase.rpc("account_delete_self");
      if (!error) return NextResponse.json({ ok: true });
      return NextResponse.json({ error: error.message || "Delete failed" }, { status: 400 });
    } catch (e:any) {
      return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

