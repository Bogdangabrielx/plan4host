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
  title: "Plan4Host vs channel manager | Plan4Host",
  description:
    "A clear comparison between Plan4Host and a classic channel manager, so hosts can see when a lighter operations platform is enough and when a heavier system is needed.",
  alternates: {
    canonical: "/plan4host-vs-channel-manager",
    languages: {
      en: "/plan4host-vs-channel-manager",
      ro: "/ro/plan4host-vs-channel-manager",
    },
  },
  openGraph: {
    title: "Plan4Host vs channel manager | Plan4Host",
    description:
      "See when Plan4Host is the right operational choice and when a heavier channel manager may be more appropriate.",
    url: "/plan4host-vs-channel-manager",
    locale: "en_US",
    type: "article",
  },
};

export default function Plan4HostVsChannelManagerPage() {
  const faq = [
    {
      q: "Is Plan4Host a classic channel manager?",
      a: "No. Plan4Host is a lighter operations platform built around unified reservations, guest flow, and daily coordination.",
    },
    {
      q: "When should I use a heavier channel manager instead?",
      a: "If you need real-time API sync, automatic pricing, advanced restrictions, or complex hotel workflows, a heavier channel manager may be a better fit.",
    },
    {
      q: "When is Plan4Host enough?",
      a: "Plan4Host is a strong fit when you want one calm place for reservations, online check-in, guest messages, and simple operational flow.",
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
            Plan4Host vs a classic channel manager
          </h1>
          <p className={`${styles.heroKicker} ${seo.seoHeroIntro}`} style={{ maxWidth: 72 * 10 }}>
            This is not a battle page. It is a positioning page. <strong>Plan4Host</strong> is designed for hosts who want <strong>calm operations</strong>, not for teams that need a heavy enterprise channel stack.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/who-plan4host-is-for">
              See who Plan4Host is for
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/how-plan4host-works-with-airbnb-and-booking">
              See how Plan4Host works
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Plan4Host comparison context" data-p4h-reveal>
          <Image
            src="/benefits_en.png"
            alt="Plan4Host operational overview"
            width={900}
            height={900}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
            priority
          />
        </div>
      </section>

      <article className={seo.article}>
        <section className={seo.articleSection} aria-labelledby="difference">
          <div className={seo.articleSplit}>
            <div className={seo.articleSectionTight}>
              <h2 id="difference" className={seo.h2}>
                The main difference
              </h2>
              <p className={seo.p}>
                A classic channel manager is usually built for <strong>distribution complexity</strong>: API connections, rate management, restrictions, and heavier inventory control.
              </p>
              <p className={seo.p}>
                Plan4Host is built for <strong>operational clarity</strong>: one calendar, online check-in, guest messages, and a simpler flow around the reservation once it enters the system.
              </p>
            </div>
            <div className={seo.imageFrame}>
              <Image
                src="/problem_multiple_booking.png"
                alt="Operational complexity across channels"
                width={1200}
                height={900}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="when-plan4host">
          <h2 id="when-plan4host" className={seo.h2}>
            When Plan4Host is the better fit
          </h2>
          <ul className={styles.includedList} style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}>
            <li>you want one place for reservations, guests, and check-in flow</li>
            <li>you manage a small or mid-size short-term rental operation</li>
            <li>you care more about daily clarity than advanced revenue tooling</li>
            <li>you want less interruption and less manual guest coordination</li>
          </ul>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="when-channel-manager">
          <h2 id="when-channel-manager" className={seo.h2}>
            When a heavier channel manager is the better fit
          </h2>
          <ul className={styles.includedList} style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}>
            <li>you need real-time API sync everywhere</li>
            <li>you need price automation and advanced rate rules</li>
            <li>you depend on restrictions, allotments, and larger hotel logic</li>
            <li>your operation is already built around enterprise distribution tooling</li>
          </ul>
        </section>

        <section className={seo.articleSection} aria-labelledby="cta">
          <div className={`sb-cardglow ${seo.card}`}>
            <h2 id="cta" className={seo.h2}>
              Final note
            </h2>
            <p className={seo.p}>
              The honest comparison is simple: <strong>Plan4Host is not trying to be everything</strong>. It is a lighter system for hosts who want a clear guest and operations flow without unnecessary complexity.
            </p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/how-plan4host-works-with-airbnb-and-booking">
                See how it works
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/online-check-in-accommodation">
                See online check-in
              </Link>
            </div>
          </div>
        </section>
      </article>

      <SeoFooter lang="en" />
      <SeoStructuredData
        lang="en"
        path="/plan4host-vs-channel-manager"
        title="Plan4Host vs channel manager | Plan4Host"
        description="A clear comparison between Plan4Host and a classic channel manager, so hosts can see when a lighter operations platform is enough and when a heavier system is needed."
        image="/benefits_en.png"
        faq={faq}
      />
    </main>
  );
}
