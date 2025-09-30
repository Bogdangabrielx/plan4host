import type { Metadata } from "next";
import s from "../legal.module.css";
import ForceDark from "@/components/theme/ForceDark";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Data Processing Addendum — Plan4Host",
  description: "DPA (GDPR Art. 28) for Plan4Host as a processor.",
};

export default function DpaPage() {
  const lastUpdated = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });
  return (
    <main className={s.page}>
      <ForceDark />
      <div className={s.container}>
        <header className={s.header}>
          <h1 className={s.h1}>Data Processing Addendum (DPA)</h1>
          <p className={s.meta}>Last updated: {lastUpdated}</p>
        </header>

        <section>
          <p className={s.p}>
            This Data Processing Addendum ("DPA") forms part of the Terms of Service (the "Agreement") between
            the customer (the "Controller") and <strong>BOA DIGITAL SOLUTIONS S.R.L.</strong>, CIF/CUI 51680505,
            registered office: BUZĂU, Mun. Buzău, Str. Pietroasele 24, Romania ("Plan4Host", the "Processor").
            This DPA reflects the parties’ agreement with respect to Processing of Personal Data under GDPR Article 28.
          </p>

          <h2 className={s.h2}>1. Subject matter & duration</h2>
          <p className={s.p}>
            The Processor provides the Plan4Host service (calendar, iCal sync, property setup, team workflows) and processes
            Personal Data on behalf of the Controller for the duration of the Agreement and any post‑termination period
            required to delete or return data.
          </p>

          <h2 className={s.h2}>2. Nature & purpose of Processing</h2>
          <p className={s.p}>
            Hosting, storage, retrieval, structuring, and transmission as needed to operate the application; including iCal import/export,
            synchronization jobs, user management, billing and subscription management.
          </p>

          <h2 className={s.h2}>3. Categories of Data & Data Subjects</h2>
          <ul className={s.list}>
            <li className={s.p}><strong>Data Subjects</strong>: Controller’s staff and end‑customers/guests.</li>
            <li className={s.p}><strong>Personal Data</strong>: names, emails, reservation data (dates/room types), optional contact details provided by Controller, technical logs.</li>
            <li className={s.p}>No special categories are intended to be processed by the Service.</li>
          </ul>

          <h2 className={s.h2}>4. Controller instructions</h2>
          <p className={s.p}>
            The Processor will process Personal Data only on documented instructions from the Controller as set out in the Agreement,
            including this DPA and applicable feature configuration, unless required by law.
          </p>

          <h2 className={s.h2}>5. Confidentiality</h2>
          <p className={s.p}>
            The Processor ensures persons authorized to process Personal Data have committed to confidentiality obligations.
          </p>

          <h2 className={s.h2}>6. Security measures</h2>
          <p className={s.p}>
            Processor implements appropriate technical and organizational measures including TLS in transit, encryption at rest provided by
            cloud providers, access controls, least‑privilege, and separation of environments. See <Link className={s.link} href="/legal/privacy">Privacy Policy</Link>.
          </p>

          <h2 className={s.h2}>7. Sub‑processors</h2>
          <p className={s.p}>
            Controller authorizes use of sub‑processors necessary for the Service: Supabase (auth/db/storage), Vercel (hosting/edge),
            Stripe (payments), Microsoft 365 (email). Processor remains responsible for their performance and will impose data protection
            obligations at least as protective as this DPA. Processor will update this list as needed.
          </p>

          <h2 className={s.h2}>8. International transfers</h2>
          <p className={s.p}>
            Where sub‑processors transfer Personal Data outside the EU/EEA, they rely on appropriate safeguards such as Standard Contractual
            Clauses and complementary measures where required.
          </p>

          <h2 className={s.h2}>9. Data Subject Requests</h2>
          <p className={s.p}>
            Processor will assist Controller, insofar as possible, by appropriate technical and organizational measures, to fulfill requests
            from Data Subjects (access, rectification, erasure, restriction, portability, objection) forwarded by Controller.
          </p>

          <h2 className={s.h2}>10. Personal Data Breach</h2>
          <p className={s.p}>
            Processor will notify Controller without undue delay after becoming aware of a Personal Data Breach and provide available
            information to assist Controller in meeting its obligations.
          </p>

          <h2 className={s.h2}>11. Records & audits</h2>
          <p className={s.p}>
            Processor will make available information reasonably necessary to demonstrate compliance with Article 28 and allow for audits
            by Controller or its auditor upon reasonable notice and subject to confidentiality, without disrupting operations.
          </p>

          <h2 className={s.h2}>12. Return or deletion of data</h2>
          <p className={s.p}>
            Upon termination, Processor will delete Personal Data or return it to Controller upon request. Operational deletions occur promptly;
            residual backups are overwritten within up to 30 days, unless a longer retention is required by law.
          </p>

          <h2 className={s.h2}>13. Liability</h2>
          <p className={s.p}>
            Liability is governed by the Agreement. Nothing in this DPA limits the parties’ rights and obligations under GDPR.
          </p>

          <h2 className={s.h2}>14. Contact</h2>
          <p className={s.p}>
            For privacy matters related to this DPA, contact <a className={s.link} href="mailto:office@plan4host.com">office@plan4host.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
