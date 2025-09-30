import type { Metadata } from "next";
import s from "../legal/legal.module.css";
import ForceDark from "@/components/theme/ForceDark";

export const metadata: Metadata = {
  title: "Partners — Plan4Host",
  description: "Partners and collaborations for Plan4Host.",
};

export default function PartnersPage() {
  const lastUpdated = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });
  return (
    <main className={s.page}>
      <ForceDark />
      <div className={s.container}>
        <header className={s.header}>
          <h1 className={s.h1}>Partners</h1>
          <p className={s.meta}>Last updated: {lastUpdated}</p>
        </header>

        <section>
          <p className={s.p}>
            We do not have formal partnerships to announce at this time.
          </p>
          <p className={s.p}>
            Plan4Host helps small hotels and property managers run smoother operations
            with an adaptive calendar, simple property setup, and powerful team workflows.
            Our goal is to keep things fast, reliable, and easy to use. Built with care for
            clarity and performance, Plan4Host focuses on the tools you actually use every day:
            calendars, cleaning, guest overview and iCal synchronization that just works.
          </p>
          <div className={s.card}>
            <p className={s.p} style={{ margin: 0 }}>
              Plan4Host is developed by <strong>BOA DIGITAL SOLUTIONS S.R.L.</strong>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
