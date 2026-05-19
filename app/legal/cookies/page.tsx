// /app/legal/cookies/page.tsx
import type { Metadata } from "next";
import s from "../legal.module.css";
import OpenCookieSettingsButton from "@/components/consent/OpenCookieSettingsButton";

export const metadata: Metadata = {
  title: "Cookie Policy — Plan4Host",
  description:
    "Cookie Policy for plan4host.com operated by BOA DIGITAL SOLUTIONS SRL. Learn how we use cookies and how you can control your preferences.",
};

export default function CookiePolicyPage() {
  const lastUpdated = "19 May 2026";

  return (
    <main className={s.page}>
      <div className={s.container}>
        <header className={s.header}>
          <div className={s.headerInner}>
            <div className={s.headerBrand}>
              <img
                src="/p4h_logo_rotund.png"
                alt="Plan4Host"
                width={38}
                height={38}
                className={s.headerLogo}
              />
              <span className={s.headerEyebrow}>Plan4Host Legal</span>
            </div>
            <h1 className={s.h1}>Cookie Policy</h1>
            <p className={s.headerLead}>
              Important information about cookies and device storage used on the website and in the application area, including your preference choices.
            </p>
            <div className={s.headerMetaRow}>
              <p className={s.meta}>Last updated: {lastUpdated}</p>
              <p className={s.meta}>Applies to: public pages and application area</p>
            </div>
          </div>
        </header>

        <section>
          <p className={s.p}>
            This Cookie Policy explains how <strong>Plan4Host</strong> (operated by{" "}
            <strong>BOA DIGITAL SOLUTIONS SRL</strong>) uses cookies and similar technologies on{" "}
            <strong>plan4host.com</strong> and <strong>www.plan4host.com</strong> (the “Website”).
            This policy is aligned with EU/GDPR requirements.
          </p>

          <h2 className={s.h2}>1. Who we are</h2>
          <p className={s.p}>
            The data controller for the Website is <strong>BOA DIGITAL SOLUTIONS S.R.L.</strong>, CIF/CUI <strong>51680505</strong>.
            Registered office: <strong>BUZĂU, Mun. Buzău, Str. Pietroasele 24, Romania</strong>. For privacy questions,
            contact <a className={s.link} href="mailto:office@plan4host.com">office@plan4host.com</a>.
          </p>

          <h2 className={s.h2}>2. What are cookies?</h2>
          <p className={s.p}>
            Cookies are small text files placed on your device to store information. They are widely
            used to make websites work or function more efficiently, as well as to provide information
            to the site owners. Cookies may be “first-party” (set by us) or “third-party” (set by external providers).
          </p>

          <h2 className={s.h2}>3. Scope and where cookies apply</h2>
          <p className={s.p}>
            This policy applies to the public marketing pages (e.g., homepage, pricing, features, contact,
            and legal pages) and to the application area (after login). Payments are processed in the app’s billing area.
          </p>

          <h2 className={s.h2}>4. Categories of cookies we use</h2>
          <ul className={s.list}>
            <li className={s.p}>
              <strong>Essential (always on)</strong> — Required for core functionality such as session,
              security, and consent storage. These cookies are necessary for
              the Website to function and cannot be switched off.
            </li>
            <li className={s.p}>
              <strong>Preferences (optional)</strong> — Used only if you choose to allow preferences.
              These help us remember interface choices in the application area, such as theme, language,
              the selected property, and certain UI customizations on your device.
            </li>
          </ul>
          <p className={`${s.p} ${s.muted}`}>
            We do <strong>not</strong> use analytics or advertising cookies. Preference cookies/storage are optional
            and are written only after you allow <strong>Preferences</strong>. If we add any new non-essential
            category in the future, we will update this page and request consent where required.
          </p>

          <div className={s.card} style={{ margin: "16px 0 6px" }}>
            <p className={s.p} style={{ margin: 0 }}>
              You can review cookie information any time via{" "}
              <OpenCookieSettingsButton className={`${s.btn} ${s.btnPrimary}`} />
              . (This opens a small settings modal.)
            </p>
            <p className={`${s.p} ${s.muted}`} style={{ marginTop: 8 }}>
              You can keep only essential cookies or allow optional preference storage. If we introduce any further
              non-essential category in the future, you will be able to manage your choices here.
            </p>
          </div>

          <h2 className={s.h2}>5. Details: cookies and similar technologies</h2>
          <p className={s.p}>
            Below is a non-exhaustive list of the key cookies and storage we use. Some cookies may be set only
            when you access specific features (e.g., billing/checkout).
          </p>

          <div className={s.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Purpose</th>
                  <th>Provider</th>
                  <th>Type</th>
                  <th>Retention</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>p4h_consent</code></td>
                  <td>Essential</td>
                  <td>Stores your cookie choices and proof of consent.</td>
                  <td>First-party (Plan4Host)</td>
                  <td>Cookie</td>
                  <td>12 months</td>
                </tr>
                <tr>
                  <td><code>sb-access-token</code></td>
                  <td>Essential</td>
                  <td>Keeps you signed in to your account (HTTP-only).</td>
                  <td>First-party (Supabase/Auth)</td>
                  <td>Cookie</td>
                  <td>~30 days</td>
                </tr>
                <tr>
                  <td><code>sb-refresh-token</code></td>
                  <td>Essential</td>
                  <td>Renews your session securely (HTTP-only).</td>
                  <td>First-party (Supabase/Auth)</td>
                  <td>Cookie</td>
                  <td>~30 days</td>
                </tr>
                <tr>
                  <td><code>app_theme</code></td>
                  <td>Preferences (optional)</td>
                  <td>Remembers your selected theme (light/dark) in the application area where theme switching is available.</td>
                  <td>First-party (Plan4Host)</td>
                  <td>Cookie</td>
                  <td>12 months</td>
                </tr>
                <tr>
                  <td><code>app_lang</code></td>
                  <td>Preferences (optional)</td>
                  <td>Remembers your selected language in the application area.</td>
                  <td>First-party (Plan4Host)</td>
                  <td>Cookie</td>
                  <td>12 months</td>
                </tr>
                <tr>
                  <td><code>p4h_guest_lang</code></td>
                  <td>Preferences (optional)</td>
                  <td>Remembers the guest-facing language chosen in the public check-in form.</td>
                  <td>First-party (Plan4Host)</td>
                  <td>Cookie</td>
                  <td>12 months</td>
                </tr>
                <tr>
                  <td><em>Stripe cookies</em></td>
                  <td>Essential (when paying)</td>
                  <td>Enable secure payment and fraud prevention. Only set in the app’s billing/checkout flow.</td>
                  <td>Third-party (stripe.com)</td>
                  <td>Cookies</td>
                  <td>Varies per Stripe policy</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className={s.h2}>5.1. Similar technologies (localStorage)</h2>
          <p className={s.p}>
            We also use <em>localStorage</em> in two ways:
          </p>
          <ul className={s.list}>
            <li className={s.p}>
              <strong>Preference storage (optional, only after consent)</strong> — used to remember interface choices
              on this device, such as <code>theme_v1</code>, <code>app_lang</code>,
              <code>p4h_guest_lang</code>, <code>p4h:selectedPropertyId</code>,
              <code>p4h:rm:lang</code>, <code>p4h:otaColors:*</code>, and <code>p4h:otaLogos:*</code>.
              These preferences mainly affect the logged-in application experience, not every public page on the site.
              Retention: until cleared or until you withdraw preference consent.
            </li>
            <li className={s.p}>
              <strong>Strictly functional device storage</strong> — some authenticated features may keep temporary
              or feature-specific data on your device, such as draft message content, notification state, or
              non-tracking UI caches. This storage supports features you actively use and is not used for analytics
              or advertising. Retention: usually until cleared or refreshed by the feature.
            </li>
          </ul>

          <h2 className={s.h2}>5.2. Service Workers & Web Push</h2>
          <p className={s.p}>
            When you enable notifications, the app registers a <em>Service Worker</em> (<code>sw.js</code>) to deliver
            Web Push messages. This does not set cookies, and we do not use it for tracking. The browser manages your
            permission for notifications; you can revoke it at any time from your browser or device settings. You can
            also unsubscribe from the app under <strong>Notifications</strong> (Turn Off).
          </p>

          <h2 className={s.h2}>6. Your choices</h2>
          <p className={s.p}>
            On your first visit, you may see a cookie banner. You can choose <strong>Only necessary</strong> or allow
            optional <strong>Preferences</strong>. If you do not allow preferences, we do not persist theme, language,
            property selection, or similar application-area interface choices on your device. Public pages that are
            intentionally fixed to a specific theme are not changed by this preference. You can change your choice later
            from Cookie settings.
          </p>

          <h2 className={s.h2}>7. Legal basis</h2>
          <p className={s.p}>
            Essential cookies are used based on our legitimate interest in providing a secure and functional
            service. Preference cookies and preference storage are used only with your consent.
          </p>

          <h2 className={s.h2}>8. International transfers</h2>
          <p className={s.p}>
            Some providers (e.g., Stripe) may process data outside the EU/EEA. When applicable, we rely on
            appropriate safeguards (e.g., standard contractual clauses) as provided by those processors.
          </p>

          <h2 className={s.h2}>9. Changes to this policy</h2>
          <p className={s.p}>
            We may update this Cookie Policy from time to time to reflect operational or legal changes.
            We encourage you to review it periodically.
          </p>

          <h2 className={s.h2}>10. Contact</h2>
          <p className={s.p}>
            For questions about this policy or your privacy choices, contact us at{" "}
            <a className={s.link} href="mailto:office@plan4host.com">office@plan4host.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
