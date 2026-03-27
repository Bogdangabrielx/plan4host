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
  title: "Cum functioneaza Plan4Host cu Airbnb si Booking | Plan4Host",
  description:
    "O explicatie clara despre cum functioneaza Plan4Host cu Airbnb si Booking prin iCal sync, si cum adauga check-in online, mesaje pentru oaspeti si operare mai organizata.",
  alternates: {
    canonical: "/ro/cum-functioneaza-plan4host-cu-airbnb-si-booking",
    languages: {
      ro: "/ro/cum-functioneaza-plan4host-cu-airbnb-si-booking",
      en: "/how-plan4host-works-with-airbnb-and-booking",
    },
  },
  openGraph: {
    title: "Cum functioneaza Plan4Host cu Airbnb si Booking | Plan4Host",
    description:
      "Vezi cum functioneaza Plan4Host cu Airbnb si Booking prin iCal sync, apoi cum organizeaza check-in-ul, mesajele pentru oaspeti si operarea zilnica.",
    url: "/ro/cum-functioneaza-plan4host-cu-airbnb-si-booking",
    locale: "ro_RO",
    type: "article",
  },
};

export default function CumFunctioneazaPlan4HostPage() {
  const faq = [
    {
      q: "Plan4Host foloseste API oficial de la Airbnb si Booking?",
      a: "Nu. Plan4Host functioneaza cu Airbnb si Booking prin sincronizare iCal.",
    },
    {
      q: "Poate sincroniza preturi si restrictii?",
      a: "Nu. iCal este folosit pentru rezervari, blocari si fluxul de disponibilitate, nu pentru automatizare de pret sau restrictii avansate.",
    },
    {
      q: "Ce se intampla dupa ce rezervarile intra in Plan4Host?",
      a: "Ele apar intr-un singur calendar si pot sustine apoi check-in online, comunicarea cu oaspetii si fluxul de curatenie.",
    },
    {
      q: "Pentru cine este potrivit acest setup?",
      a: "Este potrivit pentru operatiuni mici si medii de inchiriere pe termen scurt care vor un sistem calm pentru munca zilnica, fara costul unui channel manager greu.",
    },
  ];

  return (
    <main
      className={`${styles.landing} ${seoMontserrat.className}`}
      style={{
        paddingBottom: "var(--safe-bottom, 0px)",
        minHeight: "100dvh",
        overflowX: "hidden",
        fontFamily: seoMontserrat.style.fontFamily,
      }}
    >
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
            Cum functioneaza Plan4Host cu Airbnb si Booking
          </h1>
          <p className={`${styles.heroKicker} ${seo.seoHeroIntro}`} style={{ maxWidth: 72 * 10 }}>
            <strong>Plan4Host</strong> se conecteaza cu <strong>Airbnb</strong> si <strong>Booking.com</strong> prin <strong>iCal sync</strong>. Aduce rezervarile intr-un singur sistem calm, apoi ajuta cu <strong>check-in online</strong>, <strong>mesaje pentru oaspeti</strong> si <strong>operare zilnica</strong> dintr-un singur loc.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/ro/calendar-rezervari-unificat">
              Vezi calendarul unificat
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro/mesaje-automate-pentru-oaspeti">
              Vezi mesajele pentru oaspeti
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Preview calendar Plan4Host" data-p4h-reveal>
          <Image
            src="/Hero_device2.png"
            alt="Calendarul de rezervari din Plan4Host"
            width={900}
            height={900}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
            priority
          />
        </div>
      </section>

      <article className={seo.article}>
        <section className={seo.articleSection} aria-labelledby="ce-inseamna">
          <div className={seo.articleSplit}>
            <div className={seo.imageFrame}>
              <Image
                src="/what_unified_booking.png"
                alt="Vedere calendar rezervari unificat"
                width={1200}
                height={900}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
            <div className={seo.articleSectionTight}>
              <h2 id="ce-inseamna" className={seo.h2}>
                Ce inseamna asta in practica
              </h2>
              <p className={seo.p}>
                Plan4Host <strong>nu este pozitionat ca un channel manager API complet</strong>. Baza este mai simpla: aduce rezervarile din platforme intr-un <strong>calendar unificat</strong> si foloseste acel calendar ca punct de plecare pentru restul fluxului cu oaspetii.
              </p>
              <p className={seo.p}>
                In munca de zi cu zi, asta conteaza pentru ca nu mai sari intre tab-uri ca sa intelegi cine vine, cine pleaca si ce mai trebuie facut.
              </p>
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="ce-acopera">
          <h2 id="ce-acopera" className={seo.h2}>
            Ce acopera sincronizarea iCal
          </h2>
          <p className={seo.p}>
            In Plan4Host, <strong>iCal sync</strong> este folosit ca sa aduca timing-ul rezervarilor in sistem si sa tina disponibilitatea mai organizata intre platforme.
          </p>
          <ul className={styles.includedList} style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}>
            <li>import rezervari si date blocate</li>
            <li>afisare intr-un singur calendar per unitate</li>
            <li>mai putin control manual intre Airbnb si Booking</li>
            <li>baza pentru check-in online si comunicare cu oaspetii</li>
          </ul>
          <p className={seo.p}>
            Nu promite <strong>automatizare de pret</strong>, <strong>restrictii avansate</strong> sau tot pachetul unui channel manager greu. Diferenta asta trebuie explicata clar public.
          </p>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="de-ce">
          <h2 id="de-ce" className={seo.h2}>
            De ce totusi il folosesc gazdele
          </h2>
          <p className={seo.p}>
            Gazdele aleg Plan4Host pentru ca valoarea nu este doar “sync”. Valoarea reala este <strong>ce se intampla dupa ce rezervarea intra in sistem</strong>.
          </p>
          <div className={seo.featureRow}>
            <div className={seo.featureItem}>
              <div className={seo.imageFrame}>
                <Image
                  src="/centralized_en.png"
                  alt="Rezervari centralizate si flux pentru oaspeti"
                  width={900}
                  height={700}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p className={seo.featureCaption}>
                Rezervarile din surse diferite sunt mai usor de citit cand ajung intr-o vedere organizata.
              </p>
            </div>
            <div className={seo.featureItem}>
              <div className={seo.imageFrame}>
                <Image
                  src="/right_moment_en.png"
                  alt="Mesaje trimise la momentul potrivit"
                  width={900}
                  height={700}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p className={seo.featureCaption}>
                Dupa ce rezervarea este vizibila, comunicarea cu oaspetele poate fi livrata la momentul potrivit, nu manual.
              </p>
            </div>
            <div className={seo.featureItem}>
              <div className={seo.imageFrame}>
                <Image
                  src="/Checkin_mok2.png"
                  alt="Check-in online in Plan4Host"
                  width={900}
                  height={700}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <p className={seo.featureCaption}>
                Check-in-ul online transforma o rezervare intr-un flux structurat pentru oaspeti, nu doar intr-un eveniment in calendar.
              </p>
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="pentru-cine">
          <div className={seo.articleSplit}>
            <div className={seo.articleSectionTight}>
              <h2 id="pentru-cine" className={seo.h2}>
                Pentru cine se potriveste cel mai bine
              </h2>
              <p className={seo.p}>
                Plan4Host se potriveste cel mai bine cand vrei un <strong>sistem clar de operare</strong> pentru rezervari, informatii pentru oaspeti si coordonare zilnica — fara costul unui channel manager mare.
              </p>
              <ul className={styles.includedList} style={{ ["--success" as never]: "color-mix(in srgb, var(--text) 46%, white)" }}>
                <li>una sau mai multe proprietati mici</li>
                <li>gazde sau manageri fara receptie permanenta</li>
                <li>echipe care vor operare calma, nu functii complexe de revenue</li>
                <li>gazde care vor calendar, check-in si mesaje intr-un singur loc</li>
              </ul>
            </div>
            <div className={seo.imageFrame}>
              <Image
                src="/who_benefit.png"
                alt="Pentru cine este potrivit Plan4Host"
                width={1200}
                height={900}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </section>

        <div className={seo.articleRule} />

        <section className={seo.articleSection} aria-labelledby="cand-nu">
          <h2 id="cand-nu" className={seo.h2}>
            Cand nu este alegerea potrivita
          </h2>
          <p className={seo.p}>
            Daca ai nevoie de <strong>sync API in timp real</strong>, <strong>preturi automate</strong> sau un setup complet de channel manager enterprise, Plan4Host nu trebuie prezentat ca acel produs.
          </p>
          <p className={seo.p}>
            Cu cat mesajul public este mai clar, cu atat si Google si sistemele AI vor descrie platforma mai corect.
          </p>
        </section>

        <section className={seo.articleSection} aria-labelledby="cta">
          <div className={`sb-cardglow ${seo.card}`}>
            <h2 id="cta" className={seo.h2}>
              Nota finala
            </h2>
            <p className={seo.p}>
              Pozitionarea onesta este simpla: <strong>Plan4Host este o platforma calma de operare pentru inchirieri pe termen scurt mici si medii</strong>, construita in jurul rezervarilor unificate, fluxului pentru oaspeti si muncii zilnice practice.
            </p>
            <div className={seo.ctaRow}>
              <Link className={`${styles.btn} ${styles.btnSolid}`} href="/ro/check-in-online-cazare">
                Vezi check-in online
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro/pentru-cine-este-plan4host">
                Vezi pentru cine este Plan4Host
              </Link>
            </div>
          </div>
        </section>
      </article>

      <SeoFooter lang="ro" />
      <SeoStructuredData
        lang="ro"
        path="/ro/cum-functioneaza-plan4host-cu-airbnb-si-booking"
        title="Cum functioneaza Plan4Host cu Airbnb si Booking | Plan4Host"
        description="O explicatie clara despre cum functioneaza Plan4Host cu Airbnb si Booking prin iCal sync, si cum adauga check-in online, mesaje pentru oaspeti si operare mai organizata."
        image="/Hero_device2.png"
        faq={faq}
      />
    </main>
  );
}
