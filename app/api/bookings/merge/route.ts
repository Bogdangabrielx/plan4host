import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

function bad(status: number, body: any) {
  return NextResponse.json(body, { status });
}

/**
 * Merge: move guest/contact/docs from a FORM booking onto a MANUAL/OTA booking,
 * then cancel the form booking (no soft-hold/hold_status involved).
 *
 * POST body:
 *  - property_id (string, required)
 *  - manual_booking_id (string, required)
 *  - form_booking_id (string, required)
 *  - move_documents (boolean, optional)
 */
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
      admin
        .from("bookings")
        .select(
          "id,property_id,room_id,room_type_id,start_date,end_date,status,source,guest_first_name,guest_last_name"
        )
        .eq("id", manual_booking_id)
        .maybeSingle(),
      admin
        .from("bookings")
        .select(
          "id,property_id,room_id,room_type_id,start_date,end_date,status,source,guest_first_name,guest_last_name,form_submitted_at"
        )
        .eq("id", form_booking_id)
        .maybeSingle(),
    ]);

    if (rManual.error) return bad(500, { error: rManual.error.message });
    if (rForm.error) return bad(500, { error: rForm.error.message });
    if (!rManual.data || !rForm.data) return bad(404, { error: "Booking not found" });

    if (
      String(rManual.data.property_id) !== property_id ||
      String(rForm.data.property_id) !== property_id
    ) {
      return bad(400, { error: "Bookings must belong to the same property" });
    }

    // 2) Guard: form booking must actually look like a form (no soft-hold flags anymore)
    const src = (rForm.data.source || "").toString().toLowerCase();
    const looksForm = src === "form" || !!(rForm.data as any).form_submitted_at;
    if (!looksForm) return bad(400, { error: "form_booking_id is not a form booking" });

    // 3) Optional checks (we allow date/type differences but inform the caller)
    const manualType = rManual.data.room_type_id || null;
    const formType = rForm.data.room_type_id || null;
    const notes: string[] = [];
    if (
      rManual.data.start_date !== rForm.data.start_date ||
      rManual.data.end_date !== rForm.data.end_date
    ) {
      notes.push("dates_differ");
    }
    if (manualType && formType && String(manualType) !== String(formType)) {
      notes.push("types_differ");
    }

    // 4) Copy contact from form booking
    const rContact = await admin
      .from("booking_contacts")
      .select("email,phone,address,city,country")
      .eq("booking_id", form_booking_id)
      .maybeSingle();
    const contact =
      (rContact.data || null) as
        | {
            email?: string | null;
            phone?: string | null;
            address?: string | null;
            city?: string | null;
            country?: string | null;
          }
        | null;

    // 5) Update manual booking names (if provided on form)
    const upd: any = {};
    if ((rForm.data as any).guest_first_name)
      upd.guest_first_name = (rForm.data as any).guest_first_name;
    if ((rForm.data as any).guest_last_name)
      upd.guest_last_name = (rForm.data as any).guest_last_name;
    if (Object.keys(upd).length > 0) {
      const u = await admin.from("bookings").update(upd).eq("id", manual_booking_id);
      if (u.error) return bad(500, { error: u.error.message });
    }

    // 6) Upsert contact onto manual booking
    if (
      contact &&
      (contact.email ||
        contact.phone ||
        contact.address ||
        contact.city ||
        contact.country)
    ) {
      const upc = await admin
        .from("booking_contacts")
        .upsert(
          {
            booking_id: manual_booking_id,
            email: contact.email ?? null,
            phone: contact.phone ?? null,
            address: contact.address ?? null,
            city: contact.city ?? null,
            country: contact.country ?? null,
          },
          { onConflict: "booking_id" }
        )
        .select("booking_id")
        .maybeSingle();
      if (upc.error) return bad(500, { error: upc.error.message });
    }

    // 7) Optionally move documents
    let moved_docs = 0;
    if (move_documents) {
      const updDocs = await admin
        .from("booking_documents")
        .update({ booking_id: manual_booking_id })
        .eq("booking_id", form_booking_id)
        .select("id");
      if (!updDocs.error) moved_docs = (updDocs.data?.length || 0);
    }

    // 8) Cancel the form booking (no soft-hold / hold_status columns used anymore)
    const close = await admin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", form_booking_id);
    if (close.error) return bad(500, { error: close.error.message });

    return NextResponse.json({ ok: true, moved_docs, notes });
  } catch (e: any) {
    return bad(500, { error: e?.message || "Unexpected error" });
  }
}