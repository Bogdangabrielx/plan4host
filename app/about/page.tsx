import type { Metadata } from "next";
import s from "../legal/legal.module.css";
import ForceDark from "@/components/theme/ForceDark";

export const metadata: Metadata = {
  title: "About — Plan4Host",
  description: "About Plan4Host: our purpose, mission and story.",
};

export default function AboutPage() {
  return (
    <main className={s.page}>
      <ForceDark />
      <div className={s.container}>
        <header className={s.header}>
          <div style={{ display: 'grid', placeItems: 'center', gap: 10 }}>
            <img
              src="/p4h_logo_rotund.png"
              alt="Plan4Host"
              width={96}
              height={96}
              style={{ borderRadius: 999, border: '2px solid var(--border)', background: 'var(--card)' }}
            />
            <h1 className={s.h1} style={{ margin: 0 }}>About Us</h1>
            <p className={s.meta} style={{ marginTop: 2 }}>Clarity. Precision. Effortless control.</p>
          </div>
        </header>

        <section style={{ display: 'grid', gap: 16 }}>
          {/* Intro card with logo + overview */}
          <div className={s.card} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'center' }}>
              <img
                src="/p4h_logo_rotund.png"
                alt="Plan4Host"
                width={64}
                height={64}
                style={{ borderRadius: 999, border: '1px solid var(--border)', background: 'var(--card)' }}
              />
              <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--text)' }}>
                Built for real hospitality — not paperwork
              </div>
            </div>
            <p className={s.p}>
              Plan4Host was created with a singular purpose: to elevate the hosting experience through clarity, precision, and effortless control.
            </p>
            <p className={s.p}>
              Born from real conversations with property owners, the platform emerged from a simple but powerful insight: exceptional hospitality depends on the smooth coordination of countless details — and hosts deserve a tool that brings everything together beautifully.
            </p>
          </div>

          {/* Unified control card */}
          <div className={s.card} style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>One clear view, everything in sync</div>
            <p className={s.p}>
              With Plan4Host, every reservation, every task, and every guest interaction converge into one intuitive space — a unified calendar, always with you, directly on your phone.
            </p>
            <ul className={s.list}>
              <li className={s.p}>Oversee your entire property at a glance.</li>
              <li className={s.p}>Keep reception stress‑free: quick check‑ins, confirmations, and updates.</li>
              <li className={s.p}>Spend more time with guests, less on admin.</li>
            </ul>
          </div>

          {/* Mission card */}
          <div className={s.card} style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Our Mission</div>
            <p className={s.p}>
              Great hospitality begins with thoughtful communication — and this is where Plan4Host truly shines. Our platform delivers a carefully designed messaging flow where guests receive the right information at precisely the right time. Not everything at once. Not too late. Just the guidance they need, when they need it.
            </p>
            <p className={s.p}>
              A happy guest offers more than a pleasant stay: they bring positive feedback, stronger ratings, and warm recommendations, fueling the organic growth of every property.
            </p>
            <p className={s.p}>
              Plan4Host blends refined technology with a deep understanding of real hospitality. Our mission is to empower hosts to operate with confidence, deliver exceptional service, and create the kind of stays guests love to remember — and love to share.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
