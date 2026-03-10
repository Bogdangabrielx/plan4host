import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LandingSafeArea from "@/components/landing/LandingSafeArea";
import SeoFooter from "@/components/seo/SeoFooter";
import styles from "../../home.module.css";
import seo from "../../seo.module.css";

export const metadata: Metadata = {
  title: "Cum sa automatizezi mesajele pentru oaspeti la cazarile pe termen scurt | Plan4Host",
  description:
    "Un ghid practic despre cum sa automatizezi mesajele pentru oaspeti la cazarile pe termen scurt, cu mai putine intrebari repetitive si o comunicare mai clara.",
  alternates: {
    canonical: "/ro/cum-sa-automatizezi-mesajele-pentru-oaspeti-la-cazarile-pe-termen-scurt",
    languages: {
      ro: "/ro/cum-sa-automatizezi-mesajele-pentru-oaspeti-la-cazarile-pe-termen-scurt",
      en: "/how-to-automate-guest-messaging-for-short-term-rentals",
    },
  },
  openGraph: {
    title: "Cum sa automatizezi mesajele pentru oaspeti la cazarile pe termen scurt | Plan4Host",
    description:
      "Afla cum sa automatizezi mesajele pentru oaspeti la cazarile pe termen scurt si cum sa reduci comunicarea repetitiva din Airbnb, Booking.com si Vrbo.",
    url: "/ro/cum-sa-automatizezi-mesajele-pentru-oaspeti-la-cazarile-pe-termen-scurt",
    locale: "ro_RO",
    type: "article",
  },
};

