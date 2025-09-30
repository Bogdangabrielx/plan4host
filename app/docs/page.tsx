import type { Metadata } from "next";
import s from "../legal/legal.module.css";
import ForceDark from "@/components/theme/ForceDark";

export const metadata: Metadata = {
  title: "Docs — Plan4Host",
  description: "Documentation for Plan4Host.",
};

export default function DocsPage() {
  const lastUpdated = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });
  return (
    <main className={s.page}>
      <ForceDark />
      <div className={s.container}>
        <header className={s.header}>
          <h1 className={s.h1}>Documentation</h1>
          <p className={s.meta}>Last updated: {lastUpdated}</p>
        </header>

        <section>
          <p className={s.p}>
            Documentation is currently being prepared. Please check back soon.
          </p>
        </section>
      </div>
    </main>
  );
}
