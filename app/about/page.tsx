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
      a: "I built Plan4Host. I have worked as a developer since 2020, and my interest in automation started in 2019. The idea came after a conversation with a host who explained how fragmented, expensive, and stressful daily operations can become.",
    },
    {
      q: "What is Plan4Host meant to do?",
      a: "I built Plan4Host to make short-term rental operations calmer and clearer through a unified calendar, online check-in, guest messaging, and practical daily coordination.",
    },
    {
      q: "What is the product not trying to be?",
      a: "I am not trying to build a heavy enterprise channel manager. I want Plan4Host to be a practical operating system for smaller and mid-size short-term rental teams.",
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
          <img src="/Hero_device2.png" alt="Plan4Host app preview" className={styles.focusable} />
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
                I built Plan4Host after a conversation with a host who explained how complex guest operations really are in daily work. He described repeated questions, too many moving parts, and the feeling that existing tools were often expensive without being simple.
              </p>
              <p className={seo.p}>
                That conversation stayed with me. I realized the real problem was not only operations, but the lack of clarity around them. So I decided to build something that reduces friction instead of adding another heavy layer on top.
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
            I built Plan4Host as a <strong>short-term rental operations platform</strong>. It brings together a unified booking calendar, online check-in, guest messaging, and guest-facing support into one practical system.
          </p>
          <p className={seo.p}>
            Where iCal is the practical choice, I use it on purpose: <strong>it is efficient, affordable, and it helps hosts save money</strong> without giving up the automation that matters in daily operations.
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
                I am <strong>not trying to position Plan4Host as a heavy enterprise channel manager</strong>. I do not want to pretend it replaces every API-driven distribution system on the market.
              </p>
              <p className={seo.p}>
                I want the product to be strongest where it matters most for smaller and mid-size operations: less interruption, less manual chaos, more clarity, and a more cost-efficient setup.
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
                My name is <strong>Bogdan Enică</strong>. I am not a property manager, but I listened closely to a host who described what daily guest operations actually feel like: too many repeated questions, too much manual follow-up, too many places to check, and tools that are often expensive without feeling simple.
              </p>
              <p className={seo.p}>
                I have worked as a developer since <strong>2020</strong>, and my interest in automation started in <strong>2019</strong>. Everything I try to do in my work follows the same direction: simplify how things function and bring clarity to processes that usually feel more complicated than they should.
              </p>
            </div>
            <div className={seo.imageFrame} style={{ maxWidth: 320, marginInline: "auto" }}>
              <Image
                src="/founder_02.jpg"
                alt="Bogdan Enică, founder of Plan4Host"
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
        image="/founder_02.jpg"
        faq={faq}
      />
    </main>
  );
}
