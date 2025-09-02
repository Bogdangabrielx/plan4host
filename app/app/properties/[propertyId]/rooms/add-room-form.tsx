"use client";

import { useState } from "react";

export default function AddRoomForm({ propertyId }: { propertyId: string }) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: propertyId, name, capacity })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Eroare");
      setName("");
      setCapacity(1);
      setMsg("Creat!");
      // reload simplu pentru MVP
      window.location.reload();
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Numele camerei"
        required
        style={{ padding: 8, minWidth: 220 }}
      />
      <input
        type="number"
        min={1}
        value={capacity}
        onChange={(e) => setCapacity(parseInt(e.target.value || "1", 10))}
        placeholder="Capacitate"
        required
        style={{ padding: 8, width: 120 }}
      />
      <button disabled={busy} style={{ padding: 8 }}>
        {busy ? "Se salvează..." : "Salvează"}
      </button>
      {msg && <span>{msg}</span>}
    </form>
  );
}
