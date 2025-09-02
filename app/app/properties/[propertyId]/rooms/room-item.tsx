"use client";

export default function RoomItem({ room }: { room: any }) {
  async function onDelete() {
    const ok = confirm(`Ștergi camera "${room.name}"?`);
    if (!ok) return;
    const r = await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      alert(data.error || "Eroare la ștergere");
      return;
    }
    window.location.reload();
  }

  return (
    <li style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <span>🛏️ {room.name} (cap. {room.capacity})</span>
      <button onClick={onDelete} style={{ padding: "4px 8px" }}>Șterge</button>
    </li>
  );
}
