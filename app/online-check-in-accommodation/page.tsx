import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Online check-in for accommodation | Plan4Host",
  description:
    "Understand what online check-in means for guests, why manual check-in is stressful, and how Plan4Host simplifies the process for hosts.",
  alternates: {
    canonical: "/online-check-in-accommodation",
    languages: {
      en: "/online-check-in-accommodation",
      ro: "/ro/check-in-online-cazare",
    },
  },
};

export default function OnlineCheckInAccommodationPage() {
  const faq = [
    {
      question: "Does online check-in replace in-person check-in?",
      answer:
        "Not necessarily. Online check-in helps you collect guest details and confirmations before arrival. If you still meet guests or verify details on-site, you can keep that flow.",
    },
    {
      question: "What do guests need to do?",
      answer:
        "Guests open one link, complete the form, read and accept house rules (if you enabled them), and receive a confirmation that the check-in is completed.",
    },
    {
      question: "Will it reduce guest messages?",
      answer:
        "Yes. When guests have one place for arrival details and required steps, you avoid repeated questions and back-and-forth right before arrival.",
    },
    {
      question: "Is it hard for guests?",
      answer:
        "No. The goal is a short, clear form that works on mobile. Guests complete it in minutes, before they arrive.",
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
      <h1>Online check-in for accommodation</h1>
      <p>
        Online check-in means guests can submit their details before arrival, without back-and-forth messages. Instead
        of collecting information manually, you use a simple, repeatable flow. For hosts, this reduces stress and makes
        arrivals more predictable.
      </p>

      <h2>What online check-in means for guests</h2>
      <p>
        For guests, online check-in is a single page where they complete the required information ahead of time. This
        can include identification details, contact information, and confirmation of house rules. The important part is
        clarity: one link, one place, one completion step.
      </p>

      <h2>Problems with classic check-in</h2>
      <p>Manual check-in becomes stressful for the same reasons, over and over:</p>
      <ul>
        <li>Repeated questions from guests before arrival</li>
        <li>Details sent in multiple messages, often incomplete</li>
        <li>No clear confirmation that rules were read</li>
        <li>Time wasted copying information between platforms</li>
        <li>Urgent requests on arrival day, when you are already busy</li>
      </ul>

      <h2>How online check-in works with Plan4Host</h2>
      <p>Plan4Host helps you collect guest details without manual messaging. The flow is simple:</p>
      <p>
        <strong>invited</strong> → <strong>form</strong> → <strong>confirmation</strong> → <strong>arrival</strong>
      </p>
      <p>
        You share one check-in link, the guest completes the form, and you receive a clear confirmation. From there,
        arrivals run smoother because the needed details are already organized.
      </p>

      <h2>What the guest sees (form, rules, confirmation)</h2>
      <p>The guest experience is designed to be calm and clear:</p>
      <ul>
        <li>A check-in form with the required fields</li>
        <li>House rules they can read and accept (if enabled)</li>
        <li>A confirmation after submission, so they know the step is completed</li>
      </ul>

      <h2>Who benefits the most</h2>
      <ul>
        <li>Hosts who receive many repetitive questions</li>
        <li>Properties with self check-in or flexible arrival</li>
        <li>Small teams coordinating arrivals and cleaning</li>
        <li>Hosts managing multiple units or back-to-back stays</li>
      </ul>

      <h2>Frequently asked questions</h2>
      {faq.map((item) => (
        <div key={item.question} style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{item.question}</p>
          <p style={{ margin: "6px 0 0" }}>{item.answer}</p>
        </div>
      ))}

      <p style={{ marginTop: 28 }}>
        If you want a calm, practical way to reduce manual messages and keep check-in predictable, start by seeing how
        the flow looks for your guests.
      </p>
      <p>
        <Link href="/">See how online check-in works</Link>
        {" · "}
        <Link href="/">Discover the guest experience</Link>
      </p>

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </main>
  );
}

