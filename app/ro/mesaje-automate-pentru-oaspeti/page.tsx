import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import SeoFooter from "@/components/seo/SeoFooter";
import styles from "../../home.module.css";
import seo from "../../seo.module.css";

export const metadata: Metadata = {
  title: "Mesaje automate pentru oaspeti – cazare | Plan4Host",
  description:
    "Trimite mesaje automate pentru oaspeti dupa check-in. Informatii de sosire, Wi-Fi, reguli si check-out, la momentul potrivit, fara mesaje manuale.",
  alternates: {
    canonical: "/ro/mesaje-automate-pentru-oaspeti",
    languages: {
      ro: "/ro/mesaje-automate-pentru-oaspeti",
      en: "/automatic-guest-messages",
    },
  },
  openGraph: {
    title: "Mesaje automate pentru oaspeti – cazare | Plan4Host",
    description:
      "Mesaje automate pentru oaspeti dupa check-in: sosire, Wi-Fi, reguli si check-out, la momentul potrivit.",
    url: "/ro/mesaje-automate-pentru-oaspeti",
    locale: "ro_RO",
    type: "article",
  },
};

export default function MesajeAutomatePentruOaspetiSeoPage() {
  const faq = [
    {
      q: "Oaspetii primesc emailuri sau mesaje pe WhatsApp?",
      a: "Mesajele apar intr-un portal dedicat oaspetelui dupa confirmare.",
    },
    {
      q: "Pot personaliza mesajele?",
      a: "Da. Mesajele sunt personalizabile si pot fi editate oricand.",
    },
    {
      q: "Mesajele pornesc fara confirmarea mea?",
      a: "Nu. Mesajele incep doar dupa ce rezervarea este confirmata.",
    },
    {
      q: "Oaspetii pot raspunde la mesaje?",
      a: "Mesajele sunt informative si gandite sa reduca conversatiile inutile.",
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

      <nav className={styles.nav} aria-label="Navigatie">
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
            Mesaje automate pentru oaspeti
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            Mesajele catre oaspeti sunt una dintre cele mai mari surse de stres pentru gazde. Detalii de sosire, Wi‑Fi,
            parcare, reguli — „inca o intrebare”.
            <br />
            <br />
            Mesajele automate inlocuiesc conversatiile repetitive cu informatii clare, livrate la momentul potrivit —
            exact cand oaspetele are nevoie.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/guest-ai-assistant/demo">
              Vezi portalul de mesaje pentru oaspeti
            </Link>
            <Link
              className={`${styles.btn} ${styles.btnOutline}`}
              href="/checkin?property=b1588b40-954d-4489-b36e-45659853489a"
            >
              Vezi formularul de check-in
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Preview portal oaspete" data-p4h-reveal>
          <Image
            src="/Landing_Mockups2.png"
            alt="Preview portal oaspete"
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
              Ce inseamna mesaje automate pentru oaspeti
            </h2>
            <p className={seo.p}>
              Mesajele automate sunt mesaje programate, afisate oaspetilor in functie de starea rezervarii.
            </p>
            <p className={seo.p}>
              In loc sa raspunzi la aceleasi intrebari, oaspetii primesc informatiile potrivite automat:{" "}
              <strong>inainte de sosire</strong>, <strong>la sosire</strong> si <strong>inainte de check-out</strong>.
            </p>
            <p className={seo.pStrong}>Fara trimis manual. Fara follow-up. Fara mesaje ratate.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="manual">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="manual" className={seo.h2}>
              Problema comunicarii manuale
            </h2>
            <p className={seo.p}>Majoritatea gazdelor comunica cu oaspetii prin:</p>
            <ul className={styles.problemList}>
              <li>WhatsApp</li>
              <li>chatul platformei de rezervari</li>
              <li>mesaje in ultimul moment</li>
            </ul>
            <p className={seo.p}>Asta duce de obicei la:</p>
            <ul className={styles.problemList}>
              <li>intrebari repetitive</li>
              <li>detalii uitate</li>
              <li>stres chiar inainte de sosire</li>
              <li>intreruperi pe tot parcursul zilei</li>
            </ul>
            <p className={seo.pStrong}>Comunicarea manuala nu scaleaza — nici macar pentru proprietati mici.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="how">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="how" className={seo.h2}>
              Cum functioneaza mesajele automate cu Plan4Host
            </h2>
            <p className={seo.p}>Cu Plan4Host, mesajele urmeaza un flow simplu:</p>
            <div className={seo.flowRow} aria-label="Workflow">
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>check-in completat</span>
              <span className={seo.flowArrow}>→</span>
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>rezervare confirmata</span>
              <span className={seo.flowArrow}>→</span>
              <span className={`${seo.flowPill} ${seo.flowPillStrong}`}>mesaje afisate</span>
            </div>
            <p className={seo.p}>
              Dupa ce oaspetele completeaza check-in-ul online si gazda confirma rezervarea, oaspetele are acces la un
              portal privat unde mesajele apar automat, la momentul potrivit.
            </p>
            <p className={seo.pStrong}>Gazda nu trebuie sa faca pasi suplimentari.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="what">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="what" className={seo.h2}>
              Ce primesc oaspetii automat
            </h2>
            <p className={seo.p}>Mesajele pot include:</p>
            <ul className={styles.includedList}>
              <li>instructiuni de sosire</li>
              <li>coduri de acces</li>
              <li>detalii Wi-Fi</li>
              <li>informatii despre parcare</li>
              <li>reamintiri despre reguli</li>
              <li>instructiuni de check-out</li>
              <li>recomandari locale</li>
            </ul>
            <p className={seo.pStrong}>Mesajele apar in portalul oaspetelui, nu in emailuri sau chat-uri imprastiate.</p>
            <div className={seo.logosRow} aria-label="Platforme">
              <span className={seo.logosLabel}>Platforme</span>
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
              Cand apar mesajele
            </h2>
            <p className={seo.p}>Mesajele pot fi programate relativ la rezervare:</p>
            <ul className={styles.problemList}>
              <li>inainte de sosire (de ex. cu 1 ora inainte)</li>
              <li>la sosire</li>
              <li>inainte de check-out (de ex. cu 12 ore inainte)</li>
            </ul>
            <p className={seo.pStrong}>Fiecare mesaj apare exact cand este relevant pentru oaspete.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="see">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="see" className={seo.h2}>
              Ce vede oaspetele
            </h2>
            <p className={seo.p}>
              Oaspetii nu primesc mesaje aleatorii. Ei au acces la un portal dedicat unde mesajele apar in ordine, detaliile
              rezervarii sunt vizibile, regulile sunt accesibile si datele de contact raman la indemana.
            </p>
            <p className={seo.pStrong}>Totul este calm, structurat si usor de inteles.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="who">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="who" className={seo.h2}>
              Pentru cine sunt mesaje automate
            </h2>
            <p className={seo.p}>Mesajele automate sunt potrivite pentru:</p>
            <ul className={styles.includedList}>
              <li>gazde de short-term rentals</li>
              <li>gazde pe Airbnb si Booking</li>
              <li>proprietati fara receptie</li>
              <li>gazde care gestioneaza mai multe rezervari</li>
              <li>orice gazda care vrea mai putine intreruperi</li>
            </ul>
            <p className={seo.pStrong}>Sistemul este facut pentru hosting real, nu pentru lanturi hoteliere.</p>
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
              Vezi cum arata mesajele din perspectiva oaspetelui
            </h2>
            <p className={seo.p}>Un portal calm, unde mesajele apar la momentul potrivit.</p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/guest-ai-assistant/demo">
                Vezi portalul de mesaje pentru oaspeti
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro">
                Vezi pagina acasa
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
