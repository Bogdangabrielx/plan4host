"use client";

import { useState } from "react";

export default function AddPropertyForm() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Eroare");
      setName("");
      setMsg("Creat!");
      window.location.reload();
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", gap: 8 }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Numele proprietății"
        required
        style={{ padding: 8, minWidth: 220 }}
      />
      <button disabled={busy} style={{ padding: 8 }}>
        {busy ? "Se salvează..." : "Salvează"}
      </button>
      {msg && <span>{msg}</span>}
    </form>
  );
}
