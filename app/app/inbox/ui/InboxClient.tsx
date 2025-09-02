"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "@/app/app/_components/HeaderContext";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";

type Property  = { id: string; name: string; check_in_time: string | null; check_out_time: string | null; };
type RoomType  = { id: string; name: string; property_id: string };
type Room      = { id: string; name: string; property_id: string; room_type_id: string | null };
type Unassigned = {
  id: string;
  property_id: string;
  room_type_id: string | null;
  uid: string | null;
  summary: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
};

export default function InboxClient({ initialProperties }: { initialProperties: Property[] }) {
  const supabase = useMemo(() => createClient(), []);
  const { setTitle, setPill } = useHeader();

  const [status, setStatus] = useState<"Idle"|"Loading"|"Error">("Idle");

  const [properties] = useState<Property[]>(initialProperties);
  const [propertyId, setPropertyId] = useState<string>(initialProperties[0]?.id ?? "");

  const [types, setTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<Unassigned[]>([]);
  const [assignSel, setAssignSel] = useState<Record<string, string>>({}); // eventId -> roomId

  // Header: title + small badge with count
  useEffect(() => {
    const count = items.length;
    setTitle(
      <div style={{ display: "grid", lineHeight: 1.1 }}>
        <span>Inbox</span>
        {count > 0 && (
          <span style={countBadgeStyle}>
            {count > 99 ? "99+" : count} unassigned
          </span>
        )}
      </div>
    );
  }, [items.length, setTitle]);

  // Header pill (status)
  useEffect(() => {
    setPill(status === "Loading" ? "Syncing…" : status === "Error" ? "Error" : "Idle");
  }, [status, setPill]);

  // Load data for selected property
  useEffect(() => {
    if (!propertyId) return;
    setStatus("Loading");
    (async () => {
      const [rTypes, rRooms, rInbox] = await Promise.all([
        supabase.from("room_types")
          .select("id,name,property_id")
          .eq("property_id", propertyId)
          .order("name", { ascending: true }),
        supabase.from("rooms")
          .select("id,name,property_id,room_type_id")
          .eq("property_id", propertyId)
          .order("name", { ascending: true }),
        supabase.from("ical_unassigned_events")
          .select("id,property_id,room_type_id,uid,summary,start_date,end_date,start_time,end_time")
          .eq("property_id", propertyId)
          .order("start_date", { ascending: true })
      ]);

      if (rTypes.error || rRooms.error || rInbox.error) { setStatus("Error"); return; }
      setTypes((rTypes.data ?? []) as RoomType[]);
      setRooms((rRooms.data ?? []) as Room[]);
      setItems((rInbox.data ?? []) as Unassigned[]);
      setStatus("Idle");
    })();
  }, [propertyId, supabase]);

  // Emit + persist unassigned count (for sidebar dot)
  useEffect(() => {
    const count = items.length;
    try {
      localStorage.setItem("p4h:inboxCount", JSON.stringify({ count, ts: Date.now() }));
    } catch {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("p4h:inboxCount", { detail: { count } }));
    }
    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("p4h:inboxCount", { detail: { count: 0 } }));
      }
    };
  }, [items.length]);

  const typeName = (tid: string | null) =>
    types.find(t => t.id === tid)?.name || (tid ? "Unknown type" : "—");

  async function doAssign(ev: Unassigned) {
    const roomId = assignSel[ev.id];
    if (!roomId) return;
    setStatus("Loading");
    const res = await fetch("/api/inbox/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: ev.id, roomId })
    });
    if (res.ok) {
      setItems(prev => prev.filter(x => x.id !== ev.id));
      setStatus("Idle");
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Failed to assign.");
      setStatus("Error");
    }
  }

  async function doDelete(ev: Unassigned) {
    if (!confirm("Delete this unassigned event?")) return;
    setStatus("Loading");
    const res = await fetch("/api/inbox/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: ev.id })
    });
    if (res.ok) {
      setItems(prev => prev.filter(x => x.id !== ev.id));
      setStatus("Idle");
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Failed to delete.");
      setStatus("Error");
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Badge sub titlu (plan) */}
      <PlanHeaderBadge title="Inbox" />

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          style={{ background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", padding: "6px 10px", borderRadius: 8 }}
        >
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <span style={{ color: "var(--muted)", fontSize: 12 }}>
          Assign OTA room-type reservations to concrete rooms.
        </span>
      </div>

      {/* Grid de evenimente */}
      {items.length === 0 ? (
        <div style={{ color: "var(--muted)" }}>No unassigned events. You’re all set.</div>
      ) : (
        <ul style={{
          listStyle: "none", padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12
        }}>
          {items.map(ev => {
            const roomsOfType = rooms.filter(r => r.room_type_id && r.room_type_id === ev.room_type_id);
            return (
              <li key={ev.id} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
                  <div style={{ display: "grid", gap: 2 }}>
                    <strong>{ev.summary || "Reservation"}</strong>
                    <small style={{ color: "var(--muted)" }}>
                      {ev.start_date} {ev.start_time || ""} → {ev.end_date} {ev.end_time || ""}
                    </small>
                    <small style={{ color: "var(--muted)" }}>
                      Type: {typeName(ev.room_type_id)} • UID: {ev.uid || "—"}
                    </small>
                  </div>
                  <a href="/app/calendar" style={{ color: "var(--primary)", textDecoration: "none" }}>Open calendar</a>
                </div>

                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Assign to room</label>
                    <select
                      value={assignSel[ev.id] || ""}
                      onChange={(e) => setAssignSel(prev => ({ ...prev, [ev.id]: e.target.value }))}
                      style={{ background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", padding: "6px 10px", borderRadius: 8 }}
                    >
                      <option value="">— select room —</option>
                      {roomsOfType.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => doAssign(ev)}
                      disabled={!assignSel[ev.id]}
                      style={primaryBtn}
                    >
                      Assign
                    </button>
                    <button onClick={() => doDelete(ev)} style={dangerBtn}>Delete</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* Styles */

const countBadgeStyle: React.CSSProperties = {
  marginTop: 4,
  padding: "2px 8px",
  borderRadius: 999,
  background: "var(--panel)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.2,
  width: "fit-content",
};

const primaryBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--primary)",
  color: "#0c111b",
  fontWeight: 800,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid var(--danger)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 800,
  cursor: "pointer",
};
