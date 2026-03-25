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
  title: "Plan4Host vs channel manager | Plan4Host",
  description:
    "O comparatie clara intre Plan4Host si un channel manager clasic, ca sa vezi cand este suficienta o platforma mai usoara de operare si cand ai nevoie de un sistem mai greu.",
  alternates: {
    canonical: "/ro/plan4host-vs-channel-manager",
    languages: {
      ro: "/ro/plan4host-vs-channel-manager",
      en: "/plan4host-vs-channel-manager",
    },
  },
  openGraph: {
    title: "Plan4Host vs channel manager | Plan4Host",
    description:
      "Vezi cand Plan4Host este alegerea operationala potrivita si cand un channel manager mai greu poate fi mai potrivit.",
    url: "/ro/plan4host-vs-channel-manager",
    locale: "ro_RO",
    type: "article",
  },
};

export default function Plan4HostVsChannelManagerRoPage() {
  const faq = [
    {
      q: "Este Plan4Host un channel manager clasic?",
      a: "Nu. Plan4Host este o platforma de operare mai usoara, construita in jurul rezervarilor unificate, fluxului pentru oaspeti si coordonarii zilnice.",
    },
    {
      q: "Cand ar trebui sa folosesc un channel manager mai greu?",
      a: "Daca ai nevoie de sync API in timp real, preturi automate, restrictii avansate sau fluxuri hoteliere complexe, un channel manager mai greu poate fi alegerea mai buna.",
    },
    {
      q: "Cand este suficient Plan4Host?",
      a: "Plan4Host este o alegere buna cand vrei un singur loc calm pentru rezervari, check-in online, mesaje pentru oaspeti si flux operational simplu.",
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
            Plan4Host vs un channel manager clasic
          </h1>
          <p className={`${styles.heroKicker} ${seo.seoHeroIntro}`} style={{ maxWidth: 72 * 10 }}>
            Aceasta nu este o pagina de lupta. Este o pagina de pozitionare. <strong>Plan4Host</strong> este construit pentru <strong>operare calma</strong>, nu pentru echipe care au nevoie de un stack enterprise de distributie.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/ro/pentru-cine-este-plan4host">
              Vezi pentru cine este Plan4Host
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro/cum-functioneaza-plan4host-cu-airbnb-si-booking">
              Vezi cum functioneaza
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Context comparativ Plan4Host" data-p4h-reveal>
          <Image
            src="/benefits_en.png"
            alt="Privire de ansamblu asupra fluxului Plan4Host"
            width={900}
            height={900}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
            priority
          />
        </div>
      </section>

      <article className={seo.article}>
        <section className={seo.articleSection} aria-labelledby="difference">
          <div className={seo.articleSplit}>
            <div className={seo.articleSectionTight}>
              <h2 id="difference" className={seo.h2}>
                Diferenta principala
              </h2>
              <p className={seo.p}>
                Un channel manager clasic este construit de obicei pentru <strong>complexitate de distributie</strong>: conexiuni API, rate management, restrictii si control mai greu de inventar.
              </p>
              <p className={seo.p}>
                Plan4Host este construit pentru <strong>claritate operationala</strong>: un calendar, check-in online, mesaje pentru oaspeti si un flux mai simplu in jurul rezervarii dupa ce ea intra in sistem.
              </p>
            </div>
            <div className={seo.imageFrame}>
              <Image
                src="/problem_multiple_booking.png"
                alt="Complexitate operationala intre canale"
                width={1200}
                height={900}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="when-plan4host">
          <h2 id="when-plan4host" className={seo.h2}>
            Cand Plan4Host este alegerea mai buna
          </h2>
          <ul className={styles.includedList} style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}>
            <li>vrei un singur loc pentru rezervari, oaspeti si flux de check-in</li>
            <li>administrezi o operatiune mica sau medie de inchiriere pe termen scurt</li>
            <li>te intereseaza mai mult claritatea zilnica decat tool-uri avansate de revenue</li>
            <li>vrei mai putine intreruperi si mai putina coordonare manuala cu oaspetii</li>
          </ul>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="when-channel-manager">
          <h2 id="when-channel-manager" className={seo.h2}>
            Cand un channel manager mai greu este alegerea mai buna
          </h2>
          <ul className={styles.includedList} style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}>
            <li>ai nevoie de sync API in timp real peste tot</li>
            <li>ai nevoie de preturi automate si reguli avansate de rate</li>
            <li>depinde de restrictii, allotments si logica hoteliera extinsa</li>
            <li>operatiunea ta este deja construita in jurul unui tool enterprise de distributie</li>
          </ul>
        </section>

        <section className={seo.articleSection} aria-labelledby="cta">
          <div className={`sb-cardglow ${seo.card}`}>
            <h2 id="cta" className={seo.h2}>
              Nota finala
            </h2>
            <p className={seo.p}>
              Comparatia onesta este simpla: <strong>Plan4Host nu incearca sa fie totul</strong>. Este un sistem mai usor pentru gazde care vor un flux clar pentru oaspeti si operare fara complexitate inutila.
            </p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/ro/cum-functioneaza-plan4host-cu-airbnb-si-booking">
                Vezi cum functioneaza
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro/check-in-online-cazare">
                Vezi check-in online
              </Link>
            </div>
          </div>
        </section>
      </article>

      <SeoFooter lang="ro" />
      <SeoStructuredData
        lang="ro"
        path="/ro/plan4host-vs-channel-manager"
        title="Plan4Host vs channel manager | Plan4Host"
        description="O comparatie clara intre Plan4Host si un channel manager clasic, ca sa vezi cand este suficienta o platforma mai usoara de operare si cand ai nevoie de un sistem mai greu."
        image="/benefits_en.png"
        faq={faq}
      />
    </main>
  );
}
