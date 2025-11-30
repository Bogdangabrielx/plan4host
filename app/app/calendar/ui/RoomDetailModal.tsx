// app/app/calendar/ui/RoomDetailModal.tsx
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
  guest_companions?: any[] | null;
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

/* ───── Helpers ───── */

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

/* ───── Component ───── */

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
  const PID = room.property_id || propertyId;

  // Responsive
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 720 : false
  );
  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 720);
    onR();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // Data
  const [property, setProperty] = useState<Property | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [active, setActive] = useState<Booking | null>(null);

  // Reservation toggle (default OFF for new)
  const [on, setOn] = useState<boolean>(false);
  const userTouchedToggleRef = useRef(false);

  // Times
  const [startDate, setStartDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  // Guest name
  const [guestFirst, setGuestFirst] = useState<string>("");
  const [guestLast, setGuestLast]   = useState<string>("");

  // Contact
  const [guestEmail, setGuestEmail]     = useState<string>("");
  const [guestPhone, setGuestPhone]     = useState<string>("");
  const [guestAddr, setGuestAddr]       = useState<string>("");
  const [guestCity, setGuestCity]       = useState<string>("");
  const [guestCountry, setGuestCountry] = useState<string>("");
  // Companions (read-only from booking)
  const [companions, setCompanions] = useState<any[]>([]);
  const [companionsOpen, setCompanionsOpen] = useState<boolean>(false);

  const [showGuest, setShowGuest] = useState<boolean>(false);
  // Auto-collapse Guest Details when Reservation is OFF
  useEffect(() => {
    if (!on) setShowGuest(false);
  }, [on]);

  // Custom fields
  const [checkDefs, setCheckDefs] = useState<CheckDef[]>([]);
  const [textDefs,  setTextDefs]  = useState<TextDef[]>([]);
  const [checkValues, setCheckValues] = useState<Record<string, boolean>>({});
  const [textValues,  setTextValues]  = useState<Record<string, string>>({});
  const [detailsDirty, setDetailsDirty] = useState(false);

  // Docs
  const [docs, setDocs] = useState<BookingDoc[]>([]);
  const [releaseConfirmOpen, setReleaseConfirmOpen] = useState<boolean>(false);

  // Dirty tracking
  const initialGuestRef   = useRef<{ first: string; last: string }>({ first: "", last: "" });
  const initialContactRef = useRef<BookingContact>({ email: "", phone: "", address: "", city: "", country: "" });
  const initialTimesRef   = useRef<{ sd: string; st: string; ed: string; et: string }>({ sd: "", st: "", ed: "", et: "" });

  const [saving, setSaving] = useState<false | "creating" | "updating" | "times" | "extending" | "releasing">(false);
  const [status, setStatus] = useState<"Idle" | "Saving..." | "Saved" | "Error">("Idle");
  const [statusHint, setStatusHint] = useState<string>("");

  const CI = property?.check_in_time || "14:00";
  const CO = property?.check_out_time || "11:00";

  // API: contact
  async function fetchContact(bookingId: string): Promise<BookingContact | null> {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/contact`, { cache: "no-store" });
      if (!res.ok) return null;
      const j = await res.json();
      return (j?.contact ?? null) as BookingContact | null;
    } catch {
      return null;
    }
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

  // API: documents
  async function fetchDocuments(bookingId: string) {
    try {
      const r = await fetch(`/api/bookings/${bookingId}/documents`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      setDocs(Array.isArray(j?.documents) ? j.documents : []);
    } catch {
      setDocs([]);
    }
  }

  const primaryDoc: BookingDoc | null = useMemo(() => {
    if (!docs.length) return null;
    const pref = docs.find((d) => d.doc_type === "id_card" || d.doc_type === "passport");
    if (pref) return pref;
    return [...docs].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0];
  }, [docs]);
  const signatureDoc: BookingDoc | null = useMemo(() => {
    const byType = docs.find((d) => (d.doc_type || '').toLowerCase() === 'signature');
    if (byType) return byType;
    // fallback: if backend stored null type for signature, pick an image doc different than the primary ID doc
    const primaryId = primaryDoc?.id || null;
    const img = docs.find((d) => (!d.doc_type || d.doc_type === null) && ((d.mime_type || '').startsWith('image/')) && (String(d.id) !== String(primaryId)));
    return img || null;
  }, [docs, primaryDoc?.id]);

  // Load everything
  useEffect(() => {
    (async () => {
      const [p1, p2, pText, pChecks] = await Promise.all([
        supabase
          .from("properties")
          .select("id,name,check_in_time,check_out_time")
          .eq("id", PID)
          .maybeSingle(),
        supabase
          .from("bookings")
          .select("id,property_id,room_id,start_date,end_date,start_time,end_time,status,guest_first_name,guest_last_name,guest_companions")
          .eq("property_id", PID)
          .eq("room_id", room.id)
          .neq("status", "cancelled")
          .order("start_date", { ascending: true }),
        supabase
          .from("room_detail_text_fields")
          .select("id,label,placeholder,sort_index,property_id")
          .eq("property_id", PID)
          .order("sort_index", { ascending: true }),
        supabase
          .from("room_detail_checks")
          .select("id,label,default_value,sort_index,property_id")
          .eq("property_id", PID)
          .order("sort_index", { ascending: true }),
      ]);

      const prop = (p1.error ? null : (p1.data ?? null)) as Property | null;
      setProperty(prop);

      const allBookings = (p2.error ? [] : (p2.data ?? [])) as Booking[];
      setBookings(allBookings);

      // Active booking (only if not forced create)
      let act: Booking | null = null;
      if (!forceNew) {
        for (const b of allBookings) {
          if (b.start_date <= dateStr && dateStr <= b.end_date) { act = b; break; }
        }
      }
      setActive(act);

      const checksSorted = (pChecks.error ? [] : ((pChecks.data ?? []) as CheckDef[])).sort((a,b)=>a.sort_index-b.sort_index);
      const textsSorted  = (pText.error ? [] : ((pText.data ?? [])  as TextDef[])).sort((a,b)=>a.sort_index-b.sort_index);
      setCheckDefs(checksSorted);
      setTextDefs(textsSorted);

      // Init times
      const CIlocal = prop?.check_in_time || "14:00";
      const COlocal = prop?.check_out_time || "11:00";

      const _sDate = defaultStart?.date ?? (act ? act.start_date : dateStr);
      const _sTime = defaultStart?.time ?? (act ? (act.start_time || CIlocal) : CIlocal);
      const _eDate = defaultEnd?.date   ?? (act ? act.end_date : addDaysYMD(_sDate, 1));
      const _eTime = defaultEnd?.time   ?? (act ? (act.end_time || COlocal) : COlocal);

      setStartDate(_sDate);
      setStartTime(_sTime || "");
      setEndDate(_eDate);
      setEndTime(_eTime || "");

      // Names + contact + docs
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
        await fetchDocuments(act.id);
        const gc = (act as any).guest_companions;
        setCompanions(Array.isArray(gc) ? gc : []);
      } else {
        setGuestFirst(""); setGuestLast("");
        setGuestEmail(""); setGuestPhone(""); setGuestAddr(""); setGuestCity(""); setGuestCountry("");
        setDocs([]);
        setCompanions([]);
      }

      // Saved values / defaults
      const defaultCheckValues: Record<string, boolean> = Object.fromEntries(checksSorted.map(d => [d.id, !!d.default_value]));
      const defaultTextValues:  Record<string, string>  = Object.fromEntries(textsSorted.map(d => [d.id, ""]));

      let initCheckValues = { ...defaultCheckValues };
      let initTextValues  = { ...defaultTextValues };

      if (act) {
        const [vc, vt] = await Promise.all([
          supabase.from("booking_check_values").select("check_id,value").eq("booking_id", act.id),
          supabase.from("booking_text_values").select("field_id,value").eq("booking_id", act.id),
        ]);

        if (!vc.error && Array.isArray(vc.data)) {
          for (const row of vc.data as Array<{ check_id: string; value: boolean | null }>) {
            if (row?.check_id) initCheckValues[row.check_id] = !!row.value;
          }
        }
        if (!vt.error && Array.isArray(vt.data)) {
          for (const row of vt.data as Array<{ field_id: string; value: string | null }>) {
            if (row?.field_id) initTextValues[row.field_id] = row.value ?? "";
          }
        }
      }
      setCheckValues(initCheckValues);
      setTextValues(initTextValues);

      // Dirty baselines
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

      // Toggle
      if (!userTouchedToggleRef.current) setOn(!!act);
      setShowGuest(false);
      setDetailsDirty(false);
      setStatus("Idle"); setStatusHint("");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PID, room.id, dateStr, forceNew]);

  // Others in same room
  const others = useMemo(() => bookings.filter((b) => b.room_id === room.id), [bookings, room.id]);

  // Dirty flags
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

  const canExtend = (() => {
    if (!active || !endDirty) return false;
    const oldEnd = toDateTime(initialTimesRef.current.ed, initialTimesRef.current.et, CO);
    const newEnd = toDateTime(endDate, endTime || CO, CO);
    return newEnd > oldEnd;
  })();

  const anyDetailsDirty = guestDirty || contactDirty || detailsDirty;

  /* ───── Save flows ───── */

  async function saveCreated() {
    if (!on) { setStatus("Error"); setStatusHint("Turn reservation ON first."); return; }
    setSaving("creating"); setStatus("Saving..."); setStatusHint("Creating…");

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
      property_id: PID,
      room_id: room.id,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime || null,
      end_time: endTime || null,
      status: "confirmed",
      source: "manual",
      guest_first_name: guestFirst || null,
      guest_last_name:  guestLast  || null,
    }).select("id").maybeSingle();

    if (ins.error || !ins.data) {
      const msg = (ins.error as any)?.message || '';
      const isOverlap = /bookings_no_overlap|exclusion|23P01/i.test(msg || '');
      setStatus("Error");
      setStatusHint(
        isOverlap
          ? `Overlaps an existing confirmed reservation on Room ${room.name}.`
          : (msg || "Failed to create.")
      );
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

    const checkRows = Object.entries(checkValues).map(([check_id, value]) => ({ booking_id: newId, check_id, value }));
    const textRows  = Object.entries(textValues).map(([field_id, value]) => ({ booking_id: newId, field_id, value }));
    if (checkRows.length) await supabase.from("booking_check_values").upsert(checkRows);
    if (textRows.length)  await supabase.from("booking_text_values").upsert(textRows);

    setSaving(false); setStatus("Saved"); setStatusHint("Reservation created.");
    try {
      await fetch('/api/push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: PID, title: 'New reservation', body: `From ${startDate} to ${endDate}` })
      });
    } catch { /* ignore push errors */ }
    await onChanged(); onClose();
  }

  async function saveDetails() {
    if (!active) { setStatus("Error"); setStatusHint("No active reservation."); return; }
    if (!anyDetailsDirty) return;
    setSaving("updating"); setStatus("Saving..."); setStatusHint("Updating details…");

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

  async function saveTimes() {
    if (!active) { setStatus("Error"); setStatusHint("No active reservation."); return; }
    if (!on)     { setStatus("Error"); setStatusHint("Turn reservation ON to change times."); return; }
    if (!timesDirty) return;

    setSaving("times"); setStatus("Saving..."); setStatusHint("Saving dates & times…");

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

    if (upd.error) {
      const msg = (upd.error as any)?.message || '';
      const isOverlap = /bookings_no_overlap|exclusion|23P01/i.test(msg || '');
      setStatus("Error");
      setStatusHint(
        isOverlap
          ? `Overlaps an existing confirmed reservation on Room ${room.name}.`
          : (msg || "Failed to save times.")
      );
      setSaving(false); return;
    }

    // Mirror dates to linked form, if any
    try {
      const { data: linkRow } = await supabase
        .from('bookings')
        .select('form_id')
        .eq('id', active.id)
        .maybeSingle();
      const formId = (linkRow as any)?.form_id ? String((linkRow as any).form_id) : null;
      if (formId) {
        await supabase
          .from('form_bookings')
          .update({ start_date: startDate, end_date: endDate })
          .eq('id', formId);
      }
    } catch { /* best-effort mirror */ }

    setSaving(false); setStatus("Saved"); setStatusHint("Dates & times updated.");
    await onChanged(); onClose();
  }

  async function extendUntil() {
    if (!active) { setStatus("Error"); setStatusHint("No active reservation."); return; }
    if (!on)     { setStatus("Error"); setStatusHint("Use 'Confirm release' when OFF."); return; }
    if (!canExtend) return;

    setSaving("extending"); setStatus("Saving..."); setStatusHint("Extending…");

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
    setSaving("releasing"); setStatus("Saving..."); setStatusHint("Releasing…");

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

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* ───── UI ───── */

  const baseBtn: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    fontWeight: 900,
    cursor: "pointer",
  };
  const baseBtnGuest: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--primary)",
    color: "#0c111b",
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
        fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        paddingTop: "calc(var(--safe-top) + 12px)",
        paddingBottom: "calc(var(--safe-bottom) + 12px)",
        paddingLeft: "12px",
        paddingRight: "12px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1000px, 100%)",
          maxHeight: "calc(100dvh - (var(--safe-top) + var(--safe-bottom) + 24px + 24px))",
          overflow: "auto",
          background: "var(--panel)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        {/* ── Sticky TOP painter (maschează spațiul de deasupra headerului la scroll) ── */}
        <div
          aria-hidden
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            height: 0,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              height: 14,                     // grosimea „painter”-ului
              transform: "translateY(-14px)", // urcă peste marginea superioară
              background: "var(--panel)",     // aceeași culoare ca fundalul modalului
            }}
          />
        </div>
         
          {/* Header + status (flushed to container top, no gap while scrolling) */}
          <div
          style={{
         position: "sticky",
          // lipim headerul de muchia containerului care are padding: 16
          top: -16,
          marginTop: -16,
            paddingTop: 16,
           zIndex: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
           gap: 8,
            flexWrap: "wrap",
            background: "var(--panel)",
            paddingBottom: 8,
            marginBottom: 12,
            // înlocuiește borderBottom pentru o linie curată fără artefacte
            boxShadow: "0 1px 0 var(--border)",
           }}
            > 
           <strong>{room.name} — {dateStr} — Reservation</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                background:
                  status === "Idle"      ? "transparent"      :
                  status === "Saving..." ? "var(--primary)"   :
                  status === "Error"     ? "var(--danger)"    :
                  status === "Saved"     ? "var(--success, #22c55e)" : "#2a2f3a",
                color:
                  status === "Idle"      ? "transparent"      :
                  status === "Saving..." ? "#0c111b"          : "#fff",
                border: status === "Idle" ? "1px solid transparent" : undefined,
                fontWeight: 700,
              }}
            >
              {status}
            </span>
            {statusHint && <small style={{ color: "var(--muted)" }}>{statusHint}</small>}
          </div>
        </div>

        {/* Reservation toggle + dates */}
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <label style={{ fontWeight: 800, fontSize: 14, letterSpacing: 0.2 }}>Reservation</label>
            <button
              onClick={() => { userTouchedToggleRef.current = true; setOn(v => !v); setStatus("Idle"); setStatusHint(""); }}
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
          </div>

          {/* Dates row */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
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
                    fontFamily: "inherit",
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
                    fontFamily: "inherit",
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
                    fontFamily: "inherit",
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
                    fontFamily: "inherit",
                    width: 160,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Guest details (collapsible card) */}
          {on && (
            <div
              className="sb-card"
              style={{
                marginTop: 6,
                padding: 12,
                border: "1px solid var(--primary)",
                borderRadius: 10,
                background: "var(--panel)",
                display: "grid",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setShowGuest(v => !v)}
                aria-expanded={showGuest}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Guest details</span>
                <span aria-hidden style={{ color: "var(--muted)", fontWeight: 800 }}>
                  {showGuest ? "▾" : "▸"}
                </span>
              </button>

              {showGuest && (
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: 8,
                    background: "var(--card)",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "auto 1fr" : "auto 1fr",
                      rowGap: 8,
                      columnGap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>First name</div>
                    <input
                      type="text"
                      value={guestFirst}
                      onChange={(e) => setGuestFirst((e.target as HTMLInputElement).value)}
                      placeholder="John"
                      style={{
                        padding: 0,
                        background: "transparent",
                        color: "var(--text)",
                        border: "none",
                        borderBottom: "1px dashed var(--border)",
                        fontSize: 14,
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />

                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Last name</div>
                    <input
                      type="text"
                      value={guestLast}
                      onChange={(e) => setGuestLast((e.target as HTMLInputElement).value)}
                      placeholder="Doe"
                      style={{
                        padding: 0,
                        background: "transparent",
                        color: "var(--text)",
                        border: "none",
                        borderBottom: "1px dashed var(--border)",
                        fontSize: 14,
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />

                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Email</div>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail((e.target as HTMLInputElement).value)}
                      placeholder="john.doe@example.com"
                      style={{
                        padding: 0,
                        background: "transparent",
                        color: "var(--text)",
                        border: "none",
                        borderBottom: "1px dashed var(--border)",
                        fontSize: 14,
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />

                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Phone</div>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone((e.target as HTMLInputElement).value)}
                      placeholder="+40 7xx xxx xxx"
                      style={{
                        padding: 0,
                        background: "transparent",
                        color: "var(--text)",
                        border: "none",
                        borderBottom: "1px dashed var(--border)",
                        fontSize: 14,
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />

                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Address</div>
                    <input
                      type="text"
                      value={guestAddr}
                      onChange={(e) => setGuestAddr((e.target as HTMLInputElement).value)}
                      placeholder="Street, No."
                      style={{
                        padding: 0,
                        background: "transparent",
                        color: "var(--text)",
                        border: "none",
                        borderBottom: "1px dashed var(--border)",
                        fontSize: 14,
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />

                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>City</div>
                    <input
                      type="text"
                      value={guestCity}
                      onChange={(e) => setGuestCity((e.target as HTMLInputElement).value)}
                      placeholder="City"
                      style={{
                        padding: 0,
                        background: "transparent",
                        color: "var(--text)",
                        border: "none",
                        borderBottom: "1px dashed var(--border)",
                        fontSize: 14,
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />

                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Country</div>
                    <input
                      type="text"
                      value={guestCountry}
                      onChange={(e) => setGuestCountry((e.target as HTMLInputElement).value)}
                      placeholder="Country"
                      style={{
                        padding: 0,
                        background: "transparent",
                        color: "var(--text)",
                        border: "none",
                        borderBottom: "1px dashed var(--border)",
                        fontSize: 14,
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Document (read-only, from check-in) */}
                  <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                    <strong style={{ letterSpacing: 0.3 }}>Guest ID document</strong>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "auto 1fr" : "auto 1fr",
                        rowGap: 6,
                        columnGap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Document type</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {fmtDocType(primaryDoc?.doc_type) || "—"}
                      </div>

                      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Number</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {primaryDoc?.doc_number || "—"}
                      </div>

                      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Series</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {primaryDoc?.doc_series || "—"}
                      </div>

                      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Nationality</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {primaryDoc?.doc_nationality || "—"}
                      </div>

                      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>File</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {primaryDoc?.url ? (
                          <a
                            href={primaryDoc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "underline" }}
                          >
                            View document
                          </a>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>No file available</span>
                        )}
                      </div>
                    </div>

                    {/* Inline previews: ID image (if image) and Signature side by side */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginTop: 6 }}>
                      <div style={{ display: 'grid', gap: 6 }}>
                        <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>ID preview</label>
                        {primaryDoc?.url && (primaryDoc?.mime_type || '').startsWith('image/') ? (
                          <img src={primaryDoc.url} alt="ID document" style={{ width: 160, height: 110, objectFit: 'contain', objectPosition: 'center', borderRadius: 8, border: '1px solid var(--border)', background: '#fff' }} />
                        ) : (
                          <small style={{ color: 'var(--muted)' }}>No image preview</small>
                        )}
                      </div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>Signature</label>
                        {signatureDoc?.url ? (
                          <img src={signatureDoc.url} alt="Signature" style={{ width: 160, height: 110, objectFit: 'contain', objectPosition: 'center', borderRadius: 8, border: '1px solid var(--border)', background: '#fff' }} />
                        ) : (
                          <small style={{ color: 'var(--muted)' }}>No signature provided</small>
                        )}
                      </div>
                    </div>

                    <small style={{ color: "var(--muted)" }}>
                      Document data is read-only and comes from the guest’s online check-in.
                    </small>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Companions (collapsible, read-only) */}
          {companions.length > 0 && (
            <div
              className="sb-card"
              style={{
                padding: 12,
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "var(--panel)",
                display: "grid",
                gap: 10,
                marginTop: 6,
              }}
            >
              <button
                type="button"
                onClick={() => setCompanionsOpen(v => !v)}
                aria-expanded={companionsOpen}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Companions</span>
                <span aria-hidden style={{ color: "var(--muted)", fontWeight: 800 }}>
                  {companionsOpen ? "▾" : "▸"}
                </span>
              </button>
              {companionsOpen && (
                <div style={{ display: "grid", gap: 8 }}>
                  {companions.map((c, idx) => {
                    const name =
                      [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || `Guest ${idx + 2}`;
                    return (
                      <div
                        key={idx}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          padding: 8,
                          display: "grid",
                          gap: 4,
                          background: "var(--card)",
                        }}
                      >
                        <div style={{ fontWeight: 800 }}>{name}</div>
                        {c.birth_date && (
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>
                            Birth date:{" "}
                            <span style={{ color: "var(--text)" }}>{c.birth_date}</span>
                          </div>
                        )}
                        {(c.citizenship || c.residence_country) && (
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>
                            {c.citizenship && (
                              <>
                                Citizenship:{" "}
                                <span style={{ color: "var(--text)" }}>{c.citizenship}</span>
                              </>
                            )}
                            {c.citizenship && c.residence_country && <span> • </span>}
                            {c.residence_country && (
                              <>
                                Residence:{" "}
                                <span style={{ color: "var(--text)" }}>
                                  {c.residence_country}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                        {c.is_minor ? (
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>
                            Minor guest
                            {c.guardian_name && (
                              <>
                                {" "}
                                — Guardian:{" "}
                                <span style={{ color: "var(--text)" }}>
                                  {c.guardian_name}
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          (c.doc_type || c.doc_number) && (
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>
                              {c.doc_type === "id_card" && "ID card"}
                              {c.doc_type === "passport" && "Passport"}
                              {!c.doc_type ||
                              (c.doc_type !== "id_card" && c.doc_type !== "passport")
                                ? "Document"
                                : ""}
                              {c.doc_series && (
                                <>
                                  {" "}
                                  series{" "}
                                  <span style={{ color: "var(--text)" }}>
                                    {c.doc_series}
                                  </span>
                                </>
                              )}
                              {c.doc_number && (
                                <>
                                  {c.doc_series ? " • number " : " number "}
                                  <span style={{ color: "var(--text)" }}>
                                    {c.doc_number}
                                  </span>
                                </>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Custom detail fields */}
          {(checkDefs.length > 0 || textDefs.length > 0) && (
            <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
              <strong style={{ letterSpacing: 0.3 }}>Room details</strong>

              {checkDefs.length > 0 && (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                  {checkDefs.map(c => (
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
                  {textDefs.map(t => (
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
            {!active && on && (
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

                {/* Extend until — removed from UI by request */}

                {!on && active && (
                  <button onClick={() => setReleaseConfirmOpen(true)} style={dangerBtn} disabled={saving !== false && saving !== "releasing"}>
                    Confirm release
                  </button>
                )}
              </>
            )}

            <button onClick={onClose} style={baseBtn}>Close</button>
          </div>
        </div>
      </div>
      {releaseConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e)=>{ e.stopPropagation(); setReleaseConfirmOpen(false); }}
          style={{ position:'fixed', inset:0, zIndex: 260, background:'rgba(0,0,0,0.55)', display:'grid', placeItems:'center', padding:12 }}
        >
          <div
            onClick={(e)=>e.stopPropagation()}
            className="sb-card"
            style={{ width:'min(520px,100%)', background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:16, display:'grid', gap:10 }}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <strong>Cancel reservation</strong>
              <button className="sb-btn" onClick={()=>setReleaseConfirmOpen(false)}>✕</button>
            </div>
            <div style={{ color:'var(--muted)' }}>
              You are about to cancel this reservation. This will free the room for the selected dates. This action cannot be undone.
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="sb-btn" onClick={()=>setReleaseConfirmOpen(false)} disabled={saving !== false}>Cancel</button>
              <button
                className="sb-btn sb-btn--primary"
                onClick={async ()=>{ setReleaseConfirmOpen(false); await releaseBooking(); }}
                disabled={saving !== false}
                style={{ background:'var(--danger)', color:'#fff', border:'1px solid var(--danger)' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
