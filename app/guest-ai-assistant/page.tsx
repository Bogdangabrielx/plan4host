import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LandingSafeArea from "@/components/landing/LandingSafeArea";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import SeoFooter from "@/components/seo/SeoFooter";
import styles from "../home.module.css";
import seo from "../seo.module.css";

export const metadata: Metadata = {
  title: "Guest AI assistant for rentals | Plan4Host",
  description:
    "A language-aware assistant that helps guests find arrival, amenities, and check-out details instantly in a calm guest portal.",
  alternates: {
    canonical: "/guest-ai-assistant",
    languages: {
      en: "/guest-ai-assistant",
      ro: "/ro/asistent-ai-oaspeti",
    },
  },
  openGraph: {
    title: "Guest AI assistant for rentals | Plan4Host",
    description:
      "Guests get clear answers for arrival, amenities and check-out in their language, using information you already manage in Plan4Host.",
    url: "/guest-ai-assistant",
    locale: "en_US",
    type: "article",
  },
};

export default function GuestAiAssistantPage() {
  return (
    <main
      className={styles.landing}
      style={{
        paddingBottom: "var(--safe-bottom, 0px)",
        minHeight: "100dvh",
        overflowX: "hidden",
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
            Home page
          </Link>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="title">
        <div className={styles.heroText} data-p4h-reveal>
          <h1 id="title" className={styles.heroHeadline} style={{ margin: 0 }}>
            Guest AI assistant
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            Help guests find arrival, amenities, and check-out details instantly, in their language — without repetitive
            back-and-forth.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/guest-ai-assistant/demo">
              See where guests receive messages
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/checkin?property=b1588b40-954d-4489-b36e-45659853489a">
              See the check-in form
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Guest AI assistant preview" data-p4h-reveal>
          <Image
            src="/AI_chatbot.png"
            alt="Preview of the Guest AI assistant interface"
            width={900}
            height={900}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
            priority
          />
        </div>
      </section>

      <div className={seo.content}>
        <section className={seo.section} aria-labelledby="what">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Image
                src="/Logo_Rotund_AI.png"
                alt=""
                aria-hidden="true"
                width={44}
                height={44}
                style={{ borderRadius: 999, border: "1px solid var(--border)", background: "var(--card)" }}
              />
              <h2 id="what" className={seo.h2} style={{ margin: 0 }}>
                What it is
              </h2>
            </div>
            <p className={seo.p}>
              Guest AI assistant is a floating, language-aware helper shown in the guest portal. Instead of typing long
              questions, guests tap menus like <strong>Arrival details</strong>, <strong>Amenities</strong>,{" "}
              <strong>Extras</strong>, or <strong>Check-out</strong> and receive short, clear answers.
            </p>
            <p className={seo.p}>
              It uses the information you already manage in Plan4Host: reservation messages, your House Rules PDF, and
              the “house rules for AI” text curated in Check-in Editor.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="answers">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="answers" className={seo.h2}>
              What it can answer
            </h2>
            <ul className={styles.includedList}>
              <li>
                <strong>Arrival details:</strong> parking, access codes, how to enter, and check-in time.
              </li>
              <li>
                <strong>Amenities:</strong> Wi-Fi, coffee machine, AC, washing machine, dishwasher, minibar, and more.
              </li>
              <li>
                <strong>Recommendations:</strong> local tips for food, coffee, and things to visit (when you provided
                them).
              </li>
              <li>
                <strong>Check-out:</strong> check-out time and instructions (keys, doors, trash) when you defined them.
              </li>
            </ul>
            <p className={seo.p}>
              Every answer ends with a clear “contact the host” option, so guests can always reach you directly.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="examples">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="examples" className={seo.h2}>
              See it in action
            </h2>
            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                alignItems: "stretch",
              }}
            >
              <div className={`sb-cardglow ${seo.faqItem}`} style={{ background: "var(--card)" }}>
                <p className={seo.pStrong} style={{ margin: 0 }}>
                  Amenities menu
                </p>
                <p className={seo.p}>
                  Guests tap Wi-Fi, coffee machine, AC and other options instead of typing long questions.
                </p>
                <Image
                  src="/AI_chatbot_amenities.png"
                  alt="Guest AI assistant amenities menu"
                  width={740}
                  height={740}
                  style={{
                    width: "100%",
                    height: "auto",
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                  }}
                />
              </div>
              <div className={`sb-cardglow ${seo.faqItem}`} style={{ background: "var(--card)" }}>
                <p className={seo.pStrong} style={{ margin: 0 }}>
                  Wi-Fi answer example
                </p>
                <p className={seo.p}>
                  The assistant combines the network name (SSID) and password you wrote, and returns one clear answer —
                  without inventing credentials.
                </p>
                <Image
                  src="/AI_chatbot_example.png"
                  alt="Guest AI assistant Wi-Fi answer example"
                  width={740}
                  height={740}
                  style={{
                    width: "100%",
                    height: "auto",
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="sources">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="sources" className={seo.h2}>
              Where the assistant gets its information
            </h2>
            <p className={seo.p}>Guest AI assistant does not guess. It can only use what you already provided:</p>
            <ul className={styles.includedList}>
              <li>
                <strong>Reservation messages</strong> (RO/EN) shown on the guest portal.
              </li>
              <li>
                <strong>House Rules PDF</strong> uploaded in Check-in Editor.
              </li>
              <li>
                <strong>AI-ready house rules</strong> saved after “Read &amp; prepare text for AI”.
              </li>
            </ul>
            <p className={seo.p}>
              If something is missing or unclear, it says so and invites the guest to contact you — instead of making
              anything up.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="safe">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="safe" className={seo.h2}>
              Safety: no invented codes or passwords
            </h2>
            <p className={seo.p}>We instruct the assistant to never invent or modify sensitive details:</p>
            <ul className={styles.includedList}>
              <li>no made-up access codes or lockbox combinations</li>
              <li>no invented Wi-Fi names or passwords</li>
              <li>no fake phone numbers, addresses, or check-in/out times</li>
            </ul>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="enable">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="enable" className={seo.h2}>
              How to enable it
            </h2>
            <ol className={seo.steps}>
              <li>
                Upload your House Rules PDF in <strong>Check-in Editor</strong>.
              </li>
              <li>
                Use <strong>Read &amp; prepare text for AI</strong>, then remove any codes, passwords, or private links
                you don’t want to share.
              </li>
              <li>
                Save the text as “House rules for AI”. The assistant will use it together with your reservation
                messages.
              </li>
              <li>Guests will see the assistant inside their guest portal.</li>
            </ol>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="premium">
          <div
            className={`sb-cardglow ${seo.card}`}
            data-p4h-reveal
            style={{
              background:
                "radial-gradient(36rem 24rem at 0% 0%, color-mix(in srgb, var(--accent1) 10%, transparent), transparent 62%), radial-gradient(36rem 24rem at 100% 100%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 62%), var(--card)",
            }}
          >
            <h2 id="premium" className={seo.h2}>
              Available on Premium
            </h2>
            <p className={seo.p}>
              Guest AI assistant is available for <strong>Premium</strong> accounts. Activate it to reduce repetitive
              questions and give guests clear answers before they contact you.
            </p>
            <div className={seo.ctaRow}>
              <Link
                className={`${styles.btn} ${styles.btnSolid}`}
                href="/auth/login?mode=signup&plan=premium&next=%2Fapp%2Fsubscription%3Fplan%3Dpremium%26hl%3D1"
              >
                Get Premium
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/guest-ai-assistant/demo">
                Preview guest portal
              </Link>
            </div>
          </div>
        </section>
      </div>

      <SeoFooter lang="en" />
    </main>
  );
}
