import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LandingSafeArea from "@/components/landing/LandingSafeArea";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import SeoFooter from "@/components/seo/SeoFooter";
import SeoStructuredData from "@/components/seo/SeoStructuredData";
import { seoMontserrat } from "@/components/seo/seoFont";
import styles from "../../home.module.css";
import seo from "../../seo.module.css";

export const metadata: Metadata = {
  title: "Intrebari frecvente Plan4Host | Plan4Host",
  description:
    "Raspunsuri directe despre ce este Plan4Host, cum functioneaza cu Airbnb si Booking, ce include iCal sync si pentru cine este construita platforma.",
  alternates: {
    canonical: "/ro/intrebari-frecvente-plan4host",
    languages: {
      ro: "/ro/intrebari-frecvente-plan4host",
      en: "/plan4host-faq",
    },
  },
  openGraph: {
    title: "Intrebari frecvente Plan4Host | Plan4Host",
    description:
      "Raspunsuri clare despre Plan4Host, iCal sync, mesaje pentru oaspeti, check-in online si cand platforma este alegerea potrivita.",
    url: "/ro/intrebari-frecvente-plan4host",
    locale: "ro_RO",
    type: "article",
  },
};

export default function Plan4HostFaqRoPage() {
  const faq = [
    {
      q: "Ce este Plan4Host?",
      a: "Plan4Host este o platforma de operare pentru inchirieri pe termen scurt. Reuneste calendarul unificat, check-in-ul online, mesajele pentru oaspeti si fluxul operational pentru oaspeti intr-un singur loc.",
    },
    {
      q: "Este Plan4Host un channel manager complet?",
      a: "Nu. Plan4Host nu este pozitionat ca un channel manager API complet. Este un sistem operational mai usor, concentrat pe claritate in calendar, flux pentru oaspeti si coordonare zilnica.",
    },
    {
      q: "Plan4Host foloseste API oficial de la Airbnb si Booking?",
      a: "Nu. Plan4Host functioneaza cu Airbnb si Booking prin iCal sync.",
    },
    {
      q: "Ce include iCal sync?",
      a: "iCal sync este folosit pentru import de rezervari si date blocate si pentru export de disponibilitate inapoi. Ajuta la organizarea rezervarilor intr-un singur calendar.",
    },
    {
      q: "Ce nu include iCal sync?",
      a: "Nu include automatizare de pret, restrictii avansate sau comportamentul complet in timp real al unui channel manager API mai greu.",
    },
    {
      q: "Ce se intampla dupa ce rezervarile intra in Plan4Host?",
      a: "Rezervarile apar intr-un singur calendar si pot sustine apoi check-in online, mesaje pentru oaspeti, flux de curatenie si un proces operational zilnic mai clar.",
    },
    {
      q: "Pentru cine este Plan4Host cel mai potrivit?",
      a: "Plan4Host este cel mai potrivit pentru operatiuni mici si medii de inchiriere pe termen scurt care vor un singur loc calm pentru rezervari, comunicare cu oaspetii si flux operational.",
    },
    {
      q: "Cand nu este Plan4Host alegerea potrivita?",
      a: "Daca business-ul tau depinde de sync API in timp real, rate management avansat, reguli complexe intre canale sau fluxuri hoteliere mari, un tool mai greu poate fi mai potrivit.",
    },
  ];

  return (
    <main className={`${styles.landing} ${seoMontserrat.className}`} style={{ paddingBottom: "var(--safe-bottom, 0px)", minHeight: "100dvh", overflowX: "hidden" }}>
      <LandingSafeArea />
      <MobileScrollReveal />

      <nav className={styles.nav} aria-label="Navigatie" data-p4h-landing-nav>
        <Link href="/ro" className={styles.brand}>
          <img src="/Logo_Landing.png" alt="" aria-hidden="true" width={36} height={36} style={{ borderRadius: 12 }} />
          <strong>Plan4Host</strong>
        </Link>
        <div />
        <div className={styles.actions}>
          <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro">
            Inapoi la Plan4Host
          </Link>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="title">
        <div className={styles.heroText} data-p4h-reveal>
          <h1 id="title" className={`${styles.heroHeadline} ${seo.seoHeroTitle}`}>
            Intrebari frecvente Plan4Host
          </h1>
          <p className={`${styles.heroKicker} ${seo.seoHeroIntro}`} style={{ maxWidth: 72 * 10 }}>
            Raspunsuri directe despre ce este <strong>Plan4Host</strong>, cum functioneaza cu <strong>Airbnb</strong> si <strong>Booking.com</strong>, ce include <strong>iCal sync</strong> si cand platforma este alegerea potrivita.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/ro/cum-functioneaza-plan4host-cu-airbnb-si-booking">
              Vezi cum functioneaza
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro/pentru-cine-este-plan4host">
              Vezi pentru cine este Plan4Host
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Prezentare generala Plan4Host FAQ" data-p4h-reveal>
          <Image
            src="/Hero_device2.png"
            alt="Preview platforma Plan4Host"
            width={900}
            height={900}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
            priority
          />
        </div>
      </section>

      <article className={seo.article}>
        <section className={seo.articleSection} aria-labelledby="faq">
          <h2 id="faq" className={seo.h2}>
            Intrebari frecvente
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

        <section className={seo.articleSection} aria-labelledby="cta">
          <div className={`sb-cardglow ${seo.card}`}>
            <h2 id="cta" className={seo.h2}>
              Pagini relevante
            </h2>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/ro/cum-functioneaza-plan4host-cu-airbnb-si-booking">
                Cum functioneaza Plan4Host cu Airbnb si Booking
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro/plan4host-vs-channel-manager">
                Plan4Host vs channel manager
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro/check-in-online-cazare">
                Check-in online
              </Link>
            </div>
          </div>
        </section>
      </article>

      <SeoFooter lang="ro" />
      <SeoStructuredData
        lang="ro"
        path="/ro/intrebari-frecvente-plan4host"
        title="Intrebari frecvente Plan4Host | Plan4Host"
        description="Raspunsuri directe despre ce este Plan4Host, cum functioneaza cu Airbnb si Booking, ce include iCal sync si pentru cine este construita platforma."
        image="/Hero_device2.png"
        faq={faq}
      />
    </main>
  );
}
