import type { Metadata } from "next";
import s from "../legal/legal.module.css";
import ForceDark from "@/components/theme/ForceDark";

export const metadata: Metadata = {
  title: "About — Plan4Host",
  description: "About Plan4Host. Work in progress.",
};

export default function AboutPage() {
  const lastUpdated = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });
  return (
    <main className={s.page}>
      <ForceDark />
      <div className={s.container}>
        <header className={s.header}>
          <h1 className={s.h1}>About us</h1>
          <p className={s.meta}>Last updated: {lastUpdated}</p>
        </header>

        <section>
          <p className={s.p}>
            This page is a work in progress. We’re preparing a short story about how Plan4Host started and where we’re going.
          </p>
          <p className={s.p}>
            Need anything meanwhile? Reach out at {" "}
            <a className={s.link} href="mailto:office@plan4host.com">office@plan4host.com</a>{" "}
            or message us on WhatsApp: {" "}
            <a className={s.link} href="https://wa.me/40721759329" target="_blank" rel="noopener noreferrer">+40 721 759 329</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
