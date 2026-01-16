import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import styles from "../home.module.css";
import seo from "../seo.module.css";

export const metadata: Metadata = {
  title: "Online check-in for accommodation | Plan4Host",
  description:
    "Online check-in for accommodation: a simple way for hosts to reduce messages, stress, and time wasted before guest arrival.",
  alternates: {
    canonical: "/online-check-in-accommodation",
    languages: {
      en: "/online-check-in-accommodation",
      ro: "/ro/check-in-online-cazare",
    },
  },
  openGraph: {
    title: "Online check-in for accommodation | Plan4Host",
    description:
      "Instead of repeated messages, guests submit the required details online before they arrive.",
    url: "/online-check-in-accommodation",
    locale: "en_US",
    type: "article",
  },
};

export default function OnlineCheckInAccommodationPage() {
  const faq = [
    {
      q: "Is online check-in hard for guests?",
      a: "No. Guests receive one link and complete a simple form.",
    },
    {
      q: "Do I still need to message guests manually?",
      a: "Less. You can share one check-in link and avoid repeated back-and-forth before arrival.",
    },
    {
      q: "Can I choose what information to request?",
      a: "Yes. The form can be adapted to what your property needs.",
    },
    {
      q: "What happens after a guest submits the form?",
      a: "You receive a notification and can confirm the reservation inside Plan4Host.",
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <main
      className={styles.landing}
      style={{
        minHeight: "100dvh",
        overflowX: "hidden",
      }}
    >
      <MobileScrollReveal />

      <nav className={styles.nav} aria-label="Navigation">
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
          <h1 id="title" className={styles.heroHeadline} style={{ margin: 0 }}>
            Online check-in for accommodation
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            Online check-in is one of the simplest ways for hosts to reduce guest messages, stress, and time wasted
            before arrival. Instead of repeated conversations, guests submit the required details online, before they
            reach the property.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/">
              See how it works
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/guest-ai-assistant/demo">
              Discover the guest experience
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Check-in preview" data-p4h-reveal>
          <Image
            src="/Landing_Mockups3.png"
            alt="Plan4Host check-in preview"
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
              What online check-in means for guests
            </h2>
            <p className={seo.p}>
              Online check-in means the guest receives a link where they complete the needed information before
              arrival. No separate messages, no last-minute WhatsApp photos, and no stressful back-and-forth.
            </p>
            <p className={seo.p}>
              For the guest, the process is simple and clear. For the host, everything stays organized in one place.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="classic">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="classic" className={seo.h2}>
              Problems with classic check-in
            </h2>
            <p className={seo.p}>Classic check-in often means:</p>
            <ul className={styles.problemList}>
              <li>last-minute messages</li>
              <li>incomplete information</li>
              <li>repeated questions</li>
              <li>time wasted exactly when you are already busy</li>
            </ul>
            <p className={seo.p}>Many guests ask the same things:</p>
            <ul className={styles.problemList}>
              <li>what time they can arrive</li>
              <li>where to park</li>
              <li>what documents are needed</li>
              <li>what the property rules are</li>
            </ul>
            <p className={seo.p}>It repeats from one reservation to the next.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="workflow">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="workflow" className={seo.h2}>
              How online check-in works with Plan4Host
            </h2>
            <p className={seo.p}>With Plan4Host, online check-in follows a simple flow:</p>
            <div className={seo.flowRow} aria-label="Workflow">
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>invited</span>
              <span className={seo.flowArrow}>→</span>
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>online form</span>
              <span className={seo.flowArrow}>→</span>
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>confirmation</span>
              <span className={seo.flowArrow}>→</span>
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>arrival</span>
            </div>
            <p className={seo.p}>
              The host shares one check-in link. The guest completes the form before arrival. The host receives a
              notification and confirms the reservation.
            </p>
            <p className={seo.p}>Everything is clear before the guest reaches the property.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="form">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="form" className={seo.h2}>
              What the guest fills in
            </h2>
            <p className={seo.p}>The online check-in form can include:</p>
            <ul className={styles.includedList}>
              <li>identification details</li>
              <li>contact information</li>
              <li>accepting house rules</li>
              <li>other details requested by the host</li>
            </ul>
            <p className={seo.p}>
              Guests see exactly what to do, without extra explanations. Hosts receive structured data, without separate
              messages.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="after">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="after" className={seo.h2}>
              What the guest sees after check-in
            </h2>
            <p className={seo.p}>After completing the form, the guest:</p>
            <ul className={styles.includedList}>
              <li>receives a check-in confirmation</li>
              <li>knows the reservation is registered</li>
              <li>has access to the key information about the stay</li>
            </ul>
            <p className={seo.p}>No need for manual confirmation messages.</p>

            <div style={{ marginTop: 10 }}>
              <Image
                src="/Confirmare%20primire%20formular.png"
                alt="Example confirmation after submitting the check-in form"
                width={1200}
                height={800}
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                }}
              />
            </div>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="who">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="who" className={seo.h2}>
              Who benefits the most
            </h2>
            <p className={seo.p}>Online check-in is a good fit for:</p>
            <ul className={styles.includedList}>
              <li>hosts with one or multiple properties</li>
              <li>people managing the property alone</li>
              <li>hosts who want fewer daily interruptions</li>
              <li>properties without a permanent reception</li>
            </ul>
            <p className={seo.p}>It is not designed for large hotels with complex processes.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="faq">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="faq" className={seo.h2}>
              Frequently asked questions
            </h2>
            <div className={seo.faqGrid}>
              {faq.map((item) => (
                <div key={item.q} className={`sb-cardglow ${seo.faqItem}`} data-p4h-reveal>
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
              In practice
            </h2>
            <p className={seo.p}>
              If you want to see how online check-in works in practice, explore the full flow in Plan4Host.
            </p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/">
                See the homepage
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/guest-ai-assistant/demo">
                Discover the guest experience
              </Link>
            </div>
          </div>
        </section>
      </div>

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </main>
  );
}
