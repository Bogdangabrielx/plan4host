import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LandingSafeArea from "@/components/landing/LandingSafeArea";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import SeoFooter from "@/components/seo/SeoFooter";
import styles from "../../home.module.css";
import seo from "../../seo.module.css";

export const metadata: Metadata = {
  title: "Calendar rezervari unificat pentru Airbnb & Booking | Plan4Host",
  description:
    "Vezi toate rezervarile din Airbnb si Booking intr-un calendar unificat. Evita overbooking si gestioneaza disponibilitatea ca baza pentru check-in online si mesaje automate.",
  alternates: {
    canonical: "/ro/calendar-rezervari-unificat",
    languages: {
      ro: "/ro/calendar-rezervari-unificat",
      en: "/unified-booking-calendar",
    },
  },
  openGraph: {
    title: "Calendar rezervari unificat pentru Airbnb & Booking | Plan4Host",
    description:
      "Un calendar unificat pentru rezervari din Airbnb si Booking, ca sa eviti suprapunerile si sa ai disponibilitatea clara.",
    url: "/ro/calendar-rezervari-unificat",
    locale: "ro_RO",
    type: "article",
  },
};

export default function CalendarRezervariUnificatSeoPage() {
  const faq = [
    { q: "Sincronizarea este automata?", a: "Da. Calendarele se sincronizeaza automat, la intervale regulate." },
    { q: "Pot folosi pentru mai multe camere sau unitati?", a: "Da. Fiecare camera/unitate poate avea propriul calendar in aceeasi vedere unificata." },
    { q: "Sincronizarea iCal este sigura?", a: "Da. iCal este metoda standard folosita de platformele de rezervari." },
    {
      q: "Ce se intampla dupa ce apare o rezervare in calendar?",
      a: "Calendarul unificat devine baza pentru check-in online si comunicare structurata cu oaspetii.",
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

      <nav className={styles.nav} aria-label="Navigatie" data-p4h-landing-nav>
        <Link href="/ro" className={styles.brand}>
          <img src="/Logo_Landing.png" alt="" aria-hidden="true" width={36} height={36} style={{ borderRadius: 12 }} />
          <strong>Plan4Host</strong>
        </Link>
        <div />
        <div className={styles.actions}>
          <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro">
            Vezi pagina acasa
          </Link>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="title">
        <div className={styles.heroText} data-p4h-reveal>
          <h1 id="title" className={styles.heroHeadline} style={{ margin: 0 }}>
            Calendar rezervari unificat pentru Airbnb si Booking
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            Cand ai rezervari din mai multe platforme, lucrurile devin rapid confuze. Un calendar rezervari unificat aduce totul intr-un singur
            loc, ca sa stii mereu ce este ocupat, cand, si unde.
          </p>
          <ul className={styles.includedList} style={{ marginTop: 10 }}>
            <li>Fara sa sari intre platforme.</li>
            <li>Fara sa verifici disponibilitatea de doua ori.</li>
          </ul>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/checkin?property=b1588b40-954d-4489-b36e-45659853489a">
              Vezi formularul de check-in
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro/check-in-online-cazare">
              Citeste despre check-in online
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Preview calendar unificat" data-p4h-reveal>
          <Image
            src="/Landing_Mockups3.png"
            alt="Preview calendar Plan4Host"
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
              Ce inseamna un calendar rezervari unificat
            </h2>
            <p className={seo.p}>Un calendar rezervari unificat este un singur calendar care afiseaza toate rezervarile din platforme diferite.</p>
            <p className={seo.p}>
              In loc sa verifici separat Airbnb, Booking si alte canale, totul apare intr-o vedere organizata. Fiecare rezervare se sincronizeaza
              automat si se actualizeaza cand apar schimbari.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="problem">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="problem" className={seo.h2}>
              Problema mai multor calendare
            </h2>
            <p className={seo.p}>Cand rezervarile sunt impartite pe platforme diferite:</p>
            <ul className={styles.includedList} style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}>
              <li>disponibilitatea devine greu de urmarit</li>
              <li>overbooking-ul este un risc real</li>
              <li>schimbarile se pot pierde usor</li>
              <li>planificarea zilnica ia mai mult timp decat este necesar</li>
            </ul>
            <p className={seo.p}>Chiar si pentru cazari mici, mai multe calendare inseamna stres inutil.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="how">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="how" className={seo.h2}>
              Cum functioneaza calendarul unificat in Plan4Host
            </h2>
            <p className={seo.p}>
              Plan4Host foloseste sincronizare iCal ca sa aduca rezervarile din toate platformele intr-un singur calendar. Workflow-ul este simplu:
            </p>
            <div className={seo.flowRow} aria-label="Workflow">
              <span className={seo.flowPill}>platforme</span>
              <span className={seo.flowArrow}>→</span>
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>sync calendar</span>
              <span className={seo.flowArrow}>→</span>
              <span className={seo.flowPill}>calendar unificat</span>
            </div>
            <p className={seo.p}>Toate rezervarile sunt afisate clar, pe date si pe unitati, fara update-uri manuale.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="platforms">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="platforms" className={seo.h2}>
              Ce platforme pot fi sincronizate
            </h2>
            <p className={seo.p}>Calendarul unificat functioneaza cu:</p>
            <ul className={styles.includedList}>
              <li>Airbnb</li>
              <li>Booking.com</li>
              <li>Expedia</li>
              <li>Travelminit</li>
              <li>orice platforma care ofera linkuri iCal</li>
            </ul>
            <div className={seo.logosRow} aria-label="Platforme care suporta iCal">
              <span className={seo.logosLabel}>Exemple</span>
              <img className={seo.logoImg} src="/airbnb.png" alt="Airbnb" />
              <img className={seo.logoImg} src="/booking.png" alt="Booking.com" />
              <img className={seo.logoImg} src="/expedia.png" alt="Expedia" />
              <img className={seo.logoImg} src="/travelminit.png" alt="Travelminit" />
            </div>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="inside">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="inside" className={seo.h2}>
              Ce vezi in calendarul unificat
            </h2>
            <p className={seo.p}>In calendarul unificat poti vedea:</p>
            <ul className={styles.includedList}>
              <li>datele de check-in si check-out</li>
              <li>durata rezervarii</li>
              <li>camera/unitatea alocata</li>
              <li>statusul rezervarii</li>
            </ul>
            <p className={seo.p}>Totul este vizibil dintr-un singur ecran, fara sa schimbi tool-uri.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="why">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="why" className={seo.h2}>
              De ce conteaza un calendar unificat
            </h2>
            <p className={seo.p}>Un calendar rezervari unificat:</p>
            <ul className={styles.includedList}>
              <li>reduce riscul de overbooking</li>
              <li>salveaza timp in fiecare zi</li>
              <li>ofera o imagine clara a disponibilitatii</li>
              <li>creeaza o baza stabila pentru automatizari</li>
            </ul>
            <p className={seo.p}>Este fundatia pentru check-in online si mesaje automate pentru oaspeti.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="bridge">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="bridge" className={seo.h2}>
              Cum se leaga de check-in online
            </h2>
            <p className={seo.p}>
              Dupa ce rezervarile sunt sincronizate intr-un singur loc, poti ghida oaspetii sa completeze check-in online inainte de sosire. Dupa
              ce check-in-ul este completat si rezervarea este confirmata, comunicarea devine structurata si predictibila.
            </p>
            <p className={seo.p}>Asa ramane organizat tot workflow-ul.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="for">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="for" className={seo.h2}>
              Pentru cine este
            </h2>
            <p className={seo.p}>Un calendar unificat este potrivit pentru:</p>
            <ul className={styles.includedList}>
              <li>gazde Airbnb si Booking</li>
              <li>cazari tip short-term rental</li>
              <li>apartamente, cabane si pensiuni</li>
              <li>gazde cu mai multe unitati</li>
              <li>echipe mici fara receptie</li>
            </ul>
            <p className={seo.p}>Este gandit pentru hosting real, nu pentru lanturi hoteliere enterprise.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="faq">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
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
          </div>
        </section>

        <section className={seo.section} aria-labelledby="cta">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="cta" className={seo.h2}>
              Calendarul unificat este inceputul
            </h2>
            <p className={seo.p}>Check-in online este locul unde incepe experienta oaspetelui.</p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/checkin?property=b1588b40-954d-4489-b36e-45659853489a">
                Vezi formularul de check-in
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/guest-ai-assistant/demo">
                Vezi unde oaspetii primesc mesaje
              </Link>
            </div>
          </div>
        </section>
      </div>

      <SeoFooter lang="ro" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </main>
  );
}

