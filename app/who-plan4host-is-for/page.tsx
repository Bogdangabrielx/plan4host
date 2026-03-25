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
  title: "Who Plan4Host is for | Plan4Host",
  description:
    "See who Plan4Host is designed for, where it fits best, and when a heavier channel manager may be the better choice.",
  alternates: {
    canonical: "/who-plan4host-is-for",
    languages: {
      en: "/who-plan4host-is-for",
      ro: "/ro/pentru-cine-este-plan4host",
    },
  },
  openGraph: {
    title: "Who Plan4Host is for | Plan4Host",
    description:
      "A practical positioning page for hosts and property managers who want to know when Plan4Host is a strong fit.",
    url: "/who-plan4host-is-for",
    locale: "en_US",
    type: "article",
  },
};

export default function WhoPlan4HostIsForPage() {
  const faq = [
    {
      q: "Is Plan4Host best for large hotels?",
      a: "No. Plan4Host is better suited to small and mid-size short-term rental operations than to large hotels with complex enterprise processes.",
    },
    {
      q: "Is it useful if I manage the property alone?",
      a: "Yes. It is especially useful for hosts and managers who want less interruption and one calm place for operations.",
    },
    {
      q: "Do I need many properties to use it?",
      a: "No. It can work for a single property or for a small portfolio of units.",
    },
    {
      q: "What kind of host gets the most value?",
      a: "Hosts who want unified reservations, online check-in, guest messaging, and simple daily coordination get the most value.",
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
            Who Plan4Host is for
          </h1>
          <p className={`${styles.heroKicker} ${seo.seoHeroIntro}`} style={{ maxWidth: 72 * 10 }}>
            Plan4Host is built for <strong>small and mid-size short-term rental operations</strong> that want fewer interruptions, a clearer guest flow, and one place for reservations, online check-in, and communication.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/how-plan4host-works-with-airbnb-and-booking">
              See how it works
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/online-check-in-accommodation">
              See online check-in
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Who Plan4Host is for" data-p4h-reveal>
          <Image
            src="/who_benefit.png"
            alt="Who Plan4Host is for"
            width={900}
            height={900}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
            priority
          />
        </div>
      </section>

      <article className={seo.article}>
        <section className={seo.articleSection} aria-labelledby="best-fit">
          <div className={seo.articleSplit}>
            <div className={seo.articleSectionTight}>
              <h2 id="best-fit" className={seo.h2}>
                Best fit
              </h2>
              <p className={seo.p}>
                The strongest fit is a host or property manager who wants <strong>simple operations with clear structure</strong>, not a big stack of advanced tools.
              </p>
              <ul className={styles.includedList} style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}>
                <li>single-property hosts</li>
                <li>small portfolios with several units</li>
                <li>operators without a permanent reception</li>
                <li>teams that want fewer repetitive guest questions</li>
              </ul>
            </div>
            <div className={seo.imageFrame}>
              <Image
                src="/60%_en.png"
                alt="Common guest questions and repetitive work"
                width={1200}
                height={900}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="why">
          <h2 id="why" className={seo.h2}>
            Why it works well for this segment
          </h2>
          <p className={seo.p}>
            For this kind of business, the main problem is usually not missing enterprise features. It is <strong>operational noise</strong>: too many small messages, too many places to check, and too much manual coordination.
          </p>
          <div className={seo.featureRow}>
            <div className={seo.featureItem}>
              <div className={seo.imageFrame}>
                <Image
                  src="/benefits_en.png"
                  alt="Benefits of one structured system"
                  width={900}
                  height={700}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p className={seo.featureCaption}>
                One system reduces daily repetition across reservations, guests, and cleaning flow.
              </p>
            </div>
            <div className={seo.featureItem}>
              <div className={seo.imageFrame}>
                <Image
                  src="/Checkin_mok2.png"
                  alt="Online check-in for guests"
                  width={900}
                  height={700}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p className={seo.featureCaption}>
                Check-in becomes more structured because guests complete information before arrival.
              </p>
            </div>
            <div className={seo.featureItem}>
              <div className={seo.imageFrame}>
                <Image
                  src="/ch-rv-ms.png"
                  alt="Guest message portal"
                  width={900}
                  height={700}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p className={seo.featureCaption}>
                Messages live in one guest flow instead of being improvised reservation by reservation.
              </p>
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="not-for">
          <div className={seo.articleSplit}>
            <div className={seo.articleSectionTight}>
              <h2 id="not-for" className={seo.h2}>
                When another tool may be a better fit
              </h2>
              <p className={seo.p}>
                If your business depends on <strong>real-time API sync</strong>, <strong>price automation</strong>, <strong>advanced restrictions</strong>, or large hotel processes, a heavier tool may simply be more appropriate.
              </p>
              <p className={seo.p}>
                That does not make Plan4Host weak. It just means the product should be described for the job it actually does well.
              </p>
            </div>
            <div className={seo.imageFrame}>
              <Image
                src="/problem_multiple_booking.png"
                alt="Operational complexity across platforms"
                width={1200}
                height={900}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </section>

        <section className={seo.articleSection} aria-labelledby="cta">
          <div className={`sb-cardglow ${seo.card}`}>
            <h2 id="cta" className={seo.h2}>
              Final note
            </h2>
            <p className={seo.p}>
              The right way to describe Plan4Host is straightforward: <strong>it is a practical operations platform for hosts who want a unified calendar, structured guest flow, and less daily chaos</strong>.
            </p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/how-plan4host-works-with-airbnb-and-booking">
                See how it works
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/guest-ai-assistant">
                See the guest AI assistant
              </Link>
            </div>
          </div>
        </section>
      </article>

      <SeoFooter lang="en" />
      <SeoStructuredData
        lang="en"
        path="/who-plan4host-is-for"
        title="Who Plan4Host is for | Plan4Host"
        description="See who Plan4Host is designed for, where it fits best, and when a heavier channel manager may be the better choice."
        image="/who_benefit.png"
        faq={faq}
      />
    </main>
  );
}
