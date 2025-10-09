import type { Metadata } from "next";

export default function AirbnbIcalSyncPage() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>Airbnb iCal Sync — How to connect your calendar</h1>
      <p style={{ color: "var(--muted)" }}>
        Keep Airbnb and your other calendars in sync with iCal to avoid double bookings. This guide shows the basic steps and good practices.
      </p>

      <h2 style={{ marginTop: 24 }}>What is iCal sync?</h2>
      <p>
        iCal is a standard calendar format (.ics) that Airbnb supports for import/export. Plan4Host uses iCal to periodically fetch new reservations and
        pushes your availability out to other channels that support iCal.
      </p>

      <h2 style={{ marginTop: 24 }}>Steps to connect</h2>
      <ol>
        <li>Open Airbnb → Listings → Availability → iCal export and copy the export URL.</li>
        <li>In Plan4Host, open Channels and add a new iCal channel for your listing.</li>
        <li>Paste the Airbnb iCal export URL and save.</li>
        <li>From Plan4Host, copy the iCal export URL for the room/unit and add it back in Airbnb under iCal import.</li>
        <li>Wait for the first sync (according to your plan’s interval), then verify events appear in both calendars.</li>
      </ol>

      <h2 style={{ marginTop: 24 }}>Tips</h2>
      <ul>
        <li>Use one calendar per unit/room to avoid overlaps.</li>
        <li>Do not share private iCal URLs publicly; treat them as secrets.</li>
        <li>Force a manual refresh after initial setup to validate quickly.</li>
        <li>Keep timezones consistent across channels.</li>
      </ul>

      <p style={{ marginTop: 24 }}>
        Ready to connect? <a href="/auth/login?mode=signup">Start free</a> or learn more on the <a href="/#features">features</a> page.
      </p>

      {/* JSON-LD HowTo */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "How to sync Airbnb calendar with iCal",
            step: [
              { "@type": "HowToStep", name: "Copy Airbnb iCal export URL" },
              { "@type": "HowToStep", name: "Add iCal channel in Plan4Host" },
              { "@type": "HowToStep", name: "Paste export URL" },
              { "@type": "HowToStep", name: "Import Plan4Host iCal back into Airbnb" },
              { "@type": "HowToStep", name: "Verify sync" }
            ]
          })
        }}
      />
    </main>
  );
}

