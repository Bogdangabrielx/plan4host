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
  title: "Pentru cine este Plan4Host | Plan4Host",
  description:
    "Vezi pentru cine este proiectat Plan4Host, unde se potriveste cel mai bine si cand un channel manager mai greu poate fi alegerea mai buna.",
  alternates: {
    canonical: "/ro/pentru-cine-este-plan4host",
    languages: {
      ro: "/ro/pentru-cine-este-plan4host",
      en: "/who-plan4host-is-for",
    },
  },
  openGraph: {
    title: "Pentru cine este Plan4Host | Plan4Host",
    description:
      "O pagina practica de pozitionare pentru gazde si manageri care vor sa stie cand Plan4Host este o alegere buna.",
    url: "/ro/pentru-cine-este-plan4host",
    locale: "ro_RO",
    type: "article",
  },
};

export default function PentruCineEstePlan4HostPage() {
  const faq = [
    {
      q: "Este Plan4Host potrivit pentru hoteluri mari?",
      a: "Nu. Plan4Host se potriveste mai bine operatiunilor mici si medii de inchiriere pe termen scurt decat hotelurilor mari cu procese enterprise.",
    },
    {
      q: "Este util daca administrez proprietatea singur?",
      a: "Da. Este foarte util pentru gazde si manageri care vor mai putine intreruperi si un singur loc calm pentru operare.",
    },
    {
      q: "Am nevoie de multe proprietati ca sa il folosesc?",
      a: "Nu. Poate functiona pentru o singura proprietate sau pentru un portofoliu mic de unitati.",
    },
    {
      q: "Ce tip de gazda obtine cea mai mare valoare?",
      a: "Gazdele care vor rezervari unificate, check-in online, mesaje pentru oaspeti si coordonare zilnica simpla obtin cea mai mare valoare.",
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
            Pentru cine este Plan4Host
          </h1>
          <p className={`${styles.heroKicker} ${seo.seoHeroIntro}`} style={{ maxWidth: 72 * 10 }}>
            Plan4Host este construit pentru <strong>operatiuni mici si medii de inchiriere pe termen scurt</strong> care vor mai putine intreruperi, un flux mai clar pentru oaspeti si un singur loc pentru rezervari, check-in online si comunicare.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/ro/cum-functioneaza-plan4host-cu-airbnb-si-booking">
              Vezi cum functioneaza
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro/check-in-online-cazare">
              Vezi check-in online
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Pentru cine este Plan4Host" data-p4h-reveal>
          <Image
            src="/who_benefit.png"
            alt="Pentru cine este Plan4Host"
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
                Se potriveste cel mai bine cand
              </h2>
              <p className={seo.p}>
                Cea mai buna potrivire este o gazda sau un manager care vrea <strong>operare simpla si structurata</strong>, nu un stack mare de tool-uri avansate.
              </p>
              <ul className={styles.includedList} style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}>
                <li>gazde cu o singura proprietate</li>
                <li>portofolii mici cu mai multe unitati</li>
                <li>operatiuni fara receptie permanenta</li>
                <li>echipe care vor mai putine intrebari repetitive de la oaspeti</li>
              </ul>
            </div>
            <div className={seo.imageFrame}>
              <Image
                src="/60%_en.png"
                alt="Intrebari repetitive de la oaspeti"
                width={1200}
                height={900}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="de-ce">
          <h2 id="de-ce" className={seo.h2}>
            De ce functioneaza bine pentru acest segment
          </h2>
          <p className={seo.p}>
            Pentru acest tip de business, problema principala nu este lipsa unor functii enterprise. Problema este mai des <strong>zgomotul operational</strong>: prea multe mesaje mici, prea multe locuri de verificat si prea multa coordonare manuala.
          </p>
          <div className={seo.featureRow}>
            <div className={seo.featureItem}>
              <div className={seo.imageFrame}>
                <Image
                  src="/benefits_en.png"
                  alt="Beneficiile unui sistem structurat"
                  width={900}
                  height={700}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p className={seo.featureCaption}>
                Un singur sistem reduce repetitia zilnica intre rezervari, oaspeti si fluxul de curatenie.
              </p>
            </div>
            <div className={seo.featureItem}>
              <div className={seo.imageFrame}>
                <Image
                  src="/Checkin_mok2.png"
                  alt="Check-in online pentru oaspeti"
                  width={900}
                  height={700}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p className={seo.featureCaption}>
                Check-in-ul devine mai structurat pentru ca oaspetii completeaza informatiile inainte de sosire.
              </p>
            </div>
            <div className={seo.featureItem}>
              <div className={seo.imageFrame}>
                <Image
                  src="/ch-rv-ms.png"
                  alt="Portal de mesaje pentru oaspeti"
                  width={900}
                  height={700}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p className={seo.featureCaption}>
                Mesajele traiesc intr-un singur flux pentru oaspeti, nu improvizat rezervare cu rezervare.
              </p>
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="cand-nu">
          <div className={seo.articleSplit}>
            <div className={seo.articleSectionTight}>
              <h2 id="cand-nu" className={seo.h2}>
                Cand alt tool poate fi mai potrivit
              </h2>
              <p className={seo.p}>
                Daca business-ul tau depinde de <strong>sync API in timp real</strong>, <strong>preturi automate</strong>, <strong>restrictii avansate</strong> sau procese mari de hotel, un tool mai greu poate fi pur si simplu mai potrivit.
              </p>
              <p className={seo.p}>
                Asta nu inseamna ca Plan4Host este slab. Inseamna doar ca produsul trebuie descris pentru munca pe care o face bine in realitate.
              </p>
            </div>
            <div className={seo.imageFrame}>
              <Image
                src="/problem_multiple_booking.png"
                alt="Complexitate operationala intre platforme"
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
              Nota finala
            </h2>
            <p className={seo.p}>
              Modul corect de a descrie Plan4Host este direct: <strong>o platforma practica de operare pentru gazde care vor un calendar unificat, un flux structurat pentru oaspeti si mai putin haos zilnic</strong>.
            </p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/ro/cum-functioneaza-plan4host-cu-airbnb-si-booking">
                Vezi cum functioneaza
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro/asistent-ai-oaspeti">
                Vezi asistentul AI
              </Link>
            </div>
          </div>
        </section>
      </article>

      <SeoFooter lang="ro" />
      <SeoStructuredData
        lang="ro"
        path="/ro/pentru-cine-este-plan4host"
        title="Pentru cine este Plan4Host | Plan4Host"
        description="Vezi pentru cine este proiectat Plan4Host, unde se potriveste cel mai bine si cand un channel manager mai greu poate fi alegerea mai buna."
        image="/who_benefit.png"
        faq={faq}
      />
    </main>
  );
}
