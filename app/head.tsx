export default function Head() {
  const site = "https://www.plan4host.com";
  return (
    <>
      <title>PMS with iCal Sync & Online Check‑in | Plan4Host</title>
      <meta
        name="description"
        content="Plan4Host is a property management system (PMS) with iCal sync for Airbnb & Booking.com, secure GDPR‑friendly check‑in forms, and tools for small properties. (Software — not web hosting.)"
      />
      {/* Social overrides (optional, safe to keep) */}
      <meta property="og:title" content="PMS with iCal Sync & Online Check‑in | Plan4Host" />
      <meta property="og:description" content="PMS with iCal sync for Airbnb & Booking.com, secure online check‑in and simple tools for small and large properties." />
      <meta name="twitter:title" content="PMS with iCal Sync & Online Check‑in | Plan4Host" />
      <meta name="twitter:description" content="PMS with iCal sync for Airbnb & Booking.com, secure online check‑in and simple tools for small and large properties." />
      <link rel="canonical" href={`${site}/`} />
    </>
  );
}
