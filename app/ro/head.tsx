export default function Head() {
  const site = "https://www.plan4host.com";
  return (
    <>
      <title>Channel manager pentru Airbnb & Booking.com – Sincronizare iCal | Plan4Host</title>
      <meta
        name="description"
        content="Channel manager pentru proprietăți, sincronizare iCal Airbnb/Booking.com, check‑in online sigur – potrivit pentru proprietăți mici și mari."
      />
      {/* Social overrides */}
      <meta property="og:title" content="Channel manager pentru Airbnb & Booking.com – Sincronizare iCal | Plan4Host" />
      <meta property="og:description" content="Channel manager pentru proprietăți, sincronizare iCal Airbnb/Booking.com, check‑in online sigur – potrivit pentru proprietăți mici și mari." />
      <meta name="twitter:title" content="Channel manager pentru Airbnb & Booking.com – Sincronizare iCal | Plan4Host" />
      <meta name="twitter:description" content="Channel manager pentru proprietăți, sincronizare iCal Airbnb/Booking.com, check‑in online sigur – potrivit pentru proprietăți mici și mari." />
      <link rel="canonical" href={`${site}/ro`} />
    </>
  );
}
