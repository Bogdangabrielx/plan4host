import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import styles from "../home.module.css";
import seo from "../seo.module.css";

export const metadata: Metadata = {
  title: "Automatic guest messages for accommodation | Plan4Host",
  description:
    "Send automatic guest messages after check-in. Arrival info, Wi-Fi, rules and check-out instructions delivered at the right time, without manual messaging.",
  alternates: {
    canonical: "/automatic-guest-messages",
    languages: {
      en: "/automatic-guest-messages",
      ro: "/ro/mesaje-automate-pentru-oaspeti",
    },
  },
  openGraph: {
    title: "Automatic guest messages for accommodation | Plan4Host",
    description:
      "Send automatic guest messages after check-in: arrival, Wi-Fi, rules and check-out, delivered at the right time.",
    url: "/automatic-guest-messages",
    locale: "en_US",
    type: "article",
  },
};

export default function AutomaticGuestMessagesSeoPage() {
  const faq = [
    {
      q: "Do guests receive emails or WhatsApp messages?",
      a: "Messages appear inside a dedicated guest portal after confirmation.",
    },
    {
      q: "Can I customize the messages?",
      a: "Yes. Messages are fully customizable and can be edited anytime.",
    },
    {
      q: "Are messages sent without my confirmation?",
      a: "No. Messages start only after the reservation is confirmed.",
    },
    {
      q: "Can guests reply to messages?",
      a: "Messages are informational and designed to reduce unnecessary conversations.",
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
    <main className={styles.landing} style={{ minHeight: "100dvh", overflowX: "hidden" }}>
      <MobileScrollReveal />

      <nav className={styles.nav} aria-label="Navigation">
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
            Automatic guest messages for accommodation
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            Guest messages are one of the biggest sources of stress for hosts. Arrival details, Wi‑Fi, parking, house
            rules — “just one more question”.
            <br />
            <br />
            Automatic guest messages replace repetitive conversations with clear, well‑timed information — delivered
            exactly when guests need it.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/guest-ai-assistant/demo">
              See the guest message portal
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/checkin?property=b1588b40-954d-4489-b36e-45659853489a">
              See the check-in form
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Guest portal preview" data-p4h-reveal>
          <Image
            src="/Landing_Mockups2.png"
            alt="Guest portal preview"
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
              What automatic guest messages mean
            </h2>
            <p className={seo.p}>
              Automatic guest messages are scheduled messages sent to guests based on their reservation status.
            </p>
            <p className={seo.p}>
              Instead of answering the same questions again and again, guests receive the right information automatically:{" "}
              <strong>before arrival</strong>, <strong>at arrival</strong>, and <strong>before check-out</strong>.
            </p>
            <p className={seo.pStrong}>No manual sending. No follow-ups. No missed messages.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="manual">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="manual" className={seo.h2}>
              The problem with manual guest communication
            </h2>
            <p className={seo.p}>Most hosts communicate with guests using:</p>
            <ul className={styles.problemList}>
              <li>WhatsApp</li>
              <li>booking platform chat</li>
              <li>last-minute messages</li>
            </ul>
            <p className={seo.p}>This usually leads to:</p>
            <ul className={styles.problemList}>
              <li>repeated questions</li>
              <li>forgotten details</li>
              <li>stress right before arrival</li>
              <li>interruptions throughout the day</li>
            </ul>
            <p className={seo.pStrong}>Manual communication does not scale — even for small properties.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="how">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="how" className={seo.h2}>
              How automatic guest messages work with Plan4Host
            </h2>
            <p className={seo.p}>With Plan4Host, guest messages follow a simple flow:</p>
            <div className={seo.flowRow} aria-label="Workflow">
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>check-in completed</span>
              <span className={seo.flowArrow}>→</span>
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>reservation confirmed</span>
              <span className={seo.flowArrow}>→</span>
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>messages delivered</span>
            </div>
            <p className={seo.p}>
              Once the guest completes online check-in and the host confirms the reservation, guests gain access to a
              private message portal where scheduled messages appear automatically at the right time.
            </p>
            <p className={seo.pStrong}>No extra actions are required from the host.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="what">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="what" className={seo.h2}>
              What guests receive automatically
            </h2>
            <p className={seo.p}>Automatic messages can include:</p>
            <ul className={styles.includedList}>
              <li>arrival instructions</li>
              <li>access codes</li>
              <li>Wi-Fi details</li>
              <li>parking information</li>
              <li>house rules reminders</li>
              <li>check-out instructions</li>
              <li>local recommendations</li>
            </ul>
            <p className={seo.pStrong}>
              Messages are shown inside the guest portal — not scattered across emails or chats.
            </p>
            <div className={seo.logosRow} aria-label="Platforms">
              <span className={seo.logosLabel}>Platforms</span>
              <Image className={seo.logoImg} src="/airbnb.png" alt="Airbnb" width={52} height={52} />
              <Image className={seo.logoImg} src="/booking.png" alt="Booking.com" width={52} height={52} />
              <Image className={seo.logoImg} src="/trivago.png" alt="Trivago" width={52} height={52} />
              <Image className={seo.logoImg} src="/expedia.png" alt="Expedia" width={52} height={52} />
            </div>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="when">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="when" className={seo.h2}>
              When messages are sent
            </h2>
            <p className={seo.p}>Messages can be scheduled relative to the reservation:</p>
            <ul className={styles.problemList}>
              <li>before arrival (e.g. 1 hour before)</li>
              <li>at arrival</li>
              <li>before check-out (e.g. 12 hours before)</li>
            </ul>
            <p className={seo.pStrong}>Each message appears exactly when it is relevant for the guest.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="see">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="see" className={seo.h2}>
              What the guest sees
            </h2>
            <p className={seo.p}>
              Guests do not receive random messages. They access a dedicated guest portal where messages appear in order,
              reservation details are visible, house rules are accessible, and contact details are always available.
            </p>
            <p className={seo.pStrong}>Everything is calm, structured, and easy to understand.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="who">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="who" className={seo.h2}>
              Who automatic guest messages are for
            </h2>
            <p className={seo.p}>Automatic guest messages are ideal for:</p>
            <ul className={styles.includedList}>
              <li>short-term rental hosts</li>
              <li>Airbnb and Booking hosts</li>
              <li>properties without reception</li>
              <li>hosts managing multiple reservations</li>
              <li>anyone who wants fewer interruptions</li>
            </ul>
            <p className={seo.pStrong}>This system is built for real hosting workflows — not hotel chains.</p>
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
              See how automatic messages look from the guest’s perspective
            </h2>
            <p className={seo.p}>A calm portal where guests see messages at the right time.</p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/guest-ai-assistant/demo">
                See the guest message portal
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/">
                Home page
              </Link>
            </div>
          </div>
        </section>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </main>
  );
}

