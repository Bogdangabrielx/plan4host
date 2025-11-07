export default function ExpediaIcalSyncPage() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>Expedia iCal Sync — Connect your calendar</h1>
      <p style={{ color: "var(--muted)" }}>
        Sync Expedia with your other calendars via iCal to reduce double bookings. Below are the general steps.
      </p>
      <h2 style={{ marginTop: 24 }}>Steps to connect</h2>
      <ol>
        <li>Open your Expedia Partner Central → Calendar.</li>
        <li>Locate the iCal export link (or contact support if hidden by your contract) and copy it.</li>
        <li>In Plan4Host, add a new iCal channel for the specific room/unit and paste the Expedia export URL.</li>
        <li>Copy the Plan4Host iCal export URL and import it back into Expedia.</li>
        <li>Refresh and verify events appear correctly on both sides.</li>
      </ol>
      <h2 style={{ marginTop: 24 }}>Tips</h2>
      <ul>
        <li>Use one calendar per room/unit.</li>
        <li>iCal syncs events/blocks, not rates or restrictions.</li>
        <li>Keep timezones aligned across platforms.</li>
      </ul>
      <p style={{ marginTop: 24 }}>
        Need help? <a href="/auth/login?mode=signup">Start free</a> and configure Sync Calendars in Plan4Host.
      </p>
    </main>
  );
}

