// /app/legal/cookies/page.tsx
import type { Metadata } from "next";
import s from "../legal.module.css";
import OpenCookieSettingsButton from "@/components/consent/OpenCookieSettingsButton";
// ...
<OpenCookieSettingsButton className={`${s.btn} ${s.btnPrimary}`}>
  Cookie settings
</OpenCookieSettingsButton>

export const metadata: Metadata = {
  title: "Cookie Policy — Plan4Host",
  description:
    "Cookie Policy for plan4host.com operated by BOA DIGITAL SOLUTIONS SRL. Learn how we use cookies and how you can control your preferences.",
};

export default function CookiePolicyPage() {
  const lastUpdated = "25 September 2025";

  return (
    <main className={s.page}>
      <div className={s.container}>
        <header className={s.header}>
          <div style={{ display: "grid", placeItems: "center", gap: 10, textAlign: "center" }}>
            <img
              src="/p4h_logo_rotund.png"
              alt="Plan4Host"
              width={80}
              height={80}
              style={{ borderRadius: 999, border: "2px solid var(--border)", background: "var(--card)" }}
            />
            <h1 className={s.h1} style={{ marginBottom: 4 }}>Cookie Policy</h1>
            <p className={s.meta}>Last updated: {lastUpdated}</p>
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
              security, consent storage, <em>and theme selection</em>. These cookies are necessary for
              the Website to function and cannot be switched off.
            </li>
          </ul>
          <p className={`${s.p} ${s.muted}`}>
            We currently do <strong>not</strong> use any non-essential cookies (such as Preferences,
            Analytics, or Marketing). If this changes, this page will be updated and you will be asked
            for consent where required.
          </p>

          <div className={s.card} style={{ margin: "16px 0 6px" }}>
            <p className={s.p} style={{ margin: 0 }}>
              You can review cookie information any time via{" "}
              <OpenCookieSettingsButton className={`${s.btn} ${s.btnPrimary}`} />
              . (This opens a small settings modal.)
            </p>
            <p className={`${s.p} ${s.muted}`} style={{ marginTop: 8 }}>
              At this time we only use essential cookies, so there is nothing to opt in/out of. If we introduce
              non-essential categories in the future, you will be able to manage your choices here.
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
                  <td>Essential</td>
                  <td>Remembers your selected theme (light/dark).</td>
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
            We also use <em>localStorage</em> for interface preferences and draft content. This storage stays on your
            device and can be cleared any time from your browser settings. We do not use localStorage for analytics
            or advertising.
          </p>
          <ul className={s.list}>
            <li className={s.p}><code>theme_v1</code> — remembers theme (light/dark). Retention: until cleared.</li>
            <li className={s.p}><code>p4h:selectedPropertyId</code> — last selected property in the app. Retention: until cleared.</li>
            <li className={s.p}><code>p4h:rm:template:&lt;propertyId&gt;</code> — draft reservation message template. Retention: until cleared.</li>
            <li className={s.p}><code>p4h:otaColors:type:&lt;id&gt;</code>, <code>p4h:otaColors:room:&lt;id&gt;</code> — per‑provider color preferences. Retention: until cleared.</li>
            <li className={s.p}><code>p4h:otaLogos:type:&lt;id&gt;</code>, <code>p4h:otaLogos:room:&lt;id&gt;</code> — custom OTA logos (data URLs). Retention: until cleared.</li>
            <li className={s.p}><code>p4h:inboxCount</code> — UI badge cache. Retention: until cleared.</li>
            <li className={s.p}><code>p4h:push:asked</code> — remembers if you already responded to the browser prompt for notifications. Retention: until cleared.</li>
            <li className={s.p}><code>p4h:push:endpoint</code> — last known Web Push endpoint for this device, used to help with unsubscribe cleanup. Retention: until cleared.</li>
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
            On your first visit, you may see a small banner. At this time we only use essential cookies.
            Some UI preferences (theme, language, etc.) are stored in localStorage (see above) and are not used for tracking. If we
            introduce non-essential cookies in the future, we will ask for your consent and you will be able to
            manage your choices here.
          </p>

          <h2 className={s.h2}>7. Legal basis</h2>
          <p className={s.p}>
            Essential cookies are used based on our legitimate interest in providing a secure and functional
            service. If we add non-essential cookies in the future, they will be used only with your consent.
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
