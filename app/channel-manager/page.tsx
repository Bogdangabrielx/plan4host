export default function ChannelManagerLanding() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>Affordable Channel Manager with iCal Sync</h1>
      <p style={{ color: 'var(--muted)' }}>
        Plan4Host is a lightweight channel manager and PMS for small properties. Sync Airbnb, Booking.com, Expedia and more via iCal, avoid double bookings, and keep a clean calendar.
      </p>
      <h2 style={{ marginTop: 24 }}>Why Plan4Host</h2>
      <ul>
        <li>Affordable paid plans including Basic, designed for small teams.</li>
        <li>Secure, GDPR‑friendly guest check‑in forms with consent capture.</li>
        <li>Simple Property Setup and Cleaning tasks for daily operations.</li>
      </ul>
      <p style={{ marginTop: 24 }}>Ready to try? <a href="/auth/login?mode=signup">Start free</a> and connect your calendars.</p>
    </main>
  );
}

