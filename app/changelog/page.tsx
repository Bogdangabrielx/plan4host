import type { Metadata } from "next";
import s from "../legal/legal.module.css";

export const metadata: Metadata = {
  title: "Changelog — Plan4host",
  description: "Latest changes and releases for Plan4Host.",
};

export default function ChangelogPage() {
  const lastUpdated = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });
  return (
    <main className={s.page}>
      <div className={s.container}>
        <header className={s.header}>
          <h1 className={s.h1}>Changelog</h1>
          <p className={s.meta}>Last updated: {lastUpdated}</p>
        </header>

        <section>
          <p className={s.p}>
            There are no public changes to announce at the moment. Check back soon for updates.
          </p>
        </section>
      </div>
    </main>
  );
}

