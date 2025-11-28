export default function BookingIcalSyncPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "32px 20px",
        background: "var(--bg)",
      }}
    >
      <article style={{ width: "100%", maxWidth: 860 }}>
        <header style={{ textAlign: "center", marginBottom: 24, display: "grid", gap: 10, placeItems: "center" }}>
          <img
            src="/p4h_logo_rotund.png"
            alt="Plan4Host"
            width={80}
            height={80}
            style={{ borderRadius: 999, border: "2px solid var(--border)", background: "var(--card)" }}
          />
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Booking.com iCal Sync — How to connect your calendar</h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>
            Step-by-step guide to connect Booking.com with Plan4Host via iCal.
          </p>
        </header>

        <p style={{ color: "var(--muted)" }}>
          Keep Booking.com and your other calendars in sync with iCal to avoid double bookings. This guide shows the basic steps and tips.
        </p>

      <h2 style={{ marginTop: 24 }}>Steps to connect</h2>
      <ol>
        <li>Open Booking.com Extranet → Rates & Availability → Calendar & pricing → Sync calendars (iCal).</li>
        <li>Copy the iCal export URL from Booking.com.</li>
        <li>In Plan4Host, add a new iCal channel for your room/unit and paste the export URL.</li>
        <li>Copy the Plan4Host iCal export URL and import it back in Booking.com.</li>
        <li>Trigger a manual refresh and verify events appear in both calendars.</li>
      </ol>

      <h2 style={{ marginTop: 24 }}>Tips</h2>
      <ul>
        <li>One calendar per room/unit for clean mapping.</li>
        <li>Mind minimum/maximum stay and closures — iCal carries events, not pricing rules.</li>
        <li>Keep timezones consistent.</li>
      </ul>

        <p style={{ marginTop: 24 }}>
          Ready to connect? <a href="/auth/login?mode=signup">Start free</a> or see <a href="/#features">Sync Calendars</a> in features.
        </p>
      </article>
    </main>
  );
}
