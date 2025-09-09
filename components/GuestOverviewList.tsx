// app/app/calendar/ui/GuestOverviewList.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RoomDetailModal from "@/app/app/calendar/ui/RoomDetailModal";

type RowBooking = {
  id: string;
  property_id: string;
  room_id: string | null;
  start_date: string;
  end_date: string;
  status?: string; // folosit pentru “verde”
};

type Room = { id: string; name: string; property_id: string };

export default function GuestOverviewList({ rows }: { rows: RowBooking[] }) {
  const supabase = createClient();

  const [modal, setModal] = useState<null | {
    propertyId: string;
    dateStr: string;
    room: Room;
  }>(null);

  async function openReservationByBooking(bookingId: string) {
    // 1) booking + camera (cu embed)
    const { data: b, error } = await supabase
      .from("bookings")
      .select(
        `
        id,
        property_id,
        room_id,
        start_date,
        end_date,
        rooms:room_id (
          id,
          name,
          property_id
        )
      `
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (error || !b) return;

    if (!b.room_id) {
      alert("This booking has no assigned room yet.");
      return;
    }

    // rooms poate fi obiect SAU array — normalizăm
    const rel: any = (b as any).rooms;
    const roomObj: any = Array.isArray(rel) ? rel[0] : rel;

    const room: Room = {
      id: String(b.room_id),
      name: String(roomObj?.name ?? "Room"),
      property_id: String(b.property_id),
    };

    // 2) Folosim start_date ca dateStr — rezervarea va fi “găsită” în modal
    const dateStr = String(b.start_date);

    setModal({
      propertyId: String(b.property_id),
      dateStr,
      room,
    });
  }

  return (
    <>
      {/* Exemplu minimal de listă / tabel — adaptează la UI-ul tău */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Guest</th>
            <th align="left">Dates</th>
            <th align="left">Room</th>
            <th align="left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isGreen = r.status === "green"; // adaptează la logica ta de “verde”
            return (
              <tr key={r.id}>
                <td>…</td>
                <td>
                  {r.start_date} → {r.end_date}
                </td>
                <td>{r.room_id ?? "—"}</td>
                <td>
                  <button
                    onClick={() => openReservationByBooking(r.id)}
                    disabled={!isGreen || !r.room_id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background:
                        isGreen && r.room_id ? "var(--primary)" : "var(--card)",
                      color: isGreen && r.room_id ? "#0c111b" : "var(--text)",
                      fontWeight: 800,
                      cursor:
                        isGreen && r.room_id ? "pointer" : "not-allowed",
                    }}
                    title={
                      !r.room_id ? "No room assigned yet" : "Open reservation"
                    }
                  >
                    Open reservation
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Modalul efectiv */}
      {modal && (
        <RoomDetailModal
          dateStr={modal.dateStr}
          propertyId={modal.propertyId}
          room={modal.room}
          forceNew={false}
          onClose={() => setModal(null)}
          onChanged={() => {
            // aici poți reîncărca overview-ul dacă vrei
          }}
        />
      )}
    </>
  );
}