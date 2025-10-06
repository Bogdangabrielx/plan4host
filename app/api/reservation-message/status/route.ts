// app/api/reservation-message/status/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function POST(req: Request) {
  try {
    const supa = createClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user; if (!user) return bad(401, { error: "Not authenticated" });

    const body = await req.json().catch(() => ({}) as any);
    const booking_id: string | undefined  = body?.booking_id;
    const property_id: string | undefined = body?.property_id;
    const values: Record<string,string> = (body?.values || {}) as any;
    const template_id: string | undefined = body?.template_id;
    if (!booking_id) return bad(400, { error: "booking_id required" });

    // Booking + property
    const rBk = await supa
      .from("bookings")
      .select("id, property_id, status, guest_first_name, guest_last_name, start_date, end_date, start_time, end_time, room_id")
      .eq("id", booking_id)
      .maybeSingle();
    if (rBk.error || !rBk.data) return bad(404, { error: "Booking not found" });
    const bk: any = rBk.data;
    const propId = property_id || bk.property_id;

    // Contact email
    const rContact = await supa
      .from("booking_contacts")
      .select("email")
      .eq("booking_id", booking_id)
      .maybeSingle();
    const toEmail: string | null = (rContact.data as any)?.email ?? null;

    // Template
    let tplId: string | null = null;
    if (template_id) {
      const rOne = await supa
        .from('reservation_templates')
        .select('id,status')
        .eq('id', template_id)
        .maybeSingle();
      if (rOne.error || !rOne.data) return NextResponse.json({ ok:true, canSend:false, reason:'missing_template' });
      tplId = (rOne.data as any).id as string;
    } else {
      const rTpl = await supa
        .from("reservation_templates")
        .select("id,status")
        .eq("property_id", propId)
        .maybeSingle();
      if (rTpl.error || !rTpl.data) return NextResponse.json({ ok: true, canSend: false, reason: "missing_template" });
      tplId = (rTpl.data as any).id as string;
    }

    const [rBlocks, rFields] = await Promise.all([
      supa.from("reservation_template_blocks").select("type,text,sort_index").eq("template_id", tplId).order("sort_index", { ascending: true }),
      supa.from("reservation_template_fields").select("key").eq("template_id", tplId),
    ]);
    if (rBlocks.error) return bad(400, { error: rBlocks.error.message });
    if (rFields.error) return bad(400, { error: rFields.error.message });

    const fields = (rFields.data || []).map((x: any) => String(x.key));

    // manual_values saved in reservation_messages (if any)
    const rMsg = await supa
      .from("reservation_messages")
      .select("manual_values")
      .eq("property_id", propId)
      .eq("booking_id", booking_id)
      .maybeSingle();
    const saved: Record<string,string> = (rMsg.data as any)?.manual_values || {};

    // Merge values: live UI overrides saved
    const manualMerged: Record<string,string> = { ...(saved || {}), ...(values || {}) };
    const missingFields: string[] = fields.filter(k => !manualMerged[k] || manualMerged[k].trim() === "");

    // Heading/body presence
    const blocks = (rBlocks.data || []) as Array<{ type: string; text?: string }>;
    const hasHeading = blocks.some(b => b.type === 'heading' && (b.text || '').trim().length > 0);
    const hasBody = blocks.some(b => b.type === 'paragraph' && (b.text || '').trim().length > 0);

    if (!toEmail) return NextResponse.json({ ok: true, canSend: false, reason: "missing_email" });
    if (missingFields.length > 0) return NextResponse.json({ ok: true, canSend: false, reason: "missing_fields", missingFields });
    if (!hasHeading) return NextResponse.json({ ok: true, canSend: false, reason: "missing_subject" });
    if (!hasBody) return NextResponse.json({ ok: true, canSend: false, reason: "missing_body" });

    return NextResponse.json({ ok: true, canSend: true });
  } catch (e: any) {
    return bad(500, { error: e?.message || "Unexpected error" });
  }
}
