export default function Head() {
  const title = "Plan4Host – calendar unificat, check-in online si mesaje automate";
  const description =
    "Un singur calendar pentru Booking si Airbnb, check-in online pentru oaspeti si mesaje automate. Mai putin haos pentru gazde.";
  const url = "https://plan4host.com/ro";
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
