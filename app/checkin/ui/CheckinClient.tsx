// app/checkin/ui/CheckinClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PropertyInfo = {
  id: string;
  name: string;
  regulation_pdf_url?: string | null;
};

type RoomType = { id: string; name: string };
type Room     = { id: string; name: string; room_type_id?: string | null };
type SubmitState = "idle" | "submitting" | "success" | "error";

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
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export default function CheckinClient() {
  const supabase = useMemo(() => createClient(), []);
  const [propertyId, setPropertyId] = useState<string | null>(null);

  // Property + catalog (STRICT pe propertyId din URL)
  const [prop, setProp] = useState<PropertyInfo | null>(null);
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
  const [country,   setCountry]   = useState("");

  // dates
  const [startDate, setStartDate] = useState<string>(() => todayYMD());
  const [endDate,   setEndDate]   = useState<string>(() => addDaysYMD(todayYMD(), 1));
  const [dateError, setDateError] = useState<string>("");

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
    width: "100%", boxSizing: "border-box", padding: "12px",
    background: "var(--card)", color: "var(--text)",
    border: "1px solid var(--border)", borderRadius: 10, fontSize: 14,
  }), []);
  const SELECT: React.CSSProperties = INPUT;
  const LABEL: React.CSSProperties = useMemo(() => ({
    fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 6, display: "block",
  }), []);
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

  // 1) Citește strict ?property=<id> din URL
  useEffect(() => {
    setPropertyId(getQueryParam("property"));
  }, []);

  // 2) Load live (fără niciun cache local) pe baza propertyId
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setProp(null);
      setTypes([]);
      setRooms([]);
      setPdfUrl(null);
      setSelectedTypeId("");
      setSelectedRoomId("");

      const pid = propertyId;
      if (!pid) { setLoading(false); return; }

      // Property + PDF
      const { data: p, error: eP } = await supabase
        .from("properties")
        .select("id,name,regulation_pdf_url")
        .eq("id", pid)
        .maybeSingle();
      if (alive && !eP && p) {
        setProp(p as PropertyInfo);
        setPdfUrl((p as any)?.regulation_pdf_url ?? null);
      }

      // Room Types
      const { data: t, error: eT } = await supabase
        .from("room_types")
        .select("id,name")
        .eq("property_id", pid)
        .order("name", { ascending: true });
      const tNorm: RoomType[] = (!eT && Array.isArray(t) ? t : []).map(x => ({ id: String(x.id), name: String(x.name ?? "Type") }));

      // Rooms
      const { data: r, error: eR } = await supabase
        .from("rooms")
        .select("id,name,room_type_id")
        .eq("property_id", pid)
        .order("name", { ascending: true });
      const rNorm: Room[] = (!eR && Array.isArray(r) ? r : []).map(x => ({
        id: String(x.id),
        name: String(x.name ?? "Room"),
        room_type_id: x.room_type_id ?? null,
      }));

      if (!alive) return;
      setTypes(tNorm);
      setRooms(rNorm);

      // Preselectare clară (tip dacă există, altfel cameră)
      if (tNorm.length > 0) setSelectedTypeId(tNorm[0].id);
      else if (rNorm.length > 0) setSelectedRoomId(rNorm[0].id);

      setLoading(false);
    })();
    return () => { alive = false; };
  }, [propertyId, supabase]);

  // 3) Validări de date
  useEffect(() => {
    if (!startDate || !endDate) { setDateError(""); return; }
    setDateError(endDate <= startDate ? "Check-out must be after check-in." : "");
  }, [startDate, endDate]);

  const hasTypes = types.length > 0;
  const canSubmit =
    !!propertyId &&
    !!prop?.id &&
    firstName.trim().length >= 1 &&
    lastName.trim().length  >= 1 &&
    /\S+@\S+\.\S+/.test(email) &&
    phone.trim().length >= 5 &&
    (!dateError && !!startDate && !!endDate) &&
    (hasTypes ? !!selectedTypeId : !!selectedRoomId) &&
    agree &&
    submitState !== "submitting";

  function onOpenPdf() {
    if (!pdfUrl) return;
    try { window.open(pdfUrl, "_blank", "noopener,noreferrer"); } catch {}
  }

  // 4) Submit — trimite EXACT același property_id primit din URL
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitState("submitting");
    setErrorMsg("");

    try {
      const payload = {
        property_id: propertyId!,          // <- ID-ul proprietății din URL
        booking_id: null,                  // link property-level; dacă vei adăuga booking param, îl trimiți aici
        start_date: startDate,
        end_date: endDate,
        guest_first_name: firstName.trim(),
        guest_last_name:  lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        country: country.trim(),
        requested_room_type_id: hasTypes ? selectedTypeId : null,
        requested_room_id:     hasTypes ? null : selectedRoomId,
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
    } catch (err) {
      setErrorMsg("Unexpected error. Please try again.");
      setSubmitState("error");
    }
  }

  // 5) Render
  if (!propertyId) {
    return (
      <div style={{ maxWidth: 720, margin: "24px auto", padding: 16 }}>
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
            <button type="button" onClick={onOpenPdf} style={BTN_GHOST} title="Open house rules (PDF)">
              📄 House rules (PDF)
            </button>
          )}
        </div>
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
              <div role="alert" style={{ padding: 10, borderRadius: 10, background: "var(--danger)", color: "#0c111b", fontWeight: 800 }}>
                {dateError}
              </div>
            )}

            {/* RoomType sau Room */}
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

            {/* Consent */}
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
                I confirm the information is correct and I agree to the house rules{pdfUrl ? " (PDF link in header)" : ""}.
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

      <p style={{ color: "var(--muted)", textAlign: "center", fontSize: 12 }}>
        Powered by Plan4Host — secure check-in.
      </p>
    </div>
  );
}