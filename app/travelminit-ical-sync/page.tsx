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
          Travelminit supports calendar sync via iCal. Below you&apos;ll find what that means and how to connect it with Plan4Host.
        </p>

        <h2 style={{ marginTop: 24 }}>What is iCal sync?</h2>
        <p>
          iCal is a standard calendar format (.ics) that Travelminit and other OTAs use to import and export reservations and availability blocks.
          Plan4Host uses iCal to pull new bookings from Travelminit and push availability back, helping to keep your calendars consistent and avoid
          double bookings.
        </p>

        <h2 style={{ marginTop: 24 }}>Steps to connect</h2>
        <ol>
          <li>Open your Travelminit extranet account and go to the Calendar / iCal section.</li>
          <li>Copy the iCal export URL from Travelminit for the room/unit you want to sync.</li>
          <li>
            In Plan4Host, go to Management → Sync Calendars → Import, add a new iCal channel for that specific room/unit and paste the Travelminit
            export URL.
          </li>
          <li>Copy the Plan4Host iCal export URL for that room/unit and import it back into Travelminit under iCal import.</li>
          <li>Refresh and verify that events sync in both directions as expected.</li>
        </ol>

        <h2 style={{ marginTop: 24 }}>Tips</h2>
        <ul>
          <li>Use one calendar per room/unit for clean mapping and fewer surprises.</li>
          <li>iCal carries availability blocks and reservations, not price rules — keep your pricing in Travelminit.</li>
          <li>Check timezones across Plan4Host and Travelminit to avoid date offsets.</li>
        </ul>
        <p style={{ marginTop: 24 }}>
          Questions?{" "}
          <a href="/auth/login?mode=signup" style={{ color: "var(--primary)" }}>
            Start free
          </a>{" "}
          and configure Sync Calendars in Plan4Host.
        </p>
      </article>
    </main>
  );
}
