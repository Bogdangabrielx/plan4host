export default function Head() {
  const site = "https://www.plan4host.com";
  return (
    <>
      <title>Channel Manager for Airbnb & Booking.com – iCal Sync | Plan4Host</title>
      <meta
        name="description"
        content="Plan4Host is a PMS and channel manager with iCal sync for Airbnb & Booking.com, secure GDPR‑friendly check‑in forms, and tools for small properties. (Software — not web hosting.)"
      />
      {/* Social overrides (optional, safe to keep) */}
      <meta property="og:title" content="Channel Manager for Airbnb & Booking.com – iCal Sync | Plan4Host" />
      <meta property="og:description" content="Vacation rental channel manager with iCal sync for Airbnb & Booking.com, secure online check‑in, and tools for small and large properties." />
      <meta name="twitter:title" content="Channel Manager for Airbnb & Booking.com – iCal Sync | Plan4Host" />
      <meta name="twitter:description" content="Vacation rental channel manager with iCal sync for Airbnb & Booking.com, secure online check‑in, and tools for small and large properties." />
      <link rel="canonical" href={`${site}/`} />
    </>
  );
}
