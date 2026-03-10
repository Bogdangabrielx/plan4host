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
            Hosts in short-term rentals often answer the same questions over and over again: check-in details, parking,
            Wi-Fi, directions, and checkout instructions. Automating guest messaging reduces manual communication,
            keeps information consistent, and helps guests receive the right message when they actually need it.
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

        <div aria-label="Guest message automation preview" data-p4h-reveal>
          <div className={seo.visualStage}>
            <div className={seo.visualImageWrap}>
              <Image
                src="/HeroMSG_en.png"
                alt="Guest messaging automation preview"
                width={900}
                height={900}
                style={{ width: "100%", height: "auto", display: "block" }}
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <div className={seo.content}>
        <section className={seo.section} aria-labelledby="problem">
          <div className={`sb-cardglow ${seo.showcaseCard}`} data-p4h-reveal>
            <div className={seo.splitShowcase}>
              <div className={seo.copyStack}>
                <h2 id="problem" className={seo.h2}>
                  Why Guest Messaging Becomes a Problem for Hosts
                </h2>
                <p className={seo.p}>
                  Guest messaging becomes repetitive very quickly. Hosts keep answering the same operational questions,
                  often across multiple platforms, while long messages are ignored until the guest needs one specific detail.
                </p>
                <ul
                  className={styles.includedList}
                  style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}
                >
                  <li>the same questions come back with every reservation</li>
                  <li>important details arrive too early or get buried</li>
                  <li>communication is split across Airbnb, Booking.com, email, and chat apps</li>
                  <li>too much time is lost on repetitive replies</li>
                </ul>
                <p className={seo.pStrong}>
                  Typical examples: Wi-Fi password, parking, check-in details, early access, and checkout instructions.
                </p>
              </div>

              <div className={seo.statPanel}>
                <Image
                  src="/60%_en.png"
                  alt="Repetitive guest questions visual"
                  width={900}
                  height={700}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="automated">
          <div className={`sb-cardglow ${seo.showcaseCard}`} data-p4h-reveal>
            <h2 id="automated" className={seo.h2}>
              How Plan4Host Solves It
            </h2>
            <p className={seo.p}>
              Automated guest messaging works when one system handles timing, delivery, and guest access to information.
              That is where Plan4Host fits: it combines scheduled guest messages, one guest portal, a virtual reception
              assistant, and automatic translation in the guest&apos;s language.
            </p>
            <ul className={styles.includedList}>
              <li>automatic guest messages based on booking timing</li>
              <li>a unified guest portal instead of scattered chats</li>
              <li>AI assistance for common guest questions</li>
              <li>consistent communication across Airbnb, Booking.com, and other channels</li>
            </ul>
            <div className={seo.benefitGrid}>
              <div className={`sb-cardglow ${seo.benefitCard}`}>
                <div className={seo.benefitMiniUi} aria-hidden="true">
                  <Image
                    src="/right_moment_en.png"
                    alt=""
                    width={800}
                    height={520}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
                <p className={seo.benefitText}>
                  Guests are more likely to act on a short message shown shortly before arrival than on a long message sent days in advance.
                </p>
              </div>

              <div className={`sb-cardglow ${seo.benefitCard}`}>
                <div className={seo.benefitMiniUi} aria-hidden="true">
                  <Image
                    src="/automatic_translate_en.png"
                    alt=""
                    width={800}
                    height={520}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
                <p className={seo.benefitText}>
                  Clear communication in the guest&apos;s own language reduces friction and lowers the chance of avoidable questions.
                </p>
              </div>

              <div className={`sb-cardglow ${seo.benefitCard}`}>
                <div className={seo.benefitMiniUi} aria-hidden="true">
                  <Image
                    src="/centralized_en.png"
                    alt=""
                    width={800}
                    height={520}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
                <p className={seo.benefitText}>
                  One guest portal keeps booking details, stay instructions, and reminders in the same calm interface.
                </p>
              </div>
            </div>
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

        <section className={seo.section} aria-labelledby="key-messages">
          <div className={`sb-cardglow ${seo.showcaseCard}`} data-p4h-reveal>
            <div className={seo.splitShowcase}>
              <div className={seo.copyStack}>
                <h2 id="key-messages" className={seo.h2}>
                  Key Messages Every Short-Term Rental Should Automate
                </h2>
                <p className={seo.p}>
                  The most useful automated messages are operational. Guests need clarity, not long blocks of text.
                </p>
              </div>

              <div className={seo.statPanel}>
                <Image
                  src="/Key_msg_en.png"
                  alt="Key automated guest messages preview"
                  width={900}
                  height={900}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
            </div>

            <div className={seo.messageColumns}>
              <div className={seo.messageColumn}>
                <article className={seo.messageBlock}>
                  <h3 className={seo.messageItemTitle}>Booking confirmation</h3>
                  <p className={seo.messageItemText}>Confirm the stay and explain what happens next.</p>
                  <ul className={seo.messageItemList}>
                    <li>reservation confirmed</li>
                    <li>next step</li>
                    <li>where future details will appear</li>
                  </ul>
                </article>

                <article className={seo.messageBlock}>
                  <h3 className={seo.messageItemTitle}>During the stay</h3>
                  <p className={seo.messageItemText}>Show the practical details guests need inside the property.</p>
                  <ul className={seo.messageItemList}>
                    <li>Wi-Fi</li>
                    <li>house instructions</li>
                    <li>local tips</li>
                  </ul>
                </article>
              </div>

              <div className={seo.messageColumn}>
                <article className={seo.messageBlock}>
                  <h3 className={seo.messageItemTitle}>Before check-in</h3>
                  <p className={seo.messageItemText}>Send arrival essentials close to check-in.</p>
                  <ul className={seo.messageItemList}>
                    <li>access instructions</li>
                    <li>directions</li>
                    <li>parking</li>
                  </ul>
                </article>

                <article className={seo.messageBlock}>
                  <h3 className={seo.messageItemTitle}>Before checkout</h3>
                  <p className={seo.messageItemText}>Keep the final reminder short and actionable.</p>
                  <ul className={seo.messageItemList}>
                    <li>checkout time</li>
                    <li>keys</li>
                    <li>simple departure steps</li>
                  </ul>
                </article>
              </div>
            </div>

            <p className={seo.pStrong}>
              Timing matters more than message length.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="timing">
          <div className={`sb-cardglow ${seo.showcaseCard}`} data-p4h-reveal>
            <h2 id="timing" className={seo.h2}>
              Why Timing Matters More Than Message Length
            </h2>
            <p className={seo.p}>
              Many hosts assume the solution is to write one complete message with every possible detail. In reality,
              guests rarely read long instructions sent too early. Even when they do, they rarely remember the exact
              detail they need later.
            </p>
            <p className={seo.p}>
              A guest who receives parking instructions four days before arrival may not remember them when they are
              standing outside the property with luggage. A guest who receives checkout details at booking confirmation
              will probably ignore them until the final day.
            </p>
            <p className={seo.p}>Practical examples:</p>
            <ul className={styles.includedList}>
              <li>Send access instructions shortly before arrival, not right after booking.</li>
              <li>Show Wi-Fi details during the stay, not buried inside an early message.</li>
              <li>Send checkout reminders close enough to departure that guests still act on them.</li>
            </ul>
            <p className={seo.pStrong}>
              Airbnb message automation works best when short messages are attached to the exact moment a guest needs them.
            </p>
            <div className={seo.statPanel}>
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

        <section className={seo.section} aria-labelledby="benefits">
          <div className={`sb-cardglow ${seo.showcaseCard}`} data-p4h-reveal>
            <h2 id="benefits" className={seo.h2}>
              Benefits of Automating Guest Messaging
            </h2>
            <p className={seo.p}>
              The value is straightforward: fewer repetitive questions, less time lost in chat, and a cleaner guest
              experience from confirmation to checkout.
            </p>
            <ul className={styles.includedList}>
              <li>reduce repetitive questions from guests</li>
              <li>save time answering operational messages</li>
              <li>improve the guest experience with clearer communication</li>
              <li>deliver information at the right moment</li>
              <li>keep communication organized in one place</li>
            </ul>
            <div className={seo.statPanel}>
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

        <section className={seo.section} aria-labelledby="platforms">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="platforms" className={seo.h2}>
              Automating Guest Communication Across Multiple Platforms
            </h2>
            <p className={seo.p}>
              Many short-term rental businesses receive reservations from more than one source. A single property may
              take bookings from Airbnb, Booking.com, and Vrbo at the same time.
            </p>
            <ul className={styles.includedList}>
              <li>Airbnb</li>
              <li>Booking.com</li>
              <li>Vrbo</li>
            </ul>
            <p className={seo.p}>
              Without automation, communication quality depends too much on where the reservation came from. Some
              guests receive complete instructions, others receive partial details, and the host ends up adapting the
              process manually every time.
            </p>
            <p className={seo.p}>
              When you automate guest messaging with a central system, communication stays consistent regardless of
              platform. The guest still gets the right information, even if the booking originated somewhere else.
            </p>
            <p className={seo.pStrong}>
              That consistency is one of the biggest operational advantages of modern short-term rental communication tools.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="final">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="final" className={seo.h2}>
              Final Thoughts
            </h2>
            <p className={seo.p}>
              If you want to automate guest messaging for short-term rentals, start with the practical issues that
              consume time every week: repeated questions, badly timed instructions, and communication spread across too
              many places.
            </p>
            <p className={seo.p}>
              Well-timed automation helps hosts save time, reduce stress, and improve the guest experience without
              turning communication into something cold or impersonal.
            </p>
            <p className={seo.pStrong}>
              Plan4Host is one example of how automated guest messages, a guest portal, and AI-assisted communication
              can make that process easier to manage.
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
      </div>

      <SeoFooter lang="en" />
    </main>
  );
}
