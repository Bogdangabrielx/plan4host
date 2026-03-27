import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LandingSafeArea from "@/components/landing/LandingSafeArea";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import SeoFooter from "@/components/seo/SeoFooter";
import SeoStructuredData from "@/components/seo/SeoStructuredData";
import { seoMontserrat } from "@/components/seo/seoFont";
import styles from "../home.module.css";
import seo from "../seo.module.css";

export const metadata: Metadata = {
  title: "How Plan4Host works with Airbnb and Booking | Plan4Host",
  description:
    "A clear explanation of how Plan4Host works with Airbnb and Booking using iCal sync, and how it adds online check-in, guest messages, and cleaner daily operations.",
  alternates: {
    canonical: "/how-plan4host-works-with-airbnb-and-booking",
    languages: {
      en: "/how-plan4host-works-with-airbnb-and-booking",
      ro: "/ro/cum-functioneaza-plan4host-cu-airbnb-si-booking",
    },
  },
  openGraph: {
    title: "How Plan4Host works with Airbnb and Booking | Plan4Host",
    description:
      "See how Plan4Host works with Airbnb and Booking using iCal sync, then organizes guest communication, check-in, and operations in one place.",
    url: "/how-plan4host-works-with-airbnb-and-booking",
    locale: "en_US",
    type: "article",
  },
};

