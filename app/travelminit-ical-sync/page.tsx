export default function TravelminitIcalSyncPage() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>Travelminit iCal Sync — Connect your calendar</h1>
      <p style={{ color: "var(--muted)" }}>
        Travelminit supports calendar sync via iCal. Use the steps below to connect with Plan4Host.
      </p>
      <h2 style={{ marginTop: 24 }}>Steps to connect</h2>
      <ol>
        <li>Open your Travelminit extranet account and go to Calendar/iCal.</li>
        <li>Copy your iCal export URL from Travelminit.</li>
        <li>In Plan4Host, add a new iCal channel for the specific room/unit and paste the export URL.</li>
        <li>Copy the Plan4Host iCal export URL and import it back into Travelminit.</li>
        <li>Refresh and verify events sync both ways.</li>
      </ol>
      <h2 style={{ marginTop: 24 }}>Tips</h2>
      <ul>
        <li>One calendar per room/unit for clean mapping.</li>
        <li>iCal carries availability blocks and reservations, not price rules.</li>
        <li>Check timezones to avoid offset issues.</li>
      </ul>
      <p style={{ marginTop: 24 }}>
        Questions? <a href="/auth/login?mode=signup">Start free</a> and configure Sync Calendars in Plan4Host.
      </p>
    </main>
  );
}

