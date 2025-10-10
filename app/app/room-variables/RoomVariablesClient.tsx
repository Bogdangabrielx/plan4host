"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePersistentProperty } from "@/app/app/_components/PropertySelection";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import { useHeader } from "@/app/app/_components/HeaderContext";

type Property = { id: string; name: string };
type Definition = { id: string; property_id: string; key: string; label: string; created_at: string };

export default function RoomVariablesClient({ initialProperties, isAdmin }: { initialProperties: Property[]; isAdmin: boolean }) {
  const sb = useMemo(() => createClient(), []);
  const [properties] = useState<Property[]>(initialProperties);
  const [propertyId, setPropertyId] = usePersistentProperty(properties);
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const { setPill } = useHeader();

  // Sync pill state in header
  useEffect(() => setPill(saving ? "Saving…" : ""), [saving, setPill]);

  async function loadDefinitions() {
    if (!propertyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/room-variables/definitions?property=${propertyId}`, { cache: "no-store" });
      const j = await res.json();
      if (j?.ok) setDefinitions(j.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDefinitions(); }, [propertyId]);

  async function createDefinition() {
    const label = newLabel.trim();
    if (!label || !propertyId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/room-variables/definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: propertyId, label, key: slugify(label) }),
      });
      const j = await res.json();
      if (res.ok && j?.ok) {
        setNewLabel("");
        await loadDefinitions();
      } else {
        alert(j?.error || "Failed to create variable");
      }
    } catch (e: any) {
      alert(e?.message || "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteDefinition(id: string) {
    if (!confirm("Ștergi această variabilă?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/room-variables/definitions?id=${id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.ok) await loadDefinitions();
      else alert(j?.error || "Eroare la ștergere");
    } catch (e: any) {
      alert(e?.message || "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PlanHeaderBadge title="Room Variables" slot="header-right" />

      {/* Selector de proprietate */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Property</label>
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          style={{
            minWidth: 220,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--text)",
          }}
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Add variable form */}
      <section
        style={{
          border: "1px solid var(--border)",
          background: "var(--panel)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Adaugă variabilă globală</h2>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Ex: Door code, Wi-Fi password..."
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
            }}
            disabled={!isAdmin}
          />
          <button
            onClick={createDefinition}
            disabled={!isAdmin || saving || !newLabel.trim()}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "var(--primary)",
              color: "#0c111b",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Creează
          </button>
        </div>
        <small style={{ color: "var(--muted)" }}>
          Cheia este generată automat (ex: <span className="rm-token">door_code</span>).
        </small>
      </section>

      {/* Variabile existente */}
      <section
        style={{
          border: "1px solid var(--border)",
          background: "var(--panel)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Variabile existente</h2>
        {loading ? (
          <p style={{ color: "var(--muted)" }}>Se încarcă...</p>
        ) : definitions.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Nu există variabile pentru această proprietate.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {definitions.map((def) => (
              <span
                key={def.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "6px 10px",
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                <span className="rm-token">{def.label}</span>
                <small style={{ color: "var(--muted)" }}>{def.key}</small>
                {isAdmin && (
                  <button
                    onClick={() => deleteDefinition(def.id)}
                    style={{
                      background: "transparent",
                      color: "var(--danger)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                    title="Șterge"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Chip styling */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .rm-token {
            display: inline-block;
            padding: 2px 6px;
            border: 1px solid var(--border);
            background: var(--panel);
            color: var(--text);
            border-radius: 8px;
            font-weight: 800;
            font-size: 12px;
          }
          @media (max-width: 600px) {
            section {
              padding: 12px;
            }
            h2 {
              font-size: 16px;
            }
          }
        `,
        }}
      />
    </div>
  );
}

function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}