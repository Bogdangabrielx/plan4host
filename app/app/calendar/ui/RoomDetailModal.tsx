// app/app/calendar/ui/RoomDetailModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Booking as BaseBooking } from "./DayModal";

type Room = { id: string; name: string; property_id: string };
type Property = { id: string; name: string; check_in_time: string | null; check_out_time: string | null };

type CheckDef = { id: string; label: string; sort_index: number; default_value: boolean; property_id: string };
type TextDef  = { id: string; label: string; placeholder: string | null; sort_index: number; property_id: string };

type Booking = BaseBooking & {
  guest_first_name?: string | null;
  guest_last_name?: string | null;
  // NU mai folosim guest_email/phone/address pe bookings – contactul stă în booking_contacts
};

type BookingContact = {
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
};

function toDateTime(dateStr: string, timeStr: string | null | undefined, fallbackTime: string) {
  const t = timeStr && /^\d\d:\d\d$/.test(timeStr) ? timeStr : fallbackTime;
  return new Date(`${dateStr}T${t}:00`);
}
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) { return aStart < bEnd && bStart < aEnd; }

export default function RoomDetailModal({
  dateStr,
  propertyId,
  room,
  forceNew = false,
  defaultStart,
  defaultEnd,
  onClose,
  onChanged,
}: {
  dateStr: string;
  propertyId: string;
  room: Room;
  forceNew?: boolean;
  defaultStart?: { date: string; time: string | null };
  defaultEnd?: { date: string; time: string | null };
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const supabase = createClient();

  // Data
  const [property, setProperty] = useState<Property | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [active, setActive] = useState<Booking | null>(null);

  // Reservation fields
  const [on, setOn] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  // Guest (name on bookings)
  const [guestFirst, setGuestFirst] = useState<string>("");
  const [guestLast, setGuestLast]   = useState<string>("");

  // Contact (booking_contacts)
  const [guestEmail, setGuestEmail]   = useState<string>("");
  const [guestPhone, setGuestPhone]   = useState<string>("");
  const [guestAddr, setGuestAddr]     = useState<string>("");
  const [guestCity, setGuestCity]     = useState<string>("");
  const [guestCountry, setGuestCountry] = useState<string>("");

  const [showGuest, setShowGuest] = useState<boolean>(false);

  // Room detail custom fields (as-is)
  const [checkDefs, setCheckDefs] = useState<CheckDef[]>([]);
  const [textDefs,  setTextDefs]  = useState<TextDef[]>([]);
  const [checkValues, setCheckValues] = useState<Record<string, boolean>>({});
  const [textValues,  setTextValues]  = useState<Record<string, string>>({});
  const [detailsDirty, setDetailsDirty] = useState(false);

  // UI status
  const [saving, setSaving] = useState<false | "creating" | "updating" | "times" | "extending" | "releasing">(false);
  const [status, setStatus] = useState<"Idle" | "Saving…" | "Saved" | "Error">("Idle");
  const [statusHint, setStatusHint] = useState<string>("");

  const CI = property?.check_in_time || "14:00";
  const CO = property?.check_out_time || "11:00";

  // ——— Helpers API contact ———
  async function fetchContact(bookingId: string): Promise<BookingContact | null> {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/contact`, { cache: "no-store" });
      if (!res.ok) return null;
      const j = await res.json();
      return (j?.contact ?? null) as BookingContact | null;
    } catch { return null; }
  }
  async function saveContact(bookingId: string, payload: Partial<BookingContact>) {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    (async () => {
      const [p1, p2, p3, p4] = await Promise.all([
        supabase
          .from("properties")
          .select("id,name,check_in_time,check_out_time")
          .eq("id", propertyId)
          .maybeSingle(),
        supabase
          .from("bookings")
          .select("id,property_id,room_id,start_date,end_date,start_time,end_time,status,guest_first_name,guest_last_name")
          .eq("property_id", propertyId)
          .eq("room_id", room.id)
          .neq("status", "cancelled")
          .order("start_date", { ascending: true }),
        supabase
          .from("room_detail_check_fields")
          .select("id,label,default_value,sort_index,property_id")
          .eq("property_id", propertyId)
          .order("sort_index", { ascending: true }),
        supabase
          .from("room_detail_text_fields")
          .select("id,label,placeholder,sort_index,property_id")
          .eq("property_id", propertyId)
          .order("sort_index", { ascending: true }),
      ]);

      const prop = (p1.error ? null : (p1.data ?? null)) as Property | null;
      setProperty(prop);

      const allBookings = (p2.error ? [] : (p2.data ?? [])) as Booking[];
      setBookings(allBookings);

      // Determine active booking if not forceNew
      let act: Booking | null = null;
      if (!forceNew) {
        for (const b of allBookings) {
          if (b.start_date <= dateStr && dateStr <= b.end_date) { act = b; break; }
        }
      }
      setActive(act);

      setCheckDefs(p3.error ? [] : ((p3.data ?? []) as CheckDef[]));
      setTextDefs(p4.error ? [] : ((p4.data ?? []) as TextDef[]));

      // Initialize start/end fields
      const _sDate = defaultStart?.date ?? (act ? act.start_date : dateStr);
      const _sTime = defaultStart?.time ?? (act ? (act.start_time || CI) : CI);
      const _eDate = defaultEnd?.date   ?? (act ? act.end_date : dateStr);
      const _eTime = defaultEnd?.time   ?? (act ? (act.end_time || CO) : CO);

      setStartDate(_sDate);
      setStartTime(_sTime || "");
      setEndDate(_eDate);
      setEndTime(_eTime || "");

      // Prefill names from active booking (bookings table)
      if (act) {
        setGuestFirst(act.guest_first_name ?? "");
        setGuestLast(act.guest_last_name ?? "");
        // Load contact (booking_contacts)
        const contact = await fetchContact(act.id);
        setGuestEmail(contact?.email ?? "");
        setGuestPhone(contact?.phone ?? "");
        setGuestAddr(contact?.address ?? "");
        setGuestCity(contact?.city ?? "");
        setGuestCountry(contact?.country ?? "");
      } else {
        // creating: reset contact
        setGuestEmail(""); setGuestPhone(""); setGuestAddr(""); setGuestCity(""); setGuestCountry("");
      }

      // UX: dacă nu avem guest name sau suntem pe creare, deschidem panoul Guest
      setShowGuest(!act || !((act?.guest_first_name ?? "").trim() || (act?.guest_last_name ?? "").trim()));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, room.id, dateStr, forceNew]);

  const others = useMemo(
    () => bookings.filter((b) => b.room_id === room.id),
    [bookings, room.id]
  );

  // --- Save flows ------------------------------------------------------------

  async function saveCreated() {
    if (!on) { setStatus("Error"); setStatusHint("Turn reservation ON first."); return; }
    setSaving("creating"); setStatus("Saving…"); setStatusHint("Creating…");

    const s = toDateTime(startDate, startTime, CI);
    const e = toDateTime(endDate, endTime, CO);
    if (!(s < e)) { setStatus("Error"); setStatusHint("End must be after Start."); setSaving(false); return; }

    for (const ob of others) {
      const os = toDateTime(ob.start_date, ob.start_time, CI);
      const oe = toDateTime(ob.end_date, ob.end_time, CO);
      if (overlaps(s, e, os, oe)) {
        setStatus("Error");
        setStatusHint(`Overlaps ${ob.start_date} ${ob.start_time ?? ""} → ${ob.end_date} ${ob.end_time ?? ""}`);
        setSaving(false);
        return;
      }
    }

    // Creăm booking-ul (numai coloanele care sigur există în `bookings`)
    const ins = await supabase.from("bookings").insert({
      property_id: propertyId,
      room_id: room.id,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime || null,
      end_time: endTime || null,
      status: "confirmed",
      guest_first_name: guestFirst || null,
      guest_last_name:  guestLast  || null,
    }).select("id").maybeSingle();

    if (ins.error || !ins.data) {
      setStatus("Error"); setStatusHint(ins.error?.message || "Failed to create.");
      setSaving(false); return;
    }
    const newId = ins.data.id as string;

    // Salvează contactul (booking_contacts)
    if (guestEmail || guestPhone || guestAddr || guestCity || guestCountry) {
      await saveContact(newId, {
        email: guestEmail || null,
        phone: guestPhone || null,
        address: guestAddr || null,
        city: guestCity || null,
        country: guestCountry || null,
      });
    }

    // Persist custom room detail fields dacă există
    const checkRows = Object.entries(checkValues).map(([check_id, value]) => ({ booking_id: newId, check_id, value }));
    const textRows  = Object.entries(textValues).map(([field_id, value]) => ({ booking_id: newId, field_id, value }));
    if (checkRows.length) await supabase.from("booking_check_values").upsert(checkRows);
    if (textRows.length)  await supabase.from("booking_text_values").upsert(textRows);

    setSaving(false); setStatus("Saved"); setStatusHint("Reservation created.");
    await onChanged(); onClose();
  }

  async function saveGuestAndDetails() {
    if (!active) { setStatus("Error"); setStatusHint("No active reservation."); return; }
    setSaving("updating"); setStatus("Saving…"); setStatusHint("Updating details…");

    // 1) Actualizează NUMELE în `bookings`
    const upd = await supabase.from("bookings").update({
      guest_first_name: guestFirst || null,
      guest_last_name:  guestLast  || null,
    }).eq("id", active.id);
    if (upd.error) {
      setStatus("Error"); setStatusHint(upd.error.message || "Failed to update guest name.");
      setSaving(false); return;
    }

    // 2) Upsert contact în `booking_contacts` prin API
    await saveContact(active.id, {
      email: guestEmail || null,
      phone: guestPhone || null,
      address: guestAddr || null,
      city: guestCity || null,
      country: guestCountry || null,
    });

    // 3) Custom detail fields
    const checkRows = Object.entries(checkValues).map(([check_id, value]) => ({ booking_id: active.id, check_id, value }));
    const textRows  = Object.entries(textValues).map(([field_id, value]) => ({ booking_id: active.id, field_id, value }));
    if (checkRows.length) await supabase.from("booking_check_values").upsert(checkRows);
    if (textRows.length)  await supabase.from("booking_text_values").upsert(textRows);

    setDetailsDirty(false);
    setSaving(false); setStatus("Saved"); setStatusHint("Details updated.");
    await onChanged(); onClose();
  }

  // NEW: Save times (can move earlier/later with full overlap check)
  async function saveTimes() {
    if (!active) { setStatus("Error"); setStatusHint("No active reservation."); return; }
    if (!on)     { setStatus("Error"); setStatusHint("Turn reservation ON to change times."); return; }
    setSaving("times"); setStatus("Saving…"); setStatusHint("Saving times…");

    const s = toDateTime(startDate, startTime, CI);
    const e = toDateTime(endDate, endTime, CO);
    if (!(s < e)) { setStatus("Error"); setStatusHint("End must be after Start."); setSaving(false); return; }

    for (const ob of others) {
      if (ob.id === active.id) continue;
      const os = toDateTime(ob.start_date, ob.start_time, CI);
      const oe = toDateTime(ob.end_date, ob.end_time, CO);
      if (overlaps(s, e, os, oe)) {
        setStatus("Error");
        setStatusHint(`Overlaps ${ob.start_date} ${ob.start_time ?? ""} → ${ob.end_date} ${ob.end_time ?? ""}`);
        setSaving(false);
        return;
      }
    }

    const upd = await supabase.from("bookings").update({
      start_date: startDate,
      start_time: startTime || null,
      end_date: endDate,
      end_time: endTime || null,
    }).eq("id", active.id);

    if (upd.error) { setStatus("Error"); setStatusHint(upd.error.message || "Failed to save times."); setSaving(false); return; }

    setSaving(false); setStatus("Saved"); setStatusHint("Times updated.");
    await onChanged(); onClose();
  }

  async function extendUntil() {
    if (!active) { setStatus("Error"); setStatusHint("No active reservation."); return; }
    if (!on)     { setStatus("Error"); setStatusHint("Use 'Confirm release' to delete."); return; }
    setSaving("extending"); setStatus("Saving…"); setStatusHint("Extending…");

    const oldEnd = toDateTime(active.end_date, active.end_time ?? CO, CO);
    const newEnd = toDateTime(endDate, endTime || CO, CO);
    if (!(newEnd > oldEnd)) { setStatus("Error"); setStatusHint("New end must be after current end."); setSaving(false); return; }

    for (const ob of bookings) {
      if (ob.id === active.id || ob.room_id !== room.id) continue;
      const os = toDateTime(ob.start_date, ob.start_time, CI);
      if (os > oldEnd && newEnd > os) {
        setStatus("Error"); setStatusHint(`Overlaps next starting ${ob.start_date} ${ob.start_time ?? ""}`);
        setSaving(false); return;
      }
    }

    const upd = await supabase.from("bookings").update({
      end_date: endDate, end_time: endTime || null,
    }).eq("id", active.id);
    if (upd.error) { setStatus("Error"); setStatusHint("Failed to extend."); setSaving(false); return; }

    setSaving(false); setStatus("Saved"); setStatusHint("Extended.");
    await onChanged(); onClose();
  }

  async function releaseBooking() {
    if (!active) { setStatus("Error"); setStatusHint("No active reservation."); return; }
    setSaving("releasing"); setStatus("Saving…"); setStatusHint("Releasing…");

    const del = await supabase.from("bookings").delete().eq("id", active.id);
    if (del.error) { setStatus("Error"); setStatusHint("Failed to release."); setSaving(false); return; }

    setSaving(false); setStatus("Saved"); setStatusHint("Released.");
    await onChanged(); onClose();
  }

  // --- UI --------------------------------------------------------------------

  const baseBtn: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    fontWeight: 900,
    cursor: "pointer",
  };
  const primaryBtn: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid var(--primary)",
    background: "var(--primary)",
    color: "#0c111b",
    fontWeight: 900,
    cursor: "pointer",
  };
  const dangerBtn: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid var(--danger)",
    background: "transparent",
    color: "var(--text)",
    fontWeight: 900,
    cursor: "pointer",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        background: "rgba(0,0,0,0.6)",
        display: "grid",
        placeItems: "center",
        fontFamily: '"Times New Roman", serif',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1000px, 94vw)",
          maxHeight: "88vh",
          overflow: "auto",
          background: "var(--panel)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        {/* Header + status */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <strong>{room.name} — {dateStr} — Reservation</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                background:
                  status === "Saving…" ? "var(--primary)" :
                  status === "Error"    ? "var(--danger)"  :
                  status === "Saved"    ? "var(--success, #22c55e)" : "#2a2f3a",
                color: status === "Saving…" ? "#0c111b" : "#fff",
                fontWeight: 700,
              }}
            >
              {status}
            </span>
            {statusHint && <small style={{ color: "var(--muted)" }}>{statusHint}</small>}
          </div>
        </div>

        {/* Reservation toggle + Dates */}
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <label style={{ fontWeight: 800, fontSize: 14, letterSpacing: 0.2 }}>Reservation</label>
            <button
              onClick={() => { setOn(v => !v); setStatus("Idle"); setStatusHint(""); }}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: on ? "var(--primary)" : "var(--card)",
                color: on ? "#0c111b" : "var(--text)",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              {on ? "ON" : "OFF"}
            </button>

            <button onClick={() => setShowGuest(v => !v)} style={baseBtn} title="Add guest details">
              {showGuest ? "Hide guest details" : "Guest details"}
            </button>
          </div>

          {/* Dates row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Start */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Start (date & time)</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate((e.target as HTMLInputElement).value)}
                  style={{
                    padding: "12px 12px",
                    background: "var(--card)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    flex: 1,
                  }}
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime((e.target as HTMLInputElement).value)}
                  style={{
                    padding: "12px 12px",
                    background: "var(--card)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    width: 160,
                  }}
                />
              </div>
            </div>

            {/* End */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>End (date & time)</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate((e.target as HTMLInputElement).value)}
                  style={{
                    padding: "12px 12px",
                    background: "var(--card)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    flex: 1,
                  }}
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime((e.target as HTMLInputElement).value)}
                  style={{
                    padding: "12px 12px",
                    background: "var(--card)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    width: 160,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Guest details (name + contact) */}
          {showGuest && (
            <div
              style={{
                marginTop: 6,
                padding: 12,
                border: "1px solid var(--border)",
                borderRadius: 12,
                background: "var(--card)",
                display: "grid",
                gap: 12,
              }}
            >
              <strong style={{ letterSpacing: 0.3 }}>Guest details</strong>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Names */}
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>First name</label>
                  <input
                    type="text"
                    value={guestFirst}
                    onChange={(e) => setGuestFirst((e.target as HTMLInputElement).value)}
                    placeholder="John"
                    style={{
                      padding: "12px 12px",
                      background: "var(--card)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Last name</label>
                  <input
                    type="text"
                    value={guestLast}
                    onChange={(e) => setGuestLast((e.target as HTMLInputElement).value)}
                    placeholder="Doe"
                    style={{
                      padding: "12px 12px",
                      background: "var(--card)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  />
                </div>

                {/* Contact */}
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Email</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail((e.target as HTMLInputElement).value)}
                    placeholder="john.doe@example.com"
                    style={{
                      padding: "12px 12px",
                      background: "var(--card)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Phone</label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone((e.target as HTMLInputElement).value)}
                    placeholder="+40 7xx xxx xxx"
                    style={{
                      padding: "12px 12px",
                      background: "var(--card)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  />
                </div>

                {/* Address */}
                <div style={{ gridColumn: "1 / -1", display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Address (street & number)</label>
                  <input
                    type="text"
                    value={guestAddr}
                    onChange={(e) => setGuestAddr((e.target as HTMLInputElement).value)}
                    placeholder="Street, No."
                    style={{
                      padding: "12px 12px",
                      background: "var(--card)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>City</label>
                  <input
                    type="text"
                    value={guestCity}
                    onChange={(e) => setGuestCity((e.target as HTMLInputElement).value)}
                    placeholder="City"
                    style={{
                      padding: "12px 12px",
                      background: "var(--card)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Country</label>
                  <input
                    type="text"
                    value={guestCountry}
                    onChange={(e) => setGuestCountry((e.target as HTMLInputElement).value)}
                    placeholder="Country"
                    style={{
                      padding: "12px 12px",
                      background: "var(--card)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  />
                </div>
              </div>

              <small style={{ color: "var(--muted)" }}>
                Name is stored on the booking; contact (email/phone/address/city/country) is stored securely on this reservation’s contact profile.
              </small>
            </div>
          )}

          {/* Custom detail fields (existing feature) */}
          {(checkDefs.length > 0 || textDefs.length > 0) && (
            <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
              <strong style={{ letterSpacing: 0.3 }}>Room details</strong>

              {checkDefs.length > 0 && (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                  {checkDefs.sort((a,b) => a.sort_index - b.sort_index).map(c => (
                    <li key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={!!checkValues[c.id]}
                        onChange={(e) => {
                          const el = e.target as HTMLInputElement;
                          setCheckValues(v => ({ ...v, [c.id]: el.checked }));
                          setDetailsDirty(true);
                        }}
                      />
                      <span style={{ fontWeight: 600 }}>{c.label}</span>
                    </li>
                  ))}
                </ul>
              )}

              {textDefs.length > 0 && (
                <div style={{ display: "grid", gap: 10 }}>
                  {textDefs.sort((a,b) => a.sort_index - b.sort_index).map(t => (
                    <div key={t.id} style={{ display: "grid", gap: 6 }}>
                      <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>{t.label}</label>
                      <input
                        type="text"
                        placeholder={t.placeholder ?? ""}
                        value={textValues[t.id] ?? ""}
                        onChange={(e) => {
                          const el = e.target as HTMLInputElement;
                          setTextValues(v => ({ ...v, [t.id]: el.value }));
                          setDetailsDirty(true);
                        }}
                        style={{
                          padding: "12px 12px",
                          background: "var(--card)",
                          color: "var(--text)",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
            {!active && (
              <button onClick={saveCreated} style={primaryBtn} disabled={saving !== false}>
                Confirm reservation
              </button>
            )}
            {active && (
              <>
                <button onClick={saveGuestAndDetails} style={baseBtn} disabled={saving !== false && saving !== "updating"}>
                  Save details
                </button>
                <button onClick={saveTimes} style={baseBtn} disabled={saving !== false && saving !== "times"}>
                  Save times
                </button>
                <button onClick={extendUntil} style={baseBtn} disabled={saving !== false && saving !== "extending"}>
                  Extend until
                </button>
                <button onClick={releaseBooking} style={dangerBtn} disabled={saving !== false && saving !== "releasing"}>
                  Confirm release
                </button>
              </>
            )}
            <button onClick={onClose} style={baseBtn}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}