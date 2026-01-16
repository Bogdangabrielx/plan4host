import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Check-in online cazare | Plan4Host",
  description:
    "Afla ce inseamna check-in online pentru oaspeti, de ce check-in-ul manual este stresant si cum Plan4Host simplifica tot procesul pentru gazde.",
  alternates: {
    canonical: "/ro/check-in-online-cazare",
    languages: {
      ro: "/ro/check-in-online-cazare",
      en: "/online-check-in-accommodation",
    },
  },
};

export default function CheckInOnlineCazarePage() {
  const faq = [
    {
      question: "Check-in online inlocuieste check-in-ul fizic?",
      answer:
        "Nu neaparat. Check-in-ul online te ajuta sa colectezi datele si confirmarile inainte de sosire. Daca ai receptie sau verificari la fata locului, le poti pastra.",
    },
    {
      question: "Ce trebuie sa faca oaspetele?",
      answer:
        "Oaspetele deschide un link, completeaza formularul, citeste si accepta regulile (daca sunt active), apoi primeste o confirmare ca a finalizat check-in-ul.",
    },
    {
      question: "Reduce mesajele de la oaspeti?",
      answer:
        "Da. Cand oaspetele are un singur loc pentru pasii necesari si informatiile importante, scade numarul de intrebari repetate inainte de sosire.",
    },
    {
      question: "Este greu pentru oaspeti?",
      answer:
        "Nu. Ideea este un formular scurt, clar, care functioneaza bine pe telefon. De obicei se completeaza in cateva minute, inainte de sosire.",
    },
    {
      question: "Ce se intampla daca un oaspete nu completeaza?",
      answer:
        "Ai un reper clar: stii cine a completat si cine nu. In loc sa cauti prin conversatii, poti trimite o reamintire punctuala cu acelasi link.",
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 20px" }}>
      <h1>Check-in online pentru cazari</h1>
      <p>
        Check-in-ul online inseamna ca oaspetii iti trimit datele necesare inainte de sosire, fara mesaje in lant. In
        loc sa colectezi informatii manual, folosesti un flux clar si repetabil. Pentru gazde, asta inseamna mai putin
        stres si mai multa predictibilitate.
      </p>

      <h2>Ce inseamna check-in online pentru oaspeti</h2>
      <p>
        Pentru oaspete, check-in online inseamna o pagina simpla unde completeaza informatiile cerute inainte de sosire.
        De obicei include date de identificare, date de contact si confirmarea regulilor proprietatii. Important este sa
        fie clar: un link, un loc, un pas final de confirmare.
      </p>

      <h2>Problemele check-in-ului clasic</h2>
      <p>Check-in-ul manual devine stresant din aceleasi motive, aproape la fiecare rezervare:</p>
      <ul>
        <li>Oaspetii intreaba aceleasi lucruri inainte de sosire</li>
        <li>Date incomplete sau trimise pe bucati</li>
        <li>Lipsa unei confirmari clare ca regulile au fost citite</li>
        <li>Timp pierdut cu copiat informatii intre platforme</li>
        <li>Urgente in ziua sosirii, cand ai deja alte lucruri de facut</li>
      </ul>

      <h2>Cum functioneaza check-in-ul online cu Plan4Host</h2>
      <p>Plan4Host te ajuta sa colectezi datele oaspetilor fara mesaje manuale. Fluxul este simplu:</p>
      <p>
        <strong>invitat</strong> → <strong>formular</strong> → <strong>confirmare</strong> → <strong>sosire</strong>
      </p>
      <p>
        Trimiti un singur link de check-in, oaspetele completeaza formularul, iar tu primesti o confirmare clara. Din
        acel moment, sosirea este mai linistita, pentru ca informatiile sunt deja ordonate.
      </p>

      <h2>Ce vede oaspetele (form, reguli, confirmare)</h2>
      <p>Experienta oaspetelui este gandita sa fie calma si clara:</p>
      <ul>
        <li>Un formular de check-in cu campurile necesare</li>
        <li>Regulile proprietatii pe care le poate citi si accepta (daca sunt active)</li>
        <li>O confirmare dupa trimitere, ca sa stie ca a finalizat pasul</li>
      </ul>

      <h2>Cine beneficiaza cel mai mult</h2>
      <ul>
        <li>Gazde care primesc multe intrebari repetitive</li>
        <li>Proprietati cu self check-in sau sosiri flexibile</li>
        <li>Echipe mici care coordoneaza sosiri si curatenie</li>
        <li>Gazde cu mai multe unitati sau rezervari apropiate ca interval</li>
      </ul>

      <h2>Intrebari frecvente</h2>
      {faq.map((item) => (
        <div key={item.question} style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{item.question}</p>
          <p style={{ margin: "6px 0 0" }}>{item.answer}</p>
        </div>
      ))}

      <p style={{ marginTop: 28 }}>
        Daca vrei o varianta calma si practica pentru a reduce mesajele manuale si a face check-in-ul predictibil,
        incepe cu o privire la experienta oaspetelui.
      </p>
      <p>
        <Link href="/ro">Vezi cum functioneaza check-in-ul online</Link>
        {" · "}
        <Link href="/ro">Descopera experienta pentru oaspeti</Link>
      </p>

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </main>
  );
}

