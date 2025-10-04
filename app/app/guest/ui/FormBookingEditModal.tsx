// app/app/guest/ui/FormBookingEditModal.tsx
"use client";

import * as React from "react";

type RoomType = { id: string; name: string };
type Room = { id: string; name: string; room_type_id: string | null };
type Booking = {
  id: string;
  property_id: string;
  source: string;
  status: string;
  start_date: string;
  end_date: string;
  room_id: string | null;
  room_type_id: string | null;
  guest_first_name?: string | null;
  guest_last_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  created_at?: string | null;
  form_submitted_at?: string | null;
};

type Props = {
  open: boolean;
  bookingId: string | null;
  onClose: () => void;
  onSaved?: (updated: any) => void; // parent can refresh list
};

export default function FormBookingEditModal({ open, bookingId, onClose, onSaved }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [roomTypes, setRoomTypes] = React.useState<RoomType[]>([]);
  const [rooms, setRooms] = React.useState<Room[]>([]);

  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [roomTypeId, setRoomTypeId] = React.useState<string | null>(null);
  const [roomId, setRoomId] = React.useState<string | null>(null);

  const hasTypes = roomTypes.length > 0;

  React.useEffect(() => {
    if (!open || !bookingId) return;
    setError(null);
    setLoading(true);

    fetch(`/api/form-bookings/${bookingId}`, { method: "GET" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json())?.error || `HTTP ${r.status}`);
        return r.json();
      })
      .then(({ booking, room_types, rooms }) => {
        setBooking(booking);
        setRoomTypes(room_types || []);
        setRooms(rooms || []);
        setStartDate(booking.start_date || "");
        setEndDate(booking.end_date || "");
        setRoomTypeId(booking.room_type_id || null);
        setRoomId(booking.room_id || null);
      })
      .catch((e) => setError(e?.message ?? String(e)))
      .finally(() => setLoading(false));
  }, [open, bookingId]);

  function resetStateAndClose() {
    setBooking(null);
    setRoomTypes([]);
    setRooms([]);
    setStartDate("");
    setEndDate("");
    setRoomTypeId(null);
    setRoomId(null);
    setError(null);
    setLoading(false);
    setSaving(false);
    onClose();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;
    setSaving(true);
    setError(null);

    const payload: any = {
      start_date: startDate,
      end_date: endDate,
    };
    if (hasTypes) {
      if (roomTypeId) payload.room_type_id = roomTypeId;
      if (roomId) payload.room_id = roomId;
    } else {
      // fără room types -> cerem room_id
      if (roomId) payload.room_id = roomId;
    }

    try {
      const res = await fetch(`/api/form-bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (onSaved) onSaved(data?.booking);
      resetStateAndClose();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={saving ? undefined : resetStateAndClose}
      />
      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">Update form data</h2>
            <button
              onClick={saving ? undefined : resetStateAndClose}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            {loading && <p className="text-sm text-gray-500">Loading…</p>}
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* READ-ONLY details */}
            {booking && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500">Guest</label>
                  <div className="mt-1 text-sm">
                    {(booking.guest_first_name || "") + " " + (booking.guest_last_name || "")}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Email</label>
                  <div className="mt-1 text-sm">{booking.guest_email || "—"}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Phone</label>
                  <div className="mt-1 text-sm">{booking.guest_phone || "—"}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Source</label>
                  <div className="mt-1 text-sm">form</div>
                </div>
              </div>
            )}

            {/* EDITABLE FIELDS */}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">Start date</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">End date</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {hasTypes ? (
                <>
                  <div>
                    <label className="block text-sm font-medium">Room type (optional)</label>
                    <select
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                      value={roomTypeId || ""}
                      onChange={(e) => setRoomTypeId(e.target.value || null)}
                    >
                      <option value="">— none —</option>
                      {roomTypes.map((rt) => (
                        <option key={rt.id} value={rt.id}>{rt.name}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Dacă proprietatea are tipuri, poți seta tipul; camera e opțională.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium">Room (optional)</label>
                    <select
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                      value={roomId || ""}
                      onChange={(e) => setRoomId(e.target.value || null)}
                    >
                      <option value="">— none —</option>
                      {rooms
                        .filter((r) => !roomTypeId || String(r.room_type_id || "") === String(roomTypeId))
                        .map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Dacă alegi o cameră, verificăm disponibilitatea pentru intervalul selectat.
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium">Room</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={roomId || ""}
                    onChange={(e) => setRoomId(e.target.value || null)}
                    required
                  >
                    <option value="">— select —</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Proprietatea nu are room types, selectează direct camera.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-md px-4 py-2 text-sm hover:bg-gray-100"
                  disabled={saving}
                  onClick={resetStateAndClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}