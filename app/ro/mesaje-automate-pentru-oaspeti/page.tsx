import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LandingSafeArea from "@/components/landing/LandingSafeArea";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import SeoFooter from "@/components/seo/SeoFooter";
import styles from "../../home.module.css";
import seo from "../../seo.module.css";

export const metadata: Metadata = {
  title: "Mesaje automate pentru oaspeti Airbnb & Booking | Plan4Host",
  description:
    "Trimite mesaje automate pentru oaspeti dupa check-in. Informatii de sosire, Wi-Fi, reguli si check-out, la momentul potrivit, fara raspunsuri manuale.",
  alternates: {
    canonical: "/ro/mesaje-automate-pentru-oaspeti",
    languages: {
      ro: "/ro/mesaje-automate-pentru-oaspeti",
      en: "/automatic-guest-messages",
    },
  },
  openGraph: {
    title: "Mesaje automate pentru oaspeti Airbnb & Booking | Plan4Host",
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
            Mesaje automate pentru oaspeti
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            Mesajele automate pentru oaspeti ajuta gazdele sa reduca discutiile repetitive si sa livreze informatiile
            potrivite, la momentul potrivit. In loc sa raspunzi la aceleasi intrebari de fiecare data, pregatesti mesajele
            o singura data, iar sistemul se ocupa de restul.
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
            <p className={seo.p}>Mesajele automate sunt mesaje trimise oaspetilor in functie de starea si timingul rezervarii.</p>
            <p className={seo.p}>
              Ele inlocuiesc discutiile manuale cu informatii clare si programate, afisate cand sunt cu adevarat utile — inainte de sosire, in timpul sejurului sau inainte de check-out.
            </p>
            <ul className={styles.includedList}>
              <li>Fara trimis manual.</li>
              <li>Fara mesaje uitate.</li>
              <li>Fara stres in ultimul moment.</li>
            </ul>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="manual">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="manual" className={seo.h2}>
              Problema comunicarii manuale
            </h2>
            <p className={seo.p}>Majoritatea gazdelor comunica cu oaspetii prin:</p>
            <ul
              className={styles.includedList}
              style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}
            >
              <li>chatul platformei de rezervari</li>
              <li>WhatsApp</li>
              <li>emailuri trimise in graba</li>
            </ul>
            <p className={seo.p}>Asta duce de obicei la:</p>
            <ul
              className={styles.includedList}
              style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}
            >
              <li>intrebari repetitive</li>
              <li>detalii lipsa</li>
              <li>intreruperi pe tot parcursul zilei</li>
              <li>stres chiar inainte de sosire</li>
            </ul>
            <p className={seo.pStrong}>
              Chiar si cu cateva rezervari, mesajele manuale devin greu de gestionat constant.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="otas">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="otas" className={seo.h2}>
              Mesaje automate pentru Airbnb si Booking
            </h2>
            <p className={seo.p}>Oaspetii de pe Airbnb si Booking intreaba de obicei aceleasi lucruri:</p>
            <ul
              className={styles.includedList}
              style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}
            >
              <li>Cum intru in proprietate?</li>
              <li>Unde pot parca?</li>
              <li>Care este parola de Wi‑Fi?</li>
              <li>La ce ora este check‑out?</li>
            </ul>
            <p className={seo.p}>
              Cu mesaje automate, informatia ajunge fara raspunsuri manuale. Mesajele sunt pregatite o singura data si apar automat in portalul oaspetelui, in functie de rezervare — indiferent daca vine din Airbnb, Booking sau alta platforma.
            </p>
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
            <p className={seo.p}>Dupa ce oaspetele completeaza check-in-ul online si gazda confirma rezervarea:</p>
            <ul className={styles.includedList}>
              <li>oaspetii au acces la un portal privat de mesaje</li>
              <li>mesajele programate apar automat la momentul potrivit</li>
              <li>toate informatiile raman organizate intr-un singur loc</li>
            </ul>
            <p className={seo.pStrong}>Gazdele nu trebuie sa trimita mesaje manual.</p>
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
              <li>detalii de acces</li>
              <li>informatii Wi‑Fi</li>
              <li>ghidaj pentru parcare</li>
              <li>reamintiri despre reguli</li>
              <li>instructiuni de check-out</li>
              <li>recomandari locale</li>
            </ul>
            <p className={seo.pStrong}>
              Toate mesajele sunt afisate in portalul oaspetelui, nu imprastiate in chat-uri sau platforme diferite.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="when">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="when" className={seo.h2}>
              Cand sunt livrate mesajele
            </h2>
            <p className={seo.p}>Mesajele sunt programate relativ la rezervare:</p>
            <ul className={styles.includedList}>
              <li>inainte de sosire (de exemplu, cu o ora inainte)</li>
              <li>la sosire</li>
              <li>inainte de check-out (de exemplu, cu douasprezece ore inainte)</li>
            </ul>
            <p className={seo.pStrong}>
              Oaspetele vede fiecare mesaj exact cand este relevant, fara sa caute prin conversatii.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="see">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="see" className={seo.h2}>
              Ce vede oaspetele
            </h2>
            <p className={seo.p}>Oaspetii au acces la un portal dedicat unde:</p>
            <ul className={styles.includedList}>
              <li>mesajele apar intr-o ordine clara</li>
              <li>detaliile rezervarii sunt vizibile</li>
              <li>regulile sunt disponibile</li>
              <li>datele de contact ale proprietatii sunt mereu accesibile</li>
            </ul>
            <p className={seo.pStrong}>Experienta este calma, structurata si usor de urmarit.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="who">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="who" className={seo.h2}>
              Pentru cine sunt mesaje automate
            </h2>
            <p className={seo.p}>Mesajele automate sunt potrivite pentru:</p>
            <ul className={styles.includedList}>
              <li>gazde pe Airbnb si Booking</li>
              <li>proprietati de short-term rental</li>
              <li>cazari fara receptie permanenta</li>
              <li>gazde care gestioneaza mai multe rezervari</li>
              <li>orice gazda care vrea mai putine intreruperi in timpul zilei</li>
            </ul>
            <p className={seo.pStrong}>
              Sunt facute pentru hosting real, nu pentru lanturi hoteliere mari cu sisteme complexe.
            </p>
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
            <h2 id="cta" className={seo.h2}>Nota finala</h2>
            <p className={seo.p}>
              Mesajele automate nu sunt despre a elimina ospitalitatea. Sunt despre a elimina repetitia, stresul si
              intreruperile constante — in timp ce oaspetii raman informati si confortabili.
            </p>
            <p className={seo.pStrong}>Vezi cum arata mesajele automate din perspectiva oaspetelui.</p>
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
