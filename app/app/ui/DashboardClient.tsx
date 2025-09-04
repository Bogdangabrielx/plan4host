"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "../_components/HeaderContext";
import PlanHeaderBadge from "../_components/PlanHeaderBadge"; // ← NEW

type Property = {
  id: string;
  name: string;
  country_code: string | null;
  timezone: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
};

const card: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};

const COUNTRY_NAMES: Record<string, string> = {
  RO: "Romania",
  ES: "Spain",
  IT: "Italy",
  FR: "France",
  GB: "United Kingdom",
  DE: "Germany",
};

function flagEmoji(cc: string | null | undefined): string {
  if (!cc) return "";
  const up = cc.toUpperCase();
  if (up.length !== 2) return "";
  const A = 0x1f1e6;
  const code1 = up.charCodeAt(0) - 65 + A;
  const code2 = up.charCodeAt(1) - 65 + A;
  return String.fromCodePoint(code1, code2);
}
function countryLabel(cc: string): string {
  const name = COUNTRY_NAMES[cc] ?? cc;
  return `${flagEmoji(cc)} ${name} (${cc})`;
}

export default function DashboardClient({
  initialProperties = [],
}: {
  initialProperties?: Property[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const { setTitle, setPill } = useHeader();

  const [status, setStatus] = useState<"Idle" | "Saving…" | "Synced" | "Error">("Idle");
  const [name, setName] = useState("");
  const [country, setCountry] = useState<string>("");

  // ⚠️ seed din SSR (evită flicker/hydration mismatch)
  const [list, setList] = useState<Property[]>(initialProperties);

  const [toDelete, setToDelete] = useState<Property | null>(null);
  const [plan, setPlan] = useState<"basic"|"standard"|"premium"|null>(null);

  useEffect(() => { setTitle("Dashboard"); }, [setTitle]);

  useEffect(() => {
    setPill(
      status === "Saving…" ? "Saving…" :
      status === "Error"    ? "Error"    :
      status === "Synced"   ? "Synced"   : "Idle"
    );
  }, [status, setPill]);

  // Refresh client-side (rămâne, dar pornește deja cu initialProperties)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id,name,country_code,timezone,check_in_time,check_out_time")
        .order("created_at", { ascending: true });
      if (!error && data) setList(data as Property[]);
    })();
  }, [supabase]);

  // Load plan for button gating
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("accounts")
        .select("plan, valid_until")
        .order("created_at", { ascending: true });
      if (data && data.length) {
        const a = (data as any[])[0];
        const active = !a.valid_until || new Date(a.valid_until) > new Date();
        setPlan((active ? (a.plan as any) : 'basic') as any);
      }
    })();
  }, [supabase]);

  function guessTZ(cc: string) {
    switch (cc) {
      case "ES": return "Europe/Madrid";
      case "IT": return "Europe/Rome";
      case "FR": return "Europe/Paris";
      case "GB": return "Europe/London";
      case "DE": return "Europe/Berlin";
      case "RO":
      default:   return "Europe/Bucharest";
    }
  }

  async function addProperty() {
    if (!name || !country) return;
    setStatus("Saving…");

    const payload = {
      p_name: name,
      p_country_code: country,
      p_timezone: guessTZ(country),
      p_check_in_time: "14:00",
      p_check_out_time: "11:00",
    };

    const { error } = await supabase.rpc("create_property", payload);
    if (error) {
      console.error("create_property RPC error:", error);
      setStatus("Error");
      return;
    }

    const { data: refreshed } = await supabase
      .from("properties")
      .select("id,name,country_code,timezone,check_in_time,check_out_time")
      .order("created_at", { ascending: true });

    setList((refreshed ?? []) as Property[]);
    setName("");
    setCountry("");
    setStatus("Synced");
    setTimeout(() => setStatus("Idle"), 800);
  }

  function openConfigurator(id: string) {
    window.location.href = `/app/configurator?property=${id}`;
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setStatus("Saving…");
    const { error } = await supabase.from("properties").delete().eq("id", toDelete.id);
    if (error) { setStatus("Error"); return; }
    setList(prev => prev.filter(p => p.id !== toDelete.id));
    setToDelete(null);
    setStatus("Synced");
    setTimeout(() => setStatus("Idle"), 800);
  }

  // —— UI helpers pentru lățimi egale ——
  const FIELD_WRAPPER: React.CSSProperties = { width: 340, maxWidth: "100%" };
  const FIELD_STYLE: React.CSSProperties = {
    width: "100%",
    padding: 10,
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 8,
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PlanHeaderBadge title="Dashboard" slot="header-right" />

      {/* Add property */}
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Add Property</h2>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={FIELD_WRAPPER}>
            <label style={{ display: "block", marginBottom: 6 }}>Property Name*</label>
            <input
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="e.g. JADE Guesthouse"
              style={FIELD_STYLE}
            />
          </div>

          <div style={FIELD_WRAPPER}>
            <label style={{ display: "block", marginBottom: 6 }}>Country Location*</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.currentTarget.value)}
              style={FIELD_STYLE}
            >
              <option value="">— select —</option>
              <option value="RO">{countryLabel("RO")}</option>
              <option value="ES">{countryLabel("ES")}</option>
              <option value="IT">{countryLabel("IT")}</option>
              <option value="FR">{countryLabel("FR")}</option>
              <option value="GB">{countryLabel("GB")}</option>
              <option value="DE">{countryLabel("DE")}</option>
            </select>
          </div>

          <div>
            <button
              onClick={addProperty}
              disabled={plan === 'standard' && list.length >= 3}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--primary)",
                color: "#0c111b",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Save property
            </button>
            {plan === 'standard' && list.length >= 3 && (
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>Standard plan: max 3 properties.</div>
            )}
          </div>
          <small style={{ fontSize: 12, color: "var(--muted)" }}>
            Check-in/out default to 14:00 / 11:00. <br />
            Customizable anytime in the Configurator.
          </small>
        </div>
      </section>

      {/* Your properties */}
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Your Properties</h2>

        {list.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No properties yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {list.map((p) => (
              <li
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  alignItems: "center",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div>
                  <strong>{p.name}</strong>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {p.country_code ? `${flagEmoji(p.country_code)} ${COUNTRY_NAMES[p.country_code] ?? p.country_code}` : "—"}
                    {" • "}{p.timezone ?? "—"}
                    {" • "}CI {p.check_in_time ?? "—"} / CO {p.check_out_time ?? "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => openConfigurator(p.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--panel)",
                      color: "var(--text)",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    Open Configurator
                  </button>
                  <button
                    onClick={() => setToDelete(p)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--danger)",
                      background: "transparent",
                      color: "var(--text)",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Confirm Delete Modal */}
      {toDelete && (
        <>
          <div
            onClick={() => setToDelete(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 48 }}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              display: "grid",
              placeItems: "center",
              zIndex: 49,
            }}
          >
            <div
              style={{
                width: 480, maxWidth: "90vw",
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 10px 30px rgba(0,0,0,0.45)"
              }}
            >
              <h3 style={{ marginTop: 0 }}>Delete property?</h3>
              <p style={{ color: "var(--muted)" }}>
                You are about to permanently delete <strong>{toDelete.name}</strong>.
                This action is <strong>irreversible</strong>.
              </p>
              <p style={{ color: "var(--muted)" }}>
                All related data may be removed as well (rooms, bookings, room details,
                cleaning tasks/progress, iCal integrations, etc.).
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => setToDelete(null)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text)",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--danger)",
                    background: "var(--danger)",
                    color: "#0c111b",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  Delete permanently
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
