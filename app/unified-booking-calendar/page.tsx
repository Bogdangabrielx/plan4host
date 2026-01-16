import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LandingSafeArea from "@/components/landing/LandingSafeArea";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import SeoFooter from "@/components/seo/SeoFooter";
import styles from "../home.module.css";
import seo from "../seo.module.css";

export const metadata: Metadata = {
  title: "Unified booking calendar for Airbnb & Booking | Plan4Host",
  description:
    "View all Airbnb and Booking reservations in one unified calendar. Avoid overbooking and manage availability as the foundation for online check-in and guest messages.",
  alternates: {
    canonical: "/unified-booking-calendar",
    languages: {
      en: "/unified-booking-calendar",
      ro: "/ro/calendar-rezervari-unificat",
    },
  },
  openGraph: {
    title: "Unified booking calendar for Airbnb & Booking | Plan4Host",
    description:
      "A unified calendar for Airbnb and Booking reservations that helps avoid overbooking and keeps availability clear.",
    url: "/unified-booking-calendar",
    locale: "en_US",
    type: "article",
  },
};

export default function UnifiedBookingCalendarSeoPage() {
  const faq = [
    { q: "Is synchronization automatic?", a: "Yes. Calendars are synced automatically at regular intervals." },
    { q: "Can I use it for multiple rooms or units?", a: "Yes. Each room or unit can have its own calendar inside the unified view." },
    { q: "Is iCal synchronization safe?", a: "Yes. iCal is the standard method used by booking platforms." },
    {
      q: "What happens after a reservation appears in the calendar?",
      a: "The unified calendar becomes the base for online check-in and structured guest communication.",
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <main className={styles.landing} style={{ paddingBottom: "var(--safe-bottom, 0px)", minHeight: "100dvh", overflowX: "hidden" }}>
      <LandingSafeArea />
      <MobileScrollReveal />

      <nav className={styles.nav} aria-label="Navigation" data-p4h-landing-nav>
        <Link href="/" className={styles.brand}>
          <img src="/Logo_Landing.png" alt="" aria-hidden="true" width={36} height={36} style={{ borderRadius: 12 }} />
          <strong>Plan4Host</strong>
        </Link>
        <div />
        <div className={styles.actions}>
          <Link className={`${styles.btn} ${styles.btnOutline}`} href="/">
            Home page
          </Link>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="title">
        <div className={styles.heroText} data-p4h-reveal>
          <h1 id="title" className={styles.heroHeadline} style={{ margin: 0 }}>
            Unified booking calendar for Airbnb and Booking
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            Managing reservations across multiple booking platforms quickly becomes confusing. A unified booking calendar brings all your
            reservations into one place, so you always know what is booked, when, and where.
          </p>
          <ul className={styles.includedList} style={{ marginTop: 10 }}>
            <li>No switching between platforms.</li>
            <li>No double-checking availability.</li>
          </ul>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/checkin?property=b1588b40-954d-4489-b36e-45659853489a">
              See the online check-in form
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/online-check-in-accommodation">
              Read about online check-in
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Unified calendar preview" data-p4h-reveal>
          <Image
            src="/Landing_Mockups3.png"
            alt="Plan4Host calendar preview"
            width={900}
            height={900}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
            priority
          />
        </div>
      </section>

      <div className={seo.content}>
        <section className={seo.section} aria-labelledby="meaning">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="meaning" className={seo.h2}>
              What a unified booking calendar means
            </h2>
            <p className={seo.p}>
              A unified booking calendar is a single calendar that displays all reservations from different booking platforms.
            </p>
            <p className={seo.p}>
              Instead of checking Airbnb, Booking, and other channels separately, everything appears in one organized view. Each reservation is
              synced automatically and updated as changes happen.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="problem">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="problem" className={seo.h2}>
              The problem with multiple booking calendars
            </h2>
            <p className={seo.p}>When reservations are spread across different platforms:</p>
            <ul className={styles.includedList} style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}>
              <li>availability becomes hard to track</li>
              <li>overbooking is a real risk</li>
              <li>changes are easy to miss</li>
              <li>daily planning takes more time than necessary</li>
            </ul>
            <p className={seo.p}>Even for small accommodations, multiple calendars create unnecessary stress.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="how">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="how" className={seo.h2}>
              How a unified booking calendar works with Plan4Host
            </h2>
            <p className={seo.p}>
              Plan4Host uses iCal synchronization to collect reservations from all platforms into one calendar. The workflow is simple:
            </p>
            <div className={seo.flowRow} aria-label="Workflow">
              <span className={seo.flowPill}>booking platforms</span>
              <span className={seo.flowArrow}>→</span>
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>calendar sync</span>
              <span className={seo.flowArrow}>→</span>
              <span className={seo.flowPill}>unified calendar</span>
            </div>
            <p className={seo.p}>
              All reservations are displayed clearly, by date and by unit, without manual updates.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="platforms">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="platforms" className={seo.h2}>
              Which platforms can be synced
            </h2>
            <p className={seo.p}>The unified booking calendar works with:</p>
            <ul className={styles.includedList}>
              <li>Airbnb</li>
              <li>Booking.com</li>
              <li>Expedia</li>
              <li>Travelminit</li>
              <li>any booking platform that provides iCal links</li>
            </ul>
            <div className={seo.logosRow} aria-label="Platforms that support iCal">
              <span className={seo.logosLabel}>Examples</span>
              <img className={seo.logoImg} src="/airbnb.png" alt="Airbnb" />
              <img className={seo.logoImg} src="/booking.png" alt="Booking.com" />
              <img className={seo.logoImg} src="/expedia.png" alt="Expedia" />
              <img className={seo.logoImg} src="/travelminit.png" alt="Travelminit" />
            </div>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="inside">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="inside" className={seo.h2}>
              What you see in the unified calendar
            </h2>
            <p className={seo.p}>Inside the unified calendar, hosts can see:</p>
            <ul className={styles.includedList}>
              <li>check-in and check-out dates</li>
              <li>reservation duration</li>
              <li>assigned room or unit</li>
              <li>reservation status</li>
            </ul>
            <p className={seo.p}>Everything is visible from a single screen, without switching tools.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="why">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="why" className={seo.h2}>
              Why a unified calendar matters
            </h2>
            <p className={seo.p}>A unified booking calendar:</p>
            <ul className={styles.includedList}>
              <li>reduces the risk of overbooking</li>
              <li>saves time every day</li>
              <li>provides a clear overview of availability</li>
              <li>creates a reliable base for automation</li>
            </ul>
            <p className={seo.p}>
              It is the foundation for online check-in and automatic guest messages.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="bridge">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="bridge" className={seo.h2}>
              How the calendar connects to online check-in
            </h2>
            <p className={seo.p}>
              Once reservations are synced into one place, guests can be guided to complete online check-in before arrival. After check-in is
              completed and the reservation is confirmed, guest communication becomes structured and predictable.
            </p>
            <p className={seo.p}>This is how the full workflow stays organized.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="for">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="for" className={seo.h2}>
              Who this is built for
            </h2>
            <p className={seo.p}>A unified booking calendar is ideal for:</p>
            <ul className={styles.includedList}>
              <li>Airbnb and Booking hosts</li>
              <li>short-term rental accommodations</li>
              <li>apartments, cabins, and guesthouses</li>
              <li>hosts managing multiple units</li>
              <li>small teams without a front desk</li>
            </ul>
            <p className={seo.p}>It is designed for real hosting workflows, not enterprise hotel chains.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="faq">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="faq" className={seo.h2}>
              Frequently asked questions
            </h2>
            <div className={seo.faqGrid}>
              {faq.map((item) => (
                <div key={item.q} className={`sb-cardglow ${seo.faqItem}`}>
                  <p className={seo.faqQ}>{item.q}</p>
                  <p className={seo.faqA}>{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="cta">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="cta" className={seo.h2}>
              A unified booking calendar is the starting point
            </h2>
            <p className={seo.p}>
              Online check-in is where the guest experience begins.
            </p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/checkin?property=b1588b40-954d-4489-b36e-45659853489a">
                See the online check-in form
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/guest-ai-assistant/demo">
                See where guests receive messages
              </Link>
            </div>
          </div>
        </section>
      </div>

      <SeoFooter lang="en" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </main>
  );
}

