"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export default function BookingPreviewClient() {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    const diff = b.getTime() - a.getTime();
    const d = Math.round(diff / (1000 * 60 * 60 * 24));
    return d > 0 ? d : 0;
  }, [checkIn, checkOut]);

  const pricePerNight = 80;
  const total = nights * pricePerNight;

  return (
    <div
      style={{
        maxWidth: 1040,
        margin: "0 auto",
        padding: "16px 0 32px",
        display: "grid",
        gap: 20,
        gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
        alignItems: "flex-start",
      }}
    >
      {/* Left: property preview */}
      <section style={{ display: "grid", gap: 16 }}>
        <div
          style={{
            borderRadius: 18,
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 18px 40px rgba(15,23,42,0.65)",
          }}
        >
          <Image
            src="/hotel_room_1456x816.jpg"
            alt="Property hero"
            width={900}
            height={520}
            style={{ width: "100%", height: "auto", display: "block" }}
            priority
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(15,23,42,0.72), transparent 55%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: 16,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-end",
              color: "#f9fafb",
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                }}
              >
                BOA A‑frame House
              </div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                Brașov, Romania • Entire unit • up to 4 guests
              </div>
              <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
                <span>⭐ 4.9 (38 reviews)</span>
                <span>·</span>
                <span>Instant confirmation by host</span>
              </div>
            </div>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background:
                  "linear-gradient(135deg, #0ea5e9, #6366f1, #a855f7)",
                fontSize: 11,
                fontWeight: 700,
                boxShadow: "0 8px 22px rgba(15,23,42,0.65)",
              }}
            >
              Guest AI assistant ready
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            padding: 16,
            borderRadius: 16,
            border: "1px solid var(--border)",
            background: "var(--card)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>Highlights</h2>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.1rem",
              color: "var(--muted)",
              fontSize: 13,
              display: "grid",
              gap: 4,
            }}
          >
            <li>Contactless digital check‑in with QR code.</li>
            <li>Automatic messages and Guest AI assistant for your stay.</li>
            <li>Parking, Wi‑Fi and access instructions always at hand.</li>
          </ul>
          <div
            style={{
              marginTop: 4,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid var(--border)",
              }}
            >
              No online payment – pay directly to the host
            </span>
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid var(--border)",
              }}
            >
              Availability & prices are just examples
            </span>
          </div>
        </div>
      </section>

      {/* Right: booking form */}
      <aside
        style={{
          position: "relative",
        }}
      >
        <div
          style={{
            borderRadius: 18,
            border: "1px solid var(--border)",
            background:
              "radial-gradient(circle at top left, rgba(14,165,233,0.16), transparent 55%), radial-gradient(circle at bottom right, rgba(99,102,241,0.24), transparent 60%), var(--panel)",
            padding: 16,
            boxShadow: "0 16px 40px rgba(15,23,42,0.55)",
            display: "grid",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {pricePerNight} EUR
              <span style={{ fontSize: 12, fontWeight: 400 }}>/night</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Demo – requests are not sent
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <label
                style={{ fontSize: 12, color: "var(--muted)" }}
                htmlFor="booking-checkin"
              >
                Check‑in
              </label>
              <input
                id="booking-checkin"
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                style={{
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  padding: "6px 8px",
                  fontSize: 13,
                  background: "var(--card)",
                  color: "var(--text)",
                }}
              />
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <label
                style={{ fontSize: 12, color: "var(--muted)" }}
                htmlFor="booking-checkout"
              >
                Check‑out
              </label>
              <input
                id="booking-checkout"
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                style={{
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  padding: "6px 8px",
                  fontSize: 13,
                  background: "var(--card)",
                  color: "var(--text)",
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gap: 4 }}>
            <label
              style={{ fontSize: 12, color: "var(--muted)" }}
              htmlFor="booking-guests"
            >
              Guests
            </label>
            <select
              id="booking-guests"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value) || 1)}
              style={{
                borderRadius: 10,
                border: "1px solid var(--border)",
                padding: "6px 8px",
                fontSize: 13,
                background: "var(--card)",
                color: "var(--text)",
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <option key={g} value={g}>
                  {g} {g === 1 ? "guest" : "guests"}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={!checkIn || !checkOut || nights <= 0}
            style={{
              marginTop: 4,
              width: "100%",
              borderRadius: 999,
              border: "1px solid rgba(15,23,42,0.7)",
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 700,
              cursor: !checkIn || !checkOut || nights <= 0 ? "not-allowed" : "pointer",
              background:
                "linear-gradient(135deg, #0ea5e9, #6366f1, #a855f7)",
              color: "#f9fafb",
              boxShadow: "0 10px 30px rgba(15,23,42,0.7)",
              opacity: !checkIn || !checkOut || nights <= 0 ? 0.65 : 1,
            }}
          >
            Request booking (demo)
          </button>

          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: "var(--muted)",
              display: "grid",
              gap: 2,
            }}
          >
            {nights > 0 ? (
              <>
                <span>
                  {nights} night{nights > 1 ? "s" : ""} × {pricePerNight} EUR ={" "}
                  <strong>{total} EUR</strong>
                </span>
                <span>
                  This is only a UI preview. In production, guests would send a
                  booking request and pay directly to the host (bank transfer).
                </span>
              </>
            ) : (
              <span>Select dates to preview the estimated total.</span>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            borderRadius: 14,
            border: "1px dashed var(--border)",
            padding: 12,
            display: "flex",
            gap: 10,
            alignItems: "center",
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          <Image
            src="/Preview Calendar.png"
            alt="Calendar preview"
            width={64}
            height={64}
            style={{ borderRadius: 12, objectFit: "cover" }}
          />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              Availability calendar (example)
            </div>
            <div>
              In the real booking page, guests would see a live calendar with
              blocked dates from your Plan4Host calendar.
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

