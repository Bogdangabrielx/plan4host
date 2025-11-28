export default function TravelminitIcalSyncPage() {
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
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Travelminit iCal Sync — Connect your calendar</h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>
            Connect Travelminit with Plan4Host using iCal in a few steps.
          </p>
        </header>

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
      </article>
    </main>
  );
}
