// app/legal/cookies/page.tsx
import Link from "next/link";
import Script from "next/script";
import styles from "@/app/home.module.css";

export const metadata = {
  title: "Cookie Policy | Plan4host",
  description:
    "Learn how Plan4host uses cookies and similar technologies, how to control your preferences, and which cookies we set.",
  robots: { index: true },
};

const LAST_UPDATED = "2025-09-01"; // update this when content changes

export default function CookiePolicyPage() {
  return (
    <main style={{ maxWidth: 900, margin: "48px auto", padding: "0 20px", color: "var(--text)" }}>
      <h1 style={{ marginBottom: 8 }}>Cookie Policy</h1>
      <p style={{ color: "var(--muted)" }}>Last updated: {LAST_UPDATED}</p>

      <section>
        <h2>1. Who we are</h2>
        <p>
          This page is provided by <strong>Plan4host</strong> (the “controller”). You can reach us at{" "}
          <a href="mailto:office@plan4host.com">office@plan4host.com</a>.
        </p>
      </section>

      <section>
        <h2>2. What are cookies?</h2>
        <p>
          Cookies are small files stored on your device. We also use similar technologies (such as local storage and
          pixel tags). We refer to all of these collectively as “cookies”.
        </p>
      </section>

      <section>
        <h2>3. How we use cookies</h2>
        <p>We use cookies to:</p>
        <ul>
          <li>
            <strong>Strictly necessary</strong>: enable core features such as authentication, security, and essential
            preferences.
          </li>
          <li>
            <strong>Preferences</strong>: remember your settings.
          </li>
          <li>
            <strong>Analytics</strong>: measure usage so we can improve the product.
          </li>
          <li>
            <strong>Marketing</strong>: personalize content/ads (only if you consent).
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Consent</h2>
        <p>
          Where required, we only set analytics/marketing cookies after you give consent. You can change your choices at
          any time:
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

        {/* Client-side hook for popular CMPs; safe to keep page as a server component */}
        <Script id="p4h-consent-bridge" strategy="afterInteractive">{`
          // Expose a helper so other parts of the app can call it too
          window.showConsentManager = function () {
            try {
              if (window.Optanon) { window.Optanon.ToggleInfoDisplay(); return; }       // OneTrust
              if (window.Cookiebot) { window.Cookiebot.show(); return; }                // Cookiebot
              if (window.klaro) { window.klaro.show(); return; }                        // Klaro
              if (window.didomi && window.didomi.preferences) { window.didomi.preferences.show(); return; } // Didomi
              console.warn("No consent manager detected.");
            } catch (e) { console.error(e); }
          };
          // Wire the button
          (function(){
            var el = document.getElementById("open-cookie-preferences");
            if (!el) return;
            el.addEventListener("click", function(){ window.showConsentManager && window.showConsentManager(); });
          })();
        `}</Script>
      </section>

      <section>
        <h2>5. Cookies we use</h2>
        <p style={{ color: "var(--muted)" }}>
          Example below. Replace/extend this list or populate it automatically from your CMP.
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
                <td>_ga</td>
                <td>Google Analytics (third-party)</td>
                <td>Usage analytics</td>
                <td>Analytics</td>
                <td>13 months</td>
              </tr>
              <tr>
                <td>_fbp</td>
                <td>Meta (third-party)</td>
                <td>Remarketing/ads</td>
                <td>Marketing</td>
                <td>3 months</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>6. How to control cookies</h2>
        <ul>
          <li>Use the preference center above.</li>
          <li>Use your browser settings to block or delete cookies.</li>
          <li>Adjust your device’s advertising identifiers (iOS/Android) in system settings.</li>
        </ul>
      </section>

      <section>
        <h2>7. Third-party cookies</h2>
        <p>
          Some providers may set cookies when you use Plan4host. Please review their privacy and cookie policies for
          details on processing and international transfers.
        </p>
      </section>

      <section>
        <h2>8. Changes</h2>
        <p>
          We may update this policy from time to time. We will post the new version here and update the “Last updated”
          date above.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>
          Questions about this policy? Email us at{" "}
          <a href="mailto:office@plan4host.com">office@plan4host.com</a>. For legal terms, see{" "}
          <Link className={styles.footerLink} href="/legal/terms">
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link className={styles.footerLink} href="/legal/privacy">
            Privacy Policy
          </Link>.
        </p>
      </section>
    </main>
  );
}