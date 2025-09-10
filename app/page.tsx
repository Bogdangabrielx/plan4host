// app/page.tsx — live landing homepage
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <main className={styles.landing}>
      {/* Nav */}
      <header className={styles.nav}>
        <a href="/" className={styles.brand} aria-label="Plan4Host">
          <img src="/Logo.png" alt="Plan4Host" height={47} />
        </a>
        <nav className={styles.menu} aria-label="Primary">
          <a className={styles.menuLink} href="#features">Features</a>
          <a className={styles.menuLink} href="#pricing">Pricing</a>
          <a className={styles.menuLink} href="#about">About</a>
          <a className={styles.menuLink} href="#contact">Contact</a>
        </nav>
        <div className={styles.actions}>
          <a href="/auth/login" className={`${styles.btn} ${styles.btnGhost}`}>Sign in</a>
          <a href="/auth/login?mode=signup" className={`${styles.btn} ${styles.btnText}`}>Get Free Trial</a>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero} id="hero">
        <div className={styles.heroText}>
          <h1>
            Stay Smart,
            <br />
            Host <span className={styles.accent}>Better</span>
          </h1>
          <p>
            Simplify hosting. Empower your team. Delight your guests. With Plan4Host, experience a smarter,
            more customizable way to manage every stay.
          </p>
          <div className={styles.heroCta}>
            <a href="/auth/login?mode=signup" className={`${styles.btn} ${styles.btnPrimary}`}>Get Free Trial</a>
            <a href="#features" className={`${styles.btn} ${styles.btnGhost}`}>Learn more</a>
          </div>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          {/* Optional image placeholder — drop your own PNG in /public and set src */}
          {/* <img src="/hero.png" alt="" loading="lazy" decoding="async" /> */}
        </div>
      </section>


      {/* Features */}
      <section id="features" className={styles.features} aria-labelledby="features-title">
        <h2 id="features-title">Discover Your Next Tools</h2>
        <div className={styles.featureGrid}>
          <article className={styles.featureCard}>
            <div className={styles.featureHead}>
              <img src="/dashboard_fordark.png" className={styles.featureIcon} alt="" aria-hidden="true" />
              <h3>Easy-to-use Dashboard</h3>
            </div>
            <p>Bring all your properties into one simple dashboard and shape it your way, with flexibility to customize every detail.</p>
          </article>

          <article className={styles.featureCard}>
            <div className={styles.featureHead}>
              <img src="/ical_fordark.png" className={styles.featureIcon} alt="" aria-hidden="true" />
              <h3>Property Setup</h3>
            </div>
            <p>Quickly configure each property to match your needs—add rooms, adjust details, and personalize settings for a smooth workflow.</p>
          </article>

          <article className={styles.featureCard}>
            <div className={styles.featureHead}>
              <img src="/calendar_fordark.png" className={styles.featureIcon} alt="" aria-hidden="true" />
              <h3>Adaptive Calendar</h3>
            </div>
            <p>Your calendar, your way. Customize views, organize reservations, and keep everything visible at a glance.</p>
          </article>

          <article className={styles.featureCard}>
            <div className={styles.featureHead}>
              <img src="/ical_fordark.png" className={styles.featureIcon} alt="" aria-hidden="true" />
              <h3>Automatic Sync</h3>
            </div>
            <p>Enable automatic iCal synchronization according to your subscription plan—keeping calendars always up to date, effortlessly.</p>
          </article>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className={styles.pricing} aria-labelledby="pricing-title">
        <h2 id="pricing-title">Choose Your Plan</h2>
        <div className={styles.pricingGrid}>
          <PricingCard
            img="/basic.png"
            tier="BASIC"
            items={[
              "Custom Calendar",
              "Property Setup",
              "Up to 1 Property listed",
              "Up to 3 Rooms/Property",
              "iCal Automatic Sync ~1h",
            ]}
          />
          <PricingCard
            img="/standard.png"
            tier="STANDARD"
            items={[
              "Custom Calendar",
              "Property Setup",
              "Up to 3 Properties listed",
              "Up to 10 Rooms/Property",
              "iCal Automatic Sync ~30 min",
              "Access to Cleaning Board",
              "with Custom Cleaning Tasks",
              "Share Tasks with Your Team",
            ]}
          />
          <PricingCard
            img="/premium.png"
            tier="PREMIUM"
            items={[
              "Custom Calendar",
              "Property Setup",
              "Unlimited Properties Listed",
              "Unlimited Rooms/Property",
              "iCal Automatic sync in 10 min",
              "+ Instant with Sync Now button",
              "Access to Cleaning Board",
              "with Custom Cleaning Tasks",
              "Smart Cleaning Prioritization by Next Check-in",
              "Share Tasks with Your Team",
            ]}
          />
        </div>
      </section>

      {/* About */}
      <section id="about" className={styles.about} aria-labelledby="about-title">
        <h2 id="about-title">About Plan4Host</h2>
        <p>
          Plan4Host helps small hotels and property managers run smoother operations with an
          adaptive calendar, simple property setup, and powerful team workflows. Our goal is to
          keep things fast, reliable, and easy to use.
        </p>
        <p>
          Built with care for clarity and performance, Plan4Host focuses on the tools you actually
          use every day: calendars, cleaning, and iCal synchronization that just works.
        </p>
      </section>

      {/* Contact */}
      <section id="contact" className={styles.contact} aria-labelledby="contact-title">
        <h2 id="contact-title">Contact</h2>
        <div className={styles.contactCard}>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            We’re just an email away: 
            {" "}
            <a href="mailto:office@plan4host.com" style={{ color: "var(--text)", fontWeight: 800 }}>
              office@plan4host.com
            </a>
            .
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className={styles.footer}>
        <p>© {new Date().getFullYear()} Plan4Host</p>
      </footer>
    </main>
  );
}

function PricingCard({
  img,
  tier,
  items,
}: { img: string; tier: string; items: string[] }) {
  return (
    <article className={styles.priceCard}>
      <ul className={styles.priceList}>
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
      <img src={img} alt="" className={styles.priceImg} loading="lazy" decoding="async" />
    </article>
  );
}

// Contact form removed — showing email address only
