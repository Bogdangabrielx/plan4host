"use client";

import { useEffect, useMemo, useState } from "react";

type Property = { id: string; name: string } | null;
type RoomType = { id: string; name: string };
type Room = { id: string; name: string };

export default function CheckinClient({ initialProperty }: { initialProperty: Property }) {
  const [property, setProperty] = useState<Property>(initialProperty);
  const [regUrl, setRegUrl] = useState<string | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [roomTypeId, setRoomTypeId] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [consentReg, setConsentReg] = useState(false);
  const [consentGDPR, setConsentGDPR] = useState(false);

  // Get property from query if not provided
  useEffect(() => {
    if (property) return;
    try {
      const pid = new URL(window.location.href).searchParams.get("property");
      if (pid) setProperty({ id: pid, name: "" });
    } catch {}
  }, [property]);

  // Load regulation URL + catalog
  useEffect(() => {
    if (!property?.id) return;
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          fetch(`/api/property/regulation?propertyId=${property.id}`).then(r => r.json()).catch(() => ({})),
          fetch(`/api/property/room-catalog?propertyId=${property.id}`).then(r => r.json()).catch(() => ({})),
        ]);
        if (r1?.url) setRegUrl(r1.url as string);
        if (r2?.property) setProperty({ id: property.id, name: r2.property.name as string });
        const types: RoomType[] = Array.isArray(r2?.roomTypes) ? r2.roomTypes : [];
        setRoomTypes(types);
        // Only set rooms when there are no types
        const rms: Room[] = types.length === 0 && Array.isArray(r2?.rooms) ? r2.rooms : [];
        setRooms(rms);
      } catch {}
    })();
  }, [property?.id]);

  function header() {
    return (
      <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Guest Check‑In</h1>
        {property?.name && (
          <div style={{ color: "var(--muted)", fontWeight: 700 }}>{property.name}</div>
        )}
      </div>
    );
  }

  const hasTypes = roomTypes.length > 0;
  const hasRooms = !hasTypes;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!property?.id) { setError("Missing property."); return; }
    if (!firstName.trim() || !lastName.trim() || !email.trim()) { setError("Please fill name and email."); return; }
    if (!startDate || !endDate) { setError("Please select arrival and departure."); return; }
    if (!consentReg || !consentGDPR) { setError("Please confirm regulations and GDPR."); return; }
    if (hasTypes) {
      if (!roomTypeId) { setError("Please select room type."); return; }
    } else {
      if (!roomId) { setError("Please select a room."); return; }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkin/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          roomTypeId: hasTypes ? (roomTypeId || null) : null,
          roomId: hasRooms ? (roomId || null) : null,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          startDate,
          endDate,
          consentRegulation: consentReg,
          consentGdpr: consentGDPR,
        })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || "Submit failed. Please try again.");
        setLoading(false);
        return;
      }
      setSubmitted(true);
      setLoading(false);
    } catch (e) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (!property?.id) {
    return (
      <div className="sb-card" style={{ padding: 16 }}>
        {header()}
        <p style={{ color: "var(--muted)" }}>Missing property. Please use the link provided by your host.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="sb-card" style={{ padding: 16 }}>
        {header()}
        <p>Thank you! Your check‑in details were submitted.</p>
        <p style={{ color: "var(--muted)" }}>You can close this page now.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="sb-card" style={{ padding: 16, display: "grid", gap: 12 }}>
      {header()}
      {error && (
        <div style={{
          padding: "8px 12px",
          borderRadius: 10,
          background: "var(--danger)",
          color: "#0c111b",
          fontWeight: 800,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        <label>First name*</label>
        <input value={firstName} onChange={(e) => setFirstName((e.target as HTMLInputElement).value)} className="sb-select" />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <label>Last name*</label>
        <input value={lastName} onChange={(e) => setLastName((e.target as HTMLInputElement).value)} className="sb-select" />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <label>Email*</label>
        <input type="email" value={email} onChange={(e) => setEmail((e.target as HTMLInputElement).value)} className="sb-select" />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <label>Phone</label>
        <input value={phone} onChange={(e) => setPhone((e.target as HTMLInputElement).value)} className="sb-select" />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <label>Address</label>
        <input value={address} onChange={(e) => setAddress((e.target as HTMLInputElement).value)} className="sb-select" />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <label>Arrival date*</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate((e.target as HTMLInputElement).value)} className="sb-select" />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <label>Departure date*</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate((e.target as HTMLInputElement).value)} className="sb-select" />
      </div>

      {hasTypes ? (
        <div style={{ display: "grid", gap: 8 }}>
          <label>Room Type (from listing)</label>
          <select value={roomTypeId} onChange={(e) => { setRoomTypeId((e.target as HTMLSelectElement).value); setRoomId(""); }} className="sb-select">
            <option value="">— select —</option>
            {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <label>Room (name)</label>
          <select value={roomId} onChange={(e) => { setRoomId((e.target as HTMLSelectElement).value); setRoomTypeId(""); }} className="sb-select">
            <option value="">— select —</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={consentReg} onChange={(e) => setConsentReg((e.target as HTMLInputElement).checked)} />
          I have read the internal regulations
          {regUrl ? (
            <a href={regUrl} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", textDecoration: "none", marginLeft: 8 }}>
              (Open PDF)
            </a>
          ) : (
            <span style={{ color: "var(--muted)", marginLeft: 8 }}>(Regulations not available)</span>
          )}
        </label>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={consentGDPR} onChange={(e) => setConsentGDPR((e.target as HTMLInputElement).checked)} />
          I agree to the processing of my personal data (GDPR)
        </label>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" disabled={loading} className="sb-btn sb-btn--primary" aria-busy={loading}>
          {loading ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
