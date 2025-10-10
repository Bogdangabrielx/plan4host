import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function bad(status: number, body: any) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(req: Request) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user;
    if (!user) return bad(401, { error: "Not authenticated" });

    const body = await req.json().catch(() => ({}));
    const propertyId: string | undefined = body?.propertyId;
    const roomId: string | undefined = body?.roomId;
    const cleanDate: string | undefined = body?.cleanDate;

    if (!propertyId || !roomId || !cleanDate || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      return bad(400, { error: "Invalid payload" });
    }

    const row = {
      property_id: propertyId,
      room_id: roomId,
      clean_date: cleanDate,
      cleaned_by_user_id: user.id,
      cleaned_by_email: user.email ?? null,
      cleaned_at: new Date().toISOString(),
    } as any;

    const ins = await supa
      .from("cleaning_marks")
      .upsert(row, { onConflict: "property_id,room_id,clean_date" })
      .select("cleaned_by_email")
      .maybeSingle();

    if (ins.error) return bad(403, { error: ins.error.message });

    return NextResponse.json({ ok: true, cleaned_by_email: ins.data?.cleaned_by_email ?? user.email ?? null }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (e: any) {
    return bad(500, { error: String(e?.message ?? e) });
  }
}

