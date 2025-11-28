export default function CheckinFormsGdprPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        padding: '32px 20px',
        background: 'var(--bg)',
      }}
    >
      <article style={{ width: '100%', maxWidth: 860 }}>
        <h1 style={{ fontSize: 28, marginBottom: 10 }}>GDPR‑friendly Guest Check‑in Forms</h1>
        <p style={{ color: 'var(--muted)' }}>
          Plan4Host provides secure online check‑in forms to collect guest details, capture consent and speed up arrivals.
        </p>
        <h2 style={{ marginTop: 24 }}>What’s included</h2>
        <ul>
          <li>Personal data capture (name, contact, ID image) with explicit consent.</li>
          <li>Data stored in the EU with access controls and encryption.</li>
          <li>
            Dedicated{' '}
            <a href="/legal/dpa" style={{ color: 'var(--primary)' }}>
              Data Processing Addendum (DPA)
            </a>{' '}
            and clear{' '}
            <a href="/legal/privacy" style={{ color: 'var(--primary)' }}>
              Privacy Policy
            </a>
            .
          </li>
        </ul>
        <p style={{ marginTop: 24 }}>
          Try it:{' '}
          <a href="/auth/login?mode=signup" style={{ color: 'var(--primary)' }}>
            Start free
          </a>{' '}
          and enable check‑in for your property.
        </p>
      </article>
    </main>
  );
}
