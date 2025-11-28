// /app/legal/terms/page.tsx
import type { Metadata } from "next";
import s from "../legal.module.css";
import Link from "next/link";
import OpenCookieSettingsButton from "@/components/consent/OpenCookieSettingsButton";

export const metadata: Metadata = {
  title: "Terms of Service — Plan4Host",
  description: "Terms of Service for plan4host.com operated by BOA DIGITAL SOLUTIONS SRL.",
};

export default function TermsOfServicePage() {
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
            <h1 className={s.h1} style={{ marginBottom: 4 }}>Terms of Service</h1>
            <p className={s.meta}>Last updated: {lastUpdated}</p>
          </div>
        </header>

        <section>
          <p className={s.p}>
            These Terms of Service (“Terms”) govern your access to and use of{" "}
            <strong>Plan4Host</strong> (operated by <strong>BOA DIGITAL SOLUTIONS SRL</strong>)
            on <strong>plan4host.com</strong> and <strong>www.plan4host.com</strong>, including
            the application area after login (collectively, the “Service”). By creating an
            account, accessing, or using the Service, you agree to these Terms.
          </p>

          <h2 className={s.h2}>1. Who we are</h2>
          <p className={s.p}>
            The Service is provided by <strong>BOA DIGITAL SOLUTIONS S.R.L.</strong> (“Plan4Host”,
            “we”, “us”), CIF/CUI <strong>51680505</strong>. Registered office: <strong>BUZĂU, Mun. Buzău,
            Str. Pietroasele 24, Romania</strong>. For questions, contact{" "}
            <a className={s.link} href="mailto:office@plan4host.com">office@plan4host.com</a>.
          </p>

          <h2 className={s.h2}>2. Eligibility & Account</h2>
          <ul className={s.list}>
            <li className={s.p}>You must be at least 18 years old and able to enter into a binding contract.</li>
            <li className={s.p}>You are responsible for safeguarding your login credentials and for activities under your account.</li>
            <li className={s.p}>Provide accurate information and keep it up to date.</li>
          </ul>

          <h2 className={s.h2}>3. Free Trial, Plans & Billing</h2>
          <ul className={s.list}>
            <li className={s.p}>
              <strong>Free trial:</strong> New accounts typically receive a <strong>7-day</strong> free trial. We may
              modify or discontinue trial offers at any time.
            </li>
            <li className={s.p}>
              <strong>Plans:</strong> All plans are paid (including <strong>Basic</strong>). We do not offer a perpetual
              free plan. Plan names, features and prices may change over time.
            </li>
            <li className={s.p}>
              <strong>Trial outcome:</strong> At the end of the free trial, your account will <u>not</u> be charged
              unless you explicitly subscribe to a paid plan. If you do not subscribe, your access is
              <strong> suspended</strong>; no free/basic plan is provided.
            </li>
            <li className={s.p}>
              <strong>Subscriptions:</strong> Paid plans are billed via <em>Stripe</em> inside the app’s billing
              section. Prices, features, and limits are shown on our{" "}
              <Link className={s.link} href="https://plan4host.com/#pricing">Pricing</Link> page (where available) or inside the app.
            </li>
            <li className={s.p}>
              <strong>Renewals:</strong> Subscriptions renew automatically until cancelled. You can cancel at any time,
              effective at the end of the current billing period.
            </li>
            <li className={s.p}>
              <strong>Non‑payment / failed renewals:</strong> If a renewal charge fails or payment is not made on time,
              we may suspend your access to all features. Upon resuming payment, access to the features of your
              selected plan will be reactivated.
            </li>
            <li className={s.p}>
              <strong>Refunds:</strong> <u>No refunds</u> are provided after the first charge and no credits are issued
              for partial periods, <em>unless required by applicable law</em>.
            </li>
            <li className={s.p}>
              <strong>Consumers (B2C):</strong> For digital services, once you subscribe you request immediate
              performance and acknowledge that any statutory right of withdrawal (e.g., 14-day cooling-off) may not
              apply after service begins. Where mandatory consumer rights do apply, we will comply; otherwise, our
              “no refunds” policy remains in effect.
            </li>
            <li className={s.p}>
              <strong>Taxes:</strong> Prices may exclude taxes; you are responsible for applicable taxes where required.
            </li>
          </ul>

          <h2 className={s.h2}>4. Acceptable Use</h2>
          <ul className={s.list}>
            <li className={s.p}>Do not violate laws or third-party rights.</li>
            <li className={s.p}>No unauthorized access, probing, or interference with the Service.</li>
            <li className={s.p}>No malware, spam, scraping at abusive scale, or attempts to bypass limits/quotas.</li>
            <li className={s.p}>Do not reverse engineer components where prohibited by applicable law.</li>
            <li className={s.p}>You are responsible for content you upload or process through the Service.</li>
          </ul>

          <h2 className={s.h2}>5. Service Changes & Availability</h2>
          <ul className={s.list}>
            <li className={s.p}>
              We may update, add, or remove features, or suspend the Service (in whole or part) for maintenance,
              security, or operational reasons. We aim for reasonable notice where feasible.
            </li>
            <li className={s.p}>
              Beta/experimental features may be provided “as is” and can change or be withdrawn at any time.
            </li>
          </ul>

          <h2 className={s.h2}>6. Third-Party Services</h2>
          <p className={s.p}>
            The Service integrates with third-party providers (e.g., Supabase for auth/database, Vercel for hosting,
            Stripe for payments, Microsoft 365 via GoDaddy for email). Their terms and privacy policies apply to your
            use of their features. We are not responsible for third-party services.
          </p>

          <h2 className={s.h2}>7. Intellectual Property</h2>
          <ul className={s.list}>
            <li className={s.p}>
              We retain all rights, title, and interest in and to the Service, including software, branding, and content,
              except for content you provide.
            </li>
            <li className={s.p}>
              You grant us a non-exclusive, worldwide license to host, process, and display your content solely to
              operate and improve the Service.
            </li>
            <li className={s.p}>Feedback is voluntary and may be used without obligation to you.</li>
          </ul>

          <h2 className={s.h2}>7.1. Trademarks</h2>
          <p className={s.p}>
            Airbnb®, Booking.com®, Expedia® and other names/logos are trademarks of their respective owners.
            Their use in the Service is for identification only and does not imply endorsement.
          </p>

          <h2 className={s.h2}>8. Privacy & Data Protection</h2>
          <p className={s.p}>
            We process personal data in accordance with our{" "}
            <Link className={s.link} href="/legal/privacy">Privacy Policy</Link> and use cookies as described in our{" "}
            <Link className={s.link} href="/legal/cookies">Cookie Policy</Link>. We comply with EU/GDPR requirements.
          </p>

          <h2 className={s.h2}>9. Termination</h2>
          <ul className={s.list}>
            <li className={s.p}>
              You may cancel your subscription in the app at any time; access continues until the end of the paid period.
            </li>
            <li className={s.p}>
              We may suspend or terminate your access for material breach, security risks, fraud/abuse, or legal reasons.
            </li>
            <li className={s.p}>
              Upon termination, your right to use the Service ceases. We may retain and/or delete data per our policies and legal obligations.
            </li>
            <li className={s.p}>
              <strong>Account deletion:</strong> You can request account deletion from within the app. Operational data is
              removed promptly; residual backups may persist for up to <strong>30 days</strong> before being overwritten.
              We may retain billing records for statutory periods.
            </li>
          </ul>

          <h2 className={s.h2}>10. Disclaimers</h2>
          <p className={s.p}>
            The Service is provided on an “as is” and “as available” basis. To the fullest extent permitted by law,
            we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose,
            and non-infringement. We do not warrant uninterrupted, secure, or error-free operation.
          </p>
          <p className={s.p}>
            <strong>Third‑party calendar data (iCal) & OTAs:</strong> the Service imports/exports calendar data via
            third‑party feeds (e.g., OTAs). We are not responsible for the accuracy, completeness, or timeliness of
            external data or delivery delays. Syncs may be subject to quotas and rate limits.
          </p>

          <h2 className={s.h2}>11. Limitation of Liability</h2>
          <p className={s.p}>
            To the maximum extent permitted by law, our aggregate liability arising out of or relating to the Service is
            limited to the greater of (a) the amounts you paid to us in the 3 months preceding the event giving rise to
            the liability or (b) EUR 100. We are not liable for indirect, incidental, special, consequential, or punitive
            damages, loss of profits, data, or goodwill.
          </p>

          <h2 className={s.h2}>12. Indemnification</h2>
          <p className={s.p}>
            You will indemnify and hold harmless BOA DIGITAL SOLUTIONS SRL and its affiliates, officers, employees, and
            agents from and against any claims, damages, liabilities, and expenses (including reasonable legal fees)
            arising from your use of the Service or violation of these Terms.
          </p>

          <h2 className={s.h2}>13. Governing Law & Dispute Resolution</h2>
          <p className={s.p}>
            These Terms are governed by the laws of Romania, without regard to conflict of law principles. The courts of
            Bucharest, Romania shall have exclusive jurisdiction, and you consent to their venue. Mandatory consumer rights
            (where applicable) are not affected.
          </p>

          <h2 className={s.h2}>14. Changes to these Terms</h2>
          <p className={s.p}>
            We may update these Terms to reflect operational, legal, or regulatory changes. If changes are material, we
            will provide reasonable notice (e.g., in-app notice or email). Continued use after changes become effective
            constitutes acceptance of the updated Terms.
          </p>

          <h2 className={s.h2}>15. Contact</h2>
          <p className={s.p}>
            Questions about these Terms? Contact{" "}
            <a className={s.link} href="mailto:office@plan4host.com">office@plan4host.com</a>.
          </p>

          <div className={s.card} style={{ marginTop: 16 }}>
            <p className={s.p} style={{ margin: 0 }}>
              You can manage cookie preferences anytime via{" "}
              <OpenCookieSettingsButton className={`${s.btn} ${s.btnPrimary}`}>
                Cookie settings
              </OpenCookieSettingsButton>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
