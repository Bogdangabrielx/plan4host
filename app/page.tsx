// app/page.tsx
export default function Home() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "var(--bg, #0b1220)",
        color: "var(--text, #e6e9f2)",
      }}
    >
      <div
        style={{
          width: "min(920px, 96vw)",
          background: "var(--panel, #0f172a)",
          border: "1px solid var(--border, #20304d)",
          borderRadius: 14,
          padding: 24,
          display: "grid",
          gap: 18,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>Plan4Host</h1>
        <p style={{ margin: 0, color: "var(--muted, #9fb0d1)" }}>
          All-in-one calendar, OTA iCal sync, and cleaning board for your property.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
          <a
            href="/auth/login"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--border, #20304d)",
              background: "var(--primary, #77e1a4)",
              color: "#0c111b",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Sign in
          </a>
          <a
            href="/auth/signup"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--border, #20304d)",
              background: "transparent",
              color: "var(--text, #e6e9f2)",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Create account
          </a>
          <a
            href="/app"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--border, #20304d)",
              background: "transparent",
              color: "var(--text, #e6e9f2)",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Go to app
          </a>
        </div>

        <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "var(--muted, #9fb0d1)" }}>
          <li>Calendar per room & per day</li>
          <li>iCal export/import for OTA (Airbnb/Booking/…)</li>
          <li>Cleaning board with tasks and priorities</li>
        </ul>
      </div>
    </main>
  );
}