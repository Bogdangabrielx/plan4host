export default function ExpediaIcalSyncPage() {
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
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Expedia iCal Sync — Connect your calendar</h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>
            Quick guide to connect Expedia with Plan4Host via iCal.
          </p>
        </header>

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
          Need help?{" "}
          <a href="/auth/login?mode=signup" style={{ color: "var(--primary)" }}>
            Start free
          </a>{" "}
          and configure Sync Calendars in Plan4Host.
        </p>
      </article>
    </main>
  );
}
