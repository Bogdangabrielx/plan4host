// app/legal/cookies/page.tsx
import Link from "next/link";
import Script from "next/script";
import styles from "@/app/home.module.css";

export const metadata = {
  title: "Cookie Policy | Plan4host",
  description:
    "How Plan4host uses cookies and similar technologies, what they do, and how you can control your preferences.",
  robots: { index: true },
};

const LAST_UPDATED = "2025-09-01"; // update when content changes

export default function CookiePolicyPage() {
  return (
    <main className={styles.cookiePage}>
      {/* Hero */}
      <header className={styles.cookieHero} aria-labelledby="cp-title">
        <h1 id="cp-title">Cookie Policy</h1>
        <p className={styles.cookieLead}>
          We respect your privacy. <strong>Manage your consent here.</strong>
        </p>
        <div className={styles.cookieActions}>
          <button
            id="open-cookie-preferences"
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
          >
            Open cookie preferences
          </button>
          <span className={styles.cookieMeta}>Last updated: {LAST_UPDATED}</span>
        </div>
      </header>

      {/* Global notice about cookies */}
      <section className={styles.cookieCallout}>
        <p>
          This website uses cookies and similar technologies. Some are necessary for the proper
          functioning of the website (<strong>Essential</strong>). Others help us analyse usage,
          integrate external media, or support advertising. If you agree, these technologies are
          activated. For details, see our{" "}
          <Link className={styles.inlineLink} href="/legal/privacy">Privacy Policy</Link>. You can
          adjust your settings or withdraw your consent at any time in this Cookie Policy. If you do
          not give your consent, only essential cookies will be used.
        </p>
      </section>

      {/* US transfer notice */}
      <section className={styles.cookieCalloutAlt}>
        <p>
          <strong>Note on transfers to the USA:</strong> We may use technologies provided by US
          companies. If you consent, you also agree that your data may be transferred to the USA.
          The USA currently does not provide a data protection level comparable to the EU. US
          authorities may access your data without effective legal remedies for you. For details on
          tools used and international transfers, see our{" "}
          <Link className={styles.inlineLink} href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </section>

      {/* Why we use cookies */}
      <section>
        <h2>Why we use cookies</h2>
        <div className={styles.cookieGrid}>
          <article className={styles.cookieCard}>
            <h3>Strictly Necessary</h3>
            <p>Run core features such as sign-in, security, load balancing, and consent logging.</p>
          </article>
          <article className={styles.cookieCard}>
            <h3>Preferences</h3>
            <p>Remember your settings such as language, theme, and product options.</p>
          </article>
          <article className={styles.cookieCard}>
            <h3>Analytics</h3>
            <p>Measure usage (aggregated) to improve performance and product decisions.</p>
          </article>
          <article className={styles.cookieCard}>
            <h3>Marketing</h3>
            <p>Personalize content/ads and measure campaign performance (only with consent).</p>
          </article>
        </div>
      </section>

      {/* Legal basis & control */}
      <section>
        <h2>Consent and legal basis</h2>
        <p>
          In the EEA/UK/CH, non-essential cookies are set only with your consent. Essential cookies
          rely on our legitimate interests in operating a secure, functioning service—or on contract
          necessity where needed to deliver requested features.
        </p>
        <p>
          You can change your choices anytime using the button above. You can also block or delete
          cookies in your browser settings; however, blocking essential cookies may impact core
          functionality (e.g., sign-in).
        </p>
      </section>

      {/* Cookie table */}
      <section>
        <h2>Cookies we use</h2>
        <p className={styles.cookieNote}>
          The list below is illustrative. Actual cookies may vary by plan and enabled integrations.
          Your Consent Management Platform (CMP) can provide a live declaration.
        </p>

        <div className={styles.cookieTable}>
          <table>
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Provider</th>
                <th>Purpose</th>
                <th>Category</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>p4h_session</td>
                <td>Plan4host (first-party)</td>
                <td>Authentication and security</td>
                <td>Strictly necessary</td>
                <td>Session</td>
              </tr>
              <tr>
                <td>p4h_csrf</td>
                <td>Plan4host (first-party)</td>
                <td>CSRF protection</td>
                <td>Strictly necessary</td>
                <td>Session</td>
              </tr>
              <tr>
                <td>_ga / _ga_*</td>
                <td>Google Analytics (third-party, if enabled)</td>
                <td>Aggregated usage analytics</td>
                <td>Analytics</td>
                <td>Up to 13 months</td>
              </tr>
              <tr>
                <td>_fbp</td>
                <td>Meta (third-party, if enabled)</td>
                <td>Ad measurement / remarketing</td>
                <td>Marketing</td>
                <td>3 months</td>
              </tr>
              <tr>
                <td>__stripe_*</td>
                <td>Stripe (third-party, if enabled)</td>
                <td>Fraud prevention and payments</td>
                <td>Strictly necessary</td>
                <td>Up to 1 year</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Rights, changes, contact */}
      <section>
        <h2>Your rights</h2>
        <p>
          Depending on your region, you may have rights to access, correct, delete, or restrict
          processing of your personal data, as well as portability and objection rights. To exercise
          your rights, email <a href="mailto:office@plan4host.com">office@plan4host.com</a>. For
          more details, see our{" "}
          <Link className={styles.inlineLink} href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          We may update this Cookie Policy from time to time. The latest version will always be
          available here with the “Last updated” date.
        </p>
      </section>

      <section>
        <h2>Contact us</h2>
        <p>
          If you have questions about this Cookie Policy, contact{" "}
          <a href="mailto:office@plan4host.com">office@plan4host.com</a>.
        </p>
      </section>

      {/* CMP bridge (OneTrust / Cookiebot / Klaro / Didomi) */}
      <Script id="p4h-consent-bridge" strategy="afterInteractive">{`
        window.showConsentManager = function () {
          try {
            if (window.Optanon) { window.Optanon.ToggleInfoDisplay(); return; }       // OneTrust
            if (window.Cookiebot) { window.Cookiebot.show(); return; }                // Cookiebot
            if (window.klaro) { window.klaro.show(); return; }                        // Klaro
            if (window.didomi && window.didomi.preferences) { window.didomi.preferences.show(); return; } // Didomi
            console.warn("No consent manager detected.");
          } catch (e) { console.error(e); }
        };
        (function(){
          const el = document.getElementById("open-cookie-preferences");
          if (!el) return;
          el.addEventListener("click", () => window.showConsentManager && window.showConsentManager());
        })();
      `}</Script>
    </main>
  );
}