export default function CumAutomatizeziMesajeleSeoPage() {
  return (
    <main
      className={styles.landing}
      style={{ paddingBottom: "var(--safe-bottom, 0px)", minHeight: "100dvh", overflowX: "hidden" }}
    >
      <LandingSafeArea />

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
        <div className={styles.heroText}>
          <h1 id="title" className={styles.heroHeadline} style={{ margin: 0 }}>
            Cum sa automatizezi mesajele pentru oaspeti la cazarile pe termen scurt
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            Gazdele raspund zilnic la aceleasi intrebari: check-in, parcare, Wi-Fi, directii si check-out.
            Automatizarea reduce raspunsurile repetitive si livreaza informatia exact cand oaspetele are nevoie de ea.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/guest-ai-assistant/demo">
              Vezi portalul pentru oaspeti
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro/mesaje-automate-pentru-oaspeti">
              Vezi pagina despre mesaje automate
            </Link>
          </div>
        </div>

        <div aria-label="Preview automatizare mesaje oaspeti">
          <div className={seo.imageFrame}>
            <Image
              src="/HeroMSG_en.png"
              alt="Preview automatizare mesaje oaspeti"
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
                De ce mesajele pentru oaspeti devin o problema pentru gazde
              </h2>
              <p className={seo.p}>
                Problema nu este complexitatea. Problema este repetitia. Oaspetii intreaba iar si iar despre acces,
                parcare, Wi-Fi, directii si check-out.
              </p>
              <ul
                className={styles.includedList}
                style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}
              >
                <li>oaspetii rateaza mesajele lungi trimise prea devreme</li>
                <li>detaliile importante se pierd in raspunsuri generale</li>
                <li>gazda pierde timp cu aceleasi intrebari operationale</li>
              </ul>
            </div>

            <div className={seo.imageFrame}>
              <Image
                src="/60%_en.png"
                alt="Vizual cu intrebari repetitive de la oaspeti"
                width={900}
                height={700}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="automated">
          <div className={seo.articleSectionTight}>
            <h2 id="automated" className={seo.h2}>
              Cum rezolva Plan4Host problema
            </h2>
            <p className={seo.p}>
              Automatizarea buna este simpla: mesajul potrivit pleaca la momentul potrivit, iar toate detaliile
              pentru oaspete raman intr-un singur loc. Asta face Plan4Host.
            </p>
            <ul className={styles.includedList}>
              <li>mesaje programate pentru check-in, sejur si check-out</li>
              <li>un portal central cu instructiuni si remindere</li>
              <li>asistenta AI pentru intrebarile frecvente</li>
              <li>comunicare coerenta pentru toate sursele de rezervare</li>
            </ul>
            <p className={seo.p}>
              Poti vedea separat pagina despre <Link href="/ro/mesaje-automate-pentru-oaspeti">mesaje automate</Link>{" "}
              si pagina despre <Link href="/ro/asistent-ai-oaspeti">asistentul AI pentru oaspeti</Link>, dar impreuna
              ele rezolva aceeasi problema: comunicarea repetitiva.
            </p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/ro/mesaje-automate-pentru-oaspeti">
                Vezi mesaje automate
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro/asistent-ai-oaspeti">
                Vezi asistentul AI
              </Link>
            </div>

            <div className={seo.featureRow}>
              <div className={seo.featureItem}>
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
                  Mesajele scurte trimise aproape de sosire functioneaza mai bine decat mesajele lungi trimise prea devreme.
                </p>
              </div>

              <div className={seo.featureItem}>
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
                  Mesajele in limba oaspetelui reduc confuzia si intrebarile inutile.
                </p>
              </div>

              <div className={seo.featureItem}>
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
                  Un singur portal tine la un loc detaliile rezervarii, instructiunile si reminderele.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="timing">
          <div className={seo.articleSectionTight}>
            <h2 id="timing" className={seo.h2}>
              De ce timingul conteaza mai mult decat lungimea mesajului
            </h2>
            <p className={seo.p}>
              Mesajele lungi trimise prea devreme sunt de obicei ignorate. Oaspetii reactioneaza mai bine cand mesajul
              apare exact in momentul util.
            </p>
            <ul className={styles.includedList}>
              <li>trimite accesul aproape de sosire</li>
              <li>afiseaza Wi-Fi-ul in timpul sejurului</li>
              <li>trimite reminderul de check-out aproape de plecare</li>
            </ul>
            <p className={seo.p}>
              Aici automatizarea mesajelor devine cu adevarat utila: mesajele scurte si bine plasate functioneaza mai bine decat un mesaj generic.
            </p>
            <div className={seo.imageFrame}>
              <Image
                src="/timing_en.png"
                alt="De ce timingul conteaza in mesajele pentru oaspeti"
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
              Beneficiile automatizarii mesajelor dintr-un singur loc
            </h2>
            <p className={seo.p}>
              Scopul este simplu: mai putina repetitie, mai putina munca manuala si o comunicare mai clara, indiferent de unde vine rezervarea.
            </p>
            <ul className={styles.includedList}>
              <li>reduci intrebarile repetitive</li>
              <li>castigi timp la raspunsurile operationale</li>
              <li>pastrezi comunicarea coerenta pentru orice sursa de booking</li>
              <li>livrezi informatia la momentul potrivit</li>
              <li>tii totul organizat intr-un singur loc</li>
            </ul>
            <p className={seo.p}>
              Daca rezervarile vin din Airbnb, Booking.com sau Vrbo, cea mai sigura varianta este sa gestionezi mesajele dintr-o platforma centrala care aduna toate booking-urile.
            </p>
            <div className={seo.imageFrame}>
              <Image
                src="/benefits_en.png"
                alt="Beneficiile automatizarii mesajelor pentru oaspeti"
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
              Concluzie
            </h2>
            <p className={seo.p}>
              Incepe cu lucrurile care consuma timp in fiecare saptamana: intrebarile repetitive, instructiunile trimise prea devreme si comunicarea imprastiata in prea multe locuri.
              O automatizare buna economiseste timp si imbunatateste experienta oaspetelui fara sa para rece sau impersonala.
            </p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/ro/mesaje-automate-pentru-oaspeti">
                Vezi mesaje automate
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro/asistent-ai-oaspeti">
                Vezi asistentul AI pentru oaspeti
              </Link>
            </div>
          </div>
        </section>
      </article>

      <SeoFooter lang="ro" />
    </main>
  );
}
