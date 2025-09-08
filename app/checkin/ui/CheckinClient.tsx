"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PropertyInfo = {
  id: string;
  name: string;
  regulation_pdf_url?: string | null;
  timezone?: string | null;
  country_code?: string | null;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

type RoomType = { id: string; name: string };
type Room     = { id: string; name: string; room_type_id?: string | null };

function useQueryParam(key: string) {
  const [val, setVal] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    setVal(u.searchParams.get(key));
  }, []);
  return val;
}

function todayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function addDaysYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export default function CheckinClient() {
  const propertyId = useQueryParam("property");
  const bookingId  = useQueryParam("booking"); // optional

  const supabase = useMemo(() => createClient(), []);
  const [prop, setProp] = useState<PropertyInfo | null>(null);

  // catalog legat de proprietate
  const [types, setTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const hasTypes = types.length > 0;

  // PDF
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfOpened, setPdfOpened] = useState(false);

  // form fields
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [address,   setAddress]   = useState("");
  const [city,      setCity]      = useState("");
  const [country,   setCountry]   = useState("");

  // dates
  const [startDate, setStartDate] = useState<string>(() => todayYMD());
  const [endDate,   setEndDate]   = useState<string>(() => addDaysYMD(todayYMD(), 1));
  const [dateError, setDateError] = useState<string>("");

  // selections (depend de configurator)
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  const [agree, setAgree] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState(true);

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
    padding: "12px 12px",
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
  }), []);
  const SELECT: React.CSSProperties = INPUT;

  const LABEL: React.CSSProperties = useMemo(() => ({
    fontSize: 12,
    fontWeight: 800,
    color: "var(--muted)",
    marginBottom: 6,
    display: "block",
  }), []);

  const BTN_PRIMARY: React.CSSProperties = useMemo(() => ({
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid var(--primary)",
    background: "var(--primary)",
    color: "#0c111b",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  }), []);

  const BTN_GHOST: React.CSSProperties = useMemo(() => ({
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--text)",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  }), []);

  const ROW_2: React.CSSProperties = useMemo(() => ({
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  }), []);
  const ROW_1: React.CSSProperties = useMemo(() => ({
    display: "grid",
    gap: 12,
    gridTemplateColumns: "1fr",
  }), []);

  // ------- LOAD: property + catalog direct din Supabase (legat la propertyId) -------
  useEffect(() => {
    (async () => {
      if (!propertyId) { setLoading(false); return; }

      try {
        // 1) Property (inclusiv url PDF)
        const { data: p, error: eP } = await supabase
          .from("properties")
          .select("id,name,regulation_pdf_url,timezone,country_code")
          .eq("id", propertyId)
          .maybeSingle();
        if (!eP && p) {
          setProp(p as PropertyInfo);
          setPdfUrl((p as any)?.regulation_pdf_url ?? null);
        }

        // 2) Room Types (dacă există în configurator)
        const { data: t, error: eT } = await supabase
          .from("room_types")
          .select("id,name")
          .eq("property_id", propertyId)
          .order("name", { ascending: true });
        if (!eT && Array.isArray(t)) {
          setTypes((t as any[]).map(x => ({ id: String(x.id), name: String(x.name ?? "Type") })));
        } else {
          setTypes([]);
        }

        // 3) Rooms (pentru fallback când nu avem types)
        const { data: r, error: eR } = await supabase
          .from("rooms")
          .select("id,name,room_type_id")
          .eq("property_id", propertyId)
          .order("name", { ascending: true });
        if (!eR && Array.isArray(r)) {
          setRooms((r as any[]).map(x => ({
            id: String(x.id),
            name: String(x.name ?? "Room"),
            room_type_id: x.room_type_id ?? null,
          })));
        } else {
          setRooms([]);
        }

        // 4) pdfOpened din sesiune (per property)
        try {
          const key = `p4h:pdfOpened:${propertyId}`;
          const val = sessionStorage.getItem(key);
          if (val === "1") setPdfOpened(true);
        } catch {}

        // 5) Preselect (în funcție de configurator)
        setTimeout(() => {
          const hasTypesLocal = (t?.length ?? 0) > 0;
          if (hasTypesLocal) {
            setSelectedTypeId(String(t![0].id));
          } else if ((r?.length ?? 0) > 0) {
            setSelectedRoomId(String(r![0].id));
          }
        }, 0);
      } finally {
        setLoading(false);
      }
    })();
  }, [propertyId, supabase]);

  // ------- Validări -------
  useEffect(() => {
    if (!startDate || !endDate) { setDateError(""); return; }
    if (endDate <= startDate) setDateError("Check-out must be after check-in.");
    else setDateError("");
  }, [startDate, endDate]);

  const canSubmit =
    !!propertyId &&
    !!prop?.id &&
    firstName.trim().length >= 1 &&
    lastName.trim().length  >= 1 &&
    /\S+@\S+\.\S+/.test(email) &&
    phone.trim().length >= 5 &&
    (!dateError && !!startDate && !!endDate) &&
    ((types.length > 0) ? !!selectedTypeId : !!selectedRoomId) &&
    // acordul e obligatoriu; checkbox-ul devine vizibil doar după ce deschide PDF-ul (dacă există)
    (!pdfUrl || (pdfUrl && pdfOpened)) &&
    agree &&
    submitState !== "submitting";

  // ------- PDF Gate -------
  function onOpenPdf() {
    if (!pdfUrl) return;
    try {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      setPdfOpened(true);
      if (propertyId) {
        try { sessionStorage.setItem(`p4h:pdfOpened:${propertyId}`, "1"); } catch {}
      }
    } catch {
      setPdfOpened(true);
    }
  }

  // ------- Submit -------
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitState("submitting");
    setErrorMsg("");

    try {
      const payload: any = {
        property_id: propertyId,
        booking_id: bookingId ?? null,
        start_date: startDate,
        end_date: endDate,
        guest_first_name: firstName.trim(),
        guest_last_name:  lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        country: country.trim(),
        requested_room_type_id: (types.length > 0) ? (selectedTypeId || null) : null,
        requested_room_id:     (types.length > 0) ? null : (selectedRoomId || null),
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

      setSubmitState("success");
    } catch {
      setErrorMsg("Unexpected error. Please try again.");
      setSubmitState("error");
    }
  }

  // ------- RENDER -------
  if (!propertyId) {
    return (
      <div style={{ maxWidth: 720, margin: "24px auto", padding: 16 }}>
        <div style={CARD}>
          <h1 style={{ marginTop: 0, marginBottom: 8 }}>Check-in</h1>
          <p style={{ color: "var(--muted)" }}>
            Missing property. Please use the link provided by your host.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: "24px auto", padding: 16, display: "grid", gap: 16 }}>
      {/* Header */}
      <section style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 0.3 }}>
              Guest Check-in — {prop?.name ?? "Property"}
            </h1>
            <p style={{ margin: "6px 0 0 0", color: "var(--muted)" }}>
              Please fill in the required details. It takes ~2 minutes.
            </p>
          </div>

          {pdfUrl && (
            <button
              type="button"
              onClick={onOpenPdf}
              style={BTN_GHOST}
              title="Open house rules (PDF)"
            >
              📄 House rules (PDF)
            </button>
          )}
        </div>

        {pdfUrl && !pdfOpened && (
          <p style={{ margin: "10px 0 0 0", color: "var(--muted)", fontStyle: "italic" }}>
            Please open the House rules (PDF) to continue.
          </p>
        )}
      </section>

      {/* Form */}
      <section style={CARD}>
        {loading ? (
          <div style={{ color: "var(--muted)" }}>Loading…</div>
        ) : submitState === "success" ? (
          <div>
            <h2 style={{ marginTop: 0 }}>Thank you! ✅</h2>
            <p style={{ color: "var(--muted)" }}>
              Your check-in details were submitted successfully.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
            {/* Dates */}
            <div style={ROW_2}>
              <div>
                <label style={LABEL}>Check-in date*</label>
                <input
                  style={INPUT}
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
                  style={INPUT}
                  type="date"
                  value={endDate}
                  min={addDaysYMD(startDate, 1)}
                  onChange={(e) => setEndDate(e.currentTarget.value)}
                />
              </div>
            </div>
            {dateError && (
              <div
                role="alert"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: "var(--danger)",
                  color: "#0c111b",
                  fontWeight: 800,
                }}
              >
                {dateError}
              </div>
            )}

            {/* RoomType sau Room (în funcție de configurator) */}
            {types.length > 0 ? (
              <div style={ROW_1}>
                <div>
                  <label style={LABEL}>Preferred room type*</label>
                  <select
                    style={SELECT}
                    value={selectedTypeId}
                    onChange={(e) => setSelectedTypeId(e.currentTarget.value)}
                  >
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div style={ROW_1}>
                <div>
                  <label style={LABEL}>Preferred room*</label>
                  <select
                    style={SELECT}
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.currentTarget.value)}
                  >
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
                <label style={LABEL}>First name*</label>
                <input style={INPUT} value={firstName} onChange={e => setFirstName(e.currentTarget.value)} placeholder="John" />
              </div>
              <div>
                <label style={LABEL}>Last name*</label>
                <input style={INPUT} value={lastName} onChange={e => setLastName(e.currentTarget.value)} placeholder="Doe" />
              </div>
            </div>

            {/* Contact */}
            <div style={ROW_2}>
              <div>
                <label style={LABEL}>Email*</label>
                <input style={INPUT} type="email" value={email} onChange={e => setEmail(e.currentTarget.value)} placeholder="john@doe.com" />
              </div>
              <div>
                <label style={LABEL}>Phone*</label>
                <input style={INPUT} value={phone} onChange={e => setPhone(e.currentTarget.value)} placeholder="+40 712 345 678" />
              </div>
            </div>

            {/* Address */}
            <div style={ROW_1}>
              <div>
                <label style={LABEL}>Address</label>
                <input style={INPUT} value={address} onChange={e => setAddress(e.currentTarget.value)} placeholder="Street, number, apt." />
              </div>
              <div style={ROW_2}>
                <div>
                  <label style={LABEL}>City</label>
                  <input style={INPUT} value={city} onChange={e => setCity(e.currentTarget.value)} placeholder="Bucharest" />
                </div>
                <div>
                  <label style={LABEL}>Country</label>
                  <input style={INPUT} value={country} onChange={e => setCountry(e.currentTarget.value)} placeholder="Romania" />
                </div>
              </div>
            </div>

            {/* Consent (vizibil doar după ce deschide PDF-ul, dacă există) */}
            {(!pdfUrl || pdfOpened) && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <input
                  id="agree"
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.currentTarget.checked)}
                  style={{ marginTop: 3 }}
                />
                <label htmlFor="agree" style={{ color: "var(--muted)", cursor: "pointer" }}>
                  I confirm the information is correct and I agree to the house rules{pdfUrl ? " (see PDF link above)" : ""}.
                </label>
              </div>
            )}

            {/* Error */}
            {submitState === "error" && errorMsg && (
              <div
                role="alert"
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "var(--danger)",
                  color: "#0c111b",
                  fontWeight: 800,
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/")}
                style={BTN_GHOST}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  ...BTN_PRIMARY,
                  opacity: canSubmit ? 1 : 0.6,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                }}
              >
                {submitState === "submitting" ? "Submitting…" : "Submit check-in"}
              </button>
            </div>
          </form>
        )}
      </section>

      <p style={{ color: "var(--muted)", textAlign: "center", fontSize: 12 }}>
        Powered by Plan4Host — secure check-in.
      </p>
    </div>
  );
}