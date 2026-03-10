import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LandingSafeArea from "@/components/landing/LandingSafeArea";
import SeoFooter from "@/components/seo/SeoFooter";
import styles from "../home.module.css";
import seo from "../seo.module.css";

export const metadata: Metadata = {
  title: "How to automate guest messaging for short-term rentals | Plan4Host",
  description:
    "A practical guide to automate guest messaging for short-term rentals with better timing, fewer repetitive questions, and a clearer guest experience.",
  alternates: {
    canonical: "/how-to-automate-guest-messaging-for-short-term-rentals",
    languages: {
      en: "/how-to-automate-guest-messaging-for-short-term-rentals",
      ro: "/ro/cum-sa-automatizezi-mesajele-pentru-oaspeti-la-cazarile-pe-termen-scurt",
    },
  },
  openGraph: {
    title: "How to automate guest messaging for short-term rentals | Plan4Host",
    description:
      "Learn how to automate guest messaging for short-term rentals and reduce repetitive communication across Airbnb, Booking.com, and Vrbo.",
    url: "/how-to-automate-guest-messaging-for-short-term-rentals",
    locale: "en_US",
    type: "article",
  },
};

export default function ShortTermRentalGuestMessagingSeoPage() {
  return (
    <main
      className={styles.landing}
      style={{ paddingBottom: "var(--safe-bottom, 0px)", minHeight: "100dvh", overflowX: "hidden" }}
    >
      <LandingSafeArea />

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
        <div className={styles.heroText}>
          <h1 id="title" className={styles.heroHeadline} style={{ margin: 0 }}>
            How to automate guest messaging for short-term rentals
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            Hosts answer the same questions every day: check-in, parking, Wi-Fi, directions, and checkout.
            Automation cuts repetitive replies and gives guests the right message at the right moment.
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

        <div aria-label="Guest message automation preview">
          <div className={seo.imageFrame}>
            <Image
              src="/HeroMSG_en.png"
              alt="Guest messaging automation preview"
              width={1200}
              height={1000}
              style={{ width: "100%", height: "auto", display: "block" }}
              priority
            />
          </div>
        </div>
      </section>

      <article className={seo.article}>
        <section className={seo.articleSection} aria-labelledby="problem">
          <div className={seo.articleSplit}>
            <div className={seo.articleSectionTight}>
              <h2 id="problem" className={seo.h2}>
                Why Guest Messaging Becomes a Problem for Hosts
              </h2>
              <p className={seo.p}>
                The issue is not complexity. It is repetition. Guests keep asking about access, parking, Wi-Fi,
                directions, and checkout.
              </p>
              <ul
                className={styles.includedList}
                style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}
              >
                <li>guests miss long messages sent too early</li>
                <li>important details get buried inside generic replies</li>
                <li>hosts lose time answering the same operational questions</li>
              </ul>
            </div>

            <div className={seo.imageFrame}>
              <Image
                src="/60%_en.png"
                alt="Repetitive guest questions visual"
                width={900}
                height={700}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="automated">
          <div className={seo.articleSplit}>
            <div className={seo.articleSectionTight}>
              <h2 id="automated" className={seo.h2}>
                How Plan4Host Solves It
              </h2>
              <p className={seo.p}>
                Good automation is simple: send the right message at the right time and keep guest details in one place.
                That is what Plan4Host does.
              </p>
              <ul className={styles.includedList}>
                <li>scheduled guest messages around check-in, stay, and checkout</li>
                <li>a unified portal for instructions, reminders, and updates</li>
                <li>AI support for common guest questions</li>
                <li>consistent communication across channels</li>
              </ul>
              <p className={seo.p}>
                See <Link href="/automatic-guest-messages">automatic guest messages</Link> and the{" "}
                <Link href="/guest-ai-assistant">guest AI assistant</Link> if you want the full workflow.
              </p>
              <div className={seo.ctaRow}>
                <Link className={`${styles.btn} ${styles.btnSolid}`} href="/automatic-guest-messages">
                  Explore automatic guest messages
                </Link>
                <Link className={`${styles.btn} ${styles.btnOutline}`} href="/guest-ai-assistant">
                  Explore the guest AI assistant
                </Link>
              </div>
            </div>

            <div className={seo.articleSectionTight}>
              <div className={seo.imageFrame} aria-hidden="true">
                <Image
                  src="/right_moment_en.png"
                  alt=""
                  width={800}
                  height={520}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p className={seo.featureCaption}>
                Short messages sent close to arrival work better than long messages sent days too early.
              </p>
              <div className={seo.imageFrame} aria-hidden="true">
                <Image
                  src="/automatic_translate_en.png"
                  alt=""
                  width={800}
                  height={520}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p className={seo.featureCaption}>
                Messages in the guest&apos;s own language reduce friction and avoidable questions.
              </p>
              <div className={seo.imageFrame} aria-hidden="true">
                <Image
                  src="/centralized_en.png"
                  alt=""
                  width={800}
                  height={520}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p className={seo.featureCaption}>
                One portal keeps booking details, stay instructions, and reminders together.
              </p>
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="timing">
          <div className={seo.articleSectionTight}>
              <h2 id="timing" className={seo.h2}>
                Why Timing Matters More Than Message Length
              </h2>
              <p className={seo.p}>
                Long messages sent too early are usually ignored. Guests act faster when the message matches the moment.
              </p>
              <ul className={styles.includedList}>
                <li>send access details shortly before arrival</li>
                <li>show Wi-Fi details during the stay</li>
                <li>send checkout reminders close to departure</li>
              </ul>
              <p className={seo.p}>
                This is where Airbnb message automation becomes useful: short, well-timed messages outperform long generic ones.
              </p>
            <div className={seo.imageFrame}>
              <Image
                src="/timing_en.png"
                alt="Why timing matters in guest messaging"
                width={1200}
                height={900}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="benefits">
          <div className={seo.articleSectionTight}>
            <h2 id="benefits" className={seo.h2}>
              Benefits of Automating Guest Messaging Across Platforms
            </h2>
            <p className={seo.p}>
              The goal is simple: less repetition, less manual work, and clearer communication, no matter where the reservation comes from.
            </p>
            <ul className={styles.includedList}>
              <li>reduce repetitive questions from guests</li>
              <li>save time answering operational messages</li>
              <li>keep communication consistent for every booking source</li>
              <li>deliver information at the right moment</li>
              <li>keep communication organized in one place</li>
            </ul>
            <p className={seo.p}>
              If reservations come from Airbnb, Booking.com, or Vrbo, the safest approach is to manage guest messaging from one central platform that gathers all bookings in the same place.
            </p>
            <div className={seo.imageFrame}>
              <Image
                src="/benefits_en.png"
                alt="Benefits of automating guest messaging"
                width={1200}
                height={900}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="final">
          <div className={seo.articleSectionTight}>
              <h2 id="final" className={seo.h2}>
                Final Thoughts
              </h2>
              <p className={seo.p}>
                Start with the basics: repeated questions, badly timed instructions, and messages spread across too many places.
                Good automation saves time and improves the guest experience without making communication feel robotic.
              </p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/automatic-guest-messages">
                Explore automatic guest messages
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/guest-ai-assistant">
                Explore the guest AI assistant
              </Link>
            </div>
          </div>
        </section>
      </article>

      <SeoFooter lang="en" />
    </main>
  );
}
