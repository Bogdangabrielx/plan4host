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
  title: "Plan4Host FAQ | Plan4Host",
  description:
    "Direct answers about what Plan4Host is, how it works with Airbnb and Booking, what iCal sync includes, and who the platform is built for.",
  alternates: {
    canonical: "/plan4host-faq",
    languages: {
      en: "/plan4host-faq",
      ro: "/ro/intrebari-frecvente-plan4host",
    },
  },
  openGraph: {
    title: "Plan4Host FAQ | Plan4Host",
    description:
      "Clear answers about Plan4Host, iCal sync, guest messaging, online check-in, and when the platform is the right fit.",
    url: "/plan4host-faq",
    locale: "en_US",
    type: "article",
  },
};

export default function Plan4HostFaqPage() {
  const faq = [
    {
      q: "What is Plan4Host?",
      a: "Plan4Host is a short-term rental operations platform. It combines a unified booking calendar, online check-in, guest messaging, and guest-facing operational flow in one place.",
    },
    {
      q: "Is Plan4Host a full channel manager?",
      a: "No. Plan4Host is not positioned as a full API channel manager. It is a lighter operations system focused on calendar clarity, guest flow, and day-to-day coordination.",
    },
    {
      q: "Does Plan4Host use official Airbnb and Booking APIs?",
      a: "No. Plan4Host works with Airbnb and Booking through iCal sync.",
    },
    {
      q: "What does iCal sync include?",
      a: "iCal sync is used to import reservations and blocked dates and to export availability back. It helps keep reservations organized in one calendar.",
    },
    {
      q: "What does iCal sync not include?",
      a: "It does not include price automation, advanced restrictions, or the full real-time behavior of a heavy API channel manager.",
    },
    {
      q: "What happens after reservations enter Plan4Host?",
      a: "Reservations appear in one calendar and can then support online check-in, guest messages, cleaning flow, and a clearer daily operating process.",
    },
    {
      q: "Is the online check-in form available in multiple languages?",
      a: "Yes. The guest-facing check-in form supports multiple languages, and the confirmation email can follow the language selected in the form.",
    },
    {
      q: "Who is Plan4Host best for?",
      a: "Plan4Host is best for small and mid-size short-term rental operations that want one calm place for reservations, guest communication, and operational flow.",
    },
    {
      q: "When is Plan4Host not the right fit?",
      a: "If your business depends on real-time API sync, advanced rate management, complex channel rules, or large hotel workflows, a heavier tool may be more appropriate.",
    },
  ];

  return (
    <main className={`${styles.landing} ${seoMontserrat.className}`} style={{ paddingBottom: "var(--safe-bottom, 0px)", minHeight: "100dvh", overflowX: "hidden" }}>
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
            Plan4Host FAQ
          </h1>
          <p className={`${styles.heroKicker} ${seo.seoHeroIntro}`} style={{ maxWidth: 72 * 10 }}>
            Direct answers about what <strong>Plan4Host</strong> is, how it works with <strong>Airbnb</strong> and <strong>Booking.com</strong>, what <strong>iCal sync</strong> includes, and when the platform is the right fit.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/how-plan4host-works-with-airbnb-and-booking">
              See how it works
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/who-plan4host-is-for">
              See who Plan4Host is for
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Plan4Host FAQ overview" data-p4h-reveal>
          <Image
            src="/Hero_device2.png"
            alt="Plan4Host platform preview"
            width={900}
            height={900}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
            priority
          />
        </div>
      </section>

      <article className={seo.article}>
        <section className={seo.articleSection} aria-labelledby="faq">
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
        </section>

        <section className={seo.articleSection} aria-labelledby="cta">
          <div className={`sb-cardglow ${seo.card}`}>
            <h2 id="cta" className={seo.h2}>
              Related pages
            </h2>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/how-plan4host-works-with-airbnb-and-booking">
                How Plan4Host works with Airbnb and Booking
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/plan4host-vs-channel-manager">
                Plan4Host vs channel manager
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/online-check-in-accommodation">
                Online check-in
              </Link>
            </div>
          </div>
        </section>
      </article>

      <SeoFooter lang="en" />
      <SeoStructuredData
        lang="en"
        path="/plan4host-faq"
        title="Plan4Host FAQ | Plan4Host"
        description="Direct answers about what Plan4Host is, how it works with Airbnb and Booking, what iCal sync includes, and who the platform is built for."
        image="/Hero_device2.png"
        faq={faq}
      />
    </main>
  );
}
