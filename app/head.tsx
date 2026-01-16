export default function Head() {
  const title = "Plan4Host – unified calendar, online check‑in, automated messages";
  const description =
    "One calendar for Booking and Airbnb, online check‑in for guests, and automated messages. Less chaos for hosts.";
  const url = "https://plan4host.com/";
  const ogImage = "https://plan4host.com/og-default.png";

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:site_name" content="Plan4Host" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </>
  );
}
