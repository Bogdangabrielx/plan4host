// app/api/bookings/reconcile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

/* Helpers */
async function typeOfBooking(b: { room_type_id: string | null; room_id: string | null }): Promise<string | null> {
  if (b.room_type_id) return String(b.room_type_id);
  if (!b.room_id) return null;
  const r = await admin.from("rooms").select("room_type_id").eq("id", b.room_id).maybeSingle();
  if (r.error || !r.data) return null;
  return r.data.room_type_id ? String(r.data.room_type_id) : null;
}
function isFormish(b: any) {
  const src = (b?.source || "").toString().toLowerCase();
  return src === "form" || b?.status === "hold" || b?.status === "pending";
}

/**
 * POST /api/bookings/reconcile
 * Body:
 *  - property_id: string (required)
 *  - event_booking_id: string (required)  // booking-ul MANUAL/iCal proaspăt creat/actualizat
 *  - move_documents?: boolean (optional, default: true)
 *
 * Efect:
 *  - caută un "form booking" compatibil (aceleași date + același room_id SAU același room_type_id)
 *  - dacă găsește EXACT UNUL, face merge în booking-ul "event" și marchează form-ul ca "cancelled"
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const property_id: string | undefined = body?.property_id;
    const event_booking_id: string | undefined = body?.event_booking_id;
    const move_documents: boolean = body?.move_documents !== false; // default true

    if (!property_id || !event_booking_id) {
      return bad(400, { error: "property_id and event_booking_id are required" });
    }

    // 1) Load the event booking (manual/ical)
    const rEvent = await admin
      .from("bookings")
      .select("id,property_id,room_id,room_type_id,start_date,end_date,status,source,ical_uid,guest_first_name,guest_last_name,guest_name,form_submitted_at")
      .eq("id", event_booking_id)
      .maybeSingle();

    if (rEvent.error) return bad(500, { error: rEvent.error.message });
    if (!rEvent.data) return bad(404, { error: "Event booking not found" });
    if (String(rEvent.data.property_id) !== property_id) {
      return bad(400, { error: "event_booking_id belongs to a different property" });
    }

    const ev = rEvent.data;
    if (!ev.start_date || !ev.end_date) {
      return bad(400, { error: "Event booking has no dates" });
    }

    // 2) Determine event's allocation criterion + lock check
    const evType = await typeOfBooking({ room_type_id: ev.room_type_id, room_id: ev.room_id });
    const hasRoomCriterion = !!ev.room_id;
    const hasTypeCriterion = !!evType;

    if (!hasRoomCriterion && !hasTypeCriterion) {
      // nu putem reconcilia fără room_id sau type
      return NextResponse.json({ ok: true, reconciled: false, reason: "event_has_no_room_or_type" });
    }

    const anyName = ((ev.guest_first_name || '').trim().length + (ev.guest_last_name || '').trim().length) > 0 || (ev.guest_name || '').trim().length > 0;
    const locked = !!ev.form_submitted_at || anyName;
    if (locked) {
      return NextResponse.json({ ok: true, reconciled: false, reason: "event_locked" });
    }

    // 3) Find candidate form bookings on the same interval
    const rForms = await admin
      .from("bookings")
      .select("id,property_id,room_id,room_type_id,start_date,end_date,status,source,form_submitted_at,guest_first_name,guest_last_name")
      .eq("property_id", property_id)
      .eq("start_date", ev.start_date)
      .eq("end_date", ev.end_date)
      .neq("status", "cancelled");

    if (rForms.error) return bad(500, { error: rForms.error.message });

    const formsPool = (rForms.data || []).filter(isFormish);
    if (formsPool.length === 0) {
      return NextResponse.json({ ok: true, reconciled: false, reason: "no_form_candidates" });
    }

    // 4) Apply strict rules: dates already equal; now match criterion
    const matches: any[] = [];
    for (const fb of formsPool) {
      if (fb.room_id) {
        // form are room_id -> trebuie să coincida cu room_id din event
        if (hasRoomCriterion && String(fb.room_id) === String(ev.room_id)) {
          matches.push(fb); continue;
        }
      } else if (fb.room_type_id) {
        // form are type -> trebuie să coincida cu type-ul event-ului
        if (hasTypeCriterion && String(fb.room_type_id) === String(evType)) {
          matches.push(fb); continue;
        }
      }
    }

    if (matches.length === 0) {
      return NextResponse.json({ ok: true, reconciled: false, reason: "no_strict_match" });
    }
    if (matches.length > 1) {
      // Prea multe candidați: nu facem merge automat (evităm greșeli)
      return NextResponse.json({ ok: false, reconciled: false, reason: "multiple_matches", count: matches.length });
    }

    const form = matches[0];

    // 5) Merge: copiem numele dacă lipsesc pe event, upsert contact, mutăm documente, anulăm form
    const upd: any = {};
    if (form.guest_first_name && !ev.guest_first_name) upd.guest_first_name = form.guest_first_name;
    if (form.guest_last_name  && !ev.guest_last_name)  upd.guest_last_name  = form.guest_last_name;
    // marcăm momentul când s-a integrat formularul
    upd.form_submitted_at = form.form_submitted_at || new Date().toISOString();

    if (Object.keys(upd).length > 0) {
      await admin.from("bookings").update(upd).eq("id", ev.id);
    }

    // Contact
    const rContact = await admin.from("booking_contacts").select("email,phone,address,city,country").eq("booking_id", form.id).maybeSingle();
    const contact = (rContact.data || null) as { email?: string|null; phone?:string|null; address?:string|null; city?:string|null; country?:string|null } | null;

    if (contact && (contact.email || contact.phone || contact.address || contact.city || contact.country)) {
      await admin
        .from("booking_contacts")
        .upsert({
          booking_id: ev.id,
          email:   contact.email   ?? null,
          phone:   contact.phone   ?? null,
          address: contact.address ?? null,
          city:    contact.city    ?? null,
          country: contact.country ?? null,
        }, { onConflict: "booking_id" })
        .select("booking_id")
        .maybeSingle();
    }

    // Move docs (optional)
    let movedDocs = 0;
    if (move_documents) {
      const updDocs = await admin
        .from("booking_documents")
        .update({ booking_id: ev.id })
        .eq("booking_id", form.id)
        .select("id");
      if (!updDocs.error) movedDocs = (updDocs.data?.length || 0);
    }

    // Cancel form booking
    await admin.from("bookings").update({ status: "cancelled" }).eq("id", form.id);

    return NextResponse.json({ ok: true, reconciled: true, moved_docs: movedDocs, merged_form_id: form.id, event_id: ev.id });
  } catch (e: any) {
    return bad(500, { error: e?.message || "Unexpected error" });
  }
}
