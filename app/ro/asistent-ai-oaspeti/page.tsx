import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LandingSafeArea from "@/components/landing/LandingSafeArea";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import SeoFooter from "@/components/seo/SeoFooter";
import styles from "../../home.module.css";
import seo from "../../seo.module.css";

export const metadata: Metadata = {
  title: "Asistent AI pentru oaspeti | Plan4Host",
  description:
    "Un asistent care ajuta oaspetii sa gaseasca rapid detalii despre sosire, facilitati si check-out, direct in portalul lor.",
  alternates: {
    canonical: "/ro/asistent-ai-oaspeti",
    languages: {
      en: "/guest-ai-assistant",
      ro: "/ro/asistent-ai-oaspeti",
    },
  },
  openGraph: {
    title: "Asistent AI pentru oaspeti | Plan4Host",
    description:
      "Raspunsuri clare pentru sosire, facilitati si check-out, folosind informatiile pe care le gestionezi deja in Plan4Host.",
    url: "/ro/asistent-ai-oaspeti",
    locale: "ro_RO",
    type: "article",
  },
};

export default function RoGuestAiAssistantPage() {
  return (
    <main
      className={styles.landing}
      style={{
        paddingBottom: "var(--safe-bottom, 0px)",
        minHeight: "100dvh",
        overflowX: "hidden",
      }}
    >
      <LandingSafeArea />
      <MobileScrollReveal />

      <nav className={styles.nav} aria-label="Navigare" data-p4h-landing-nav>
        <Link href="/ro" className={styles.brand}>
          <img src="/Logo_Landing.png" alt="" aria-hidden="true" width={36} height={36} style={{ borderRadius: 12 }} />
          <strong>Plan4Host</strong>
        </Link>
        <div />
        <div className={styles.actions}>
          <Link className={`${styles.btn} ${styles.btnOutline}`} href="/ro">
            Pagina acasa
          </Link>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="title">
        <div className={styles.heroText} data-p4h-reveal>
          <h1 id="title" className={styles.heroHeadline} style={{ margin: 0 }}>
            Asistent AI pentru oaspeti
          </h1>
          <p className={styles.heroKicker} style={{ maxWidth: 72 * 10 }}>
            Ofera raspunsuri rapide despre sosire, facilitati si plecare, direct in limba oaspetelui — fara mesaje
            repetitive.
          </p>
          <div className={styles.heroCta}>
            <Link className={`${styles.btn} ${styles.btnSolid}`} href="/guest-ai-assistant/demo">
              Vezi unde apar mesajele pentru oaspeti
            </Link>
            <Link
              className={`${styles.btn} ${styles.btnOutline}`}
              href="/checkin?property=b1588b40-954d-4489-b36e-45659853489a"
            >
              Vezi formularul de check-in
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Previzualizare asistent AI" data-p4h-reveal>
          <Image
            src="/AI_chatbot.png"
            alt="Previzualizare interfata asistent AI pentru oaspeti"
            width={900}
            height={900}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
            priority
          />
        </div>
      </section>

      <div className={seo.content}>
        <section className={seo.section} aria-labelledby="what">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Image
                src="/Logo_Rotund_AI.png"
                alt=""
                aria-hidden="true"
                width={44}
                height={44}
                style={{ borderRadius: 999, border: "1px solid var(--border)", background: "var(--card)" }}
              />
              <h2 id="what" className={seo.h2} style={{ margin: 0 }}>
                Ce este
              </h2>
            </div>
            <p className={seo.p}>
              Asistentul AI este un mic helper care apare in portalul oaspetelui. In loc sa scrie mesaje lungi,
              oaspetele apasa pe meniuri precum <strong>Detalii la sosire</strong>, <strong>Facilitati</strong>,{" "}
              <strong>Extra</strong> sau <strong>Check-out</strong> si primeste raspunsuri scurte si clare.
            </p>
            <p className={seo.p}>
              Foloseste informatiile pe care le gestionezi deja in Plan4Host: mesajele de rezervare, PDF-ul cu
              regulamentul si textul „house rules for AI” pregatit in Check-in Editor.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="answers">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="answers" className={seo.h2}>
              La ce poate raspunde
            </h2>
            <ul className={styles.includedList}>
              <li>
                <strong>Detalii la sosire:</strong> parcare, coduri de acces, cum intri si ora de check-in.
              </li>
              <li>
                <strong>Facilitati:</strong> Wi-Fi, aparat de cafea, AC, masina de spalat, masina de spalat vase,
                minibar si altele.
              </li>
              <li>
                <strong>Recomandari:</strong> idei locale (cand sunt mentionate in continut).
              </li>
              <li>
                <strong>Check-out:</strong> ora si instructiuni (chei, usi, gunoi) daca sunt definite.
              </li>
            </ul>
            <p className={seo.p}>Fiecare raspuns se incheie cu o optiune clara de contactare a gazdei.</p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="examples">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="examples" className={seo.h2}>
              Cum arata in practica
            </h2>
            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                alignItems: "stretch",
              }}
            >
              <div className={`sb-cardglow ${seo.faqItem}`} style={{ background: "var(--card)" }}>
                <p className={seo.pStrong} style={{ margin: 0 }}>
                  Meniul de facilitati
                </p>
                <p className={seo.p}>
                  Oaspetii apasa Wi-Fi, aparat de cafea, AC si alte optiuni in loc sa trimita intrebari lungi.
                </p>
                <Image
                  src="/AI_chatbot_amenities.png"
                  alt="Meniu de facilitati in asistentul AI"
                  width={740}
                  height={740}
                  style={{
                    width: "100%",
                    height: "auto",
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                  }}
                />
              </div>
              <div className={`sb-cardglow ${seo.faqItem}`} style={{ background: "var(--card)" }}>
                <p className={seo.pStrong} style={{ margin: 0 }}>
                  Exemplu raspuns pentru Wi-Fi
                </p>
                <p className={seo.p}>
                  Asistentul combina numele retelei (SSID) si parola pe care le-ai scris, intr-un singur raspuns clar —
                  fara sa inventeze date.
                </p>
                <Image
                  src="/AI_chatbot_example.png"
                  alt="Exemplu de raspuns Wi-Fi in asistentul AI"
                  width={740}
                  height={740}
                  style={{
                    width: "100%",
                    height: "auto",
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="sources">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="sources" className={seo.h2}>
              De unde are informatiile
            </h2>
            <p className={seo.p}>Asistentul nu ghiceste. Foloseste doar ce ai introdus deja:</p>
            <ul className={styles.includedList}>
              <li>
                <strong>Mesaje de rezervare</strong> (RO/EN) in portalul oaspetelui.
              </li>
              <li>
                <strong>PDF cu regulamentul</strong> incarcat in Check-in Editor.
              </li>
              <li>
                <strong>Textul „house rules for AI”</strong> salvat dupa „Read &amp; prepare text for AI”.
              </li>
            </ul>
            <p className={seo.p}>
              Daca lipseste o informatie, asistentul spune ca nu este clar si invita oaspetele sa contacteze gazda — nu
              inventeaza nimic.
            </p>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="safe">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="safe" className={seo.h2}>
              Siguranta: fara coduri sau parole inventate
            </h2>
            <p className={seo.p}>Asistentul este instruit sa nu inventeze date sensibile:</p>
            <ul className={styles.includedList}>
              <li>nu genereaza coduri de acces sau combinatii</li>
              <li>nu inventeaza nume de retea Wi-Fi sau parole</li>
              <li>nu inventeaza numere de telefon, adrese sau ore de check-in/out</li>
            </ul>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="enable">
          <div className={`sb-cardglow ${seo.card}`} data-p4h-reveal>
            <h2 id="enable" className={seo.h2}>
              Cum il activezi
            </h2>
            <ol className={seo.steps}>
              <li>
                Incarca PDF-ul cu regulamentul in <strong>Check-in Editor</strong>.
              </li>
              <li>
                Foloseste <strong>Read &amp; prepare text for AI</strong>, apoi sterge coduri, parole sau linkuri
                private pe care nu vrei sa le afisezi.
              </li>
              <li>
                Salveaza textul ca „house rules for AI”. Asistentul il va folosi impreuna cu mesajele de rezervare.
              </li>
              <li>Oaspetii vor vedea asistentul in portalul lor.</li>
            </ol>
          </div>
        </section>

        <section className={seo.section} aria-labelledby="premium">
          <div
            className={`sb-cardglow ${seo.card}`}
            data-p4h-reveal
            style={{
              background:
                "radial-gradient(36rem 24rem at 0% 0%, color-mix(in srgb, var(--accent1) 10%, transparent), transparent 62%), radial-gradient(36rem 24rem at 100% 100%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 62%), var(--card)",
            }}
          >
            <h2 id="premium" className={seo.h2}>
              Disponibil pe Premium
            </h2>
            <p className={seo.p}>
              Asistentul AI este disponibil pentru conturile <strong>Premium</strong>. Il poti activa pentru a reduce
              intrebarile repetitive si pentru a oferi raspunsuri clare oaspetilor.
            </p>
            <div className={seo.ctaRow}>
              <Link
                className={`${styles.btn} ${styles.btnSolid}`}
                href="/auth/login?mode=signup&plan=premium&next=%2Fapp%2Fsubscription%3Fplan%3Dpremium%26hl%3D1"
              >
                Activeaza Premium
              </Link>
              <Link className={`${styles.btn} ${styles.btnOutline}`} href="/guest-ai-assistant/demo">
                Previzualizeaza portalul
              </Link>
            </div>
          </div>
        </section>
      </div>

      <SeoFooter lang="ro" />
    </main>
  );
}
