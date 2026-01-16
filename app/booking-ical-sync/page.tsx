import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import styles from "../home.module.css";
import seo from "../seo.module.css";

export const metadata: Metadata = {
  title: "Booking.com iCal sync – connect your calendar | Plan4Host",
  description:
    "A short guide for Booking.com iCal sync: import reservations into Plan4Host and export availability back to reduce double bookings.",
  alternates: {
    canonical: "/booking-ical-sync",
    languages: {
      en: "/booking-ical-sync",
      ro: "/ro/sincronizare-ical-booking",
    },
  },
  openGraph: {
    title: "Booking.com iCal sync – connect your calendar | Plan4Host",
    description:
      "Connect Booking.com calendar sync via iCal: import bookings and export availability to keep calendars aligned.",
    url: "/booking-ical-sync",
    locale: "en_US",
    type: "article",
  },
};

export default function BookingIcalSyncPage() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to sync Booking.com calendar with iCal",
    step: [
      { "@type": "HowToStep", name: "Copy Booking.com iCal export URL" },
      { "@type": "HowToStep", name: "Add Booking.com calendar in Plan4Host (Import iCal)" },
      { "@type": "HowToStep", name: "Paste the Booking.com iCal link and save" },
      { "@type": "HowToStep", name: "Copy Plan4Host export link and add it back to Booking.com (Import iCal)" },
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
            Booking.com iCal sync
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            A practical way to keep your <strong>Booking.com calendar</strong> in sync using <strong>iCal (.ics)</strong>
            — so availability and reservations stay aligned across platforms.
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

        <div className={styles.heroVisual} aria-label="Booking.com logo" data-p4h-reveal>
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
            <Image src="/booking.png" alt="Booking.com" width={360} height={360} style={{ width: 160, height: 160 }} priority />
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
              For Booking.com iCal sync you usually connect two directions: you <strong>import</strong> Booking.com
              bookings into Plan4Host, then you <strong>export</strong> availability from Plan4Host back into Booking.com.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="steps">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="steps" className={seo.h2}>
              Steps to connect Booking.com with Plan4Host
            </h2>
            <ol className={seo.steps}>
              <li>In Booking.com Extranet, find the calendar sync (iCal) section and copy the export link for your unit.</li>
              <li>In Plan4Host, open Sync Calendars → Import iCal and create an import for the same unit/room.</li>
              <li>Paste the Booking.com iCal link and save.</li>
              <li>Copy the Plan4Host export link for that unit/room and add it back into Booking.com as an iCal import.</li>
              <li>Verify that events appear correctly on both sides and there are no overlaps.</li>
            </ol>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="tips">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="tips" className={seo.h2}>
              Practical tips
            </h2>
            <ul className={styles.problemList}>
              <li>Use one calendar per room/unit for clean mapping.</li>
              <li>iCal syncs events/blocks, not pricing rules.</li>
              <li>Keep timezone settings consistent across platforms.</li>
            </ul>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="cta">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="cta" className={seo.h2}>
              Ready to connect?
            </h2>
            <p className={seo.p}>Start free and connect your first Booking.com iCal calendar in a few minutes.</p>
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

