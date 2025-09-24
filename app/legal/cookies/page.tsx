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

const LAST_UPDATED = "2025-09-01"; // Update whenever content changes

export default function CookiePolicyPage() {
  return (
    <main style={{ maxWidth: 920, margin: "48px auto", padding: "0 20px", color: "var(--text)" }}>
      <h1 style={{ marginBottom: 8 }}>Cookie Policy</h1>
      <p style={{ color: "var(--muted)" }}>Last updated: {LAST_UPDATED}</p>

      <section>
        <h2>1. Who we are</h2>
        <p>
          This Cookie Policy describes how <strong>Plan4host</strong> (“we”, “us”, “our”) uses cookies and similar
          technologies on our website and app. If you have questions, contact{" "}
          <a href="mailto:office@plan4host.com">office@plan4host.com</a>.
        </p>
      </section>

      <section>
        <h2>2. What are cookies?</h2>
        <p>
          Cookies are small text files placed on your device by a website. We also use similar technologies such as local
          storage and pixel tags—together referred to as “cookies”. Cookies can be “session” (deleted when you close the
          browser) or “persistent” (stored until they expire or you delete them).
        </p>
      </section>

      <section>
        <h2>3. Why we use cookies</h2>
        <ul>
          <li>
            <strong>Strictly necessary</strong> — to run core features (sign-in, security, load balancing, consent
            logging).
          </li>
          <li>
            <strong>Preferences</strong> — to remember choices (language, theme, product settings).
          </li>
          <li>
            <strong>Analytics</strong> — to measure usage and improve our product.
          </li>
          <li>
            <strong>Marketing</strong> — to personalize content/ads and measure campaign performance (only with your
            consent, where required).
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Legal basis & consent</h2>
        <p>
          In the EEA/UK/CH, we set non-essential cookies (analytics/marketing) only with your consent. Essential cookies
          rely on our legitimate interests in providing a secure, functioning service, or on contract necessity where
          cookies are required to deliver requested functionality.
        </p>
        <p>
          You can change your choices anytime:
        </p>
        <p>
          <button
            id="open-cookie-preferences"
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            aria-describedby="cookie-consent-help"
          >
            Open cookie preferences
          </button>
          <span id="cookie-consent-help" className={styles.srOnly}>
            Opens the cookie preference center.
          </span>
        </p>

        {/* Bridge to popular CMPs; page remains a server component */}
        <Script id="p4h-consent-bridge" strategy="afterInteractive">{`
          // Allow calls from anywhere in the app:
          window.showConsentManager = function () {
            try {
              if (window.Optanon) { window.Optanon.ToggleInfoDisplay(); return; }       // OneTrust
              if (window.Cookiebot) { window.Cookiebot.show(); return; }                // Cookiebot
              if (window.klaro) { window.klaro.show(); return; }                        // Klaro
              if (window.didomi && window.didomi.preferences) { window.didomi.preferences.show(); return; } // Didomi
              console.warn("No consent manager detected.");
            } catch (e) { console.error(e); }
          };
          // Wire the button:
          (function(){
            const el = document.getElementById("open-cookie-preferences");
            if (!el) return;
            el.addEventListener("click", () => window.showConsentManager && window.showConsentManager());
          })();
        `}</Script>
      </section>

      <section>
        <h2>5. Cookies we use</h2>
        <p style={{ color: "var(--muted)" }}>
          The list below is illustrative. Actual cookies may vary by your plan and enabled integrations. Your CMP can
          provide an always-up-to-date declaration.
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
                <td>Authentication, route protection, security</td>
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
                <td>Usage analytics (aggregated)</td>
                <td>Analytics</td>
                <td>Up to 13 months</td>
              </tr>
              <tr>
                <td>_gid</td>
                <td>Google Analytics (third-party, if enabled)</td>
                <td>Session analytics</td>
                <td>Analytics</td>
                <td>24 hours</td>
              </tr>
              <tr>
                <td>_fbp</td>
                <td>Meta (third-party, if enabled)</td>
                <td>Ad measurement/remarketing</td>
                <td>Marketing</td>
                <td>3 months</td>
              </tr>
              <tr>
                <td>_hjSession_* / _hjFirstSeen</td>
                <td>Hotjar (third-party, if enabled)</td>
                <td>Experience analytics</td>
                <td>Analytics</td>
                <td>Up to 1 year</td>
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

      <section>
        <h2>6. How to control cookies</h2>
        <ul>
          <li>Use the preference center (button above) to change or withdraw consent.</li>
          <li>Block or delete cookies via your browser settings (help pages vary by browser/device).</li>
          <li>Reset platform advertising identifiers in your device settings (iOS/Android).</li>
        </ul>
        <p style={{ color: "var(--muted)" }}>
          Blocking essential cookies may affect core functionality (e.g., sign-in).
        </p>
      </section>

      <section>
        <h2>7. Third-party providers</h2>
        <p>
          When enabled, third-party providers (e.g., analytics, payments, support widgets) may set their own cookies. We
          recommend reviewing their privacy and cookie policies for details on processing, retention, and international
          transfers.
        </p>
      </section>

      <section>
        <h2>8. International transfers</h2>
        <p>
          If data is transferred outside your region (e.g., the EEA/UK/CH), we rely on appropriate safeguards such as
          Standard Contractual Clauses, where applicable, and vendor assessments. See our{" "}
          <Link className={styles.footerLink} href="/legal/privacy">
            Privacy Policy
          </Link>{" "}
          for more information.
        </p>
      </section>

      <section>
        <h2>9. Retention</h2>
        <p>
          Cookie lifetimes are shown in the table above. Server-side logs and analytics records may be retained for a
          longer period in aggregated form for security, auditing, and product improvement.
        </p>
      </section>

      <section>
        <h2>10. Your rights</h2>
        <p>
          Depending on your region, you may have rights to access, correct, delete, or restrict processing of your
          personal data, as well as portability and objection rights. To exercise your rights, email{" "}
          <a href="mailto:office@plan4host.com">office@plan4host.com</a>. For details, see our{" "}
          <Link className={styles.footerLink} href="/legal/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>11. Changes to this policy</h2>
        <p>
          We may update this Cookie Policy from time to time. The latest version will always be available on this page
          with the “Last updated” date.
        </p>
      </section>

      <section>
        <h2>12. Contact us</h2>
        <p>
          If you have any questions about this Cookie Policy, contact{" "}
          <a href="mailto:office@plan4host.com">office@plan4host.com</a>.
        </p>
      </section>
    </main>
  );
}