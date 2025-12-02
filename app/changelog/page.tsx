import type { Metadata } from "next";
import s from "../legal/legal.module.css";
import ForceDark from "@/components/theme/ForceDark";

export const metadata: Metadata = {
  title: "Changelog — Plan4host",
  description: "Latest changes and releases for Plan4Host.",
};

export default function ChangelogPage() {
  const lastUpdated = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });
  return (
    <main className={s.page}>
      <ForceDark />
      <div className={s.container}>
        <header className={s.header}>
          <div style={{ display: "grid", placeItems: "center", gap: 10, textAlign: "center" }}>
            <img
              src="/p4h_logo_rotund.png"
              alt="Plan4Host"
              width={72}
              height={72}
              style={{ borderRadius: 999, border: "2px solid var(--border)", background: "var(--card)" }}
            />
            <h1 className={s.h1} style={{ marginBottom: 4 }}>
              Changelog
            </h1>
            <p className={s.meta}>Last updated: {lastUpdated}</p>
          </div>
        </header>

        <section>
          <div
            className={s.card}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 2fr) minmax(0, 2fr)",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>
                New · Guest AI assistant
              </div>
              <h2 className={s.h2} style={{ marginTop: 0 }}>
                Help guests find answers instantly with Guest AI assistant
              </h2>
              <p className={s.p}>
                We’ve added a floating AI assistant to the public reservation page{" "}
                <code style={{ fontFamily: "monospace", fontSize: 12 }}>r/[token]</code>. Guests can choose their
                preferred language and tap smart menus like arrival details, amenities, local tips and check-out to get
                short, clear answers.
              </p>
              <p className={s.p}>
                The assistant uses only the information you provide: reservation messages, House Rules PDF and the
                curated “House rules for AI” text from the Check-in Editor. It never invents access codes, Wi‑Fi
                passwords, phone numbers or addresses — if something is missing it gently asks the guest to contact you.
              </p>
              <p className={s.p}>
                In <strong>Check-in Editor</strong> you can now import your House Rules PDF, review the extracted text
                and save it as AI input. This keeps the assistant both helpful and safe, while reducing repetitive
                “How do I…?” questions from guests.
              </p>
              <p className={s.p} style={{ fontSize: 13, color: "var(--muted)" }}>
                Guest AI assistant is currently available for <strong>Premium accounts</strong>.
              </p>
            </div>
            <div style={{ justifySelf: "center" }}>
              <div
                style={{
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "1px solid rgba(148,163,184,0.4)",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
                  maxWidth: 360,
                  width: "100%",
                }}
              >
                <img
                  src="/AI_chatbot.PNG"
                  alt="Guest AI assistant preview"
                  style={{ display: "block", width: "100%", height: "auto" }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
