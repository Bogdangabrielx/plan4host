export default function BookingIcalSyncPage() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>Booking.com iCal Sync — How to connect your calendar</h1>
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
    </main>
  );
}

