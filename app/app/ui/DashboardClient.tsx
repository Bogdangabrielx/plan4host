// app/app/DashboardClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "../_components/HeaderContext";
import { COUNTRIES as TZ_COUNTRIES, findCountry } from "@/lib/timezones";
import PlanHeaderBadge from "../_components/PlanHeaderBadge";

type Property = {
  id: string;
  name: string;
  country_code: string | null;
  timezone: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  regulation_pdf_url?: string | null;
  regulation_pdf_uploaded_at?: string | null;
};

const card: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};

const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  TZ_COUNTRIES.map(c => [c.code, c.name])
);

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

  // seed din SSR (evită flicker/hydration mismatch)
  const [list, setList] = useState<Property[]>(initialProperties);

  const [toDelete, setToDelete] = useState<Property | null>(null);
  const [plan, setPlan] = useState<"basic"|"standard"|"premium"|null>(null);

  // Copied! state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // Warn (no PDF) state
  const [needsPdfId, setNeedsPdfId] = useState<string | null>(null);
  const warnTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (warnTimerRef.current) window.clearTimeout(warnTimerRef.current);
    };
  }, []);

  useEffect(() => { setTitle("Dashboard"); }, [setTitle]);

  useEffect(() => {
    setPill(
      status === "Saving…" ? "Saving…" :
      status === "Error"    ? "Error"    :
      status === "Synced"   ? "Synced"   : "Idle"
    );
  }, [status, setPill]);

  // Refresh client-side: INCLUDE regulation_* (fix pentru „PDF dispare după refresh”)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id,name,country_code,timezone,check_in_time,check_out_time,regulation_pdf_url,regulation_pdf_uploaded_at")
        .order("created_at", { ascending: true });
      if (!error && data) setList(data as Property[]);
    })();
  }, [supabase]);

  // Load plan
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
  const c = findCountry(cc);
  return c?.tz || "Europe/Bucharest";
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
      .select("id,name,country_code,timezone,check_in_time,check_out_time,regulation_pdf_url,regulation_pdf_uploaded_at")
      .order("created_at", { ascending: true });

    setList((refreshed ?? []) as Property[]);
    setName("");
    setCountry("");
    setStatus("Synced");
    setTimeout(() => setStatus("Idle"), 800);
  }

  function openPropertySetup(id: string) {
    window.location.href = `/app/propertySetup?property=${id}`;
  }

  // —— BASE URL pentru linkurile de check-in ——
  function getCheckinBase(): string {
    const v1 = (process.env.NEXT_PUBLIC_CHECKIN_BASE || "").toString().trim();
    if (v1) return v1.replace(/\/+$/, "");
    const v2 = (process.env.NEXT_PUBLIC_APP_URL || "").toString().trim();
    if (v2) return v2.replace(/\/+$/, "");
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin.replace(/\/+$/, "");
    }
    return "";
  }

  // Construiește URL ABSOLUT, sigur, cu ?property=<ID>
  function buildPropertyCheckinLink(p: Property): string {
    const base = getCheckinBase();
    try {
      const u = new URL(base);
      const normalizedPath = u.pathname.replace(/\/+$/, "");
      u.pathname = `${normalizedPath}/checkin`;
      const qs = new URLSearchParams({ property: p.id });
      u.search = qs.toString();
      return u.toString();
    } catch {
      return `${base.replace(/\/+$/, "")}/checkin?property=${encodeURIComponent(p.id)}`;
    }
  }

  async function copyPropertyCheckinLink(p: Property) {
    // Dacă NU există PDF, nu copiem și arătăm hint pe buton
    if (!p.regulation_pdf_url) {
      setNeedsPdfId(p.id);
      if (warnTimerRef.current) window.clearTimeout(warnTimerRef.current);
      warnTimerRef.current = window.setTimeout(() => setNeedsPdfId(null), 2000);
      return;
    }

    const link = buildPropertyCheckinLink(p);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(p.id);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback când Clipboard API e blocat (Safari incognito, etc.)
      prompt("Copy this link:", link);
    }
  }

  async function uploadRegulationPdf(propertyId: string, file: File) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed.");
      return;
    }
    setStatus("Saving…");
    try {
      const fd = new FormData();
      fd.append("propertyId", propertyId);
      fd.append("file", file);
      const res = await fetch("/api/property/regulation/upload", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(j?.error || "Upload failed.");
        setStatus("Error");
        return;
      }
      const { data } = await supabase
        .from("properties")
        .select("id,name,country_code,timezone,check_in_time,check_out_time,regulation_pdf_url,regulation_pdf_uploaded_at")
        .order("created_at", { ascending: true });
      if (data) setList(data as Property[]);
      setStatus("Synced");
      setTimeout(() => setStatus("Idle"), 800);
    } catch (e) {
      console.error(e);
      setStatus("Error");
    }
  }

  // ——— Small hyperlink-triggered file picker for House Rules ———
  function triggerHouseRulesUpload(propertyId: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.style.display = "none";
    input.onchange = (e: Event) => {
      const file = (e.currentTarget as HTMLInputElement).files?.[0];
      if (file) uploadRegulationPdf(propertyId, file);
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setStatus("Saving…");
    const { error } = await supabase.rpc("account_delete_property_self", { p_property_id: toDelete.id });
    if (error) { setStatus("Error"); return; }
    setList(prev => prev.filter(p => p.id !== toDelete.id));
    setToDelete(null);
    setStatus("Synced");
    setTimeout(() => setStatus("Idle"), 800);
  }

  // —— UI helpers ——
  const FIELD_WRAPPER: React.CSSProperties = { width: 340, maxWidth: "100%" };
  const FIELD_STYLE: React.CSSProperties = {
    width: "100%",
    padding: 10,
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontFamily: 'inherit',
  };

  return (
    <div style={{ display: "grid", gap: 16, fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      <PlanHeaderBadge title="Dashboard" slot="header-right" />

      {/* Add property */}
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>List New Property</h2>

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
              {TZ_COUNTRIES
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <option key={c.code} value={c.code}>{countryLabel(c.code)}</option>
                ))}
            </select>
          </div>

          <div>
            <button
              onClick={addProperty}
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
          </div>
          <small style={{ fontSize: 12, color: "var(--muted)" }}>
            Check-in/out default to 14:00 / 11:00. <br />
            Customizable anytime in the Property Setup.
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
            {list.map((p) => {
              const isWarn = needsPdfId === p.id;
              const isCopied = copiedId === p.id;

              return (
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
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {/* Copy property check-in link (ABSOLUT + ?property=<ID>) */}
                    <button
                      onClick={() => copyPropertyCheckinLink(p)}
                      title={p.regulation_pdf_url ? "Copy property check-in link" : "Upload House Rules PDF first"}
                      data-checkin-link={buildPropertyCheckinLink(p)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: isWarn ? "var(--danger)" : "var(--panel)",
                        color: isWarn ? "#0c111b" : "var(--text)",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      {isWarn ? "Upload rules first" : (isCopied ? "Copied!" : "Copy check-in link")}
                    </button>

                    <button
                      onClick={() => openPropertySetup(p.id)}
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
                      Property Setup
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

                  {/* Footer line with tiny links: Open + Change/Upload */}
                  <div style={{ gridColumn: "1 / -1", color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                    {p.regulation_pdf_url ? (
                      <span>
                        Regulations PDF uploaded
                        {p.regulation_pdf_uploaded_at ? ` • ${new Date(p.regulation_pdf_uploaded_at).toLocaleString()}` : ""}
                        {" • "}
                        <a
                          href={p.regulation_pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--primary)", textDecoration: "none" }}
                        >
                          Open
                        </a>
                        {" • "}
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); triggerHouseRulesUpload(p.id); }}
                          style={{ color: "var(--primary)", textDecoration: "none" }}
                          title="Change / re-upload House Rules PDF"
                        >
                          Change
                        </a>
                      </span>
                    ) : (
                      <span>
                        No Regulations PDF uploaded
                        {" • "}
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); triggerHouseRulesUpload(p.id); }}
                          style={{ color: "var(--primary)", textDecoration: "none" }}
                          title="Upload House Rules PDF"
                        >
                          Upload
                        </a>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
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
                width: "min(480px, calc(100vw - 32px))",
                maxHeight: "calc(100vh - 32px)",
                overflow: "auto",
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
