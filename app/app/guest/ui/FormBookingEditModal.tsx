"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Modal for editing a *form-only* booking.
 * Editable fields: start_date, end_date, and either room_type_id (if the property uses room types)
 * or room_id (if the property has no room types).
 *
 * Everything else is read-only.
 */

type Props = {
  bookingId: string;
  propertyId: string;
  onClose: () => void;
  onSaved?: () => void;
};

type Booking = {
  id: string;
  property_id: string;
  source: string | null;
  status: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  room_id: string | null;
  room_type_id: string | null;

  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;

  form_submitted_at: string | null;
  created_at: string | null;
};

type RoomType = { id: string; name: string };
type Room = { id: string; name: string; room_type_id: string | null };

const FIELD: React.CSSProperties = {
  padding: "10px 12px",
  background: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontFamily: "inherit",
  minHeight: 44,
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>
      {children}
    </label>
  );
}

function isValidYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default function EditFormBookingModal({
  bookingId,
  propertyId,
  onClose,
  onSaved,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read-only data
  const [booking, setBooking] = useState<Booking | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hasRoomTypes, setHasRoomTypes] = useState<boolean>(false);

  // Editable fields
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [roomTypeId, setRoomTypeId] = useState<string | "">("");
  const [roomId, setRoomId] = useState<string | "">("");

  // Derived: filtered list of rooms if a room type is chosen
  const filteredRooms = useMemo(() => {
    if (!roomTypes.length) return rooms;
    if (!roomTypeId) return rooms;
    return rooms.filter((r) => (r.room_type_id || null) === (roomTypeId || null));
  }, [rooms, roomTypes, roomTypeId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Load booking (RLS)
        const { data: b, error: eB } = await supabase
          .from("bookings")
          .select(
            "id,property_id,source,status,start_date,end_date,start_time,end_time,room_id,room_type_id,guest_first_name,guest_last_name,guest_email,guest_phone,form_submitted_at,created_at"
          )
          .eq("id", bookingId)
          .maybeSingle();

        if (!alive) return;
        if (eB || !b) {
          setError(eB?.message || "Booking not found.");
          setLoading(false);
          return;
        }

        setBooking(b as Booking);

        // 2) Load room types and rooms for property
        const [rt, rr] = await Promise.all([
          supabase
            .from("room_types")
            .select("id,name")
            .eq("property_id", propertyId)
            .order("name", { ascending: true }),
          supabase
            .from("rooms")
            .select("id,name,room_type_id")
            .eq("property_id", propertyId)
            .order("name", { ascending: true }),
        ]);

        if (!alive) return;

        const listRT = (rt.data || []) as RoomType[];
        const listR = (rr.data || []) as Room[];

        setRoomTypes(listRT);
        setRooms(listR);
        setHasRoomTypes(listRT.length > 0);

        // 3) Seed edit fields
        setStartDate(b.start_date);
        setEndDate(b.end_date);

        // If property has room types → prefer editing by type (consistent with "what guest selected")
        // Otherwise, edit by room id (room name).
        if (listRT.length > 0) {
          setRoomTypeId((b.room_type_id as string) || "");
          setRoomId(""); // keep room independent in this modal
        } else {
          setRoomId((b.room_id as string) || "");
          setRoomTypeId("");
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load data.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [supabase, bookingId, propertyId]);

  function validate(): string | null {
    if (!isValidYMD(startDate)) return "Start date must be in YYYY-MM-DD format.";
    if (!isValidYMD(endDate)) return "End date must be in YYYY-MM-DD format.";
    if (endDate < startDate) return "End date cannot be before Start date.";

    if (hasRoomTypes) {
      if (!roomTypeId) return "Please select a Room type.";
    } else {
      if (!roomId) return "Please select a Room.";
    }
    return null;
  }

  async function onSave() {
    if (!booking) return;
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Friendly pre-check: do not allow selecting a room that overlaps a confirmed booking (verde/intangibil)
      if (!hasRoomTypes && roomId) {
        const q = supabase
          .from('bookings')
          .select('id,start_date,end_date,room_id,status')
          .eq('property_id', propertyId)
          .eq('room_id', roomId)
          .eq('status', 'confirmed')
          .lt('start_date', endDate)
          .gt('end_date', startDate)
          .limit(1);
        const r = await q;
        if (!r.error && (r.data?.length || 0) > 0) {
          const roomName = rooms.find(rm => String(rm.id) === String(roomId))?.name || '#Room';
          setError(`Overlaps an existing confirmed reservation on Room ${roomName}.`);
          setSaving(false);
          return;
        }
      }

      const res = await fetch("/api/booking/form/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: booking.id,
          start_date: startDate,
          end_date: endDate,
          // Only send one of room_type_id / room_id (avoid risky overwrites)
          room_type_id: hasRoomTypes ? (roomTypeId || null) : null,
          room_id: !hasRoomTypes ? (roomId || null) : null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const raw = (j?.error || '').toString();
        const isOverlap = /overlap/i.test(raw) || /bookings_no_overlap|exclusion|23P01/i.test(raw);
        setError(isOverlap ? 'Overlaps an existing confirmed reservation on this room.' : (raw || 'Save failed.'));
        return;
      }
      onSaved && onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Network error.");
    } finally {
      setSaving(false);
    }
  }

  function ReadRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <div style={{ display: "grid", gap: 6 }}>
        <Label>{label}</Label>
        <div
          style={{
            ...FIELD,
            background: "var(--panel)",
            color: "var(--muted)",
            borderStyle: "dashed",
          }}
        >
          {value ?? "—"}
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 80,
        display: "grid",
        placeItems: "center",
        padding: 12,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="sb-card"
        style={{
          width: "min(820px, 100%)",
          maxHeight: "calc(100vh - 32px)",
          overflow: "auto",
          padding: 16,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          borderRadius: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <strong>Edit form booking</strong>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="sb-btn"
              onClick={onClose}
              style={{ minHeight: 44 }}
            >
              Close
            </button>
            <button
              type="button"
              className="sb-btn sb-btn--primary"
              onClick={onSave}
              disabled={saving || loading || !booking}
              aria-busy={saving}
              style={{ minHeight: 44 }}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ color: "var(--muted)" }}>Loading…</div>
        ) : error ? (
          <div
            style={{
              color: "var(--danger)",
              background: "color-mix(in srgb, var(--danger) 10%, transparent)",
              border: "1px solid var(--danger)",
              padding: 10,
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            {error}
          </div>
        ) : !booking ? (
          <div style={{ color: "var(--muted)" }}>Booking not found.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {/* Read-only section */}
            <div
              className="sb-card"
              style={{ padding: 12, borderRadius: 10, background: "var(--card)" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <ReadRow
                  label="Guest"
                  value={
                    <>
                      {(booking.guest_first_name || "").toString()}{" "}
                      {(booking.guest_last_name || "").toString()}
                    </>
                  }
                />
                <ReadRow
                  label="Contact"
                  value={
                    <>
                      {booking.guest_email || "—"}
                      {booking.guest_phone ? ` • ${booking.guest_phone}` : ""}
                    </>
                  }
                />
                <ReadRow label="Source" value={booking.source || "—"} />
                <ReadRow
                  label="Form submitted"
                  value={
                    booking.form_submitted_at
                      ? new Date(booking.form_submitted_at).toLocaleString()
                      : "—"
                  }
                />
              </div>
            </div>

            {/* Editable section */}
            <div
              className="sb-card"
              style={{ padding: 12, borderRadius: 10, background: "var(--card)" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div style={{ display: "grid", gap: 6 }}>
                  <Label>Start date</Label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.currentTarget.value)}
                    style={FIELD}
                  />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <Label>End date</Label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.currentTarget.value)}
                    style={FIELD}
                  />
                </div>

                {hasRoomTypes ? (
                  <>
                    <div style={{ display: "grid", gap: 6 }}>
                      <Label>Room type</Label>
                      <select
                        value={roomTypeId}
                        onChange={(e) => {
                          setRoomTypeId(e.currentTarget.value);
                          // keep roomId independent for this edit modal (we only persist type)
                          setRoomId("");
                        }}
                        style={FIELD}
                      >
                        <option value="">Select room type…</option>
                        {roomTypes.map((rt) => (
                          <option key={rt.id} value={rt.id}>
                            {rt.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Optional hint list of rooms in the chosen type (read-only preview) */}
                    <div style={{ display: "grid", gap: 6 }}>
                      <Label>Rooms in selected type (read only)</Label>
                      <div
                        style={{
                          ...FIELD,
                          background: "var(--panel)",
                          borderStyle: "dashed",
                          color: "var(--muted)",
                          minHeight: 44,
                        }}
                      >
                        {roomTypeId
                          ? filteredRooms.map((r) => r.name).join(", ") || "—"
                          : "Select a room type…"}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "grid", gap: 6 }}>
                      <Label>Room</Label>
                      <select
                        value={roomId}
                        onChange={(e) => setRoomId(e.currentTarget.value)}
                        style={FIELD}
                      >
                        <option value="">Select room…</option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div />
                  </>
                )}
              </div>

              <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 12 }}>
                Only the fields above are editable. All other details remain read-only.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
