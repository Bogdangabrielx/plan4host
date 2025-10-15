// app/api/form-bookings/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient as createRls } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function bad(status: number, body: any) {
  return NextResponse.json(body, { status });
}
function ok(body: any) { return NextResponse.json(body, { status: 200 }); }

type UUID = string;

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
    if (!isValidUUID(id)) return bad(400, { error: "Invalid booking id" });

    // load booking + property
    const { data: booking, error: e1 } = await supa
      .from("bookings")
      .select("id,property_id,source,status,start_date,end_date,room_id,room_type_id,guest_first_name,guest_last_name,guest_email,guest_phone,created_at,form_submitted_at,ical_uid")
      .eq("id", id)
      .single();

    if (e1 || !booking) return bad(404, { error: "Booking not found" });

    // edit doar pentru form-only
    if ((booking as any).source !== "form") {
      return bad(409, { error: "Only form-only bookings can be edited here" });
    }

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
    if (!isValidUUID(id)) return bad(400, { error: "Invalid booking id" });

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

    // load booking + property
    const { data: booking, error: e1 } = await supa
      .from("bookings")
      .select("id,property_id,source,start_date,end_date,room_id,room_type_id,status")
      .eq("id", id)
      .single();

    if (e1 || !booking) return bad(404, { error: "Booking not found" });
    if ((booking as any).source !== "form") {
      return bad(409, { error: "Only form-only bookings can be edited here" });
    }

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

    // dacă se setează room_id → verificăm conflicte de capacitate (overlap)
    if (room_id) {
      const { data: conflicts } = await supa
        .from("bookings")
        .select("id,start_date,end_date,start_time,end_time,status,source")
        .eq("property_id", propertyId)
        .eq("room_id", room_id)
        // Blochează doar rezervările active (confirmed); HOLD/pendente sunt ignorate
        .in("status", ["confirmed","checked_in"]) 
        .neq("id", id);

      const conflictHit = (conflicts || []).find((b: any) => overlap(start_date, end_date, b.start_date, b.end_date));
      if (conflictHit) {
        const src = (conflictHit.source || '').toString() || 'manual';
        const msg = `Target room is occupied by an active reservation (source: ${src}) from ${conflictHit.start_date} to ${conflictHit.end_date}.`;
        return bad(409, { error: msg, conflict: { id: conflictHit.id, source: conflictHit.source, start_date: conflictHit.start_date, end_date: conflictHit.end_date, start_time: conflictHit.start_time, end_time: conflictHit.end_time } });
      }
    }

    // build update payload (NU modificăm source/status/guest fields etc.)
    const patch: any = {
      start_date,
      end_date,
      // dacă proprietatea are types: putem seta type; altfel lăsăm null (sau existent)
      room_type_id: hasTypes ? (room_type_id ?? null) : null,
      room_id: room_id ?? null,
      updated_at: new Date().toISOString(),
    };
    // Dacă s-a lipit pe o cameră → confirmă rezervarea provenită din formular
    if (room_id) {
      patch.status = 'confirmed';
    }

    const { error: eUpd } = await supa.from("bookings").update(patch).eq("id", id);
    if (eUpd) return bad(500, { error: eUpd.message });

    // return updated snapshot
    const { data: updated } = await supa
      .from("bookings")
      .select("id,property_id,source,status,start_date,end_date,room_id,room_type_id")
      .eq("id", id)
      .single();

    return ok({ ok: true, booking: updated });
  } catch (e: any) {
    return bad(500, { error: "Server error", details: e?.message ?? String(e) });
  }
}
