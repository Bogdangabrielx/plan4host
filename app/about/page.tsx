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
          <h1 className={s.h1}> About Us</h1>
        </header>

        <section>
          <p className={s.p}>
            Plan4Host was created with a singular purpose: to elevate the hosting experience through clarity, precision, and effortless control.
          </p>
          <p className={s.p}>
            Born from real conversations with property owners, the platform emerged from a simple but powerful insight: exceptional hospitality depends on the smooth coordination of countless details — and hosts deserve a tool that brings everything together beautifully.
          </p>
          <p className={s.p}>
            With Plan4Host, every reservation, every task, and every guest interaction converge into one intuitive space: a unified calendar, always with you, directly on your phone. This central view allows you to oversee your entire property with ease, ensuring nothing is missed and every stay flows seamlessly.
          </p>
          <p className={s.p}>
            Managing the reception area becomes equally effortless. Check-ins, confirmations, and updates can be handled with just a few clicks, giving you more time to focus on your guests, not on the administrative weight behind each booking.
          </p>

          <div aria-hidden role="separator" style={{ borderTop: '1px solid var(--border)', margin: '28px 0' }} />

          <h2 className={s.h2}> Our Mission</h2>
          <p className={s.p}>
            Great hospitality begins with thoughtful communication — and this is where Plan4Host truly shines. Our platform delivers a carefully designed messaging flow where guests receive the right information at precisely the right time. Not everything at once. Not too late. Just the guidance they need, when they need it, helping them feel welcome, confident, and never uncertain.
          </p>
          <p className={s.p}>
            A happy guest offers more than a pleasant stay. They bring positive feedback, stronger ratings, and warm recommendations, fueling the organic growth of every property.
          </p>
          <p className={s.p}>
            Plan4Host blends refined technology with a deep understanding of real hospitality. Our mission is to empower hosts to operate with confidence, deliver exceptional service, and create the kind of stays guests love to remember — and love to share.
          </p>
        </section>
      </div>
    </main>
  );
}
