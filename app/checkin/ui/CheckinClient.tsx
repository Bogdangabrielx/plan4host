// app/checkin/ui/CheckinClient.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState, useImperativeHandle } from "react";
import Image from "next/image";

type PropertyInfo = {
  id: string;
  name: string;
  regulation_pdf_url?: string | null;
};

type RoomType = { id: string; name: string };
type Room     = { id: string; name: string; room_type_id?: string | null };
type SubmitState = "idle" | "submitting" | "success" | "error";

type Country = { iso2: string; name: string; nationality_en?: string | null };

function getQueryParam(k: string): string | null {
  if (typeof window === "undefined") return null;
  const u = new URL(window.location.href);
  return u.searchParams.get(k);
}

function todayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function addDaysYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate() + 0).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** ---------- Reusable Combobox (decoupled from parent) ---------- */
type ComboboxHandle = {
  getText: () => string;
  commit: () => void;
};
type ComboboxProps = {
  value: string;                    // committed value from parent
  onCommit: (v: string) => void;    // called on blur, Enter or option select
  options: string[];
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  minChars?: number;                // min chars to start listing options (typing is always free)
  inputStyle?: React.CSSProperties;
};

const Combobox = React.forwardRef<ComboboxHandle, ComboboxProps>(function Combobox(
  { value, onCommit, options, placeholder, ariaLabel, id, minChars = 0, inputStyle },
  ref
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [hi, setHi] = useState<number>(-1);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Precompute a lowercase view for fast includes()
  const lowerOptions = useMemo(() => options.map(o => [o, o.toLowerCase()] as const), [options]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < minChars) return [];
    const out: string[] = [];
    for (let i = 0; i < lowerOptions.length; i++) {
      const [orig, low] = lowerOptions[i];
      if (low.includes(q)) out.push(orig);
      if (out.length >= 50) break; // safety cap
    }
    return out;
  }, [query, minChars, lowerOptions]);

  // Sync external value only when not actively typing here
  useEffect(() => {
    if (!focused) setQuery(value || "");
  }, [value, focused]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function select(v: string) {
    setQuery(v);
    onCommit(v.trim());
    setOpen(false);
  }

  React.useImperativeHandle(ref, () => ({
    getText: () => query,
    commit: () => onCommit(query.trim()),
  }));

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        id={id}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={open}
        aria-controls={id ? id + "-listbox" : undefined}
        aria-autocomplete="list"
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => { setFocused(false); setOpen(false); onCommit(query.trim()); }}
        onChange={(e) => {
          const v = e.currentTarget.value;
          setQuery(v);            // local only → no parent re-render per key
          if (!open) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setOpen(true); return; }
          if (e.key === "ArrowDown") { setHi((i) => Math.min(i + 1, list.length - 1)); e.preventDefault(); }
          else if (e.key === "ArrowUp") { setHi((i) => Math.max(i - 1, 0)); e.preventDefault(); }
          else if (e.key === "Enter") {
            if (open && hi >= 0 && hi < list.length) { select(list[hi]); e.preventDefault(); }
            else { onCommit(query.trim()); setOpen(false); }
          }
          else if (e.key === "Escape") { setOpen(false); }
        }}
        style={inputStyle}
      />
      {open && (
        <ul
          role="listbox"
          id={id ? id + "-listbox" : undefined}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            marginTop: 6,
            maxHeight: 220,
            overflow: "auto",
            padding: 6,
            listStyle: "none",
            display: list.length > 0 ? "block" : "none",
          }}
        >
          {list.map((opt, idx) => (
            <li
              key={opt + idx}
              role="option"
              aria-selected={idx === hi}
              onMouseEnter={() => setHi(idx)}
              onMouseDown={(e) => { e.preventDefault(); select(opt); }}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                cursor: "pointer",
                background: idx === hi ? "var(--primary)" : "transparent",
                color: idx === hi ? "#0c111b" : "var(--text)",
                fontWeight: 700,
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default function CheckinClient() {
  // strict pe ?property=<id>
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [bookingId, setBookingId]   = useState<string | null>(null); // opțional

  // catalog încărcat prin endpoint public (bypass RLS)
  const [prop, setProp]   = useState<PropertyInfo | null>(null);
  const [types, setTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // selections
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  // form fields
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [address,   setAddress]   = useState("");
  const [city,      setCity]      = useState("");

  // Country & Nationality
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryText, setCountryText] = useState<string>("");           // committed
  const [docNationality, setDocNationality] = useState<string>("");     // committed

  // Refs to read the current draft (non-committed) text without re-render
  const countryRef = useRef<ComboboxHandle | null>(null);
  const nationalityRef = useRef<ComboboxHandle | null>(null);

  // Document section
  type DocType = "" | "id_card" | "passport";
  const [docType, setDocType] = useState<DocType>("");
  const [docSeries, setDocSeries] = useState<string>("");   // doar CI (uppercase)
  const [docNumber, setDocNumber] = useState<string>("");   // comun

  // Upload file (foto/PDF) — obligatoriu
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docFilePreview, setDocFilePreview] = useState<string | null>(null);

  // dates
  const [startDate, setStartDate] = useState<string>(() => todayYMD());
  const [endDate,   setEndDate]   = useState<string>(() => addDaysYMD(todayYMD(), 1));
  const [dateError, setDateError] = useState<string>("");

  // house rules gate
  const [pdfViewed, setPdfViewed] = useState(false);
  const [agree, setAgree] = useState(false);

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Confirmation email modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<"idle"|"sending"|"sent"|"error">("idle");
  const [confirmError, setConfirmError] = useState<string>("");

  // responsive helper: 1 col sub 560px
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 560px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsNarrow("matches" in e ? e.matches : (e as MediaQueryList).matches);
    handler(mq);
    mq.addEventListener?.("change", handler as any);
    mq.addListener?.(handler as any); // fallback safari vechi
    return () => {
      mq.removeEventListener?.("change", handler as any);
      mq.removeListener?.(handler as any);
    };
  }, []);

  // revoke preview URLs
  useEffect(() => {
    return () => { if (docFilePreview) URL.revokeObjectURL(docFilePreview); };
  }, [docFilePreview]);

  // ---------- THEME & ICONS ----------
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark") return true;
    if (attr === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    try { m?.addEventListener("change", onChange); } catch { m?.addListener?.(onChange); }
    return () => {
      try { m?.removeEventListener("change", onChange); } catch { m?.removeListener?.(onChange); }
    };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const ob = new MutationObserver(() => {
      const t = root.getAttribute("data-theme");
      if (t === "dark") setIsDark(true);
      if (t === "light") setIsDark(false);
    });
    ob.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => ob.disconnect();
  }, []);

  // formular_* icons (themed)
  const formIcon = (key: "email"|"phone"|"address"|"city"|"country"|"id"|"firstname"|"lastname") => {
    const token = {
      email: "email",
      phone: "phone",
      address: "address",
      city: "city",
      country: "country",
      id: "id",
      firstname: "firstname",
      lastname: "lastname",
    }[key];
    return `/formular_${token}_${isDark ? "fordark" : "forlight"}.png`;
  };

  // generic themed icons (e.g. /room_forlight.png)
  const themedIcon = (base: "room") => `/${base}_${isDark ? "fordark" : "forlight"}.png`;


  
  // ---------- STYLES ----------
  const CARD: React.CSSProperties = useMemo(() => ({
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    overflow: "hidden",
  }), []);
  const INPUT: React.CSSProperties = useMemo(() => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    fontFamily: 'inherit',
    borderRadius: 10,
    fontSize: 14,
  }), []);
  const INPUT_DATE: React.CSSProperties = useMemo(() => ({
    ...INPUT,
    maxWidth: 260,
  }), [INPUT]);
  const SELECT: React.CSSProperties = INPUT;
  const LABEL: React.CSSProperties = useMemo(() => ({
    fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 6, display: "block",
  }), []);
  const LABEL_ROW: React.CSSProperties = useMemo(() => ({
    ...LABEL,
    display: "flex",
    alignItems: "center",
    gap: 6,
  }), [LABEL]);
  const BTN_PRIMARY: React.CSSProperties = useMemo(() => ({
    padding: "12px 16px", borderRadius: 12, border: "1px solid var(--primary)",
    background: "var(--primary)", color: "#0c111b", fontWeight: 900, cursor: "pointer",
  }), []);
  const BTN_GHOST: React.CSSProperties = useMemo(() => ({
    padding: "10px 14px", borderRadius: 12, border: "1px solid var(--border)",
    background: "transparent", color: "var(--text)", fontWeight: 800, cursor: "pointer",
  }), []);
  const ROW_2: React.CSSProperties = useMemo(() => ({
    display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  }), []);
  const ROW_1: React.CSSProperties = useMemo(() => ({
    display: "grid", gap: 12, gridTemplateColumns: "1fr",
  }), []);

  // 1) URL params
  useEffect(() => {
    setPropertyId(getQueryParam("property"));
    setBookingId(getQueryParam("booking"));
  }, []);

  // 2) catalog public
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setProp(null);
      setTypes([]); setRooms([]);
      setPdfUrl(null);
      setSelectedTypeId(""); setSelectedRoomId("");
      setAgree(false); setPdfViewed(false);

      if (!propertyId) { setLoading(false); return; }

      try {
        const res = await fetch(`/api/public/property-catalog?property=${encodeURIComponent(propertyId)}`, { cache: "no-store" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Failed to load property catalog (${res.status})`);
        }
        const j = await res.json();
        if (!alive) return;

        const p = j.property as PropertyInfo;
        const t = (j.room_types ?? []) as Array<{id:string; name:string}>;
        const r = (j.rooms ?? []) as Array<{id:string; name:string; room_type_id?: string|null}>;

        setProp(p);
        setPdfUrl(p?.regulation_pdf_url ?? null);
        setTypes(t.map(x => ({ id: String(x.id), name: String(x.name ?? "Type") })));
        setRooms(r.map(x => ({ id: String(x.id), name: String(x.name ?? "Room"), room_type_id: x.room_type_id ?? null })));
      } catch (e: any) {
        setErrorMsg(e?.message || "Failed to load property data.");
        setSubmitState("error");
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [propertyId]);

  // 2.1) țări + naționalități
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/public/countries", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (!alive) return;
        const arr: Country[] = Array.isArray(j?.countries) ? j.countries : [];
        arr.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
        setCountries(arr);
      } catch { /* fallback text */ }
    })();
    return () => { alive = false; };
  }, []);

  // 3) validare date
  useEffect(() => {
    if (!startDate || !endDate) { setDateError(""); return; }
    setDateError(endDate <= startDate ? "Check-out must be after check-in." : "");
  }, [startDate, endDate]);

  const nationalityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of countries) {
      const n = (c.nationality_en ?? "").trim();
      if (n) set.add(n);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [countries]);

  const hasTypes = types.length > 0;

  // trebuie să fie deschis PDF-ul dacă există
  const consentGatePassed = !pdfUrl || pdfViewed;

  // Folosim textul curent din input-uri chiar dacă nu e "commit"
  const currentCountry = (countryRef.current?.getText() ?? countryText).trim();
  const currentNationality = (nationalityRef.current?.getText() ?? docNationality).trim();

  const countryValid = currentCountry.length > 0;

  const docValid = (() => {
    if (docType === "") return false;
    if (docNumber.trim().length < 1) return false;
    if (docType === "id_card") return docSeries.trim().length > 0;
    if (docType === "passport") return currentNationality.length > 0;
    return false;
  })();

  const canSubmit =
    !!propertyId &&
    !!prop?.id &&
    firstName.trim().length >= 1 &&
    lastName.trim().length  >= 1 &&
    /\S+@\S+\.\S+/.test(email) &&
    phone.trim().length >= 5 &&
    (!dateError && !!startDate && !!endDate) &&
    (hasTypes ? !!selectedTypeId : !!selectedRoomId) &&
    countryValid &&
    docValid &&
    !!docFile && // document upload obligatoriu
    consentGatePassed && agree &&
    submitState !== "submitting";

  // deschide PDF-ul (marchează vizualizat)
  function onOpenPdf() {
    if (!pdfUrl) return;
    try { setPdfViewed(true); } catch {}
  }

  // upload helper
  async function uploadDocFile(): Promise<{ path: string; mime: string } | null> {
    if (!docFile || !propertyId) return null;
    const fd = new FormData();
    fd.append("file", docFile);
    fd.append("property", propertyId);
    if (bookingId) fd.append("booking", bookingId);
    const res = await fetch("/api/checkin/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || "Upload failed");
    }
    const j = await res.json();
    return { path: j?.path as string, mime: docFile.type || "application/octet-stream" };
  }

  // 4) submit
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitState("submitting");
    setErrorMsg("");

    // asigură „commit” din combobox-uri înainte de trimis
    countryRef.current?.commit();
    nationalityRef.current?.commit();

    const countryToSend = (countryRef.current?.getText() ?? countryText).trim();
    const nationalityToSend = (nationalityRef.current?.getText() ?? docNationality).trim();

    try {
      // 4.1 upload fișier (obligatoriu)
      const uploaded = await uploadDocFile();
      if (!uploaded) throw new Error("Please upload your ID document.");

      // 4.2 payload
      const payload: any = {
        property_id: propertyId!,
        booking_id: bookingId,
        start_date: startDate,
        end_date: endDate,
        guest_first_name: firstName.trim(),
        guest_last_name:  lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        country: countryToSend,
        requested_room_type_id: hasTypes ? selectedTypeId : null,
        requested_room_id:     hasTypes ? null : selectedRoomId,

        // document
        doc_type: docType, // "id_card" | "passport"
        doc_series: docType === "id_card" ? docSeries.trim() : null,
        doc_number: docNumber.trim(),
        doc_nationality: docType === "passport" ? nationalityToSend : null,

        // file
        doc_file_path: uploaded.path,
        doc_file_mime: uploaded.mime,
      };

      const res = await fetch("/api/checkin/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = j?.error || j?.message || "Submission failed. Please try again.";
        setErrorMsg(msg);
        setSubmitState("error");
        return;
      }

      // păstrăm în parent și valorile finale „committed”
      setCountryText(countryToSend);
      if (docType === "passport") setDocNationality(nationalityToSend);

      // Trigger confirmation email modal + send
      const j = await res.json().catch(() => ({}));
      const booking = (j?.id || null) as string | null;
      if (booking) {
        setConfirmOpen(true);
        setConfirmStatus("sending");
        setConfirmError("");
        try {
          const r = await fetch('/api/checkin/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: booking, property_id: propertyId, email })
          });
          const jj = await r.json().catch(()=>({}));
          if (r.ok && jj?.sent) setConfirmStatus("sent");
          else { setConfirmStatus("error"); setConfirmError(jj?.error || jj?.message || 'Failed to send'); }
        } catch (er:any) {
          setConfirmStatus("error"); setConfirmError(er?.message || 'Failed to send');
        }
      }
      // Mark submit success, but show final Thank you only after email is sent
      setSubmitState("success");
    } catch (err: any) {
      setErrorMsg(err?.message || "Unexpected error. Please try again.");
      setSubmitState("error");
    }
  }

  // Auto-close confirmation modal on successful send
  useEffect(() => {
    if (confirmStatus === 'sent') {
      setConfirmOpen(false);
    }
  }, [confirmStatus]);

  // 5) render
  if (!propertyId) {
    return (
      <div style={{ maxWidth: 720, margin: "24px auto", padding: 16, fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
        <div style={CARD}>
          <h1 style={{ marginTop: 0, marginBottom: 8 }}>Check-in</h1>
          <p style={{ color: "var(--muted)" }}>
            Missing property. This link must include <code>?property=&lt;PROPERTY_ID&gt;</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: "24px auto", padding: 16, display: "grid", gap: 16, fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      {/* Light CSS for pulse animation */}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes p4h-pulse{0%{opacity:.6}50%{opacity:1}100%{opacity:.6}}` }} />
      {/* Header */}
      <section style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, letterSpacing: 0.3, alignContent:"center" }}>
               Stay Smart, Experience Better  <br />
               <br />
            </h1>
            <p style={{ margin: "6px 0 0 0", color: "var(--muted)" }}>
              Thank you for choosing us!<br />
              Please fill in the fields below with the requested information.<br />
              Once you complete the online check-in, you will automatically receive an email with confirmation of check-in for {prop?.name ?? "the property"}. <br />
              Please note that all information you provide is strictly confidential.<br />
              Thank you for your patience!
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section style={CARD}>
        {loading ? (
          <div style={{ color: "var(--muted)" }}>Loading…</div>
        ) : (submitState === "success" && confirmStatus === "sent") ? (
          <div>
            <h2 style={{ marginTop: 0 }}>Thank you! ✅</h2>
            <p style={{ color: "var(--muted)" }}>
              Your check-in details were submitted successfully.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
            {/* Dates */}
            <div style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
              alignItems: "start",
            }}>
              <div>
                <label style={LABEL}>Check-in date*</label>
                <input
                  style={INPUT_DATE}
                  type="date"
                  value={startDate}
                  min={todayYMD()}
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    setStartDate(v);
                    if (endDate <= v) setEndDate(addDaysYMD(v, 1));
                  }}
                />
              </div>
              <div>
                <label style={LABEL}>Check-out date*</label>
                <input
                  style={INPUT_DATE}
                  type="date"
                  value={endDate}
                  min={addDaysYMD(startDate, 1)}
                  onChange={(e) => setEndDate(e.currentTarget.value)}
                />
              </div>
            </div>
            {dateError && (
              <div role="alert" style={{ padding: 10, borderRadius: 10, background: "var(--danger)", color: "#0c111b", fontWeight: 800 }}>
                {dateError}
              </div>
            )}

            {/* RoomType sau Room */}
            {types.length > 0 ? (
              <div style={ROW_1}>
                <div>
                  <label htmlFor="checkin-room-type" style={LABEL_ROW}>
                    <Image src={themedIcon("room")} alt="" width={16} height={16} />
                    <span>Booked room type*</span>
                  </label>
                  <select
                    id="checkin-room-type"
                    style={SELECT}
                    value={selectedTypeId}
                    onChange={(e) => setSelectedTypeId(e.currentTarget.value)}
                  >
                    <option value="" disabled>Select room type…</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div style={ROW_1}>
                <div>
                  <label htmlFor="checkin-room" style={LABEL_ROW}>
                    <Image src={themedIcon("room")} alt="" width={16} height={16} />
                    <span>Booked room*</span>
                  </label>
                  <select
                    id="checkin-room"
                    style={SELECT}
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.currentTarget.value)}
                  >
                    <option value="" disabled>Select room…</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Name */}
            <div style={ROW_2}>
              <div>
                <label htmlFor="checkin-first-name" style={LABEL_ROW}>
                  <Image src={formIcon("firstname")} alt="" width={16} height={16} />
                  <span>First name*</span>
                </label>
                <input id="checkin-first-name" style={INPUT} value={firstName} onChange={e => setFirstName(e.currentTarget.value)} placeholder="First Name" />
              </div>
              <div>
                <label htmlFor="checkin-last-name" style={LABEL_ROW}>
                  <Image src={formIcon("lastname")} alt="" width={16} height={16} />
                  <span>Last name*</span>
                </label>
                <input id="checkin-last-name" style={INPUT} value={lastName} onChange={e => setLastName(e.currentTarget.value)} placeholder="Last Name" />
              </div>
            </div>

            {/* Contact */}
            <div style={ROW_2}>
              <div>
                <label htmlFor="checkin-email" style={LABEL_ROW}>
                  <Image src={formIcon("email")} alt="" width={16} height={16} />
                  <span>Email*</span>
                </label>
                <input id="checkin-email" style={INPUT} type="email" value={email} onChange={e => setEmail(e.currentTarget.value)} placeholder="***@example.com" />
              </div>
              <div>
                <label htmlFor="checkin-phone" style={LABEL_ROW}>
                  <Image src={formIcon("phone")} alt="" width={16} height={16} />
                  <span>Phone*</span>
                </label>
                <input id="checkin-phone" style={INPUT} value={phone} onChange={e => setPhone(e.currentTarget.value)} placeholder="+40 700 000 000" />
              </div>
            </div>

            {/* Address */}
            <div style={ROW_1}>
              <div>
                <label htmlFor="checkin-address" style={LABEL_ROW}>
                  <Image src={formIcon("address")} alt="" width={16} height={16} />
                  <span>Address</span>
                </label>
                <input id="checkin-address" style={INPUT} value={address} onChange={e => setAddress(e.currentTarget.value)} placeholder="Street, number, apt." />
              </div>

              <div style={ROW_2}>
                <div>
                  <label htmlFor="checkin-city" style={LABEL_ROW}>
                    <Image src={formIcon("city")} alt="" width={16} height={16} />
                    <span>City</span>
                  </label>
                  <input id="checkin-city" style={INPUT} value={city} onChange={e => setCity(e.currentTarget.value)} placeholder="Bucharest" />
                </div>

                <div>
                  <label htmlFor="checkin-country" style={LABEL_ROW}>
                    <Image src={formIcon("country")} alt="" width={16} height={16} />
                    <span>Country*</span>
                  </label>
                  <Combobox
                    ref={countryRef}
                    id="checkin-country"
                    ariaLabel="Country"
                    value={countryText}
                    onCommit={setCountryText}
                    options={countries.map(c => c.name)}
                    placeholder="Start typing… e.g. Romania"
                    minChars={0}
                    inputStyle={INPUT}
                  />
                </div>
              </div>
            </div>

            {/* Identity document */}
            <div style={{ ...ROW_1, marginTop: 6 }}>
              <div>
                <label htmlFor="checkin-doc-type" style={LABEL_ROW}>
                  <Image src={formIcon("id")} alt="" width={16} height={16} />
                  <span>Document type*</span>
                </label>
                <select
                  id="checkin-doc-type"
                  style={SELECT}
                  value={docType}
                  onChange={(e) => {
                    const v = e.currentTarget.value as DocType;
                    setDocType(v);
                    setDocSeries("");
                    setDocNumber("");
                    setDocNationality("");
                    // Reset combobox draft for nationality when switching types
                    if (nationalityRef.current) nationalityRef.current.commit();
                  }}
                >
                  <option value="" disabled>Select document type…</option>
                  <option value="id_card">Identity card</option>
                  <option value="passport">Passport</option>
                </select>
              </div>

              {/* Conditional fields */}
              {docType === "id_card" && (
                <div style={ROW_2}>
                  <div>
                    <label style={LABEL}>Series*</label>
                    <input
                      style={{ ...INPUT, textTransform: "uppercase" }}
                      value={docSeries}
                      onChange={(e) => setDocSeries(e.currentTarget.value.toUpperCase())}
                      placeholder="e.g. AB"
                      inputMode="text"
                    />
                  </div>
                  <div>
                    <label style={LABEL}>Number*</label>
                    <input
                      style={INPUT}
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.currentTarget.value)}
                      placeholder="e.g. 123456"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              )}

              {docType === "passport" && (
                <div style={ROW_2}>
                  <div>
                    <label style={LABEL}>Nationality (citizenship)*</label>
                    <Combobox
                      ref={nationalityRef}
                      id="checkin-nationality"
                      ariaLabel="Nationality"
                      value={docNationality}
                      onCommit={setDocNationality}
                      options={nationalityOptions}
                      placeholder="Start typing… e.g. Romanian"
                      minChars={0}
                      inputStyle={INPUT}
                    />
                  </div>
                  <div>
                    <label style={LABEL}>Number*</label>
                    <input
                      style={INPUT}
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.currentTarget.value)}
                      placeholder="e.g. X1234567"
                    />
                  </div>
                </div>
              )}

              {/* Upload ID document (photo/PDF) — obligatoriu */}
              <div style={{ marginTop: 6 }}>
                <label style={LABEL}>Upload ID document (photo/PDF)*</label>
                <input
                  style={INPUT}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0] ?? null;
                    setDocFile(f || null);
                    if (f && f.type.startsWith("image/")) {
                      const url = URL.createObjectURL(f);
                      setDocFilePreview(url);
                    } else {
                      setDocFilePreview(null);
                    }
                  }}
                />
                {docFile && (
                  <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                    {docFilePreview ? (
                      <img
                        src={docFilePreview}
                        alt="Preview"
                        style={{ maxWidth: "320px", borderRadius: 8, border: "1px solid var(--border)" }}
                      />
                    ) : (
                      <small style={{ color: "var(--muted)" }}>
                        {docFile.name} ({docFile.type || "application/octet-stream"})
                      </small>
                    )}
                    <button
                      type="button"
                      onClick={() => { setDocFile(null); setDocFilePreview(null); }}
                      style={BTN_GHOST}
                    >
                      Remove file
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Consent — ALWAYS visible; checkbox enabled only after opening the PDF (if exists) */}
            <div
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--card)",
                display: "flex",
                alignItems: "flex-start",
                gap: 5,
              }}
            >
              <input
                id="agree"
                type="checkbox"
                checked={agree}
                disabled={!!pdfUrl && !pdfViewed}
                onChange={(e) => setAgree(e.currentTarget.checked)}
                style={{ marginTop: 3, cursor: (!!pdfUrl && !pdfViewed) ? "not-allowed" : "pointer" }}
                title={!!pdfUrl && !pdfViewed ? "Open the House Rules to enable this checkbox." : undefined}
              />
              <label htmlFor="agree" style={{ fontSize:13, color: "var(--muted)" }}>
                I have read and agree to the{" "}
                {pdfUrl ? (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onOpenPdf}
                    style={{ fontWeight: 700, fontSize:12 }}
                  >
                    Property Rules (pdf)
                  </a>
                ) : (
                  <span style={{ fontStyle: "italic" }}>House Rules</span>
                )}
                .
                {!!pdfUrl && !pdfViewed && (
                  <span style={{ marginLeft: 6 }}>
                    (Please open the PDF to enable the checkbox)
                  </span>
                )}
                {!!pdfUrl && pdfViewed && (
                  <span style={{ marginLeft: 6, color: "var(--text)", fontWeight: 700, fontSize:9 }}>
                    Opened
                  </span>
                )}
              </label>
            </div>

            {/* Error */}
            {submitState === "error" && errorMsg && (
              <div role="alert" style={{ padding: 12, borderRadius: 12, background: "var(--danger)", color: "#0c111b", fontWeight: 800 }}>
                {errorMsg}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/")} style={BTN_GHOST}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                style={{ ...BTN_PRIMARY, opacity: canSubmit ? 1 : 0.6, cursor: canSubmit ? "pointer" : "not-allowed" }}
              >
                {submitState === "submitting" ? "Submitting…" : "Submit check-in"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Confirmation email modal */}
      {confirmOpen && (
        <div role="dialog" aria-modal="true" onClick={()=>setConfirmOpen(false)}
          style={{ position:'fixed', inset:0, zIndex: 300, background:'rgba(0,0,0,.55)', display:'grid', placeItems:'center', padding:12 }}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(540px, 100%)', padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <strong>Confirmation Email</strong>
              <button className="sb-btn" onClick={()=>setConfirmOpen(false)}>Close</button>
            </div>
            {confirmStatus === 'sending' && (
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ width:10, height:10, borderRadius:999, background:'var(--primary)', animation:'p4h-pulse 1.2s infinite' }} />
                <span>Sending…</span>
              </div>
            )}
            {confirmStatus === 'sent' && (
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span className="sb-badge" style={{ background:'var(--primary)', color:'#0c111b', borderColor:'var(--primary)' }}>Sent</span>
                <span>We sent a confirmation email to your address.</span>
              </div>
            )}
            {confirmStatus === 'error' && (
              <div style={{ display:'grid', gap:8 }}>
                <div style={{ padding: 10, borderRadius: 10, background:'var(--danger)', color:'#0c111b', fontWeight:800 }}>
                  Error sending confirmation email.
                </div>
                <small style={{ color:'var(--muted)' }}>
                  You can try again in 30 minutes or contact the property directly.
                </small>
              </div>
            )}
            <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end' }}>
              <button className="sb-btn" onClick={()=>setConfirmOpen(false)}>OK</button>
            </div>
          </div>
        </div>
      )}

      <p style={{ color: "var(--muted)", textAlign: "center", fontSize: 12 }}>
        Powered by Plan4Host — secure check-in.
      </p>
    </div>
  );
}
