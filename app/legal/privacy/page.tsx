// /app/legal/privacy/page.tsx
import type { Metadata } from "next";
import s from "../legal.module.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Plan4Host",
  description:
    "Privacy Policy for plan4host.com operated by BOA DIGITAL SOLUTIONS SRL. Learn what data we collect, why, and how to exercise your rights under GDPR.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "25 September 2025";

  return (
    <main className={s.page}>
      <div className={s.container}>
        <header className={s.header}>
          <h1 className={s.h1}>Privacy Policy</h1>
          <p className={s.meta}>Last updated: {lastUpdated}</p>
        </header>

        <section>
          <p className={s.p}>
            This Privacy Policy explains how <strong>Plan4Host</strong> (operated by{" "}
            <strong>BOA DIGITAL SOLUTIONS SRL</strong>) (“we”, “us”) collects and uses your
            personal data on <strong>plan4host.com</strong> and <strong>www.plan4host.com</strong>
            (the “Website”) and within our application (after login). We comply with the EU General
            Data Protection Regulation (GDPR).
          </p>

          <h2 className={s.h2}>1. Controller & contact</h2>
          <p className={s.p}>
            Data controller: <strong>BOA DIGITAL SOLUTIONS S.R.L.</strong>, CIF/CUI <strong>51680505</strong>.
            Registered office: <strong>BUZĂU, Mun. Buzău, Str. Pietroasele 24, Romania</strong>. For privacy
            questions or rights requests, contact{" "}
            <a className={s.link} href="mailto:office@plan4host.com">office@plan4host.com</a>.
          </p>

          <h2 className={s.h2}>2. What data we collect</h2>
          <ul className={s.list}>
            <li className={s.p}><strong>Account data</strong>: email address, password (hash only, never plaintext), profile details you provide (e.g., display name), organization/property information.</li>
            <li className={s.p}><strong>Authentication/session data</strong>: session tokens handled by Supabase (HTTP-only cookies), login timestamps, basic security logs.</li>
            <li className={s.p}><strong>Billing & subscription data</strong>: plan, subscription status, invoices and payment identifiers. Card data is processed by <em>Stripe</em>; we do not store full card numbers.</li>
            <li className={s.p}><strong>Usage & logs</strong>: server logs (IP address, timestamps, user agent), application events (e.g., iCal import/export jobs) for security and troubleshooting.</li>
            <li className={s.p}><strong>Communications</strong>: messages you send to <a className={s.link} href="mailto:office@plan4host.com">office@plan4host.com</a>.</li>
            <li className={s.p}><strong>Cookies & similar</strong>: see our <Link className={s.link} href="/legal/cookies">Cookie Policy</Link> for details.</li>
          </ul>

          <h2 className={s.h2}>3. Why we process your data (purposes)</h2>
          <ul className={s.list}>
            <li className={s.p}><strong>Provide and operate the service</strong> (accounts, calendar, iCal sync, billing).</li>
            <li className={s.p}><strong>Authenticate and secure access</strong>, prevent fraud/abuse, maintain reliability.</li>
            <li className={s.p}><strong>Customer support & communications</strong> you initiate.</li>
            <li className={s.p}><strong>Legal compliance</strong> (tax/accounting, regulatory obligations).</li>
            <li className={s.p}><strong>Improvements</strong> (troubleshooting, quality, performance). We currently do <em>not</em> use analytics or advertising cookies.</li>
          </ul>

          <h2 className={s.h2}>4. Legal bases (GDPR Art. 6)</h2>
          <ul className={s.list}>
            <li className={s.p}><strong>Contract</strong> — to provide the service you requested (Art. 6(1)(b)).</li>
            <li className={s.p}><strong>Legitimate interests</strong> — security, fraud prevention, service reliability and improvement (Art. 6(1)(f)).</li>
            <li className={s.p}><strong>Legal obligation</strong> — e.g., tax and accounting records (Art. 6(1)(c)).</li>
            <li className={s.p}><strong>Consent</strong> — for any future non-essential cookies or optional communications (Art. 6(1)(a)).</li>
          </ul>

          <h2 className={s.h2}>5. Sharing & processors</h2>
          <p className={s.p}>We use vetted service providers (“processors”) to run Plan4Host:</p>
          <div className={s.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Role</th>
                  <th>Data categories</th>
                  <th>Location/Transfer</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Supabase</td>
                  <td>Authentication, database, storage</td>
                  <td>Account data, session tokens, app data</td>
                  <td>EU/EEA regions where available; may involve transfers with safeguards (SCCs)</td>
                </tr>
                <tr>
                  <td>Vercel</td>
                  <td>Hosting and edge delivery</td>
                  <td>Usage logs (IP, UA), content delivery</td>
                  <td>Global infrastructure; transfers protected by SCCs</td>
                </tr>
                <tr>
                  <td>Stripe</td>
                  <td>Payments & subscriptions</td>
                  <td>Billing identifiers, invoices; card data processed by Stripe</td>
                  <td>Global infrastructure; transfers protected by SCCs and other safeguards</td>
                </tr>
                <tr>
                  <td>Microsoft 365 (via GoDaddy)</td>
                  <td>Email service</td>
                  <td>Support communications</td>
                  <td>Global infrastructure; transfers protected by SCCs</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={`${s.p} ${s.muted}`}>
            We do not sell your personal data. We currently do not use analytics or advertising networks.
          </p>

          <h2 className={s.h2}>6. International transfers</h2>
          <p className={s.p}>
            When data is transferred outside the EU/EEA by our processors, we rely on appropriate safeguards
            such as the European Commission’s Standard Contractual Clauses (SCCs) and complementary measures where necessary.
          </p>

          <h2 className={s.h2}>7. Retention</h2>
          <ul className={s.list}>
            <li className={s.p}><strong>Account data</strong>: for the life of your account and up to 24 months after closure, unless we must retain it to meet legal obligations or resolve disputes.</li>
            <li className={s.p}><strong>Billing records</strong>: retained for statutory periods required by tax/accounting laws (typically 5–10 years).</li>
            <li className={s.p}><strong>Support communications</strong>: typically up to 24 months.</li>
            <li className={s.p}><strong>Routine server logs</strong>: typically up to 90 days unless needed for security investigations.</li>
          </ul>

          <h2 className={s.h2}>8. Security</h2>
          <p className={s.p}>
            We implement technical and organizational measures including TLS encryption in transit, encryption at rest provided by our cloud providers, access controls, and least-privilege practices. No method of transmission or storage is 100% secure, but we work to protect your data.
          </p>

          <h2 className={s.h2}>9. Your rights</h2>
          <ul className={s.list}>
            <li className={s.p}>Access your data and obtain a copy.</li>
            <li className={s.p}>Rectify inaccurate or incomplete data.</li>
            <li className={s.p}>Erase your data (“right to be forgotten”).</li>
            <li className={s.p}>Restrict or object to processing in certain cases.</li>
            <li className={s.p}>Data portability.</li>
            <li className={s.p}>Withdraw consent at any time for processing based on consent.</li>
            <li className={s.p}>Lodge a complaint with your local supervisory authority (EU/EEA).</li>
          </ul>
          <div className={s.card} style={{ marginTop: 8 }}>
            <p className={s.p} style={{ margin: 0 }}>
              To exercise your rights, contact{" "}
              <a className={s.link} href="mailto:office@plan4host.com">office@plan4host.com</a>.
              We may need to verify your identity before fulfilling your request.
            </p>
          </div>

          <h2 className={s.h2}>10. Children</h2>
          <p className={s.p}>The service is not directed to children under 16. If you believe a child provided us with personal data, contact us and we will take appropriate steps.</p>

          <h2 className={s.h2}>11. Automated decision-making</h2>
          <p className={s.p}>We do not perform automated decision-making or profiling that produces legal effects about you.</p>

          <h2 className={s.h2}>12. Cookies</h2>
          <p className={s.p}>
            For details about cookies we use, see our{" "}
            <Link className={s.link} href="/legal/cookies">Cookie Policy</Link>.
          </p>

          <h2 className={s.h2}>13. Changes to this policy</h2>
          <p className={s.p}>We may update this Privacy Policy to reflect operational, legal, or regulatory changes. We encourage you to review it periodically.</p>

          <h2 className={s.h2}>14. Contact</h2>
          <p className={s.p}>
            For questions about this policy or your privacy rights, contact{" "}
            <a className={s.link} href="mailto:office@plan4host.com">office@plan4host.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
