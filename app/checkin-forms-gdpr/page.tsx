export default function CheckinFormsGdprPage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>GDPR‑friendly Guest Check‑in Forms</h1>
      <p style={{ color: 'var(--muted)' }}>
        Plan4Host provides secure online check‑in forms to collect guest details, capture consent and speed up arrivals.
      </p>
      <h2 style={{ marginTop: 24 }}>What’s included</h2>
      <ul>
        <li>Personal data capture (name, contact, ID image) with explicit consent.</li>
        <li>Data stored in the EU with access controls and encryption.</li>
        <li>Dedicated <a href="/legal/dpa">Data Processing Addendum (DPA)</a> and clear <a href="/legal/privacy">Privacy Policy</a>.</li>
      </ul>
      <p style={{ marginTop: 24 }}>Try it: <a href="/auth/login?mode=signup">Start free</a> and enable check‑in for your property.</p>
    </main>
  );
}

