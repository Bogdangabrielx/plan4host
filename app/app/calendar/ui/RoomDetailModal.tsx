"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Booking } from "./DayModal";

type Room = { id: string; name: string; property_id: string };
type Property = { id: string; name: string; check_in_time: string | null; check_out_time: string | null };

type CheckDef = { id: string; label: string; sort_index: number; default_value: boolean; property_id: string };
type TextDef  = { id: string; label: string; placeholder: string | null; sort_index: number; property_id: string };

function pad(n: number) { return String(n).padStart(2, "0"); }
function addDaysStr(s: string, n: number) { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function toDateTime(dateStr: string, timeStr: string | null | undefined) { return new Date(`${dateStr}T${(timeStr ?? "00:00")}:00`); }
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) { return aStart < bEnd && bStart < aEnd; }

export default function RoomDetailModal({
  dateStr,
  propertyId,
  room,
  onClose,
  onChanged,
  // NOU: forțăm modul "creare nouă" (ignorăm rezervarea activă) + precompletări
  forceNew,
  defaultStart,
  defaultEnd,
}: {
  dateStr: string;
  propertyId: string;
  room: Room;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  forceNew?: boolean;
  defaultStart?: { date: string; time: string | null };
  defaultEnd?: { date: string; time: string | null };
}) {
  const supabase = createClient();

  const [property, setProperty] = useState<Property | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [active, setActive] = useState<Booking | null>(null);

  // toggle & times
  const [on, setOn] = useState<boolean>(false);          // NEW booking => OFF by default
  const [startDate, setStartDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  // room details (defs + values)
  const [checkDefs, setCheckDefs] = useState<CheckDef[]>([]);
  const [textDefs, setTextDefs] = useState<TextDef[]>([]);
  const [checkValues, setCheckValues] = useState<Record<string, boolean>>({});
  const [textValues, setTextValues]   = useState<Record<string, string>>({});
  const [detailsDirty, setDetailsDirty] = useState(false);

  // UI status
  const [saving, setSaving] = useState<false | "creating" | "updating" | "extending" | "releasing">(false);
  const [status, setStatus] = useState<"Idle" | "Saving…" | "Error" | "Saved">("Idle");
  const [statusHint, setStatusHint] = useState<string>("");

  useEffect(() => {
    (async () => {
      setStatus("Saving…"); setStatusHint("Loading data…");

      const [p1, p2, p3, p4] = await Promise.all([
        supabase.from("properties")
          .select("id,name,check_in_time,check_out_time")
          .eq("id", propertyId)
          .maybeSingle(),
        supabase.from("bookings")
          .select("id,property_id,room_id,start_date,end_date,start_time,end_time,status")
          .eq("room_id", room.id)
          .neq("status", "cancelled")
          .order("start_date", { ascending: true }),
        supabase.from("room_detail_checks")
          .select("id,label,default_value,sort_index,property_id")
          .eq("property_id", propertyId)
          .order("sort_index", { ascending: true }),
        supabase.from("room_detail_text_fields")
          .select("id,label,placeholder,sort_index,property_id")
          .eq("property_id", propertyId)
          .order("sort_index", { ascending: true }),
      ]);

      const prop = (p1.error ? null : (p1.data ?? null)) as Property | null;
      setProperty(prop);
      const CI = prop?.check_in_time || "14:00";
      const CO = prop?.check_out_time || "11:00";

      const allBookings = (p2.error ? [] : (p2.data ?? [])) as Booking[];
      setBookings(allBookings);

      // determinăm rezervarea activă DOAR dacă nu e forceNew
      let act: Booking | null = null;
      if (!forceNew) {
        for (const b of allBookings) {
          if (b.start_date <= dateStr && dateStr <= b.end_date) { act = b; break; }
        }
      }
      setActive(act);

      const checks = (p3.error ? [] : (p3.data ?? [])) as CheckDef[];
      const texts  = (p4.error ? [] : (p4.data ?? [])) as TextDef[];
      setCheckDefs(checks);
      setTextDefs(texts);

      if (act) {
        // EXISTING booking → ON + valori salvate
        setOn(true);
        setStartDate(act.start_date);
        setStartTime(act.start_time || CI);
        setEndDate(act.end_date);
        setEndTime(act.end_time || CO);

        const [vc, vt] = await Promise.all([
          supabase.from("booking_check_values")
            .select("check_id,value")
            .eq("booking_id", act.id),
          supabase.from("booking_text_values")
            .select("field_id,value")
            .eq("booking_id", act.id),
        ]);

        const cv: Record<string, boolean> = {};
        const tv: Record<string, string> = {};

        // defaults
        for (const d of checks) cv[d.id] = !!d.default_value;

        if (!vc.error) {
          for (const row of (vc.data ?? []) as Array<{check_id: string; value: boolean}>) {
            cv[row.check_id] = !!row.value;
          }
        }
        if (!vt.error) {
          for (const row of (vt.data ?? []) as Array<{field_id: string; value: string | null}>) {
            tv[row.field_id] = row.value ?? "";
          }
        }

        setCheckValues(cv);
        setTextValues(tv);
      } else {
        // NEW booking → OFF + prefill (din props sau din zi + CI/CO)
        setOn(false);
        const sD = defaultStart?.date ?? dateStr;
        const sT = (defaultStart?.time ?? CI) || CI;
        const eD = defaultEnd?.date ?? addDaysStr(dateStr, 1);
        const eT = (defaultEnd?.time ?? CO) || CO;

        setStartDate(sD); setStartTime(sT);
        setEndDate(eD);   setEndTime(eT);

        const cv: Record<string, boolean> = {};
        for (const d of checks) cv[d.id] = !!d.default_value;
        setCheckValues(cv);
        setTextValues({});
      }

      setDetailsDirty(false);
      setStatus("Idle"); setStatusHint("");
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, room.id, dateStr, forceNew, defaultStart?.date, defaultStart?.time, defaultEnd?.date, defaultEnd?.time]);

  // pentru validări: dacă suntem în create mode, "others" = toate booking-urile; dacă suntem în edit, excludem activul
  const others = useMemo(() => {
    const arr = active ? bookings.filter(b => b.id !== active.id) : bookings.slice();
    return arr;
  }, [bookings, active]);

  // Afișăm “Save extended period” doar dacă end-ul e schimbat și e MAI TÂRZIU decât cel curent
  const extendDirty = useMemo(() => {
    if (!active) return false;
    const oldEnd = toDateTime(active.end_date, active.end_time);
    const newEnd = toDateTime(endDate, endTime);
    return newEnd.getTime() > oldEnd.getTime();
  }, [active, endDate, endTime]);

  async function confirmReservation() {
    if (!on) { setStatus("Error"); setStatusHint("Turn ON to confirm."); return; }
    setSaving("creating"); setStatus("Saving…"); setStatusHint("Creating booking…");

    const s = toDateTime(startDate, startTime);
    const e = toDateTime(endDate, endTime);
    if (!(s < e)) { setStatus("Error"); setStatusHint("End must be after Start."); setSaving(false); return; }

    for (const ob of others) {
      const os = toDateTime(ob.start_date, ob.start_time);
      const oe = toDateTime(ob.end_date, ob.end_time);
      if (overlaps(s, e, os, oe)) {
        setStatus("Error"); setStatusHint(`Overlaps ${ob.start_date} ${ob.start_time ?? ""} → ${ob.end_date} ${ob.end_time ?? ""}`);
        setSaving(false); return;
      }
    }

    const ins = await supabase.from("bookings").insert({
      property_id: propertyId, room_id: room.id,
      start_date: startDate, end_date: endDate,
      start_time: startTime || null, end_time: endTime || null,
      status: "confirmed",
    }).select().maybeSingle();
    if (ins.error || !ins.data) { setStatus("Error"); setStatusHint("Failed to create."); setSaving(false); return; }
    const newBooking = ins.data as Booking;

    const checkRows = Object.entries(checkValues).map(([check_id, value]) => ({ booking_id: newBooking.id, check_id, value }));
    const textRows  = Object.entries(textValues).map(([field_id, value]) => ({ booking_id: newBooking.id, field_id, value }));
    if (checkRows.length) await supabase.from("booking_check_values").upsert(checkRows);
    if (textRows.length)  await supabase.from("booking_text_values").upsert(textRows);

    setSaving(false); setStatus("Saved"); setStatusHint("Reservation created.");
    await onChanged(); onClose();
  }

  async function saveChanges() {
    if (!active) { setStatus("Error"); setStatusHint("No active reservation."); return; }
    if (!on)     { setStatus("Error"); setStatusHint("Use 'Confirm release' to delete.'"); return; }
    setSaving("updating"); setStatus("Saving…"); setStatusHint("Updating…");

    // doar checks/texts; timpii rămân neschimbați aici
    const checkRows = Object.entries(checkValues).map(([check_id, value]) => ({ booking_id: active.id, check_id, value }));
    const textRows  = Object.entries(textValues).map(([field_id, value]) => ({ booking_id: active.id, field_id, value }));

    const r1 = checkRows.length ? await supabase.from("booking_check_values").upsert(checkRows) : { error: null };
    const r2 = textRows.length  ? await supabase.from("booking_text_values").upsert(textRows)   : { error: null };
    if ((r1 as any).error || (r2 as any).error) {
      setStatus("Error"); setStatusHint("Failed to save changes."); setSaving(false); return;
    }

    setDetailsDirty(false);
    setSaving(false); setStatus("Saved"); setStatusHint("Details updated.");
    await onChanged(); onClose();
  }

  async function saveExtended() {
    if (!active) { setStatus("Error"); setStatusHint("No active reservation."); return; }
    if (!on)     { setStatus("Error"); setStatusHint("Use 'Confirm release' to delete.'"); return; }
    setSaving("extending"); setStatus("Saving…"); setStatusHint("Extending…");

    const oldEnd = toDateTime(active.end_date, active.end_time);
    const newEnd = toDateTime(endDate, endTime);
    if (!(newEnd > oldEnd)) { setStatus("Error"); setStatusHint("New end must be after current end."); setSaving(false); return; }

    for (const ob of bookings) {
      if (ob.id === active.id || ob.room_id !== room.id) continue;
      const os = toDateTime(ob.start_date, ob.start_time);
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

  async function confirmRelease() {
    if (!active) { setStatus("Error"); setStatusHint("No active reservation."); return; }
    setSaving("releasing"); setStatus("Saving…"); setStatusHint("Releasing…");

    const del = await supabase.from("bookings").delete().eq("id", active.id);
    if (del.error) { setStatus("Error"); setStatusHint("Failed to release."); setSaving(false); return; }

    setSaving(false); setStatus("Saved"); setStatusHint("Released.");
    await onChanged(); onClose();
  }

  const CI = property?.check_in_time || "14:00";
  const CO = property?.check_out_time || "11:00";

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "min(720px, 92vw)", maxHeight: "86vh", overflow: "auto",
                 background: "var(--panel)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
        {/* Header + status pill */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <strong>{room.name} — {dateStr} — Reservation</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999,
                           background: status === "Saving…" ? "var(--primary)" : status === "Error" ? "var(--danger)" : status === "Saved" ? "var(--success, #22c55e)" : "#2a2f3a",
                           color: status === "Saving…" ? "#0c111b" : "#fff", fontWeight: 700 }}>
              {status}
            </span>
            {statusHint && <small style={{ color: "var(--muted)" }}>{statusHint}</small>}
          </div>
        </div>

        {/* Reservation toggle + Start/End (date & time) */}
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ fontWeight: 800, fontSize: 14, letterSpacing: 0.2 }}>Reservation</label>
            <button onClick={() => { setOn(v => !v); setStatus("Idle"); setStatusHint(""); }}
              style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)",
                       background: on ? "var(--primary)" : "var(--card)", color: on ? "#0c111b" : "var(--text)",
                       cursor: "pointer", fontWeight: 900 }}>
              {on ? "ON" : "OFF"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* START */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Start (date & time)</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                <input
                  type="date" value={startDate}
                  onChange={(e) => { setStartDate((e.target as HTMLInputElement).value); setStatus("Idle"); setStatusHint(""); }}
                  style={dtInput}
                />
                <input
                  type="time" value={startTime}
                  onChange={(e) => { setStartTime((e.target as HTMLInputElement).value); setStatus("Idle"); setStatusHint(""); }}
                  style={dtInput}
                />
              </div>
              <small style={{ color: "var(--muted)" }}>Default: {CI}</small>
            </div>

            {/* END */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>End (date & time)</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                <input
                  type="date" value={endDate}
                  onChange={(e) => { setEndDate((e.target as HTMLInputElement).value); setStatus("Idle"); setStatusHint(""); }}
                  style={dtInput}
                />
                <input
                  type="time" value={endTime}
                  onChange={(e) => { setEndTime((e.target as HTMLInputElement).value); setStatus("Idle"); setStatusHint(""); }}
                  style={dtInput}
                />
              </div>
              <small style={{ color: "var(--muted)" }}>Default: {CO}</small>
            </div>
          </div>
        </div>

        {/* Room details (CHECKS + TEXTS) */}
        {(checkDefs.length > 0 || textDefs.length > 0) && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
            <strong>Room details</strong>

            {checkDefs.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10, marginTop: 10 }}>
                {checkDefs.sort((a,b) => a.sort_index - b.sort_index).map(c => (
                  <li key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={!!checkValues[c.id]}
                      onChange={(e) => { setCheckValues(v => ({ ...v, [c.id]: (e.target as HTMLInputElement).checked })); setDetailsDirty(true); }}
                    />
                    <span style={{ fontWeight: 600 }}>{c.label}</span>
                  </li>
                ))}
              </ul>
            )}

            {textDefs.length > 0 && (
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {textDefs.sort((a,b) => a.sort_index - b.sort_index).map(t => (
                  <div key={t.id} style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>{t.label}</label>
                    <input
                      type="text"
                      placeholder={t.placeholder ?? ""}
                      value={textValues[t.id] ?? ""}
                      onChange={(e) => { setTextValues(v => ({ ...v, [t.id]: (e.target as HTMLInputElement).value })); setDetailsDirty(true); }}
                      style={{
                        padding: "10px 12px",
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          {!active && on && (
            <button onClick={confirmReservation} disabled={!!saving} style={primaryBtn}>Confirm reservation</button>
          )}

          {active && on && (
            <>
              {detailsDirty && (
                <button onClick={saveChanges}  disabled={!!saving} style={primaryBtn}>Save changes</button>
              )}
              {extendDirty && (
                <button onClick={saveExtended} disabled={!!saving} style={primaryBtn}>Save extended period</button>
              )}
            </>
          )}

          {active && !on && (
            <button onClick={confirmRelease} disabled={!!saving} style={dangerBtn}>Confirm release</button>
          )}

          <button onClick={onClose} disabled={!!saving} style={ghostBtn}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* styles */
const dtInput: React.CSSProperties = {
  padding: "12px 14px",
  background: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 16,
  lineHeight: 1.35,
  fontWeight: 800,
  letterSpacing: 0.2 as any,
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "var(--primary)",
  color: "#0c111b",
  fontWeight: 900,
  cursor: "pointer",
};

const primaryBtnOutline: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--primary)",
  background: "transparent",
  color: "var(--text)",
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

const ghostBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 900,
  cursor: "pointer",
};