export default function HowPlan4HostWorksPage() {
  const faq = [
    {
      q: "Does Plan4Host use official Airbnb and Booking APIs?",
      a: "No. Plan4Host works with Airbnb and Booking through iCal calendar sync.",
    },
    {
      q: "Can Plan4Host sync prices and restrictions?",
      a: "No. iCal sync is used for reservations, blocked dates, and availability flow, not for price automation or advanced channel restrictions.",
    },
    {
      q: "What happens after reservations enter Plan4Host?",
      a: "They appear in one calendar and can then support online check-in, guest communication, and cleaning flow.",
    },
    {
      q: "Who is this setup best for?",
      a: "It is best for small and mid-size short-term rental operations that want one calm system for daily work without paying for a heavy channel manager.",
    },
  ];

  return (
    <main
      className={`${styles.landing} ${seoMontserrat.className}`}
      style={{
        paddingBottom: "var(--safe-bottom, 0px)",
        minHeight: "100dvh",
        overflowX: "hidden",
        fontFamily: seoMontserrat.style.fontFamily,
      }}
    >
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
            Back to Plan4Host
          </Link>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="title">
        <div className={styles.heroText} data-p4h-reveal>
          <h1 id="title" className={`${styles.heroHeadline} ${seo.seoHeroTitle}`}>
            How Plan4Host works with Airbnb and Booking
          </h1>
          <p className={`${styles.heroKicker} ${seo.seoHeroIntro}`} style={{ maxWidth: 72 * 10 }}>
            <strong>Plan4Host</strong> connects with <strong>Airbnb</strong> and <strong>Booking.com</strong> through <strong>iCal sync</strong>. It brings reservations into one calm system, then helps you run <strong>online check-in</strong>, <strong>guest messages</strong>, and <strong>daily operations</strong> from one place.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/unified-booking-calendar">
              See the unified calendar
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/automatic-guest-messages">
              See guest messaging
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Plan4Host calendar preview" data-p4h-reveal>
          <Image
            src="/Hero_device2.png"
            alt="Plan4Host reservation calendar"
            width={900}
            height={900}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
            priority
          />
        </div>
      </section>

      <article className={seo.article}>
        <section className={seo.articleSection} aria-labelledby="what-it-means">
          <div className={seo.articleSplit}>
            <div className={seo.imageFrame}>
              <Image
                src="/what_unified_booking.png"
                alt="Unified booking calendar view"
                width={1200}
                height={900}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
            <div className={seo.articleSectionTight}>
              <h2 id="what-it-means" className={seo.h2}>
                What this means in practice
              </h2>
              <p className={seo.p}>
                Plan4Host is <strong>not positioned as a full API channel manager</strong>. The core is simpler: collect reservations from booking platforms into <strong>one unified calendar</strong> and use that calendar as the base for the rest of the guest flow.
              </p>
              <p className={seo.p}>
                In daily work, that matters because you stop switching between tabs to understand what is arriving, what is leaving, and what still needs action.
              </p>
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="covers">
          <h2 id="covers" className={seo.h2}>
            What iCal sync covers
          </h2>
          <p className={seo.p}>
            With Plan4Host, <strong>iCal sync</strong> is used to pull reservation timing into the system and keep availability more organized across platforms.
          </p>
          <ul className={styles.includedList} style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}>
            <li>import reservations and blocked dates</li>
            <li>show bookings in one calendar per unit</li>
            <li>reduce manual checking between Airbnb and Booking</li>
            <li>create the base for guest messaging and online check-in</li>
          </ul>
          <p className={seo.p}>
            It does <strong>not</strong> try to promise price automation, advanced restrictions, or the full scope of a heavy API channel manager. That distinction should stay explicit.
          </p>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="why-use-it">
          <h2 id="why-use-it" className={seo.h2}>
            Why hosts still use it
          </h2>
          <p className={seo.p}>
            Hosts choose Plan4Host because the value is not only “sync”. The real value is what happens <strong>after the reservation enters the system</strong>.
          </p>
          <div className={seo.featureRow}>
            <div className={seo.featureItem}>
              <div className={seo.imageFrame}>
                <Image
                  src="/centralized_en.png"
                  alt="Centralized reservations and guest flow"
                  width={900}
                  height={700}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p className={seo.featureCaption}>
                Reservations from different sources are easier to read when they land in one organized view.
              </p>
            </div>
            <div className={seo.featureItem}>
              <div className={seo.imageFrame}>
                <Image
                  src="/right_moment_en.png"
                  alt="Messages delivered at the right moment"
                  width={900}
                  height={700}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p className={seo.featureCaption}>
                Once the booking is visible, guest communication can be delivered at the right moment instead of manually.
              </p>
            </div>
            <div className={seo.featureItem}>
              <div className={seo.imageFrame}>
                <Image
                  src="/Checkin_mok2.png"
                  alt="Online check-in inside Plan4Host"
                  width={900}
                  height={700}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p className={seo.featureCaption}>
                Online check-in turns a reservation into a structured guest flow, not just another calendar event.
              </p>
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="best-fit">
          <div className={seo.articleSplit}>
            <div className={seo.articleSectionTight}>
              <h2 id="best-fit" className={seo.h2}>
                Who this setup fits best
              </h2>
              <p className={seo.p}>
                Plan4Host fits best when you want a <strong>clear operating system</strong> for reservations, guest information, and day-to-day coordination — without paying for a large channel manager stack.
              </p>
              <ul className={styles.includedList} style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}>
                <li>one or multiple small properties</li>
                <li>owners or managers working without a permanent reception</li>
                <li>teams that care more about calm operations than advanced revenue features</li>
                <li>hosts who want one place for calendar, check-in, and guest communication</li>
              </ul>
            </div>
            <div className={seo.imageFrame}>
              <Image
                src="/who_benefit.png"
                alt="Who Plan4Host fits best"
                width={1200}
                height={900}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="not-right-fit">
          <h2 id="not-right-fit" className={seo.h2}>
            When it is not the right fit
          </h2>
          <p className={seo.p}>
            If you need <strong>real-time API sync</strong>, <strong>automatic pricing</strong>, or a full enterprise channel manager setup, Plan4Host should not be presented as that product.
          </p>
          <p className={seo.p}>
            The clearer this is in public content, the easier it becomes for both Google and AI systems to describe the platform correctly.
          </p>
        </section>

        <section className={seo.articleSection} aria-labelledby="cta">
          <div className={`sb-cardglow ${seo.card}`}>
            <h2 id="cta" className={seo.h2}>
              Final note
            </h2>
            <p className={seo.p}>
              The honest positioning is simple: <strong>Plan4Host is a calm operations platform for small and mid-size short-term rentals</strong>, built around unified reservations, guest flow, and practical daily work.
            </p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/online-check-in-accommodation">
                See online check-in
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/who-plan4host-is-for">
                See who Plan4Host is for
              </Link>
            </div>
          </div>
        </section>
      </article>

      <SeoFooter lang="en" />
      <SeoStructuredData
        lang="en"
        path="/how-plan4host-works-with-airbnb-and-booking"
        title="How Plan4Host works with Airbnb and Booking | Plan4Host"
        description="A clear explanation of how Plan4Host works with Airbnb and Booking using iCal sync, and how it adds online check-in, guest messages, and cleaner daily operations."
        image="/Hero_device2.png"
        faq={faq}
      />
    </main>
  );
}
