"use client";

import Link from "next/link";
import styles from "@/app/home.module.css";

type Lang = "en" | "ro";

export default function SeoFooter({ lang }: { lang: Lang }) {
  const homeHref = lang === "ro" ? "/ro" : "/";
  const homeLabel = lang === "ro" ? "Vezi pagina acasa" : "Home page";

  const checkinHref = lang === "ro" ? "/ro/check-in-online-cazare" : "/online-check-in-accommodation";
  const checkinTitle = lang === "ro" ? "Check-in online pentru cazari" : "Online check-in for accommodation";

  const messagesHref = lang === "ro" ? "/ro/mesaje-automate-pentru-oaspeti" : "/automatic-guest-messages";
  const messagesTitle = lang === "ro" ? "Mesaje automate pentru oaspeti" : "Automatic guest messages for accommodation";

  const thirdHref = lang === "ro" ? "/ro/calendar-rezervari-unificat" : "/unified-booking-calendar";
  const thirdTitle = lang === "ro" ? "Calendar rezervari unificat" : "Unified booking calendar";

  return (
    <footer className={styles.footer} aria-label="Footer">
      <div className={`${styles.footerGrid} p4h-seo-footer-grid`}>
        <div className={styles.footerCol}>
          <div className={styles.footerBrand}>
            <img src="/Logo_Landing.png" alt="" aria-hidden="true" className={styles.logoDark} />
            <strong>Plan4Host</strong>
          </div>
          <p className={styles.footerCopy} style={{ maxWidth: 60 * 10 }}>
            {lang === "ro"
              ? "Check-in online si mesaje automate pentru oaspeti, intr-un portal clar si organizat."
              : "Online check-in and automatic guest messages, in a calm and structured guest portal."}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className={styles.footerLink} href={homeHref}>
              {homeLabel}
            </Link>
            <a className={styles.footerLink} href="mailto:office@plan4host.com">
              Support
            </a>
          </div>
        </div>

        <div className={styles.footerCol}>
          <div className={styles.footerTitle}>Social</div>
          <ul className={styles.footerList}>
            <li>
              <a
                className={styles.footerLink}
                href="https://www.facebook.com/share/1D5V7mG79g/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="/facebook_forlight.png"
                  alt="Facebook"
                  width={18}
                  height={18}
                  style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }}
                />
                Facebook
              </a>
            </li>
            <li>
              <a
                className={styles.footerLink}
                href="https://www.instagram.com/plan4host?igh=MXB3cnlzZjZxZGVvMQ%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="/instagram_forlight.png"
                  alt="Instagram"
                  width={18}
                  height={18}
                  style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }}
                />
                Instagram
              </a>
            </li>
            <li>
              <a
                className={styles.footerLink}
                href="https://www.linkedin.com/company/plan4host/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="/linkedin.png"
                  alt="LinkedIn"
                  width={18}
                  height={18}
                  style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }}
                />
                LinkedIn
              </a>
            </li>
          </ul>
        </div>
      </div>
      <style jsx>{`
        .p4h-seo-footer-grid {
          grid-template-columns: 1.2fr 1fr;
        }
        @media (max-width: 840px) {
          .p4h-seo-footer-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "8px 0",
          justifyContent: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <a
          href="https://eservicii.anpc.ro/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="ANPC e-Servicii"
          title="ANPC e-Servicii"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--card)",
          }}
        >
          <img src="/ANPC.png" alt="ANPC" style={{ width: 120, height: "auto" }} />
        </a>
        <a
          href="https://stripe.com/en-ro/payments"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Stripe Payments"
          title="Stripe Payments"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--card)",
          }}
        >
          <img src="/STRIPE.png" alt="Stripe" style={{ width: 120, height: "auto" }} />
        </a>
      </div>

      {/* Related guides (simple links — no cards) */}
      <div style={{ padding: "6px 0", color: "var(--muted)" }} aria-label="Related guides">
        <Link className={styles.footerLink} href={checkinHref}>
          {checkinTitle}
        </Link>{" "}
        ·{" "}
        <Link className={styles.footerLink} href={messagesHref}>
          {messagesTitle}
        </Link>{" "}
        ·{" "}
        <Link className={styles.footerLink} href={thirdHref}>
          {thirdTitle}
        </Link>
      </div>

      <div className={styles.legalBar}>
        <p>
          Plan4Host · Bucharest, RO
        </p>
      </div>
    </footer>
  );
}
