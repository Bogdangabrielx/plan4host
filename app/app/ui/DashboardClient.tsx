// app/app/DashboardClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "../_components/HeaderContext";
import { COUNTRIES as TZ_COUNTRIES, findCountry } from "@/lib/timezones";
import PlanHeaderBadge from "../_components/PlanHeaderBadge";
import LoadingPill from "../_components/LoadingPill";
import overlayStyles from "../_components/AppLoadingOverlay.module.css";

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
  const [isSmall, setIsSmall] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(max-width: 480px)")?.matches ?? false;
  });

  // seed din SSR (evită flicker/hydration mismatch)
  const [list, setList] = useState<Property[]>(initialProperties);

  const [toDelete, setToDelete] = useState<Property | null>(null);
  const [plan, setPlan] = useState<"basic" | "standard" | "premium" | null>(null);
  // Toggle actions per property (one-at-a-time)
  const [openPropId, setOpenPropId] = useState<string | null>(null);
  // Inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  // First-property guidance
  const [showFirstPropertyGuide, setShowFirstPropertyGuide] = useState<boolean>(false);
  const [highlightName, setHighlightName] = useState<boolean>(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const guideShownRef = useRef<boolean>(false);
  const [firstPropertyStep, setFirstPropertyStep] = useState<0 | 1 | 2>(0);
  const [firstPropertyPhoto, setFirstPropertyPhoto] = useState<File | null>(null);
  const firstPropertyPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [firstPropertyResult, setFirstPropertyResult] = useState<{ propertyId: string; link: string } | null>(null);
  const [firstPropertyCopied, setFirstPropertyCopied] = useState<boolean>(false);
  const [firstPropertyLoading, setFirstPropertyLoading] = useState(false);
  const [firstPropertyLoadingIdx, setFirstPropertyLoadingIdx] = useState(0);
  const firstPropertyLoadingTimerRef = useRef<number | null>(null);
  const firstPropertyLoadingIntervalRef = useRef<number | null>(null);
  const [firstPropertyError, setFirstPropertyError] = useState<string | null>(null);

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

  const pillLockRef = useRef(false);
  const overlayMessageNode = (text: string) => <span data-p4h-overlay="message">{text}</span>;
  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  useEffect(() => {
    if (pillLockRef.current) return;
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
          setFirstPropertyStep(1);
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
        setFirstPropertyStep(1);
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

  const FIRST_PROPERTY_LOADING_TITLE = "Preparing your guest experience…";
  const FIRST_PROPERTY_LOADING_DETAILS = [
    "This is what your guests will see before arrival.",
    "Creating guest check-in link…",
    "Final touches…",
  ];

  async function createFirstProperty() {
    if (!name || !country) return;
    setFirstPropertyError(null);
    setFirstPropertyLoadingIdx(0);
    setFirstPropertyLoading(true);

    const start = Date.now();
    const minMs = 1000;

    // Only start rotating micro-messages if we're still loading after ~2s.
    if (firstPropertyLoadingTimerRef.current) window.clearTimeout(firstPropertyLoadingTimerRef.current);
    firstPropertyLoadingTimerRef.current = window.setTimeout(() => {
      if (firstPropertyLoadingIntervalRef.current) window.clearInterval(firstPropertyLoadingIntervalRef.current);
      firstPropertyLoadingIntervalRef.current = window.setInterval(() => {
        setFirstPropertyLoadingIdx((i) => (i + 1) % FIRST_PROPERTY_LOADING_DETAILS.length);
      }, 900);
    }, 2000);

    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          country_code: country,
          timezone: guessTZ(country),
          check_in_time: "14:00",
          check_out_time: "11:00",
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        throw new Error(j?.error || "Could not create property.");
      }

      const j = await res.json().catch(() => ({} as any));
      const createdId: string | undefined = j?.property?.id;
      if (!createdId) throw new Error("Could not create property.");

      // Best-effort: upload optional photo selected in step 2
      if (firstPropertyPhoto) {
        try {
          const fd = new FormData();
          fd.set("propertyId", createdId);
          fd.set("file", firstPropertyPhoto);
          const up = await fetch("/api/property/profile/upload", { method: "POST", body: fd });
          if (up.ok) {
            try {
              window.dispatchEvent(new CustomEvent("p4h:onboardingDirty"));
            } catch {}
          }
        } catch {}
      }

      // Update list so the dashboard reflects the created property immediately.
      try {
        if (j?.property) setList((prev) => (prev.length ? prev : [j.property as Property]));
      } catch {}

      const elapsed = Date.now() - start;
      const remaining = Math.max(minMs - elapsed, 0);
      if (remaining) await wait(remaining);

      const link = buildPropertyCheckinLink({ id: createdId } as Property);
      setFirstPropertyResult({ propertyId: createdId, link });
      setFirstPropertyCopied(false);
      setFirstPropertyPhoto(null);
      setName("");
      setCountry("");
      try {
        window.dispatchEvent(new CustomEvent("p4h:onboardingDirty"));
      } catch {}
    } catch (e: any) {
      setFirstPropertyError(e?.message || "Could not create property.");
      // Reopen step 2 so user can retry quickly
      setShowFirstPropertyGuide(true);
      setFirstPropertyStep(2);
    } finally {
      if (firstPropertyLoadingIntervalRef.current) window.clearInterval(firstPropertyLoadingIntervalRef.current);
      firstPropertyLoadingIntervalRef.current = null;
      setFirstPropertyLoading(false);
      if (firstPropertyLoadingTimerRef.current) window.clearTimeout(firstPropertyLoadingTimerRef.current);
      firstPropertyLoadingTimerRef.current = null;
    }
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

      const { data: refreshed } = await supabase
        .from("properties")
        .select(
          "id,name,country_code,timezone,check_in_time,check_out_time,regulation_pdf_url,regulation_pdf_uploaded_at"
        )
        .order("created_at", { ascending: true });

      setList((refreshed ?? []) as Property[]);
      setName("");
      setCountry("");
      // Use the same overlay UX as the rest of the app: dots while saving, then "Saved" briefly.
      pillLockRef.current = true;
      setPill(overlayMessageNode("Saved"));
      await wait(1000);
      pillLockRef.current = false;
      setStatus("Idle");
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

  async function savePropertyName(id: string, newNameRaw: string) {
    const newName = (newNameRaw || "").trim();
    setRenamingId(null);
    if (!newName) return; // ignore empty
    const current = list.find(p => p.id === id);
    if (current && current.name.trim() === newName) return; // no change
    setStatus("Saving…");
    try {
      const { error } = await supabase.from('properties').update({ name: newName }).eq('id', id);
      if (!error) {
        setList(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
        setStatus("Synced");
        setTimeout(() => setStatus("Idle"), 800);
      } else {
        setStatus("Error");
      }
    } catch {
      setStatus("Error");
    }
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

  // —— Desktop-only two-column layout + equal heights ——
  const DESKTOP_BP = 960; // px
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const addCardRef = useRef<HTMLDivElement | null>(null);
  const listCardRef = useRef<HTMLDivElement | null>(null);
  const [addCardHeight, setAddCardHeight] = useState<number | null>(null);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= DESKTOP_BP);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(max-width: 480px)");
    const on = (e: MediaQueryListEvent) => setIsSmall(e.matches);
    try { mq?.addEventListener("change", on); } catch { mq?.addListener?.(on as any); }
    setIsSmall(mq?.matches ?? false);
    return () => { try { mq?.removeEventListener("change", on); } catch { mq?.removeListener?.(on as any); } };
  }, []);

  // Keep list card matched to the New Property card height on desktop.
  useEffect(() => {
    if (!isDesktop) { setAddCardHeight(null); return; }
    const el = addCardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      setAddCardHeight(el?.getBoundingClientRect().height ?? null);
      return;
    }
    const ro = new ResizeObserver(() => {
      try {
        const h = Math.round(el.getBoundingClientRect().height);
        setAddCardHeight(h);
      } catch {}
    });
    ro.observe(el);
    // Initial measure
    try { setAddCardHeight(Math.round(el.getBoundingClientRect().height)); } catch {}
    return () => ro.disconnect();
  }, [isDesktop]);

  return (
    <div style={{ fontFamily: "inherit", color: "var(--text)" }}>
      <PlanHeaderBadge title="Dashboard" slot="under-title" />
      <div style={{ padding: isSmall ? "10px 12px 16px" : "16px", display: "grid", gap: 16 }}>

      {/* 2-column desktop row: New Property + Your Properties */}
      <div 
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: isDesktop ? "minmax(0, 1fr) minmax(0, 1fr)" : "1fr",
          alignItems: "start",
        }}
      >
      {/* Add property */}
      <section className="sb-cardglow" ref={addCardRef} style={card}>
        <h2 style={{ marginTop: 0 }}>New Property</h2>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={FIELD_WRAPPER}>
            <label style={{ display: "block", marginBottom: 6 }}>Property Name*</label>
            <input
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="e.g. BOA aFrame"
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

          <div style={{ ...FIELD_WRAPPER, marginTop: 6 }}>
            <button
              onClick={() => {
                if (list.length === 0) {
                  setFirstPropertyError(null);
                  setShowFirstPropertyGuide(true);
                  setFirstPropertyStep(1);
                  return;
                }
                addProperty();
              }}
              className="sb-btn sb-btn--primary sb-cardglow sb-btn--p4h-copylink"
              style={{ width: "100%", minHeight: 44 }}
            >
              Save
            </button>
          </div>
         
        </div>
      </section>

      {/* Your properties */}
      <section className="sb-cardglow"
        ref={listCardRef}
        style={{
          ...card,
          // Desktop: match the height of the New Property card and scroll inner list
          height: isDesktop && addCardHeight ? addCardHeight : undefined,
          display: "flex",
          flexDirection: "column",
          overflow: isDesktop ? "hidden" : undefined,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Your Properties</h2>

        {list.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No properties yet.</p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 10,
              // Desktop: make the list take remaining space and scroll
              flex: isDesktop ? 1 : undefined,
              minHeight: isDesktop ? 0 : undefined,
              overflowY: isDesktop ? "auto" : undefined,
              // Keep item rows at natural height; do not stretch when there's extra space
              alignContent: isDesktop ? "start" : undefined,
              alignItems: isDesktop ? "start" : undefined,
            }}
          >
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
                    if (target && (target.closest('button') || target.closest('a') || target.closest('input'))) return;
                    setOpenPropId(prev => prev === p.id ? null : p.id);
                  }}
                >
                  {/* Info */}
                  <div>
                    {renamingId === p.id ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e)=> setRenameValue(e.currentTarget.value)}
                        onBlur={()=> savePropertyName(p.id, renameValue)}
                        onKeyDown={(e)=>{
                          if (e.key === 'Enter') { e.currentTarget.blur(); }
                          if (e.key === 'Escape') { setRenamingId(null); }
                        }}
                        autoFocus
                        style={{
                          ...FIELD_STYLE,
                          width: 'min(320px, 100%)',
                          padding: 8,
                          fontWeight: "var(--fw-medium)",
                        }}
                        placeholder="Property name"
                      />
                    ) : (
                      <strong>{p.name}</strong>
                    )}
                    <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)" }}>
                      {p.country_code
                        ? `${flagEmoji(p.country_code)} ${COUNTRY_NAMES[p.country_code] ?? p.country_code}`
                        : "—"}
                      {" • "}
                      {p.timezone ?? "—"}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={`propActions ${openPropId === p.id ? 'open' : ''}`} style={{ gap: 8, flexWrap: "wrap" }}>
                    {renamingId === p.id ? null : (
                      <button
                        onClick={() => { setRenamingId(p.id); setRenameValue(p.name); setTimeout(()=>renameInputRef.current?.focus(), 0); }}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: "var(--panel)",
                          color: "var(--text)",
                          fontSize: "var(--fs-s)",
                          fontWeight: "var(--fw-medium)",
                          cursor: "pointer",
                        }}
                      >
                        Rename
                      </button>
                    )}
                    <button
                      onClick={() => openPropertySetup(p.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--panel)",
                        color: "var(--text)",
                        fontSize: "var(--fs-s)",
                        fontWeight: "var(--fw-medium)",
                        cursor: "pointer",
                      }}
                    >
                      Setup
                    </button>

                    <button
                      onClick={() => setToDelete(p)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--danger)",
                        background: "transparent",
                        color: "var(--text)",
                        fontSize: "var(--fs-s)",
                        fontWeight: "var(--fw-medium)",
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
      </div>

		      {/* First property wizard (3 steps) */}
		      {showFirstPropertyGuide && list.length === 0 && firstPropertyStep > 0 && (
		        <div
		          role="dialog"
		          aria-modal="true"
	          onClick={(e) => {
	            // Require explicit close button
	            e.stopPropagation();
	          }}
	          style={{
	            position: "fixed",
	            inset: 0,
	            zIndex: 240,
	            background: "rgba(0,0,0,0.55)",
	            display: "grid",
	            placeItems: "center",
	            padding: 12,
	            paddingTop: "calc(var(--safe-top, 0px) + 12px)",
	            paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
	          }}
	        >
	          <div
	            onClick={(e) => e.stopPropagation()}
	            className="sb-card"
	            style={{
	              width: "min(520px, 100%)",
	              background: "var(--panel)",
	              border: "1px solid var(--border)",
	              borderRadius: 14,
	              padding: 16,
	              display: "grid",
	              gap: 12,
	            }}
		          >
		            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 40px", alignItems: "start", gap: 12 }}>
		              <div aria-hidden />
		              <div style={{ display: "grid", justifyItems: "center", textAlign: "center", gap: 6 }}>
		                <div
		                  style={{
		                    fontSize: 13,
		                    fontWeight: 800,
		                    textTransform: "uppercase",
		                    letterSpacing: ".14em",
		                    color: "color-mix(in srgb, var(--text) 86%, transparent)",
		                  }}
		                >
		                  {firstPropertyStep === 1 ? "Add property" : "Add photo"}
		                </div>
		              </div>
		              <button
		                aria-label="Close"
		                className="sb-btn sb-cardglow sb-btn--icon"
		                style={{ width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", fontWeight: 900 }}
		                onClick={() => {
		                  setShowFirstPropertyGuide(false);
		                  setFirstPropertyStep(0);
		                  setFirstPropertyPhoto(null);
		                }}
		              >
		                ×
		              </button>
		            </div>

		            {firstPropertyStep === 1 ? (
		              <div style={{ display: "grid", gap: 12 }}>
		                <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)", textAlign: "center" }}>
		                  Takes less than 30 seconds.
		                </div>
		                <div style={{ display: "grid", gap: 6 }}>
		                  <label style={{ display: "block" }}>Property name</label>
		                  <input
		                    value={name}
	                    onChange={(e) => setName(e.currentTarget.value)}
	                    placeholder="e.g. BOA aFrame"
	                    style={FIELD_STYLE}
	                  />
		                  <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)" }}>
		                    Guests will see this. Change anytime.
		                  </div>
		                </div>

	                <div style={{ display: "grid", gap: 6 }}>
	                  <label style={{ display: "block" }}>Country</label>
	                  <select value={country} onChange={(e) => setCountry(e.currentTarget.value)} style={FIELD_STYLE}>
	                    <option value="">— select —</option>
	                    {TZ_COUNTRIES.slice()
	                      .sort((a, b) => {
	                        if (a.code === "RO") return -1;
	                        if (b.code === "RO") return 1;
	                        return a.name.localeCompare(b.name);
	                      })
	                      .map((c) => (
	                        <option key={c.code} value={c.code}>
	                          {countryLabel(c.code)}
	                        </option>
	                      ))}
	                  </select>
		                  <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)" }}>
		                    Helps personalize guest info.
		                  </div>
		                </div>

		                <div style={{ display: "flex", justifyContent: "flex-end" }}>
		                  <button
		                    className="sb-btn sb-cardglow"
		                    disabled={!name || !country}
		                    style={{
		                      border: "1px solid var(--primary)",
		                      background: "transparent",
		                      color: "var(--text)",
		                      borderRadius: 999,
		                      fontWeight: "var(--fw-medium)",
		                    }}
		                    onClick={() => setFirstPropertyStep(2)}
		                  >
		                    Continue
		                  </button>
		                </div>
		              </div>
	            ) : (
	              <div style={{ display: "grid", gap: 12 }}>
		                <div style={{ display: "grid", gap: 6 }}>
		                  <label style={{ display: "block" }}>Property photo (optional)</label>
	                  <input
	                    ref={firstPropertyPhotoInputRef}
	                    type="file"
	                    accept="image/*"
	                    style={{ display: "none" }}
	                    onChange={(e) => setFirstPropertyPhoto(e.currentTarget.files?.[0] ?? null)}
	                  />
			                  <button
			                    type="button"
			                    className="sb-btn sb-cardglow"
			                    style={{
			                      width: "100%",
			                      minHeight: 44,
			                      borderRadius: 999,
			                      border: "1px solid var(--primary)",
			                      background: "transparent",
			                      color: "var(--text)",
			                      display: "inline-flex",
			                      alignItems: "center",
			                      justifyContent: "center",
			                      gap: 10,
			                      fontWeight: "var(--fw-medium)",
			                    }}
			                    onClick={() => firstPropertyPhotoInputRef.current?.click()}
			                  >
			                    <span aria-hidden style={{ display: "grid", placeItems: "center" }}>
			                      <svg
			                        width="18"
			                        height="18"
			                        viewBox="0 0 24 24"
			                        fill="none"
			                        xmlns="http://www.w3.org/2000/svg"
			                        style={{ display: "block" }}
			                      >
			                        <path
			                          d="M7 11C8.10457 11 9 10.1046 9 9C9 7.89543 8.10457 7 7 7C5.89543 7 5 7.89543 5 9C5 10.1046 5.89543 11 7 11Z"
			                          stroke="currentColor"
			                          strokeWidth="1.5"
			                          strokeLinecap="round"
			                          strokeLinejoin="round"
			                        />
			                        <path
			                          d="M5.56055 21C11.1305 11.1 15.7605 9.35991 21.0005 15.7899"
			                          stroke="currentColor"
			                          strokeWidth="1.5"
			                          strokeLinecap="round"
			                          strokeLinejoin="round"
			                        />
			                        <path
			                          d="M11.5 3H5C3.93913 3 2.92172 3.42136 2.17157 4.17151C1.42142 4.92165 1 5.93913 1 7V17C1 18.0609 1.42142 19.0782 2.17157 19.8284C2.92172 20.5785 3.93913 21 5 21H17C18.0609 21 19.0783 20.5785 19.8284 19.8284C20.5786 19.0782 21 18.0609 21 17V11"
			                          stroke="currentColor"
			                          strokeWidth="1.5"
			                          strokeLinecap="round"
			                          strokeLinejoin="round"
			                        />
			                        <path
			                          d="M20.6 1.00003C20.008 1.00175 19.4377 1.2171 19 1.60422C18.6567 1.30103 18.23 1.10139 17.7719 1.02963C17.3138 0.957876 16.844 1.0171 16.42 1.20011C15.9959 1.38311 15.6359 1.68198 15.3838 2.06026C15.1316 2.43854 14.9983 2.87989 15 3.33048C15 6.11406 19 8 19 8C19 8 23 6.11406 23 3.33048C23 2.71241 22.7472 2.11966 22.2971 1.68261C21.847 1.24557 21.2365 1.00003 20.6 1.00003Z"
			                          stroke="currentColor"
			                          strokeWidth="1.5"
			                          strokeLinecap="round"
			                          strokeLinejoin="round"
			                        />
			                      </svg>
			                    </span>
			                    {firstPropertyPhoto ? "Change photo" : "Add photo"}
			                  </button>
		                  <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)" }}>
		                    {firstPropertyPhoto ? firstPropertyPhoto.name : "Optional — you can skip this for now."}
		                  </div>
		                </div>

			                <div style={{ display: "grid", gap: 10 }}>
			                  <button
			                    className="sb-btn sb-btn--primary"
			                    style={{ width: "100%", minHeight: 44 }}
			                    disabled={!name || !country || firstPropertyLoading}
			                    onClick={() => {
			                      setShowFirstPropertyGuide(false);
			                      setFirstPropertyStep(0);
			                      createFirstProperty();
			                    }}
			                  >
			                    Create & view guest link
			                  </button>
			                  {!firstPropertyPhoto && (
			                    <button
			                      className="sb-btn"
			                      style={{ width: "100%", minHeight: 44, borderRadius: 999 }}
			                      disabled={!name || !country || firstPropertyLoading}
			                      onClick={() => {
			                        setFirstPropertyPhoto(null);
			                        setShowFirstPropertyGuide(false);
			                        setFirstPropertyStep(0);
			                        createFirstProperty();
			                      }}
			                    >
			                      Skip photo
			                    </button>
			                  )}
			                  {firstPropertyError && (
			                    <div style={{ color: "var(--danger)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)", textAlign: "center" }}>
			                      {firstPropertyError}
			                    </div>
			                  )}
			                </div>
		              </div>
		            )}
		          </div>
		        </div>
		      )}

	      {/* First property loading (between step 2 and feedback) */}
	      {firstPropertyLoading && (
	        <div
	          className={overlayStyles.overlay}
	          role="status"
	          aria-live="polite"
	          aria-label={FIRST_PROPERTY_LOADING_TITLE}
	          style={{ zIndex: 243 }}
	        >
	          <div style={{ display: "grid", justifyItems: "center", gap: 12, padding: 12 }}>
	            <LoadingPill title={FIRST_PROPERTY_LOADING_TITLE} />
	            <div style={{ display: "grid", gap: 6, textAlign: "center" }}>
	              <div style={{ color: "var(--text)", fontSize: "var(--fs-b)", lineHeight: "var(--lh-b)", fontWeight: 700 }}>
	                {FIRST_PROPERTY_LOADING_TITLE}
	              </div>
	              <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)" }}>
	                {FIRST_PROPERTY_LOADING_DETAILS[firstPropertyLoadingIdx] ?? FIRST_PROPERTY_LOADING_DETAILS[0]}
	              </div>
	            </div>
	          </div>
	        </div>
	      )}

		      {/* AHA modal: guest link ready (no explicit link shown) */}
		      {firstPropertyResult && (
	        <>
	          <div
	            onClick={() => setFirstPropertyResult(null)}
	            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 241 }}
	          />
	          <div
	            role="dialog"
	            aria-modal="true"
	            style={{
	              position: "fixed",
	              inset: 0,
	              display: "grid",
	              placeItems: "center",
	              zIndex: 242,
	              padding: 12,
	              paddingTop: "calc(var(--safe-top, 0px) + 12px)",
	              paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
	            }}
	          >
	            <div
	              onClick={(e) => e.stopPropagation()}
	              className="sb-card"
	              style={{
	                width: "min(520px, 100%)",
	                background: "var(--panel)",
	                border: "1px solid var(--border)",
	                borderRadius: 14,
	                padding: 16,
	                display: "grid",
	                gap: 12,
	              }}
	            >
	              <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 40px", alignItems: "start", gap: 12 }}>
	                <div aria-hidden />
	                <div style={{ display: "grid", justifyItems: "center", textAlign: "center", gap: 6 }}>
	                  <div
	                    style={{
	                      fontSize: 13,
	                      fontWeight: 800,
	                      textTransform: "uppercase",
	                      letterSpacing: ".14em",
	                      color: "color-mix(in srgb, var(--text) 86%, transparent)",
	                    }}
	                  >
	                    Guest link ready
	                  </div>
	                </div>
	                <button
	                  aria-label="Close"
	                  className="sb-btn sb-cardglow sb-btn--icon"
	                  style={{ width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", fontWeight: 900 }}
	                  onClick={() => setFirstPropertyResult(null)}
	                >
	                  ×
	                </button>
	              </div>
		              <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)", textAlign: "center" }}>
		                This is what your guest will see.
		              </div>

		              <div style={{ display: "grid", gap: 10 }}>
	                <button
	                  className="sb-btn sb-btn--primary"
	                  style={{ width: "100%", minHeight: 44 }}
	                  onClick={() => {
	                    try {
	                      window.open(firstPropertyResult.link, "_blank", "noopener,noreferrer");
	                    } catch {
	                      window.location.href = firstPropertyResult.link;
	                    }
	                  }}
	                >
	                  View guest link
	                </button>
	                <button
	                  className="sb-btn"
	                  style={{ width: "100%", minHeight: 44, borderRadius: 999 }}
	                  onClick={async () => {
	                    try {
	                      await navigator.clipboard.writeText(firstPropertyResult.link);
	                      setFirstPropertyCopied(true);
	                      window.setTimeout(() => setFirstPropertyCopied(false), 1000);
	                    } catch {
	                      prompt("Copy this link:", firstPropertyResult.link);
	                    }
	                  }}
	                >
	                  {firstPropertyCopied ? "Copied" : "Copy link"}
	                </button>
			                <button
			                  className="sb-btn sb-btn--ghost sb-cardglow"
			                  style={{
			                    justifyContent: "center",
			                    border: "1px solid var(--primary)",
			                    background: "transparent",
			                    color: "var(--text)",
		                    borderRadius: 999,
		                  }}
		                  onClick={() => {
		                    window.location.href = `/app/propertySetup?property=${encodeURIComponent(firstPropertyResult.propertyId)}&guide=rooms`;
		                  }}
		                >
		                  Continue setup
		                </button>
		                <a
		                  href={firstPropertyResult.link}
		                  target="_blank"
		                  rel="noopener noreferrer"
		                  style={{
		                    color: "var(--primary)",
		                    fontSize: "var(--fs-s)",
		                    lineHeight: "var(--lh-s)",
		                    textAlign: "center",
		                    textDecoration: "none",
		                    overflowWrap: "anywhere",
		                  }}
		                >
		                  {firstPropertyResult.link}
		                </a>
		              </div>
		            </div>
		          </div>
		        </>
		      )}

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
	                This will permanently delete <strong>{toDelete.name}</strong>.
	              </p>
	              <p style={{ color: "var(--muted)" }}>
	                Related rooms, bookings, and integrations may be removed.
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
	                    fontSize: "var(--fs-s)",
	                    fontWeight: "var(--fw-medium)",
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
	                    fontSize: "var(--fs-s)",
	                    fontWeight: "var(--fw-bold)",
	                    cursor: "pointer",
	                  }}
	                >
	                  Delete
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
    </div>
  );
}
