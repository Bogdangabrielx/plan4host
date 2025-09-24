// app/legal/cookies/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — Plan4host",
  description:
    "Cookie Policy for plan4host.com operated by BOA DIGITAL SOLUTIONS SRL. Learn how we use cookies and how you can control your preferences.",
};

export default function CookiePolicyPage() {
  const lastUpdated = "25 September 2025";

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold">Cookie Policy</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Last updated: {lastUpdated}
        </p>
      </header>

      <section className="space-y-6 leading-relaxed">
        <p>
          This Cookie Policy explains how <strong>Plan4host</strong> (operated by{" "}
          <strong>BOA DIGITAL SOLUTIONS SRL</strong>) uses cookies and similar
          technologies on <strong>plan4host.com</strong> and{" "}
          <strong>www.plan4host.com</strong> (the “Website”). This policy is
          aligned with EU/GDPR requirements.
        </p>

        <h2 className="text-xl font-semibold">1. Who we are</h2>
        <p>
          The data controller for the Website is <strong>BOA DIGITAL SOLUTIONS SRL</strong>.  
          For privacy questions, contact: <a className="underline" href="mailto:office@plan4host.com">office@plan4host.com</a>.
          We do not display a postal address on this page.
        </p>

        <h2 className="text-xl font-semibold">2. What are cookies?</h2>
        <p>
          Cookies are small text files placed on your device to store information. They are
          widely used to make websites work or function more efficiently, as well as to provide
          information to the site owners. Cookies may be “first-party” (set by us) or
          “third-party” (set by external providers).
        </p>

        <h2 className="text-xl font-semibold">3. Scope and where cookies apply</h2>
        <p>
          This policy applies to the public marketing pages (e.g., homepage, pricing, features, contact,
          and legal pages) and to the application area (after login). Payments are processed in the app’s
          billing area.
        </p>

        <h2 className="text-xl font-semibold">4. Categories of cookies we use</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Essential (always on)</strong> — Required for core functionality such as
            session, security, consent storage, and payment processing when you explicitly
            proceed to checkout.
          </li>
          <li>
            <strong>Preferences</strong> — Improve your experience by remembering your theme selection
            (e.g., dark/light). These are optional and will be used only if you allow non-essential cookies.
          </li>
        </ul>

        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <p className="mb-3">
            You can change your choices at any time via{" "}
            <button
              id="open-cookie-settings"
              className="rounded-xl px-3 py-2"
              style={{ background: "var(--primary)", color: "var(--bg)" }}
              aria-haspopup="dialog"
            >
              Cookie settings
            </button>
            . (This opens a preferences modal we provide.)
          </p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Buttons you may see: “Accept essential”, “Accept all”, “Reject all”, “Only necessary”, “Save”.
          </p>
        </div>

        <h2 className="text-xl font-semibold">5. Details: cookies and similar technologies</h2>
        <p>
          Below is a non-exhaustive list of the key cookies and storage we use. Some cookies may be set
          only when you access specific features (e.g., billing/checkout).
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--panel)" }}>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Purpose</th>
                <th className="p-3 text-left">Provider</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Retention</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="p-3"><code>cookie_consent</code></td>
                <td className="p-3">Essential</td>
                <td className="p-3">Stores your cookie choices and proof of consent.</td>
                <td className="p-3">First-party (Plan4host)</td>
                <td className="p-3">Cookie</td>
                <td className="p-3">12 months</td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="p-3"><code>sb-access-token</code></td>
                <td className="p-3">Essential</td>
                <td className="p-3">Keeps you signed in to your account (HTTP-only).</td>
                <td className="p-3">First-party (Supabase/Auth)</td>
                <td className="p-3">Cookie</td>
                <td className="p-3">~30 days</td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="p-3"><code>sb-refresh-token</code></td>
                <td className="p-3">Essential</td>
                <td className="p-3">Renews your session securely (HTTP-only).</td>
                <td className="p-3">First-party (Supabase/Auth)</td>
                <td className="p-3">Cookie</td>
                <td className="p-3">~30 days</td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="p-3"><code>app_theme</code></td>
                <td className="p-3">Preferences</td>
                <td className="p-3">Remembers your selected theme (light/dark).</td>
                <td className="p-3">First-party (Plan4host)</td>
                <td className="p-3">Cookie</td>
                <td className="p-3">12 months</td>
              </tr>
              <tr>
                <td className="p-3"><em>Stripe cookies</em></td>
                <td className="p-3">Essential (when paying)</td>
                <td className="p-3">
                  Enable secure payment and fraud prevention. Only set in the app’s billing/checkout flow.
                </td>
                <td className="p-3">Third-party (stripe.com)</td>
                <td className="p-3">Cookies</td>
                <td className="p-3">Varies per Stripe policy</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-semibold">6. Your choices</h2>
        <p>
          On your first visit, you’ll see a small banner. You can accept only essential cookies or allow
          all categories. You can revisit your choices any time via the{" "}
          <button
            id="open-cookie-settings-2"
            className="underline"
            aria-haspopup="dialog"
          >
            Cookie settings
          </button>{" "}
          link/button.
        </p>

        <h2 className="text-xl font-semibold">7. Legal basis</h2>
        <p>
          Essential cookies are used based on our legitimate interest in providing a secure and functional
          service. Non-essential (Preferences) are used only with your consent.
        </p>

        <h2 className="text-xl font-semibold">8. International transfers</h2>
        <p>
          Some providers (e.g., Stripe) may process data outside the EU/EEA. When applicable, we rely on
          appropriate safeguards (e.g., standard contractual clauses) as provided by those processors.
        </p>

        <h2 className="text-xl font-semibold">9. Changes to this policy</h2>
        <p>
          We may update this Cookie Policy from time to time to reflect operational or legal changes.
          We encourage you to review it periodically.
        </p>

        <h2 className="text-xl font-semibold">10. Contact</h2>
        <p>
          For questions about this policy or your privacy choices, contact us at{" "}
          <a className="underline" href="mailto:office@plan4host.com">office@plan4host.com</a>.
        </p>
      </section>
    </main>
  );
}