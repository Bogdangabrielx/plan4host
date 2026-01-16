import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import styles from "../../home.module.css";
import seo from "../../seo.module.css";

export const metadata: Metadata = {
  title: "Check-in online cazare – formular digital pentru oaspeti | Plan4Host",
  description:
    "Colecteaza datele oaspetilor online, fara mesaje repetitive. Check-in digital pentru Airbnb si Booking, simplu si organizat.",
  alternates: {
    canonical: "/ro/check-in-online-cazare",
    languages: {
      ro: "/ro/check-in-online-cazare",
      en: "/online-check-in-accommodation",
    },
  },
  openGraph: {
    title: "Check-in online cazare – formular digital pentru oaspeti | Plan4Host",
    description:
      "Formular check-in digital pentru colectare date oaspeti online. Functioneaza pentru Airbnb si Booking.",
    url: "/ro/check-in-online-cazare",
    locale: "ro_RO",
    type: "article",
  },
};

export default function CheckInOnlineCazarePage() {
  const faq = [
    {
      q: "Este check-in-ul online complicat pentru oaspeti?",
      a: "Nu. Oaspetele primeste un link si completeaza un formular simplu.",
    },
    {
      q: "Trebuie sa trimit mesaje manual?",
      a: "Nu. Linkul de check-in poate fi trimis automat.",
    },
    {
      q: "Pot personaliza ce informatii cer?",
      a: "Da. Formularul se adapteaza nevoilor fiecarei cazari.",
    },
    {
      q: "Ce se intampla dupa ce oaspetele completeaza formularul?",
      a: "Gazda este notificata si poate confirma rezervarea.",
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

      <nav className={styles.nav} aria-label="Navigatie">
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
          <h1 id="title" className={styles.heroHeadline} style={{ margin: 0 }}>
            Check-in online pentru cazari
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            Check-in-ul online este una dintre cele mai simple metode prin care o gazda poate reduce mesajele, stresul si
            timpul pierdut inainte de sosirea oaspetilor. In loc de discutii repetitive, oaspetii completeaza datele
            necesare online, inainte de a ajunge la cazare.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/ro">
              Vezi cum functioneaza
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/guest-ai-assistant/demo">
              Descopera experienta pentru oaspeti
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Preview check-in" data-p4h-reveal>
          <Image
            src="/Landing_Mockups3.png"
            alt="Preview Plan4Host check-in"
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
              Ce inseamna check-in online pentru oaspeti
            </h2>
            <p className={seo.p}>
              Check-in-ul online inseamna ca oaspetele primeste un link unde completeaza toate informatiile necesare
              inainte de sosire. Nu mai este nevoie de mesaje separate, poze trimise pe WhatsApp sau discutii in ultimul
              moment.
            </p>
            <p className={seo.p}>
              Practic, este un <strong>formular check-in digital</strong> pentru <strong>colectare date oaspeti online</strong>.
            </p>
            <p className={seo.p}>
              Pentru oaspete, procesul este simplu si clar. Pentru gazda, totul este organizat intr-un singur loc.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="otas">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="otas" className={seo.h2}>
              Check-in online pentru Airbnb si Booking
            </h2>
            <p className={seo.p}>
              Multi hosti cauta exact asta: <strong>check-in online Airbnb</strong> si <strong>check-in online Booking</strong>, fara mesaje repetitive.
              In practica, inseamna un singur link pe care il trimiti in conversatia de rezervare, pe WhatsApp sau pe email.
            </p>
            <p className={seo.p}>
              Oaspetele completeaza formularul inainte de sosire, iar tu ai datele intr-un singur loc. Mai putin haos, mai putine intrebari, mai multa claritate.
            </p>
            <div className={seo.logosRow} aria-label="Platforme">
              <span className={seo.logosLabel}>Platforme</span>
              <Image className={seo.logoImg} src="/airbnb.png" alt="Airbnb" width={52} height={52} />
              <Image className={seo.logoImg} src="/booking.png" alt="Booking.com" width={52} height={52} />
              <Image className={seo.logoImg} src="/trivago.png" alt="Trivago" width={52} height={52} />
              <Image className={seo.logoImg} src="/expedia.png" alt="Expedia" width={52} height={52} />
            </div>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="classic">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="classic" className={seo.h2}>
              Problemele check-in-ului clasic
            </h2>
            <p className={seo.p}>Check-in-ul clasic inseamna, de obicei:</p>
            <ul className={styles.problemList}>
              <li>mesaje trimise in graba</li>
              <li>informatii incomplete</li>
              <li>intrebari repetitive</li>
              <li>timp pierdut exact cand ai alte lucruri de facut</li>
            </ul>
            <p className={seo.p}>Multi oaspeti intreaba aceleasi lucruri:</p>
            <ul className={styles.problemList}>
              <li>la ce ora pot ajunge</li>
              <li>unde se parcheaza</li>
              <li>ce documente sunt necesare</li>
              <li>care sunt regulile cazarii</li>
            </ul>
            <p className={seo.p}>Toate acestea se repeta de la o rezervare la alta.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="workflow">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="workflow" className={seo.h2}>
              Cum functioneaza check-in-ul online cu Plan4Host
            </h2>
            <p className={seo.p}>
              Cu Plan4Host, check-in-ul online functioneaza intr-un mod simplu:
            </p>
            <div className={seo.flowRow} aria-label="Workflow">
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>invitat</span>
              <span className={seo.flowArrow}>→</span>
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>formular online</span>
              <span className={seo.flowArrow}>→</span>
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>confirmare</span>
              <span className={seo.flowArrow}>→</span>
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>sosire</span>
            </div>
            <p className={seo.p}>
              Gazda trimite un link de check-in. Oaspetele completeaza formularul inainte de sosire. Gazda primeste o
              notificare si confirma rezervarea.
            </p>
            <p className={seo.p}>Totul este clar inainte ca oaspetele sa ajunga la cazare.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="form">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="form" className={seo.h2}>
              Ce completeaza oaspetele in formular
            </h2>
            <p className={seo.p}>Formularul de check-in poate include:</p>
            <ul className={styles.includedList}>
              <li>datele de identificare</li>
              <li>informatii de contact</li>
              <li>acceptarea regulilor interne</li>
              <li>alte detalii cerute de gazda</li>
            </ul>
            <p className={seo.p}>
              Oaspetele vede exact ce are de facut, fara explicatii suplimentare. Gazda primeste datele organizate, fara
              mesaje separate.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="after">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="after" className={seo.h2}>
              Ce vede oaspetele dupa check-in
            </h2>
            <p className={seo.p}>Dupa completarea formularului, oaspetele:</p>
            <ul className={styles.includedList}>
              <li>primeste confirmarea check-in-ului</li>
              <li>stie ca rezervarea este inregistrata</li>
              <li>are acces la informatiile importante despre cazare</li>
            </ul>
            <p className={seo.p}>Nu mai este nevoie de mesaje de confirmare trimise manual.</p>

            <div style={{ marginTop: 10 }}>
              <Image
                src="/Confirmare%20primire%20formular.png"
                alt="Exemplu de confirmare dupa trimiterea formularului de check-in"
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
              Pentru cine este potrivit check-in-ul online
            </h2>
            <p className={seo.p}>Check-in-ul online este potrivit pentru:</p>
            <ul className={styles.includedList}>
              <li>gazde cu una sau mai multe cazari</li>
              <li>persoane care gestioneaza singure proprietatea</li>
              <li>gazde care vor mai putine intreruperi zilnice</li>
              <li>cazari fara receptie permanenta</li>
            </ul>
            <p className={seo.p}>Nu este destinat hotelurilor mari cu procese complexe.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="faq">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="faq" className={seo.h2}>
              Intrebari frecvente despre check-in online
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
              In practica
            </h2>
            <p className={seo.p}>
              Daca vrei sa vezi cum functioneaza check-in-ul online in practica, descopera workflow-ul complet cu
              Plan4Host.
            </p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/ro">
                Vezi pagina acasa
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/guest-ai-assistant/demo">
                Descopera experienta pentru oaspeti
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
