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
          Keep Booking.com and your other calendars in sync with iCal to avoid double bookings. Below you&apos;ll find a short explanation and the key steps.
        </p>

        <h2 style={{ marginTop: 24 }}>What is iCal sync?</h2>
        <p>
          iCal is a standard calendar format (.ics) that Booking.com supports for importing and exporting reservations and availability blocks.
          Plan4Host uses iCal to periodically pull new bookings from Booking.com and push availability updates back, helping you reduce the risk
          of overlaps across channels.
        </p>

        <h2 style={{ marginTop: 24 }}>Steps to connect</h2>
        <ol>
          <li>Open Booking.com Extranet → Rates &amp; Availability → Calendar &amp; pricing → Sync calendars (iCal).</li>
          <li>Copy the iCal export URL from Booking.com for the room/unit you want to sync.</li>
          <li>
            In Plan4Host, go to Management → Sync Calendars → Import, add a new iCal channel for the same room/unit,
            paste the Booking.com export URL and save.
          </li>
          <li>From Plan4Host, copy the iCal export URL for that room/unit and import it back into Booking.com under iCal import.</li>
          <li>Trigger a manual refresh and verify that events appear in both calendars without overlaps.</li>
        </ol>

        <h2 style={{ marginTop: 24 }}>Tips</h2>
        <ul>
          <li>Use one calendar per room/unit for clean mapping and easier troubleshooting.</li>
          <li>Remember that iCal carries events/blocks, not pricing rules — keep your rate settings in the Extranet.</li>
          <li>Keep timezones consistent across Booking.com, Plan4Host and any other channels you connect.</li>
        </ul>

        <p style={{ marginTop: 24 }}>
          Ready to connect?{" "}
          <a href="/auth/login?mode=signup" style={{ color: "var(--primary)" }}>
            Start free
          </a>{" "}
          or see{" "}
          <a href="/#features" style={{ color: "var(--primary)" }}>
            Sync Calendars
          </a>{" "}
          in features.
        </p>
      </article>
    </main>
  );
}
