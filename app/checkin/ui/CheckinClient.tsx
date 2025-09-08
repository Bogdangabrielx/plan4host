"use client";

import { useEffect, useMemo, useState } from "react";

type PropertyInfo = {
  id: string;
  name: string;
  timezone?: string | null;
  country_code?: string | null;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

function useQueryParam(key: string) {
  const [val, setVal] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    setVal(u.searchParams.get(key));
  }, []);
  return val;
}

export default function CheckinClient() {
  const propertyId = useQueryParam("property");
  const bookingId  = useQueryParam("booking"); // optional

  const [prop, setProp] = useState<PropertyInfo | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // form fields
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [address,   setAddress]   = useState("");
  const [city,      setCity]      = useState("");
  const [country,   setCountry]   = useState("");

  const [agree,     setAgree]     = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Styling helpers
  const CARD: React.CSSProperties = useMemo(() => ({
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  }), []);

  const INPUT: React.CSSProperties = useMemo(() => ({
    width: "100%",
    padding: "12px 12px",
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
  }), []);

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
  }), []);

  const BTN_GHOST: React.CSSProperties = useMemo(() => ({
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--text)",
    fontWeight: 800,
    cursor: "pointer",
  }), []);

  // load property + regulations (silence noisy errors like "Bucket not found")
  useEffect(() => {
    (async () => {
      if (!propertyId) { setLoading(false); return; }

      try {
        // Property name (lightweight)
        const resProp = await fetch(`/api/property/basic?id=${propertyId}`, { cache: "no-store" }).catch(() => null);
        if (resProp && resProp.ok) {
          const j = await resProp.json().catch(() => ({}));
          if (j?.property) setProp(j.property as PropertyInfo);
        }

        // Regulations PDF — ignore errors completely, just treat as "no pdf"
        const resPdf = await fetch(`/api/property/regulation?propertyId=${propertyId}`, { cache: "no-store" }).catch(() => null);
        if (resPdf && resPdf.ok) {
          const j = await resPdf.json().catch(() => ({}));
          // accept either {url:"..."} or {data:{url:"..."}}
          const url = j?.url ?? j?.data?.url ?? null;
          if (url && typeof url === "string") setPdfUrl(url);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [propertyId]);

  // validation
  const canSubmit =
    !!propertyId &&
    firstName.trim().length >= 1 &&
    lastName.trim().length  >= 1 &&
    /\S+@\S+\.\S+/.test(email) &&
    phone.trim().length >= 5 &&
    agree &&
    submitState !== "submitting";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitState("submitting");
    setErrorMsg("");

    try {
      const payload = {
        property_id: propertyId,
        booking_id: bookingId ?? null,
        guest_first_name: firstName.trim(),
        guest_last_name:  lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        country: country.trim(),
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
    } catch (err: any) {
      setErrorMsg("Unexpected error. Please try again.");
      setSubmitState("error");
    }
  }

  // ——— RENDER ———
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
      {/* Header card */}
      <section style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 0.3 }}>
              Guest Check-in {prop?.name ? <span style={{ color: "var(--muted)", fontSize: 18 }}>· {prop.name}</span> : null}
            </h1>
            <p style={{ margin: "6px 0 0 0", color: "var(--muted)" }}>
              Please fill in the required details. It takes ~2 minutes.
            </p>
          </div>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                ...BTN_GHOST,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
              }}
            >
              📄 House rules (PDF)
            </a>
          )}
        </div>
      </section>

      {/* Form card */}
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
            {/* Name */}
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
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
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
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
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr" }}>
              <div>
                <label style={LABEL}>Address</label>
                <input style={INPUT} value={address} onChange={e => setAddress(e.currentTarget.value)} placeholder="Street, number, apt." />
              </div>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
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
                I confirm the information is correct and I agree to the house rules{pdfUrl ? " (see PDF link above)" : ""}.
              </label>
            </div>

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

      {/* Footer hint */}
      <p style={{ color: "var(--muted)", textAlign: "center", fontSize: 12 }}>
        Powered by Plan4Host — secure check-in.
      </p>
    </div>
  );
}