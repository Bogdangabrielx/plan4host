import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LandingSafeArea from "@/components/landing/LandingSafeArea";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import SeoFooter from "@/components/seo/SeoFooter";
import styles from "../home.module.css";
import seo from "../seo.module.css";

export const metadata: Metadata = {
  title: "How to automate guest messaging for short-term rentals | Plan4Host",
  description:
    "Learn how to automate guest messaging for short-term rentals with scheduled arrival, stay and check-out messages that reduce repetitive replies.",
  alternates: {
    canonical: "/how-to-automate-guest-messaging-for-short-term-rentals",
  },
  openGraph: {
    title: "How to automate guest messaging for short-term rentals | Plan4Host",
    description:
      "A practical guide to automating guest messaging for short-term rentals with check-in, stay and check-out communication.",
    url: "/how-to-automate-guest-messaging-for-short-term-rentals",
    locale: "en_US",
    type: "article",
  },
};

export default function ShortTermRentalGuestMessagingSeoPage() {
  const faq = [
    {
      q: "What guest messages can be automated?",
      a: "Hosts can automate arrival information, access instructions, stay reminders, and check-out guidance.",
    },
    {
      q: "When should guest messages be triggered?",
      a: "The most useful timing is before check-in, during the stay, and before check-out, based on each reservation.",
    },
    {
      q: "Does automation remove the personal side of hosting?",
      a: "No. It removes repetitive replies and keeps communication consistent, while hosts still step in when needed.",
    },
    {
      q: "Is this useful only for large properties?",
      a: "No. It is especially useful for small and mid-sized short-term rentals that do not have a front desk.",
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
    <main
      className={styles.landing}
      style={{ paddingBottom: "var(--safe-bottom, 0px)", minHeight: "100dvh", overflowX: "hidden" }}
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
            Home page
          </Link>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="title">
        <div className={styles.heroText} data-p4h-reveal>
          <h1 id="title" className={styles.heroHeadline} style={{ margin: 0 }}>
            How to automate guest messaging for short-term rentals
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            Short-term rental hosts lose time answering the same questions before every arrival. Guest messaging
            automation replaces repetitive replies with scheduled information guests receive at the right moment.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/guest-ai-assistant/demo">
              See the guest message portal
            </Link>
            <Link
              className={`${styles.btn} ${styles.btnOutline}`}
              href="/automatic-guest-messages"
            >
              Read the guest messaging page
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Guest message automation preview" data-p4h-reveal>
          <Image
            src="/Hero_device2.png"
            alt="Guest message automation preview"
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
              What guest messaging automation actually means
            </h2>
            <p className={seo.p}>
              Guest messaging automation means preparing communication once and delivering it automatically based on
              each reservation timeline.
            </p>
            <p className={seo.p}>
              Instead of manually sending every arrival message, Wi-Fi detail, parking note, or check-out reminder,
              the host defines the message and the timing, then the system handles the rest.
            </p>
            <ul className={styles.includedList}>
              <li>less repetitive communication</li>
              <li>clearer guest experience</li>
              <li>fewer missed details</li>
            </ul>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="problem">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="problem" className={seo.h2}>
              Why short-term rental hosts need it
            </h2>
            <p className={seo.p}>
              Most short-term rentals operate without reception staff. That means the same operational questions come
              directly to the host, often at inconvenient times.
            </p>
            <ul
              className={styles.includedList}
              style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}
            >
              <li>How do I get inside?</li>
              <li>What time is check-in?</li>
              <li>Where do I park?</li>
              <li>What is the Wi-Fi password?</li>
              <li>What do I need to do before check-out?</li>
            </ul>
            <p className={seo.pStrong}>
              Automation makes sure the right answer is already waiting for the guest before they ask.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="steps">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="steps" className={seo.h2}>
              How to automate guest messaging step by step
            </h2>
            <ol className={seo.steps}>
              <li>Define the core messages every guest needs during the stay.</li>
              <li>Group them by timing: before check-in, during the stay, and before check-out.</li>
              <li>Write each message in a short, practical format.</li>
              <li>Attach the messages to reservation timing instead of sending them manually.</li>
              <li>Use one guest portal so guests always know where to find the latest information.</li>
            </ol>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="examples">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="examples" className={seo.h2}>
              Examples of messages worth automating
            </h2>
            <p className={seo.p}>For short-term rentals, the most useful automated messages are:</p>
            <ul className={styles.includedList}>
              <li>arrival instructions and access details</li>
              <li>parking and Wi-Fi information</li>
              <li>house rules and quiet hours reminders</li>
              <li>mid-stay reminders or useful property notes</li>
              <li>check-out steps and departure time reminders</li>
            </ul>
            <p className={seo.pStrong}>
              The goal is not more messages. The goal is better timing and less friction.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="timing">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="timing" className={seo.h2}>
              The timings that matter most
            </h2>
            <p className={seo.p}>Automation is useful only when the message arrives at the moment it becomes relevant.</p>
            <div className={seo.flowRow} aria-label="Messaging timing flow">
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>before check-in</span>
              <span className={seo.flowArrow}>→</span>
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>during stay</span>
              <span className={seo.flowArrow}>→</span>
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>before check-out</span>
            </div>
            <p className={seo.p}>
              This keeps messages useful instead of noisy. Guests do not need to search old chats because everything is
              shown when it matters.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="portal">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="portal" className={seo.h2}>
              Why a guest portal works better than scattered chats
            </h2>
            <p className={seo.p}>
              If messages live across Airbnb chat, Booking messages, email, and WhatsApp, guests miss details and hosts
              lose control over what was actually shared.
            </p>
            <p className={seo.p}>
              A structured guest portal gives each reservation one place for messaging, rules, and essential stay
              information.
            </p>
            <p className={seo.pStrong}>
              That creates consistency for the host and a calmer experience for the guest.
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
            <h2 id="cta" className={seo.h2}>
              Final note
            </h2>
            <p className={seo.p}>
              If you want to automate guest messaging for short-term rentals, the important part is not sending more
              content. It is sending fewer, better-timed messages that reduce uncertainty for guests and reduce manual
              work for hosts.
            </p>
            <p className={seo.pStrong}>See how that workflow looks inside Plan4Host.</p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/guest-ai-assistant/demo">
                See the guest portal
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
