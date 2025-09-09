// RoomDetailModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Booking as BaseBooking } from "./DayModal";

type Room = { id: string; name: string; property_id: string };
type Property = { id: string; name: string; check_in_time: string | null; check_out_time: string | null };

type CheckDef = { id: string; label: string; sort_index: number; default_value: boolean; property_id: string };
type TextDef  = { id: string; label: string; placeholder: string | null; sort_index: number; property_id: string };

type Booking = BaseBooking & {
  guest_first_name?: string | null;
  guest_last_name?: string | null;
};

type BookingContact = {
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
};

type BookingDoc = {
  id: string;
  doc_type: string | null;
  doc_series: string | null;
  doc_number: string | null;
  doc_nationality: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
  path: string;
  url: string | null; // signed URL
};

function toDateTime(dateStr: string, timeStr: string | null | undefined, fallbackTime: string) {
  const t = timeStr && /^\d\d:\d\d$/.test(timeStr) ? timeStr : fallbackTime;
  return new Date(`${dateStr}T${t}:00`);
}
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) { return aStart < bEnd && bStart < aEnd; }
function addDaysYMD(ymd: string, days: number) {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function normTime(t: string | null | undefined, fallback: string) {
  const v = (t ?? "").trim();
  return /^\d\d:\d\d$/.test(v) ? v : fallback;
}
function fmtDocType(t: string | null | undefined) {
  if (!t) return "—";
  return t === "id_card" ? "ID card" : t === "passport" ? "Passport" : t.replace(/_/g, " ");
}

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

  // Reservation toggle
  const [on, setOn] = useState<boolean>(true);

  // Reservation fields
  const [startDate, setStartDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  // Guest name (bookings)
  const [guestFirst, setGuestFirst] = useState<string>("");
  const [guestLast, setGuestLast]   = useState<string>("");

  // Contact (booking_contacts)
  const [guestEmail, setGuestEmail]     = useState<string>("");
  const [guestPhone, setGuestPhone]     = useState<string>("");
  const [guestAddr, setGuestAddr]       = useState<string>("");
  const [guestCity, setGuestCity]       = useState<string>("");
  const [guestCountry, setGuestCountry] = useState<string>("");

  const [showGuest, setShowGuest] = useState<boolean>(false);

  // Custom room detail fields
  const [checkDefs, setCheckDefs] = useState<CheckDef[]>([]);
  const [textDefs,  setTextDefs]  = useState<TextDef[]>([]);
  const [checkValues, setCheckValues] = useState<Record<string, boolean>>({});
  const [textValues,  setTextValues]  = useState<Record<string, string>>({});
  const [detailsDirty, setDetailsDirty] = useState(false); // only for custom fields

  // Documents (from guest check-in)
  const [docs, setDocs] = useState<BookingDoc[]>([]);

  // Dirty tracking (names + contacts + times)
  const initialGuestRef   = useRef<{ first: string; last: string }>({ first: "", last: "" });
  const initialContactRef = useRef<BookingContact>({ email: "", phone: "", address: "", city: "", country: "" });
  const initialTimesRef   = useRef<{ sd: string; st: string; ed: string; et: string }>({ sd: "", st: "", ed: "", et: "" });

  const [saving, setSaving] = useState<false | "creating" | "updating" | "times" | "extending" | "releasing">(false);
  const [status, setStatus] = useState<"Idle" | "Saving…" | "Saved" | "Error">("Idle");
  const [statusHint, setStatusHint] = useState<string>("");

  const CI = property?.check_in_time || "14:00";
  const CO = property?.check_out_time || "11:00";

  // ——— Booking contact API ———
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
    } catch { return false; }
  }

  async function fetchDocuments(bookingId: string) {
    try {
      const r = await fetch(`/api/bookings/${bookingId}/documents`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      setDocs(Array.isArray(j?.documents) ? j.documents : []);
    } catch {
      setDocs([]);
    }
  }

  // Alege documentul „principal”: ID card / Passport, altfel cel mai recent
  const primaryDoc: BookingDoc | null = useMemo(() => {
    if (!docs.length) return null;
    const pref = docs.find(d => d.doc_type === "id_card" || d.doc_type === "passport");
    if (pref) return pref;
    return [...docs].sort((a,b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0];
  }, [docs]);

  // Load everything (property, bookings, field definitions, existing values/defaults)
  useEffect(() => {
    (async () => {
      // p1: property, p2: bookings, p3: legacy check fields, p4: text fields, p5: NEW unified check defs
      const [p1, p2, p3, p4, p5] = await Promise.all([
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
        // NEW: unified checks table (optional, if present)
        supabase
          .from("room_detail_checks")
          .select("id,label,default_value,sort_index,property_id")
          .eq("property_id", propertyId)
          .order("sort_index", { ascending: true }),
      ]);

      const prop = (p1.error ? null : (p1.data ?? null)) as Property | null;
      setProperty(prop);

      const allBookings = (p2.error ? [] : (p2.data ?? [])) as Booking[];
      setBookings(allBookings);

      // Determine active booking if not creating
      let act: Booking | null = null;
      if (!forceNew) {
        for (const b of allBookings) {
          if (b.start_date <= dateStr && dateStr <= b.end_date) { act = b; break; }
        }
      }
      setActive(act);

      // Merge legacy check fields + NEW unified checks (dedupe by id; prefer NEW over legacy on conflicts)
      const legacyChecks = (p3.error ? [] : ((p3.data ?? []) as CheckDef[]));
      const unifiedChecks = (p5.error ? [] : ((p5.data ?? []) as CheckDef[]));
      const mergedChecksMap = new Map<string, CheckDef>();
      for (const c of [...unifiedChecks, ...legacyChecks]) {
        if (c && c.id && !mergedChecksMap.has(c.id)) mergedChecksMap.set(c.id, c);
      }
      const mergedChecks = Array.from(mergedChecksMap.values()).sort((a,b) => a.sort_index - b.sort_index);
      setCheckDefs(mergedChecks);

      const defsTexts  = (p4.error ? [] : ((p4.data ?? []) as TextDef[]));
      setTextDefs(defsTexts);

      // Init start/end
      const CIlocal = prop?.check_in_time || "14:00";
      const COlocal = prop?.check_out_time || "11:00";

      const _sDate = defaultStart?.date ?? (act ? act.start_date : dateStr);
      const _sTime = defaultStart?.time ?? (act ? (act.start_time || CIlocal) : CIlocal);

      // IMPORTANT: for create, default End = Start + 1 day
      const _eDate = defaultEnd?.date   ?? (act ? act.end_date : addDaysYMD(_sDate, 1));
      const _eTime = defaultEnd?.time   ?? (act ? (act.end_time || COlocal) : COlocal);

      setStartDate(_sDate);
      setStartTime(_sTime || "");
      setEndDate(_eDate);
      setEndTime(_eTime || "");

      // Names + contact (single contact fetch; reuse for initial refs)
      let contact: BookingContact | null = null;
      if (act) {
        setGuestFirst(act.guest_first_name ?? "");
        setGuestLast(act.guest_last_name ?? "");
        contact = await fetchContact(act.id);
        setGuestEmail(contact?.email ?? "");
        setGuestPhone(contact?.phone ?? "");
        setGuestAddr(contact?.address ?? "");
        setGuestCity(contact?.city ?? "");
        setGuestCountry(contact?.country ?? "");
        // Documents (include signed URL)
        await fetchDocuments(act.id);
      } else {
        setGuestFirst(""); setGuestLast("");
        setGuestEmail(""); setGuestPhone(""); setGuestAddr(""); setGuestCity(""); setGuestCountry("");
        setDocs([]);
      }

      // ---------- Room details: load saved values or defaults ----------
      const defaultCheckValues: Record<string, boolean> = Object.fromEntries(
        mergedChecks.map((d) => [d.id, !!d.default_value])
      );
      const defaultTextValues: Record<string, string> = Object.fromEntries(
        defsTexts.map((d) => [d.id, ""])
      );

      let initCheckValues = { ...defaultCheckValues };
      let initTextValues  = { ...defaultTextValues };

      if (act) {
        const [vc, vt] = await Promise.all([
          supabase
            .from("booking_check_values")
            .select("check_id,value")
            .eq("booking_id", act.id),
          supabase
            .from("booking_text_values")
            .select("field_id,value")
            .eq("booking_id", act.id),
        ]);

        if (!vc.error && Array.isArray(vc.data)) {
          for (const row of vc.data as Array<{ check_id: string; value: boolean | null }>) {
            if (row && row.check_id) initCheckValues[row.check_id] = !!row.value;
          }
        }
        if (!vt.error && Array.isArray(vt.data)) {
          for (const row of vt.data as Array<{ field_id: string; value: string | null }>) {
            if (row && row.field_id) initTextValues[row.field_id] = row.value ?? "";
          }
        }
      }
      setCheckValues(initCheckValues);
      setTextValues(initTextValues);
      // -----------------------------------------------------------------

      // Set initial refs for dirty tracking
      initialGuestRef.current = { first: act?.guest_first_name ?? "", last: act?.guest_last_name ?? "" };
      initialContactRef.current = {
        email:   contact?.email   ?? "",
        phone:   contact?.phone   ?? "",
        address: contact?.address ?? "",
        city:    contact?.city    ?? "",
        country: contact?.country ?? "",
      };
      initialTimesRef.current = {
        sd: act ? act.start_date : _sDate,
        st: act ? (act.start_time || CIlocal) : _sTime,
        ed: act ? act.end_date : _eDate,
        et: act ? (act.end_time || COlocal) : _eTime,
      };

      // Default ON; open guest panel if creating or no name
      setOn(true);
      setShowGuest(!act || !((act?.guest_first_name ?? "").trim() || (act?.guest_last_name ?? "").trim()));
      setDetailsDirty(false);
      setStatus("Idle"); setStatusHint("");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, room.id, dateStr, forceNew]);

  const others = useMemo(
    () => bookings.filter((b) => b.room_id === room.id),
    [bookings, room.id]
  );

  // Derived dirty flags
  const guestDirty =
    guestFirst !== initialGuestRef.current.first ||
    guestLast  !== initialGuestRef.current.last;

  const contactDirty =
    guestEmail   !== initialContactRef.current.email ||
    guestPhone   !== initialContactRef.current.phone ||
    guestAddr    !== initialContactRef.current.address ||
    guestCity    !== initialContactRef.current.city ||
    guestCountry !== initialContactRef.current.country;

  const timesDirty = !!active && (
    startDate !== initialTimesRef.current.sd ||
    normTime(startTime, CI) !== normTime(initialTimesRef.current.st, CI) ||
    endDate   !== initialTimesRef.current.ed ||
    normTime(endTime, CO)   !== normTime(initialTimesRef.current.et, CO)
  );

  const endDirty = !!active && (
    endDate !== initialTimesRef.current.ed ||
    normTime(endTime, CO) !== normTime(initialTimesRef.current.et, CO)
  );

  // For "Extend until" ensure real extension (newEnd > oldEnd)
  const canExtend = (() => {
    if (!active || !endDirty) return false;
    const oldEnd = toDateTime(initialTimesRef.current.ed, initialTimesRef.current.et, CO);
    const newEnd = toDateTime(endDate, endTime || CO, CO);
    return newEnd > oldEnd;
  })();

  const anyDetailsDirty = guestDirty || contactDirty || detailsDirty;

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

    if (guestEmail || guestPhone || guestAddr || guestCity || guestCountry) {
      await saveContact(newId, {
        email: guestEmail || null,
        phone: guestPhone || null,
        address: guestAddr || null,
        city: guestCity || null,
        country: guestCountry || null,
      });
    }

    // Custom fields (persist what’s on screen)
    const checkRows = Object.entries(checkValues).map(([check_id, value]) => ({ booking_id: newId, check_id, value }));
    const textRows  = Object.entries(textValues).map(([field_id, value]) => ({ booking_id: newId, field_id, value }));
    if (checkRows.length) await supabase.from("booking_check_values").upsert(checkRows);
    if (textRows.length)  await supabase.from("booking_text_values").upsert(textRows);

    setSaving(false); setStatus("Saved"); setStatusHint("Reservation created.");
    await onChanged(); onClose();
  }

  async function saveDetails() {
    if (!active) { setStatus("Error"); setStatusHint("No active reservation."); return; }
    if (!anyDetailsDirty) return;
    setSaving("updating"); setStatus("Saving…"); setStatusHint("Updating details…");

    if (guestDirty) {
      const upd = await supabase.from("bookings").update({
        guest_first_name: guestFirst || null,
        guest_last_name:  guestLast  || null,
      }).eq("id", active.id);
      if (upd.error) {
        setStatus("Error"); setStatusHint(upd.error.message || "Failed to update guest name.");
        setSaving(false); return;
      }
    }

    if (contactDirty) {
      await saveContact(active.id, {
        email: guestEmail || null,
        phone: guestPhone || null,
        address: guestAddr || null,
        city: guestCity || null,
        country: guestCountry || null,
      });
    }

    if (detailsDirty) {
      const checkRows = Object.entries(checkValues).map(([check_id, value]) => ({ booking_id: active.id, check_id, value }));
      const textRows  = Object.entries(textValues).map(([field_id, value]) => ({ booking_id: active.id, field_id, value }));
      if (checkRows.length) await supabase.from("booking_check_values").upsert(checkRows);
      if (textRows.length)  await supabase.from("booking_text_values").upsert(textRows);
      setDetailsDirty(false);
    }

    setSaving(false); setStatus("Saved"); setStatusHint("Details updated.");
    await onChanged(); onClose();
  }

  // Save dates & times (start OR end changed)
  async function saveTimes() {
    if (!active) { setStatus("Error"); setStatusHint("No active reservation."); return; }
    if (!on)     { setStatus("Error"); setStatusHint("Turn reservation ON to change times."); return; }
    if (!timesDirty) return;

    setSaving("times"); setStatus("Saving…"); setStatusHint("Saving dates & times…");

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

    setSaving(false); setStatus("Saved"); setStatusHint("Dates & times updated.");
    await onChanged(); onClose();
  }

  async function extendUntil() {
    if (!active) { setStatus("Error"); setStatusHint("No active reservation."); return; }
    if (!on)     { setStatus("Error"); setStatusHint("Use 'Confirm release' when OFF."); return; }
    if (!canExtend) return;

    setSaving("extending"); setStatus("Saving…"); setStatusHint("Extending…");

    const res = await fetch(`/api/bookings/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ end_date: endDate, end_time: endTime || null }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      setStatus("Error"); setStatusHint(txt || "Failed to extend.");
      setSaving(false); return;
    }

    setSaving(false); setStatus("Saved"); setStatusHint("Extended.");
    await onChanged(); onClose();
  }

  async function releaseBooking() {
    if (!active) { setStatus("Error"); setStatusHint("No active reservation."); return; }
    setSaving("releasing"); setStatus("Saving…"); setStatusHint("Releasing…");

    try {
      const res = await fetch(`/api/bookings/${active.id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.error) throw new Error(j?.error || `HTTP ${res.status}`);
      setSaving(false); setStatus("Saved"); setStatusHint("Released.");
      await onChanged(); onClose();
    } catch (e: any) {
      setStatus("Error");
      setStatusHint(e?.message || "Failed to release.");
      setSaving(false);
    }
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

          {/* Guest details (name + contact + document from check-in) */}
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

              {/* Document (read-only, from check-in) */}
              <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                <strong style={{ letterSpacing: 0.3 }}>Guest ID document</strong>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {/* Type + link */}
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Document type</label>
                    <input
                      type="text"
                      disabled
                      value={fmtDocType(primaryDoc?.doc_type)}
                      placeholder="—"
                      style={{
                        padding: "12px 12px",
                        background: "var(--card)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        opacity: 0.9,
                      }}
                    />
                    {primaryDoc?.url ? (
                      <a
                        href={primaryDoc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: "underline", fontWeight: 800 }}
                      >
                        View file
                      </a>
                    ) : (
                      <small style={{ color: "var(--muted)" }}>No file available</small>
                    )}
                  </div>

                  {/* Number */}
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Number</label>
                    <input
                      type="text"
                      disabled
                      value={primaryDoc?.doc_number || ""}
                      placeholder="—"
                      style={{
                        padding: "12px 12px",
                        background: "var(--card)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        opacity: 0.9,
                      }}
                    />
                  </div>

                  {/* Series (if any) */}
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Series</label>
                    <input
                      type="text"
                      disabled
                      value={primaryDoc?.doc_series || ""}
                      placeholder="—"
                      style={{
                        padding: "12px 12px",
                        background: "var(--card)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        opacity: 0.9,
                      }}
                    />
                  </div>

                  {/* Nationality (for passports) */}
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Nationality</label>
                    <input
                      type="text"
                      disabled
                      value={primaryDoc?.doc_nationality || ""}
                      placeholder="—"
                      style={{
                        padding: "12px 12px",
                        background: "var(--card)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        opacity: 0.9,
                      }}
                    />
                  </div>
                </div>

                <small style={{ color: "var(--muted)" }}>
                  Document data is read-only and comes from the guest’s online check-in.
                </small>
              </div>

              <small style={{ color: "var(--muted)" }}>
                Name is stored on the booking; contact (email/phone/address/city/country) is stored on the reservation’s contact profile.
              </small>
            </div>
          )}

          {/* Custom detail fields */}
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
                {anyDetailsDirty && (
                  <button onClick={saveDetails} style={baseBtn} disabled={saving !== false && saving !== "updating"}>
                    Save details
                  </button>
                )}

                {on && timesDirty && (
                  <button onClick={saveTimes} style={baseBtn} disabled={saving !== false && saving !== "times"} title="Save updated dates & times">
                    Save dates & times
                  </button>
                )}

                {on && canExtend && (
                  <button onClick={extendUntil} style={baseBtn} disabled={saving !== false && saving !== "extending"}>
                    Extend until
                  </button>
                )}

                {!on && (
                  <button onClick={releaseBooking} style={dangerBtn} disabled={saving !== false && saving !== "releasing"}>
                    Confirm release
                  </button>
                )}
              </>
            )}

            <button onClick={onClose} style={baseBtn}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}