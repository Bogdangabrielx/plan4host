import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LandingSafeArea from "@/components/landing/LandingSafeArea";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import SeoFooter from "@/components/seo/SeoFooter";
import styles from "../home.module.css";
import seo from "../seo.module.css";

export const metadata: Metadata = {
  title: "Automatic guest messages for Airbnb & Booking | Plan4Host",
  description:
    "Send automatic guest messages after check-in. Arrival info, Wi-Fi, rules and check-out instructions delivered at the right time, without manual replies.",
  alternates: {
    canonical: "/automatic-guest-messages",
    languages: {
      en: "/automatic-guest-messages",
      ro: "/ro/mesaje-automate-pentru-oaspeti",
    },
  },
  openGraph: {
    title: "Automatic guest messages for Airbnb & Booking | Plan4Host",
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
      q: "Do guests receive emails or chat messages?",
      a: "Messages are shown inside a dedicated guest portal after reservation confirmation.",
    },
    {
      q: "Can messages be customized?",
      a: "Yes. Hosts can edit messages anytime and adjust them to their property.",
    },
    {
      q: "Are messages sent automatically without confirmation?",
      a: "No. Messages start only after the reservation is confirmed by the host.",
    },
    {
      q: "Can guests reply to messages?",
      a: "Messages are designed to provide information and reduce unnecessary conversations.",
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
            Automatic guest messages for accommodation
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            Automatic guest messages help hosts reduce repetitive conversations and deliver the right information to
            guests at the right time. Instead of answering the same questions again and again, hosts prepare messages
            once and let the system handle the rest.
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
            src="/Hero_device2.png"
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
              Automatic guest messages are messages sent to guests based on their reservation status and timing.
            </p>
            <p className={seo.p}>
              They replace manual conversations with clear, scheduled information that guests receive when it is
              actually useful — before arrival, during the stay, or before check-out.
            </p>
            <ul className={styles.includedList}>
              <li>No manual sending.</li>
              <li>No forgotten messages.</li>
              <li>No last-minute stress.</li>
            </ul>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="manual">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="manual" className={seo.h2}>
              The problem with manual guest communication
            </h2>
            <p className={seo.p}>Most hosts communicate with guests using:</p>
            <ul
              className={styles.includedList}
              style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}
            >
              <li>booking platform chat</li>
              <li>WhatsApp</li>
              <li>email messages sent in a hurry</li>
            </ul>
            <p className={seo.p}>This usually leads to:</p>
            <ul
              className={styles.includedList}
              style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}
            >
              <li>repeated questions</li>
              <li>missing details</li>
              <li>interruptions throughout the day</li>
              <li>stress right before arrival</li>
            </ul>
            <p className={seo.pStrong}>
              Even with only a few reservations, manual messaging becomes difficult to manage consistently.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="otas">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="otas" className={seo.h2}>
              Automatic messages for Airbnb and Booking
            </h2>
            <p className={seo.p}>Airbnb and Booking guests usually ask the same questions:</p>
            <ul
              className={styles.includedList}
              style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}
            >
              <li>How do I access the property?</li>
              <li>Where can I park?</li>
              <li>What is the Wi‑Fi password?</li>
              <li>What time is check‑out?</li>
            </ul>
            <p className={seo.p}>
              With automatic guest messages, this information is delivered without manual replies. Messages are prepared
              once and shown automatically to guests based on their reservation — regardless of whether the booking
              comes from Airbnb, Booking, or another platform.
            </p>
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
              After the guest completes online check-in and the host confirms the reservation:
            </p>
            <ul className={styles.includedList}>
              <li>guests gain access to a private message portal</li>
              <li>scheduled messages appear automatically at the right moment</li>
              <li>all information stays organized in one place</li>
            </ul>
            <p className={seo.pStrong}>Hosts do not need to send messages manually.</p>
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
              <li>access details</li>
              <li>Wi‑Fi information</li>
              <li>parking guidance</li>
              <li>house rules reminders</li>
              <li>check-out instructions</li>
              <li>local recommendations</li>
            </ul>
            <p className={seo.pStrong}>
              All messages are displayed inside the guest portal, not scattered across multiple chats or platforms.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="when">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="when" className={seo.h2}>
              When messages are delivered
            </h2>
            <p className={seo.p}>Messages are scheduled relative to the reservation:</p>
            <ul className={styles.includedList}>
              <li>before arrival (for example, one hour before)</li>
              <li>at arrival</li>
              <li>before check-out (for example, twelve hours before)</li>
            </ul>
            <p className={seo.pStrong}>
              Guests see each message exactly when it is relevant, without searching through conversations.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="see">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="see" className={seo.h2}>
              What the guest sees
            </h2>
            <p className={seo.p}>
              Guests access a dedicated guest portal where:
            </p>
            <ul className={styles.includedList}>
              <li>messages appear in a clear order</li>
              <li>reservation details are visible</li>
              <li>house rules are available</li>
              <li>property contact information is always accessible</li>
            </ul>
            <p className={seo.pStrong}>The experience is calm, structured, and easy to follow.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="who">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="who" className={seo.h2}>
              Who automatic guest messages are for
            </h2>
            <p className={seo.p}>Automatic guest messages are ideal for:</p>
            <ul className={styles.includedList}>
              <li>Airbnb and Booking hosts</li>
              <li>short-term rental properties</li>
              <li>accommodations without a permanent reception</li>
              <li>hosts managing multiple reservations</li>
              <li>anyone who wants fewer interruptions during the day</li>
            </ul>
            <p className={seo.pStrong}>
              They are built for real hosting workflows, not large hotel chains with complex systems.
            </p>
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
            <h2 id="cta" className={seo.h2}>Final note</h2>
            <p className={seo.p}>
              Automatic guest messages are not about removing hospitality. They are about removing repetition, stress,
              and constant interruptions — while keeping guests informed and comfortable.
            </p>
            <p className={seo.pStrong}>See how automatic guest messages look from the guest’s perspective.</p>
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

      <SeoFooter lang="en" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </main>
  );
}
