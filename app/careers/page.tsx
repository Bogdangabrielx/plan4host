import type { Metadata } from "next";
import s from "../legal/legal.module.css";
import ForceDark from "@/components/theme/ForceDark";

export const metadata: Metadata = {
  title: "Careers — Plan4host",
  description: "Work with Plan4Host.",
};

export default function CareersPage() {
  const lastUpdated = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });
  return (
    <main className={s.page}>
      <ForceDark />
      <div className={s.container}>
        <header className={s.header}>
          <h1 className={s.h1}>Careers</h1>
          <p className={s.meta}>Last updated: {lastUpdated}</p>
        </header>

        <section>
          <p className={s.p}>
            We currently don’t have open positions. Please check this page periodically for updates,
            or send us an email at <a className={s.link} href="mailto:office@plan4host.com">office@plan4host.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
