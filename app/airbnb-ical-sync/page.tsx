import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import styles from "../home.module.css";
import seo from "../seo.module.css";

export const metadata: Metadata = {
  title: "Airbnb iCal sync – connect your calendar | Plan4Host",
  description:
    "A short guide for Airbnb iCal sync: import the Airbnb calendar into Plan4Host and export availability back to avoid double bookings.",
  alternates: {
    canonical: "/airbnb-ical-sync",
    languages: {
      en: "/airbnb-ical-sync",
      ro: "/ro/sincronizare-ical-airbnb",
    },
  },
  openGraph: {
    title: "Airbnb iCal sync – connect your calendar | Plan4Host",
    description:
      "Connect Airbnb calendar sync via iCal: import reservations and export availability to keep calendars aligned.",
    url: "/airbnb-ical-sync",
    locale: "en_US",
    type: "article",
  },
};

export default function AirbnbIcalSyncPage() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to sync Airbnb calendar with iCal",
    step: [
      { "@type": "HowToStep", name: "Copy Airbnb iCal export URL" },
      { "@type": "HowToStep", name: "Add Airbnb calendar in Plan4Host (Import iCal)" },
      { "@type": "HowToStep", name: "Paste the Airbnb iCal link and save" },
      { "@type": "HowToStep", name: "Copy Plan4Host export link and add it back to Airbnb (Import iCal)" },
      { "@type": "HowToStep", name: "Verify that reservations and blocks appear on both sides" },
    ],
  };

  return (
    <main className={styles.landing} style={{ minHeight: "100dvh", overflowX: "hidden" }}>
      <MobileScrollReveal />

      <nav className={styles.nav} aria-label="Navigation">
        <Link href="/" className={styles.brand}>
          <img src="/Logo_Landing.png" alt="" aria-hidden="true" width={36} height={36} style={{ borderRadius: 12 }} />
          <strong>Plan4Host</strong>
        </Link>
        <div />
        <div className={styles.actions}>
          <Link className={`${styles.btn} ${styles.btnSolid}`} href="/auth/login?mode=signup">
            Start free
          </Link>
          <Link className={`${styles.btn} ${styles.btnOutline}`} href="/">
            Home page
          </Link>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="title">
        <div className={styles.heroText} data-p4h-reveal>
          <h1 id="title" className={styles.heroHeadline} style={{ margin: 0 }}>
            Airbnb iCal sync
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            This guide shows how to set up <strong>Airbnb calendar sync</strong> using <strong>iCal (.ics)</strong>, so
            reservations and availability stay aligned across platforms.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/auth/login?mode=signup">
              Start free
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/#features">
              Learn more
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Airbnb logo" data-p4h-reveal>
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
            <Image src="/airbnb.png" alt="Airbnb" width={360} height={360} style={{ width: 160, height: 160 }} priority />
          </div>
        </div>
      </section>

      <div className={seo.content}>
        <section className={seo.section} aria-labelledby="meaning">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="meaning" className={seo.h2}>
              What iCal sync means
            </h2>
            <p className={seo.p}>
              iCal is a standard calendar format (<strong>.ics</strong>) used to share reservations and blocked dates.
              With Airbnb iCal sync, you typically do two things: you <strong>import</strong> Airbnb bookings into
              Plan4Host, and you <strong>export</strong> Plan4Host availability back to Airbnb.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="steps">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="steps" className={seo.h2}>
              Steps to connect Airbnb with Plan4Host
            </h2>
            <ol className={seo.steps}>
              <li>In Airbnb, open your listing’s calendar settings and copy the iCal export link.</li>
              <li>In Plan4Host, go to Sync Calendars → Import iCal and add a calendar for the same unit/room.</li>
              <li>Paste the Airbnb iCal link and save.</li>
              <li>In Plan4Host, copy the export link for that unit/room and add it back in Airbnb as an iCal import.</li>
              <li>Wait for sync and verify that events appear on both sides without overlaps.</li>
            </ol>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="tips">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="tips" className={seo.h2}>
              Practical tips
            </h2>
            <ul className={styles.problemList}>
              <li>Use one iCal link per unit/room for clean mapping.</li>
              <li>Treat iCal URLs as private links (do not share them publicly).</li>
              <li>Keep timezone settings consistent across platforms.</li>
            </ul>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="cta">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="cta" className={seo.h2}>
              Ready to connect?
            </h2>
            <p className={seo.p}>Start free and connect your first Airbnb iCal calendar in a few minutes.</p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/auth/login?mode=signup">
                Start free
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/">
                Home page
              </Link>
            </div>
          </div>
        </section>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
    </main>
  );
}
