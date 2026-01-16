import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import styles from "../../home.module.css";
import seo from "../../seo.module.css";

export const metadata: Metadata = {
  title: "Sincronizare iCal Expedia – conecteaza calendarul | Plan4Host",
  description:
    "Ghid scurt pentru sincronizare iCal Expedia: importi rezervarile in Plan4Host si exporti disponibilitatea inapoi ca sa eviti suprapunerile.",
  alternates: {
    canonical: "/ro/sincronizare-ical-expedia",
    languages: {
      ro: "/ro/sincronizare-ical-expedia",
      en: "/expedia-ical-sync",
    },
  },
  openGraph: {
    title: "Sincronizare iCal Expedia – conecteaza calendarul | Plan4Host",
    description:
      "Sincronizare calendar Expedia prin iCal (.ics): import rezervari si export disponibilitate pentru a reduce overbooking.",
    url: "/ro/sincronizare-ical-expedia",
    locale: "ro_RO",
    type: "article",
  },
};

export default function SincronizareIcalExpediaRO() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Cum sincronizezi calendarul Expedia cu iCal",
    step: [
      { "@type": "HowToStep", name: "Copiaza linkul iCal de export din Expedia" },
      { "@type": "HowToStep", name: "Adauga calendarul Expedia in Plan4Host (Import iCal)" },
      { "@type": "HowToStep", name: "Lipeste linkul Expedia si salveaza" },
      { "@type": "HowToStep", name: "Copiaza linkul de export din Plan4Host si importa-l inapoi in Expedia" },
      { "@type": "HowToStep", name: "Verifica daca rezervarile apar corect in ambele calendare" },
    ],
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
          <Link className={`${styles.btn} ${styles.btnSolid}`} href="/auth/login?mode=signup">
            Incepe gratuit
          </Link>
          <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro">
            Vezi pagina acasa
          </Link>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="title">
        <div className={styles.heroText} data-p4h-reveal>
          <h1 id="title" className={styles.heroHeadline} style={{ margin: 0 }}>
            Sincronizare iCal Expedia
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            Conectezi <strong>calendarul Expedia</strong> prin <strong>iCal (.ics)</strong>, ca rezervarile si
            disponibilitatea sa ramana aliniate intre Expedia si Plan4Host.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/auth/login?mode=signup">
              Incepe gratuit
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro#features">
              Afla mai mult
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Logo Expedia" data-p4h-reveal>
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
            <Image src="/expedia.png" alt="Expedia" width={360} height={360} style={{ width: 160, height: 160 }} priority />
          </div>
        </div>
      </section>

      <div className={seo.content}>
        <section className={seo.section} aria-labelledby="meaning">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="meaning" className={seo.h2}>
              Ce inseamna sincronizarea iCal
            </h2>
            <p className={seo.p}>
              iCal este un format standard de calendar (<strong>.ics</strong>) folosit pentru a partaja rezervari si
              blocari. Pentru Expedia iCal, de obicei conectezi doua directii: <strong>importi</strong> rezervarile in
              Plan4Host si <strong>exporti</strong> disponibilitatea din Plan4Host inapoi in Expedia.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="steps">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="steps" className={seo.h2}>
              Pasi de conectare Expedia cu Plan4Host
            </h2>
            <ol className={seo.steps}>
              <li>In Expedia Partner Central, gaseste zona de calendar/iCal si copiaza linkul de export.</li>
              <li>In Plan4Host, mergi la Sync Calendars → Import iCal si adauga un import pentru aceeasi camera/unitate.</li>
              <li>Lipeste linkul Expedia si salveaza.</li>
              <li>Copiaza linkul de export din Plan4Host si importa-l inapoi in Expedia (iCal import).</li>
              <li>Verifica daca evenimentele apar corect in ambele calendare si nu exista suprapuneri.</li>
            </ol>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="tips">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="tips" className={seo.h2}>
              Sfaturi practice
            </h2>
            <ul className={styles.problemList}>
              <li>Foloseste un calendar per camera/unitate pentru mapare clara.</li>
              <li>iCal sincronizeaza evenimente/blocari, nu preturi.</li>
              <li>Pastreaza fusul orar consistent pe toate platformele.</li>
            </ul>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="cta">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="cta" className={seo.h2}>
              Vrei sa conectezi calendarul?
            </h2>
            <p className={seo.p}>Incepe gratuit si conecteaza primul calendar iCal in cateva minute.</p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/auth/login?mode=signup">
                Incepe gratuit
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro">
                Vezi pagina acasa
              </Link>
            </div>
          </div>
        </section>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
    </main>
  );
}

