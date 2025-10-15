// app/api/form-bookings/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient as createRls } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function bad(status: number, body: any) {
  return NextResponse.json(body, { status });
}
function ok(body: any) { return NextResponse.json(body, { status: 200 }); }

type UUID = string;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createAdmin(URL, SERVICE, { auth: { persistSession: false } });

function isValidUUID(v?: string | null) {
  return !!v && /^[0-9a-f-]{36}$/i.test(v);
}

function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  // overlap if a.start < b.end && a.end > b.start
  return aStart < bEnd && aEnd > bStart;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: UUID } }
) {
  try {
    const supa = createRls();
    const { data: auth } = await supa.auth.getUser();
    if (!auth?.user) return bad(401, { error: "Not authenticated" });

    const id = params?.id;
    if (!isValidUUID(id)) return bad(400, { error: "Invalid form id" });

    // load form + property
    const { data: booking, error: e1 } = await supa
      .from("form_bookings")
      .select("id,property_id,state as status,start_date,end_date,room_id,room_type_id,guest_first_name,guest_last_name,guest_email,guest_phone,created_at,submitted_at")
      .eq("id", id)
      .single();

    if (e1 || !booking) return bad(404, { error: "Booking not found" });

    // forms only

    const propertyId = (booking as any).property_id as UUID;

    // load property
    const { data: property } = await supa
      .from("properties")
      .select("id,name,timezone")
      .eq("id", propertyId)
      .single();

    // load room_types & rooms
    const [{ data: roomTypes }, { data: rooms }] = await Promise.all([
      supa.from("room_types").select("id,name").eq("property_id", propertyId).order("name", { ascending: true }),
      supa.from("rooms").select("id,name,room_type_id").eq("property_id", propertyId).order("name", { ascending: true }),
    ]);

    return ok({
      booking,
      property,
      room_types: roomTypes ?? [],
      rooms: rooms ?? [],
    });
  } catch (e: any) {
    return bad(500, { error: "Server error", details: e?.message ?? String(e) });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: UUID } }
) {
  try {
    const supa = createRls();
    const { data: auth } = await supa.auth.getUser();
    if (!auth?.user) return bad(401, { error: "Not authenticated" });

    const id = params?.id;
    if (!isValidUUID(id)) return bad(400, { error: "Invalid form id" });

    const body = await req.json().catch(() => ({}));
    const start_date = String(body?.start_date || "").trim();
    const end_date = String(body?.end_date || "").trim();
    const room_id = body?.room_id ? String(body.room_id).trim() : null;
    const room_type_id = body?.room_type_id ? String(body.room_type_id).trim() : null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      return bad(400, { error: "Invalid dates (expect YYYY-MM-DD)" });
    }
    if (end_date < start_date) {
      return bad(400, { error: "end_date cannot be before start_date" });
    }

    // load form + property
    const { data: booking, error: e1 } = await supa
      .from("form_bookings")
      .select(
        "id,property_id,start_date,end_date,room_id,room_type_id,state,guest_first_name,guest_last_name,guest_email,guest_phone,guest_address,guest_city,guest_country"
      )
      .eq("id", id)
      .single();

    if (e1 || !booking) return bad(404, { error: "Form not found" });

    const propertyId = (booking as any).property_id as UUID;

    // load room_types & rooms
    const [{ data: roomTypes }, { data: rooms }] = await Promise.all([
      supa.from("room_types").select("id,name").eq("property_id", propertyId),
      supa.from("rooms").select("id,name,room_type_id").eq("property_id", propertyId),
    ]);

    const hasTypes = (roomTypes?.length ?? 0) > 0;

    // validate selection: dacă proprietatea are room types -> acceptăm room_type_id;
    // dacă NU are room types -> cerem room_id
    if (hasTypes) {
      // room_type_id e opțional, dar dacă vine trebuie să fie al proprietății
      if (room_type_id && !roomTypes?.some(rt => String(rt.id) === room_type_id)) {
        return bad(400, { error: "Invalid room_type_id for this property" });
      }
      // dacă a venit room_id, verificăm că aparține proprietății (și, dacă e cazul, se potrivește tipul ales)
      if (room_id) {
        const r = rooms?.find(r => String(r.id) === room_id);
        if (!r) return bad(400, { error: "Invalid room_id for this property" });
        if (room_type_id && String(r.room_type_id || "") !== room_type_id) {
          return bad(400, { error: "room_id does not match selected room_type_id" });
        }
      }
    } else {
      // fără room types -> trebuie room_id
      if (!room_id) return bad(400, { error: "This property has no room types; room_id is required" });
      const r = rooms?.find(r => String(r.id) === room_id);
      if (!r) return bad(400, { error: "Invalid room_id for this property" });
    }

    // Dacă se setează room_id → prevenim suprapunerea cu alte formulare pe aceeași cameră
    let targetBooking: any | null = null;
    if (room_id) {
      const rForms = await admin
        .from('form_bookings')
        .select('id,start_date,end_date,state,room_id')
        .eq('property_id', propertyId)
        .eq('room_id', room_id)
        .neq('id', id)
        .neq('state', 'cancelled')
        .lt('start_date', end_date)
        .gt('end_date', start_date);
      if (!rForms.error && (rForms.data?.length || 0) > 0) {
        return bad(409, { error: 'Another form overlaps on this room.' });
      }
      // Anti-overlap cu rezervări active (confirmed / checked_in) pe aceeași cameră
      try {
        const rBk = await admin
          .from('bookings')
          .select('id,start_date,end_date,status')
          .eq('property_id', propertyId)
          .eq('room_id', room_id)
          .in('status', ['confirmed','checked_in'])
          .lt('start_date', end_date)
          .gt('end_date', start_date)
          .limit(1);
        if (!rBk.error && (rBk.data?.length || 0) > 0) {
          return bad(409, { error: 'Target room has an active confirmed reservation overlap.' });
        }
      } catch {}

      // Opțional: încercăm să găsim un eveniment existent pentru link (dacă există); nu este obligatoriu
      try {
        const rEv = await admin
          .from('bookings')
          .select('id,room_id,start_date,end_date,status,source,form_id,guest_first_name,guest_last_name,guest_email,guest_phone')
          .eq('property_id', propertyId)
          .eq('room_id', room_id)
          .eq('start_date', start_date)
          .eq('end_date', end_date)
          .neq('status', 'cancelled')
          .is('form_id', null)
          .neq('source', 'form')
          .maybeSingle();
        if (!rEv.error && rEv.data) targetBooking = rEv.data;
      } catch {}
    }

    // a) Update form
    const patchForm: any = {
      start_date,
      end_date,
      room_type_id: hasTypes ? (room_type_id ?? null) : null,
      room_id: room_id ?? null,
      updated_at: new Date().toISOString(),
    };
    if (room_id && targetBooking) patchForm.state = 'linked';
    const uForm = await admin.from('form_bookings').update(patchForm).eq('id', id).select('id').maybeSingle();
    if (uForm.error) return bad(500, { error: uForm.error.message });

    // b) If a target booking exists, link it and confirm
    if (room_id && targetBooking) {
      if (targetBooking.form_id) return bad(409, { error: 'Target booking already linked to a form.' });
      // Bring non-empty guest fields from form onto booking, without overwriting existing non-empty values
      const fb = booking as any;
      const upd: any = { form_id: id, status: 'confirmed' };
      const has = (v: any) => typeof v === 'string' ? v.trim().length > 0 : !!v;
      if (has(fb.guest_first_name) && !has((targetBooking as any).guest_first_name)) upd.guest_first_name = fb.guest_first_name;
      if (has(fb.guest_last_name)  && !has((targetBooking as any).guest_last_name))  upd.guest_last_name  = fb.guest_last_name;
      if (has(fb.guest_email)      && !has((targetBooking as any).guest_email))      upd.guest_email      = fb.guest_email;
      if (has(fb.guest_phone)      && !has((targetBooking as any).guest_phone))      upd.guest_phone      = fb.guest_phone;
      if (has(fb.guest_address)    && !has((targetBooking as any).guest_address))    upd.guest_address    = fb.guest_address;
      const uBk = await admin.from('bookings').update(upd).eq('id', targetBooking.id).select('id').maybeSingle();
      if (uBk.error) return bad(500, { error: uBk.error.message });

      // Upsert contact from form into booking_contacts
      try {
        const cp: any = { booking_id: targetBooking.id };
        if (has(fb.guest_email))   cp.email   = fb.guest_email;
        if (has(fb.guest_phone))   cp.phone   = fb.guest_phone;
        if (has(fb.guest_address)) cp.address = fb.guest_address;
        if (has(fb.guest_city))    cp.city    = fb.guest_city;
        if (has(fb.guest_country)) cp.country = fb.guest_country;
        if (Object.keys(cp).length > 1) {
          await admin.from('booking_contacts').upsert(cp, { onConflict: 'booking_id' });
        }
      } catch {}

      // move documents form → booking
      try {
        const { data: fdocs } = await admin
          .from('form_documents')
          .select('id,storage_bucket,storage_path,doc_type,mime_type,size_bytes,doc_series,doc_number,doc_nationality')
          .eq('form_id', id);
        if ((fdocs?.length || 0) > 0) {
          const rows = (fdocs || []).map((d: any) => ({
            property_id: propertyId,
            booking_id: targetBooking.id,
            storage_bucket: d.storage_bucket,
            storage_path: d.storage_path,
            doc_type: d.doc_type,
            mime_type: d.mime_type,
            size_bytes: d.size_bytes,
            uploaded_at: new Date().toISOString(),
            doc_series: d.doc_series,
            doc_number: d.doc_number,
            doc_nationality: d.doc_nationality,
          }));
          await admin.from('booking_documents').insert(rows);
          await admin.from('form_documents').delete().eq('form_id', id);
        }
      } catch {}
    }

    return ok({ ok: true, booking_id: targetBooking ? String(targetBooking.id) : null });
  } catch (e: any) {
    return bad(500, { error: "Server error", details: e?.message ?? String(e) });
  }
}
