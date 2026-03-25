type SeoLang = "en" | "ro";

export type SeoFaqItem = {
  q: string;
  a: string;
};

type SeoHowTo = {
  name: string;
  steps: string[];
};

function absoluteUrl(path: string) {
  return `https://www.plan4host.com${path}`;
}

function brandDescription(lang: SeoLang) {
  return lang === "ro"
    ? "Plan4Host este software pentru gazde si manageri de proprietati in regim hotelier. Aduna calendarul unificat, check-in-ul online, mesajele automate pentru oaspeti si asistentul AI pentru oaspeti intr-un singur loc."
    : "Plan4Host is software for short-term rental hosts and property managers. It combines a unified booking calendar, online check-in, automated guest messages, and a guest AI assistant in one place.";
}

function organizationJsonLd(lang: SeoLang) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Plan4Host",
    url: "https://www.plan4host.com",
    logo: "https://www.plan4host.com/Logo_Landing_AI.png",
    description: brandDescription(lang),
    foundingLocation: {
      "@type": "Place",
      name: "Bucharest, Romania",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bucharest",
      addressCountry: "RO",
    },
    areaServed: "Worldwide",
    sameAs: ["https://www.plan4host.com"],
  };
}

function softwareJsonLd(lang: SeoLang) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Plan4Host",
    url: "https://www.plan4host.com",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: lang,
    description: brandDescription(lang),
    publisher: {
      "@type": "Organization",
      name: "Plan4Host",
      url: "https://www.plan4host.com",
    },
  };
}

function webPageJsonLd({
  lang,
  path,
  title,
  description,
}: {
  lang: SeoLang;
  path: string;
  title: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: absoluteUrl(path),
    description,
    inLanguage: lang,
    isPartOf: {
      "@type": "WebSite",
      name: "Plan4Host",
      url: "https://www.plan4host.com",
    },
    about: {
      "@type": "SoftwareApplication",
      name: "Plan4Host",
      url: "https://www.plan4host.com",
    },
  };
}

function articleJsonLd({
  lang,
  path,
  title,
  description,
  image,
}: {
  lang: SeoLang;
  path: string;
  title: string;
  description: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    inLanguage: lang,
    mainEntityOfPage: absoluteUrl(path),
    image: absoluteUrl(image || "/Logo_Landing_AI.png"),
    author: {
      "@type": "Organization",
      name: "Plan4Host",
    },
    publisher: {
      "@type": "Organization",
      name: "Plan4Host",
      logo: {
        "@type": "ImageObject",
        url: "https://www.plan4host.com/Logo_Landing_AI.png",
      },
    },
  };
}

function faqJsonLd(faq: SeoFaqItem[]) {
  return {
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
}

function howToJsonLd(howTo: SeoHowTo) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: howTo.name,
    step: howTo.steps.map((step) => ({
      "@type": "HowToStep",
      name: step,
    })),
  };
}

export default function SeoStructuredData({
  lang,
  path,
  title,
  description,
  image,
  includeArticle = true,
  faq,
  howTo,
  customSchemas,
}: {
  lang: SeoLang;
  path: string;
  title: string;
  description: string;
  image?: string;
  includeArticle?: boolean;
  faq?: SeoFaqItem[];
  howTo?: SeoHowTo;
  customSchemas?: unknown[];
}) {
  const scripts = [
    organizationJsonLd(lang),
    softwareJsonLd(lang),
    webPageJsonLd({ lang, path, title, description }),
    ...(includeArticle ? [articleJsonLd({ lang, path, title, description, image })] : []),
    ...(faq?.length ? [faqJsonLd(faq)] : []),
    ...(howTo ? [howToJsonLd(howTo)] : []),
    ...(customSchemas ?? []),
  ];

  return (
    <>
      {scripts.map((data, index) => (
        <script
          key={`${path}-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  );
}
