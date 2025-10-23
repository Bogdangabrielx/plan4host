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
  TZ_COUNTRIES.map((c) => [c.code, c.name])
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
  const [plan, setPlan] = useState<"basic" | "standard" | "premium" | null>(null);
  // Toggle actions per property (one-at-a-time)
  const [openPropId, setOpenPropId] = useState<string | null>(null);
  // First-property guidance
  const [showFirstPropertyGuide, setShowFirstPropertyGuide] = useState<boolean>(false);
  const [highlightName, setHighlightName] = useState<boolean>(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const guideShownRef = useRef<boolean>(false);

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

  // Theme-aware assets (light/dark)
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const detect = () => {
      const t = el.getAttribute('data-theme');
      if (t === 'dark') setIsDark(true);
      else if (t === 'light') setIsDark(false);
      else setIsDark(window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false);
    };
    detect();
    const mo = new MutationObserver(detect);
    mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onMq = () => detect();
    try { mq?.addEventListener('change', onMq); } catch { mq?.addListener?.(onMq); }
    return () => { try { mq?.removeEventListener('change', onMq); } catch { mq?.removeListener?.(onMq); } mo.disconnect(); };
  }, []);

  useEffect(() => {
    setTitle("Dashboard");
  }, [setTitle]);

  useEffect(() => {
    setPill(status === "Saving…" ? "Saving…" : status === "Error" ? "Error" : status === "Synced" ? "Synced" : "Idle");
  }, [status, setPill]);

  // Refresh client-side: INCLUDE regulation_* (fix pentru „PDF dispare după refresh”)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(
          "id,name,country_code,timezone,check_in_time,check_out_time,regulation_pdf_url,regulation_pdf_uploaded_at"
        )
        .order("created_at", { ascending: true });
      if (!error && data) {
        setList(data as Property[]);
        if (!guideShownRef.current && (data?.length ?? 0) === 0) {
          guideShownRef.current = true;
          setShowFirstPropertyGuide(true);
        }
      }
    })();
  }, [supabase]);

  // Show guidance popup if initial SSR reported zero properties
  useEffect(() => {
    try {
      if (!guideShownRef.current && (initialProperties?.length ?? 0) === 0) {
        guideShownRef.current = true;
        setShowFirstPropertyGuide(true);
      }
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load plan
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("accounts").select("plan, valid_until").order("created_at", { ascending: true });
      if (data && data.length) {
        const a = (data as any[])[0];
        const active = !a.valid_until || new Date(a.valid_until) > new Date();
        setPlan((active ? (a.plan as any) : "basic") as any);
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

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          country_code: country,
          timezone: guessTZ(country),
          check_in_time: '14:00',
          check_out_time: '11:00',
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        console.error('Create property error:', j?.error || res.statusText);
        setStatus('Error');
        return;
      }

      const j = await res.json().catch(() => ({} as any));
      const createdId: string | undefined = j?.property?.id;

      // If this is the first property, redirect straight to Property Setup with guidance popup
      if (createdId && list.length === 0) {
        window.location.href = `/app/propertySetup?property=${encodeURIComponent(createdId)}&guide=rooms`;
        return;
      }

      const { data: refreshed } = await supabase
        .from("properties")
        .select(
          "id,name,country_code,timezone,check_in_time,check_out_time,regulation_pdf_url,regulation_pdf_uploaded_at"
        )
        .order("created_at", { ascending: true });

      setList((refreshed ?? []) as Property[]);
      setName("");
      setCountry("");
      setStatus("Synced");
      setTimeout(() => setStatus("Idle"), 800);
    } catch (e) {
      console.error(e);
      setStatus('Error');
    }
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
        .select(
          "id,name,country_code,timezone,check_in_time,check_out_time,regulation_pdf_url,regulation_pdf_uploaded_at"
        )
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
    if (error) {
      setStatus("Error");
      return;
    }
    setList((prev) => prev.filter((p) => p.id !== toDelete.id));
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
    fontFamily: "inherit",
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        fontFamily: "Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <PlanHeaderBadge title="Dashboard" slot="header-right" />

      {/* Add property */}
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>New Property</h2>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={FIELD_WRAPPER}>
            <label style={{ display: "block", marginBottom: 6 }}>Property Name*</label>
            <input
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="e.g. JADE Guesthouse"
              ref={nameInputRef}
              style={{
                ...FIELD_STYLE,
                border: highlightName ? ('2px solid var(--primary)') : FIELD_STYLE.border,
                boxShadow: highlightName ? '0 0 0 4px color-mix(in srgb, var(--primary) 25%, transparent)' : undefined,
                transition: 'box-shadow 160ms ease, border-color 160ms ease',
              }}
            />
          </div>

          <div style={FIELD_WRAPPER}>
            <label style={{ display: "block", marginBottom: 6 }}>Country Location*</label>
            <select value={country} onChange={(e) => setCountry(e.currentTarget.value)} style={FIELD_STYLE}>
              <option value="">— select —</option>
              {TZ_COUNTRIES.slice()
                .sort((a, b) => {
                  if (a.code === 'RO') return -1;
                  if (b.code === 'RO') return 1;
                  return a.name.localeCompare(b.name);
                })
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {countryLabel(c.code)}
                  </option>
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
         
        </div>
      </section>

      {/* First-time guidance modal */}
      {showFirstPropertyGuide && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e)=>{ e.stopPropagation(); /* require button to dismiss */ }}
          style={{ position:'fixed', inset:0, zIndex: 240, background:'rgba(0,0,0,0.55)', display:'grid', placeItems:'center', padding:12,
                   paddingTop:'calc(var(--safe-top, 0px) + 12px)', paddingBottom:'calc(var(--safe-bottom, 0px) + 12px)' }}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(560px, 100%)', background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:16, display:'grid', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <strong>Getting started</strong>
            </div>
            <div style={{ color:'var(--text)' }}>
              As a first step, please add the property name you want to register and select its country.
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button
                className="sb-btn sb-btn--primary"
                onClick={() => {
                  setShowFirstPropertyGuide(false);
                  setHighlightName(true);
                  try {
                    nameInputRef.current?.focus();
                    nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  } catch {}
                }}
              >OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Your properties */}
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Your Properties</h2>

        {list.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No properties yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {list.map((p) => {
              return (
                <li
                  key={p.id}
                  className="propItem"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto", // desktop
                    gap: 10,
                    alignItems: "center",
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 12,
                  }}
                  onPointerUp={(e) => {
                    const target = e.target as HTMLElement;
                    if (target && (target.closest('button') || target.closest('a'))) return;
                    setOpenPropId(prev => prev === p.id ? null : p.id);
                  }}
                >
                  {/* Info */}
                  <div>
                    <strong>{p.name}</strong>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>
                      {p.country_code
                        ? `${flagEmoji(p.country_code)} ${COUNTRY_NAMES[p.country_code] ?? p.country_code}`
                        : "—"}
                      {" • "}
                      {p.timezone ?? "—"}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={`propActions ${openPropId === p.id ? 'open' : ''}`} style={{ gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => openPropertySetup(p.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--panel)",
                        color: "var(--text)",
                        fontWeight: 800,
                        cursor: "pointer",
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
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  {/* Footer line removed: Regulations PDF upload/status moved to Check-in Editor */}
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
                boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Delete property?</h3>
              <p style={{ color: "var(--muted)" }}>
                You are about to permanently delete <strong>{toDelete.name}</strong>. This action is{" "}
                <strong>irreversible</strong>.
              </p>
              <p style={{ color: "var(--muted)" }}>
                All related data may be removed as well (rooms, bookings, room details, cleaning tasks/progress,
                iCal integrations, etc.).
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
                    cursor: "pointer",
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
                    cursor: "pointer",
                  }}
                >
                  Delete permanently
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ⬇️ CSS: actions hidden by default; show on open. Mobile stacks buttons. */}
      <style jsx>{`
        .propActions { display: none; }
        .propActions.open { display: flex; }
        @media (max-width: 720px) {
          .propItem { grid-template-columns: 1fr; align-items: start; }
          .propActions { grid-column: 1 / -1; width: 100%; }
          .propActions.open { display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 4px; }
          .propActions > button { width: 100%; border-radius: 29px !important; min-height: 44px; }
        }
      `}</style>
    </div>
  );
}
