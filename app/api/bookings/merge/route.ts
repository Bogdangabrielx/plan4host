// app/api/bookings/merge/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

async function typeOfBooking(b: { room_type_id: string | null; room_id: string | null }): Promise<string | null> {
  if (b.room_type_id) return String(b.room_type_id);
  if (!b.room_id) return null;
  const r = await admin.from("rooms").select("room_type_id").eq("id", b.room_id).maybeSingle();
  if (r.error || !r.data) return null;
  return r.data.room_type_id ? String(r.data.room_type_id) : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const property_id: string | undefined = body?.property_id;
    const manual_booking_id: string | undefined = body?.manual_booking_id;
    const form_booking_id: string | undefined = body?.form_booking_id;
    const move_documents: boolean = !!body?.move_documents;

    if (!property_id || !manual_booking_id || !form_booking_id) {
      return bad(400, { error: "property_id, manual_booking_id and form_booking_id are required" });
    }

    // 1) Load bookings and validate they belong to property
    const [rManual, rForm] = await Promise.all([
      admin.from("bookings").select("id,property_id,room_id,room_type_id,start_date,end_date,status,source,guest_first_name,guest_last_name").eq("id", manual_booking_id).maybeSingle(),
      admin.from("bookings").select("id,property_id,room_id,room_type_id,start_date,end_date,status,source,guest_first_name,guest_last_name,form_submitted_at").eq("id", form_booking_id).maybeSingle(),
    ]);

    if (rManual.error) return bad(500, { error: rManual.error.message });
    if (rForm.error) return bad(500, { error: rForm.error.message });
    if (!rManual.data || !rForm.data) return bad(404, { error: "Booking not found" });
    if (String(rManual.data.property_id) !== property_id || String(rForm.data.property_id) !== property_id) {
      return bad(400, { error: "Bookings must belong to the same property" });
    }

    // Guard: form booking?
    const src = (rForm.data.source || "").toString().toLowerCase();
    const looksForm = src === "form" || !!(rForm.data as any).form_submitted_at || rForm.data.status === "hold" || rForm.data.status === "pending";
    if (!looksForm) return bad(400, { error: "form_booking_id is not a form/hold booking" });

    // 2) STRICT RULES: dates + allocation criterion must both match
    if (rManual.data.start_date !== rForm.data.start_date || rManual.data.end_date !== rForm.data.end_date) {
      return bad(400, { error: "Dates must match for merge" });
    }

    // Criterion:
    // - dacă form are room_id -> trebuie să coincidă cu room_id manual
    // - altfel, dacă form are room_type_id -> trebuie să coincidă cu type-ul manual (direct sau derivat din room_id)
    const formHasRoom = !!rForm.data.room_id;
    const formHasType = !!rForm.data.room_type_id;

    if (!formHasRoom && !formHasType) {
      return bad(400, { error: "Form booking must contain room or room type to allow merge" });
    }

    if (formHasRoom) {
      if (!rManual.data.room_id || String(rManual.data.room_id) !== String(rForm.data.room_id)) {
        return bad(400, { error: "Room mismatch (form vs manual)" });
      }
    } else {
      const manualType = (await typeOfBooking(rManual.data)) ?? null;
      const formType   = String(rForm.data.room_type_id);
      if (!manualType || manualType !== formType) {
        return bad(400, { error: "Room type mismatch (form vs manual)" });
      }
    }

    // 3) Read contact from form booking
    const rContact = await admin
      .from("booking_contacts")
      .select("email,phone,address,city,country")
      .eq("booking_id", form_booking_id)
      .maybeSingle();
    const contact = (rContact.data || null) as { email?: string|null; phone?:string|null; address?:string|null; city?:string|null; country?:string|null } | null;

    // 4) Update manual booking names (only if provided by form)
    const upd: any = {};
    if ((rForm.data as any).guest_first_name) upd.guest_first_name = (rForm.data as any).guest_first_name;
    if ((rForm.data as any).guest_last_name)  upd.guest_last_name  = (rForm.data as any).guest_last_name;
    if (Object.keys(upd).length > 0) {
      await admin.from("bookings").update(upd).eq("id", manual_booking_id);
    }

    // 5) Upsert contact onto manual booking
    if (contact && (contact.email || contact.phone || contact.address || contact.city || contact.country)) {
      await admin
        .from("booking_contacts")
        .upsert({
          booking_id: manual_booking_id,
          email:   contact.email   ?? null,
          phone:   contact.phone   ?? null,
          address: contact.address ?? null,
          city:    contact.city    ?? null,
          country: contact.country ?? null,
        }, { onConflict: "booking_id" })
        .select("booking_id")
        .maybeSingle();
    }

    // 6) Optionally move documents
    let movedDocs = 0;
    if (move_documents) {
      const updDocs = await admin
        .from("booking_documents")
        .update({ booking_id: manual_booking_id })
        .eq("booking_id", form_booking_id)
        .select("id");
      if (!updDocs.error) movedDocs = (updDocs.data?.length || 0);
    }

    // 7) Close form booking (mark cancelled) — fără coloane care nu mai există
    await admin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", form_booking_id);

    return NextResponse.json({ ok: true, moved_docs: movedDocs });
  } catch (e: any) {
    return bad(500, { error: e?.message || "Unexpected error" });
  }
}