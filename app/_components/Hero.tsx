// app/_components/Hero.tsx
export default function Hero() {
  return (
    <section className="hero">
      <picture>
        {/* Use your own images when ready. These are placeholders from /public. */}
        <source srcSet="/1000_F_1562223063_JMPSrQfYtlwbUSXWAyPekAGRWhWNUPgU.jpg" media="(min-width: 768px)" />
        <img
          src="/1000_F_1562215037_mCyMrFmMaFBeEwsFHoMfV1yB6izt7O75.jpg"
          alt="Infrastructură hosting rapidă"
          className="hero-bg"
          loading="eager"
          fetchpriority="high"
        />
      </picture>

      <div className="hero-overlay" />

      <div className="hero-content">
        <h1>Hosting simplu, rapid și sigur</h1>
        <p>Plan4Host te ajută să-ți pui proiectul online fără griji.</p>

        <div className="hero-actions">
          <a className="hero-btn hero-btn--primary" href="/auth/login">Începe gratuit</a>
          <a className="hero-btn hero-btn--ghost" href="#features">Vezi beneficiile</a>
        </div>

        <ul className="hero-usp" aria-label="Beneficii cheie">
          <li>99.9% uptime garantat</li>
          <li>SSL gratuit</li>
          <li>Migrare asistată</li>
          <li>Suport 24/7</li>
        </ul>
      </div>
    </section>
  );
}

