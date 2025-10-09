import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImageRO() {
  const bg = "#f8fafc";
  const text = "#0f172a";
  const primary = "#16b981";

  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: 64,
          background: bg,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 42,
            fontWeight: 900,
            color: text,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              background: primary,
              borderRadius: 6,
              marginRight: 14,
            }}
          />
          <span>Plan4Host</span>
        </div>
        <div style={{ fontSize: 84, lineHeight: 1.1, fontWeight: 800, color: text }}>
          Stay Smart,
          <br />
          Host <span style={{ color: primary }}>Better</span>
        </div>
        <div style={{ marginTop: 24, fontSize: 28, color: "#475569", maxWidth: 900 }}>
          Channel manager ieftin cu iCal (Booking.com/Airbnb) și check‑in online sigur.
        </div>
      </div>
    ),
    { ...size }
  );
}
