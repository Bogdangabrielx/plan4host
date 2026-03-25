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
  title: "About Plan4Host",
  description:
    "Why Plan4Host exists, who built it, and how the product is positioned for short-term rental hosts and property managers.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Plan4Host",
    description:
      "Meet the founder behind Plan4Host and see why the platform was built for calm, structured short-term rental operations.",
    url: "/about",
    locale: "en_US",
    type: "article",
  },
};

export default function AboutPage() {
  const faq = [
    {
      q: "Who built Plan4Host?",
      a: "Plan4Host was built by Bogdan E., based on direct exposure to the daily friction hosts face around reservations, guest communication, and operations.",
    },
    {
      q: "What is Plan4Host meant to do?",
      a: "Plan4Host is meant to make short-term rental operations calmer and clearer through a unified calendar, online check-in, guest messaging, and practical daily coordination.",
    },
    {
      q: "What is the product not trying to be?",
      a: "It is not trying to be a heavy enterprise channel manager. The product is positioned as a practical operating system for smaller and mid-size short-term rental teams.",
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
            Home page
          </Link>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="title">
        <div className={styles.heroText} data-p4h-reveal>
          <h1 id="title" className={`${styles.heroHeadline} ${seo.seoHeroTitle}`}>
            About Plan4Host
          </h1>
          <p className={`${styles.heroKicker} ${seo.seoHeroIntro}`} style={{ maxWidth: 72 * 10 }}>
            Plan4Host was built for one reason: to make <strong>short-term rental operations calmer</strong>. The goal is not to add more noise or more dashboards. The goal is to give hosts and property managers one clear place for reservations, guests, check-in, and daily coordination.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/who-plan4host-is-for">
              Who Plan4Host is for
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/how-plan4host-works-with-airbnb-and-booking">
              How it works
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Founder of Plan4Host" data-p4h-reveal>
          <div style={{ display: "grid", placeItems: "center", padding: 24, height: "100%" }}>
            <div className={`sb-cardglow ${seo.card}`} style={{ width: "100%", maxWidth: 360, textAlign: "center", alignContent: "start" }}>
              <div className={seo.imageFrame} style={{ maxWidth: 180, margin: "0 auto" }}>
                <Image
                  src="/founder.jpg"
                  alt="Bogdan E., founder of Plan4Host"
                  width={480}
                  height={480}
                  style={{ width: "100%", height: "auto", display: "block", borderRadius: "999px" }}
                  priority
                />
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <p className={seo.faqQ} style={{ margin: 0 }}>Bogdan E.</p>
                <p className={seo.faqA} style={{ margin: 0 }}>Founder of Plan4Host</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className={seo.article}>
        <section className={seo.articleSection} aria-labelledby="why-built">
          <div className={seo.articleSplit}>
            <div className={seo.articleSectionTight}>
              <h2 id="why-built" className={seo.h2}>
                Why the product was built
              </h2>
              <p className={seo.p}>
                The product started from a simple observation: hosts spend too much time answering the same questions, checking too many places, and improvising too much around reservations.
              </p>
              <p className={seo.p}>
                The more those small interruptions accumulate, the harder it becomes to actually focus on hospitality. Plan4Host was built to reduce that friction, not to create another heavy tool.
              </p>
            </div>
            <div className={seo.imageFrame}>
              <Image
                src="/60%_en.png"
                alt="Repetitive host work and guest questions"
                width={1200}
                height={900}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="what-it-is">
          <h2 id="what-it-is" className={seo.h2}>
            What Plan4Host is
          </h2>
          <p className={seo.p}>
            Plan4Host is a <strong>short-term rental operations platform</strong>. It combines a unified booking calendar, online check-in, guest messaging, and guest-facing support into one practical system.
          </p>
          <ul className={styles.includedList} style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}>
            <li>one calendar for reservations</li>
            <li>one check-in flow for guests</li>
            <li>one place for message timing and guest information</li>
            <li>one calmer operational process for the host</li>
          </ul>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="what-it-is-not">
          <div className={seo.articleSplit}>
            <div className={seo.imageFrame}>
              <Image
                src="/problem_multiple_booking.png"
                alt="Operational complexity across booking channels"
                width={1200}
                height={900}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
            <div className={seo.articleSectionTight}>
              <h2 id="what-it-is-not" className={seo.h2}>
                What Plan4Host is not
              </h2>
              <p className={seo.p}>
                Plan4Host is <strong>not positioned as a heavy enterprise channel manager</strong>. It does not pretend to replace every API-driven distribution system on the market.
              </p>
              <p className={seo.p}>
                The product is strongest when it helps small and mid-size short-term rental operations work more clearly, with less interruption and less manual chaos.
              </p>
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="founder">
          <div className={seo.articleSplit}>
            <div className={seo.articleSectionTight}>
              <h2 id="founder" className={seo.h2}>
                Who is behind Plan4Host
              </h2>
              <p className={seo.p}>
                Plan4Host was founded by <strong>Bogdan E.</strong>, with the product shaped around real hosting friction: repetitive guest questions, fragmented reservation handling, and too much manual follow-up.
              </p>
              <p className={seo.p}>
                The direction has stayed the same: build a product that feels calm, understandable, and genuinely useful in daily work.
              </p>
            </div>
            <div className={seo.imageFrame} style={{ maxWidth: 320, marginInline: "auto" }}>
              <Image
                src="/founder.jpg"
                alt="Bogdan E., founder of Plan4Host"
                width={480}
                height={480}
                style={{ width: "100%", height: "auto", display: "block", borderRadius: 24 }}
              />
            </div>
          </div>
        </section>

        <section className={seo.articleSection} aria-labelledby="faq">
          <h2 id="faq" className={seo.h2}>
            Quick FAQ
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
      </article>

      <SeoFooter lang="en" />
      <SeoStructuredData
        lang="en"
        path="/about"
        title="About Plan4Host"
        description="Why Plan4Host exists, who built it, and how the product is positioned for short-term rental hosts and property managers."
        image="/founder.jpg"
        faq={faq}
      />
    </main>
  );
}
