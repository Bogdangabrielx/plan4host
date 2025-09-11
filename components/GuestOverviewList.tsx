// components/GuestOverviewList.tsx
"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RoomDetailModal from "@/app/app/calendar/ui/RoomDetailModal";

export type GuestOverviewItem = {
  id: string | null;             // booking_id (poate fi null în cazuri “manuale” fără booking)
  property_id: string;
  room_id: string | null;
  start_date: string;            // yyyy-mm-dd
  end_date: string;              // yyyy-mm-dd
  status: "green" | "yellow" | "red";

  // opționale, utile pentru UI
  _room_label?: string | null;
  _room_type_id?: string | null;
  _room_type_name?: string | null;
  _reason?: string | null;       // ex: waiting_form, missing_form, type_conflict, no_ota_found, room_required_auto_failed
  _cutoff_ts?: string | null;
  _guest_first_name?: string | null;
  _guest_last_name?: string | null;
};

type RowBooking = {
  id: string;
  property_id: string;
  room_id: string | null;
  start_date: string;
  end_date: string;
  status?: string; // “green” pentru buton activ
};

type Room = { id: string; name: string; property_id: string };

export default function GuestOverviewList({ items }: { items: GuestOverviewItem[] }) {
  const supabase = createClient();

  const [modal, setModal] = useState<null | {
    propertyId: string;
    dateStr: string;
    room: Room;
  }>(null);

  async function openReservationByBooking(bookingId: string) {
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

    const rel: any = (b as any).rooms;
    const roomObj: any = Array.isArray(rel) ? rel[0] : rel;

    const room: Room = {
      id: String(b.room_id),
      name: String(roomObj?.name ?? "Room"),
      property_id: String(b.property_id),
    };

    const dateStr = String(b.start_date);

    setModal({
      propertyId: String(b.property_id),
      dateStr,
      room,
    });
  }

  const rows: RowBooking[] = useMemo(
    () =>
      items.map((it) => ({
        id: String(it.id ?? ""),
        property_id: it.property_id,
        room_id: it.room_id ?? null,
        start_date: it.start_date,
        end_date: it.end_date,
        status: it.status,
      })),
    [items]
  );

  const colorFor = (k: GuestOverviewItem["status"]) =>
    k === "green" ? "var(--success, #22c55e)" : k === "yellow" ? "#eab308" : "var(--danger, #ef4444)";

  const reasonLabel = (r?: string | null) => {
    switch (r) {
      case "waiting_form": return "Waiting for guest form";
      case "missing_form": return "Missing guest form";
      case "type_conflict": return "Type conflict with OTA";
      case "no_ota_found": return "No OTA match found";
      case "room_required_auto_failed": return "Room assignment required";
      default: return r || "";
    }
  };

  const nameOf = (it: GuestOverviewItem) => {
    const f = (it._guest_first_name ?? "").trim();
    const l = (it._guest_last_name ?? "").trim();
    return (f || l) ? `${f} ${l}`.trim() : "—";
  };

  return (
    <>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th align="left" style={{ padding: 8 }}>Status</th>
            <th align="left" style={{ padding: 8 }}>Guest</th>
            <th align="left" style={{ padding: 8 }}>Dates</th>
            <th align="left" style={{ padding: 8 }}>Type</th>
            <th align="left" style={{ padding: 8 }}>Room</th>
            <th align="left" style={{ padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const isGreen = it.status === "green";
            const canOpen = Boolean(isGreen && it.room_id && it.id);
            const hint = reasonLabel(it._reason);
            return (
              <tr key={`${it.start_date}|${it.end_date}|${it._room_type_id}|${it.id ?? "x"}`} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: 8 }}>
                  <span
                    title={hint}
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: colorFor(it.status),
                      verticalAlign: "middle",
                    }}
                  />
                  {hint ? <small style={{ marginLeft: 8, color: "var(--muted)" }}>{hint}</small> : null}
                </td>
                <td style={{ padding: 8, fontWeight: 700 }}>{nameOf(it)}</td>
                <td style={{ padding: 8 }}>
                  {it.start_date} → {it.end_date}
                </td>
                <td style={{ padding: 8 }}>{it._room_type_name ?? "—"}</td>
                <td style={{ padding: 8 }}>{it._room_label ?? (it.room_id ? `#${String(it.room_id).slice(0, 4)}` : "—")}</td>
                <td style={{ padding: 8 }}>
                  <button
                    onClick={() => it.id && openReservationByBooking(it.id)}
                    disabled={!canOpen}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: canOpen ? "var(--primary)" : "var(--card)",
                      color: canOpen ? "#0c111b" : "var(--text)",
                      fontWeight: 800,
                      cursor: canOpen ? "pointer" : "not-allowed",
                    }}
                    title={
                      !it.id
                        ? "No booking id"
                        : !it.room_id
                        ? "No room assigned yet"
                        : isGreen
                        ? "Open reservation"
                        : "Reservation not ready"
                    }
                  >
                    Open reservation
                  </button>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 16, color: "var(--muted)" }}>
                No upcoming stays found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {modal && (
        <RoomDetailModal
          dateStr={modal.dateStr}
          propertyId={modal.propertyId}
          room={modal.room}
          forceNew={false}
          onClose={() => setModal(null)}
          onChanged={() => {
            // dacă vrei, poți declanșa un refresh din părinte
          }}
        />
      )}
    </>
  );
}