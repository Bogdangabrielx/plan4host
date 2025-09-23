"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./home.module.css";

export default function HomePage() {
  const [navOpen, setNavOpen] = useState(false);
  const year = new Date().getFullYear();

  return (
    <main className={styles.landing}>
      {/* Accessible skip link */}
      <a href="#content" className={`${styles.skipLink} ${styles.focusable}`}>Skip to content</a>

      {/* Top Nav */}
      <nav
        className={styles.nav}
        data-open={navOpen ? "true" : "false"}
        aria-label="Primary"
      >
        <Link href="/" className={`${styles.brand} ${styles.focusable}`}>
          {/* logo corect și DIMENSIONAT */}
          <img src="/logo_fordark.png" alt="Plan4host" className={styles.logoDark} />
          <strong>Plan4host</strong>
        </Link>

        {/* Desktop menu */}
        <div className={styles.menu} id="nav-menu">
          <a href="#features" className={`${styles.menuLink} ${styles.focusable}`}>Features</a>
          <a href="#pricing" className={`${styles.menuLink} ${styles.focusable}`}>Pricing</a>
          <a href="#about" className={`${styles.menuLink} ${styles.focusable}`}>About</a>
          <a href="#contact" className={`${styles.menuLink} ${styles.focusable}`}>Contact</a>
        </div>

        {/* Actions + Mobile toggle */}
        <div className={styles.actions}>
          <Link href="/auth/login" className={`${styles.btn} ${styles.btnGhost} ${styles.focusable}`}>Sign in</Link>
          {/* Get started -> login in signup mode */}
          <Link
            href="/auth/login?mode=signup"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnText} ${styles.focusable}`}
          >
            Get started
          </Link>

          <button
            type="button"
            className={`${styles.btn} ${styles.menuToggle} ${styles.focusable}`}
            aria-controls="mobile-menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(v => !v)}
          >
            {navOpen ? "Close" : "Menu"}
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      <div
        id="mobile-menu"
        className={styles.mobileMenu}
        hidden={!navOpen}
      >
        <a href="#features" className={`${styles.mobileLink} ${styles.focusable}`} onClick={() => setNavOpen(false)}>Features</a>
        <a href="#pricing" className={`${styles.mobileLink} ${styles.focusable}`} onClick={() => setNavOpen(false)}>Pricing</a>
        <a href="#about" className={`${styles.mobileLink} ${styles.focusable}`} onClick={() => setNavOpen(false)}>About</a>
        <a href="#contact" className={`${styles.mobileLink} ${styles.focusable}`} onClick={() => setNavOpen(false)}>Contact</a>
      </div>

      {/* Hero */}
      <section id="content" className={styles.hero}>
        <div className={styles.heroText}>
          <h1>
            Stay Smart, <br>
            </br>Host{" "}
            <span className={styles.betterGrad}>Better</span>
          </h1>
          <p>
            Plan4host helps small accommodations manage occupancy, avoid double bookings,
            and sync calendars across channels with ease.
          </p>
          <div className={styles.heroCta}>
            {/* Start free -> login in signup mode */}
            <Link
              href="/auth/login?mode=signup"
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnText} ${styles.focusable}`}
            >
              Start free
            </Link>
            <a href="#features" className={`${styles.btn} ${styles.btnGhost} ${styles.focusable}`}>See features</a>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Calendar preview">
          <Image
            src="/hero_calendar.png"
            alt=""
            width={900}
            height={600}
            priority
            sizes="(max-width: 900px) 100vw, 50vw"
            className={styles.focusable}
          />
        </div>
      </section>

      {/* Features — după textul tău + PNG-uri */}
      <section id="features" className={styles.features} aria-labelledby="features-title">
        <h2 id="features-title">Features</h2>
        <div className={styles.featureGrid}>
          <article className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
            <div className={styles.featureHead}>
              <img src="/dashboard_fordark.png" alt="" aria-hidden="true" className={styles.featureIcon} />
              <h3>Easy-to-use Dashboard</h3>
            </div>
            <p>Bring all your properties into one simple dashboard and shape it your way, with flexibility to customize every detail.</p>
          </article>

          <article className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
            <div className={styles.featureHead}>
              <img src="/configurator_fordark.png" alt="" aria-hidden="true" className={styles.featureIcon} />
              <h3>Property Setup</h3>
            </div>
            <p>Quickly configure each property to match your needs—add rooms, adjust details, and personalize settings for a smooth workflow.</p>
          </article>

          <article className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
            <div className={styles.featureHead}>
              <img src="/calendar_fordark.png" alt="" aria-hidden="true" className={styles.featureIcon} />
              <h3>Adaptive Calendar</h3>
            </div>
            <p>Your calendar, your way. Customize views, organize reservations, and keep everything visible at a glance.</p>
          </article>

          <article className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
            <div className={styles.featureHead}>
              <img src="/ical_fordark.png" alt="" aria-hidden="true" className={styles.featureIcon} />
              <h3>Automatic Sync</h3>
            </div>
            <p>Sync reservations with Airbnb, Booking.com and more; according to your subscription plan—keeping calendars always up to date, effortlessly.</p>
          </article>
        </div>
      </section>

      {/* Pricing — BASIC / STANDARD / PREMIUM */}
      <section id="pricing" className={styles.pricing} aria-labelledby="pricing-title">
        <h2 id="pricing-title">Pricing</h2>
        <div className={styles.pricingGrid}>
          <div className={styles.priceCard}>
            <div className={styles.priceTier}>BASIC</div>
            <ul className={styles.priceList}>
              <li>Adaptive calendar</li>
              <li>Online check-in form</li>
              <li>Unlimited properties and rooms listed</li>
              <li>Autosync every 60 minutes with iCal</li>
            </ul>
            <img className={styles.priceImg} src="/basic.png" alt="" aria-hidden="true" />
            <Link href="/auth/signup" className={`${styles.btn} ${styles.btnPrimary} ${styles.focusable}`}>Choose Basic</Link>
          </div>

          <div className={styles.priceCard}>
            <div className={styles.priceTier}>STANDARD</div>
            <ul className={styles.priceList}>
              <li>Adaptive calendar</li>
              <li>Online check-in form</li>
              <li>Unlimited properties and rooms listed</li>
              <li>Autosync every 30 minutes with iCal</li>
              <li>Smart cleaning board (Advanced Next-Check-In Priority)</li>
            </ul>
            <img className={styles.priceImg} src="/standard.png" alt="" aria-hidden="true" />
            <Link href="/auth/signup" className={`${styles.btn} ${styles.btnPrimary} ${styles.focusable}`}>Choose Standard</Link>
          </div>

          <div className={styles.priceCard}>
            <div className={styles.priceTier}>PREMIUM</div>
            <ul className={styles.priceList}>
              <li>Adaptive calendar</li>
              <li>Online check-in form</li>
              <li>Unlimited properties and rooms listed</li>
              <li>Autosync every 10 minutes with iCal + Sync Now Function</li>
              <li>Smart cleaning board - Advanced Next-Check-In Priority</li>
              <li>Delegate tasks with your team members</li>
            </ul>
            <img className={styles.priceImg} src="/premium.png" alt="" aria-hidden="true" />
            <Link href="/auth/signup" className={`${styles.btn} ${styles.btnPrimary} ${styles.focusable}`}>Choose Premium</Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className={styles.about} aria-labelledby="about-title">
        <h2 id="about-title">About</h2>
        <p>
         Plan4Host helps small hotels and property managers run smoother operations<br>
        </br>with an adaptive calendar,simple property setup, and powerful team workflows. <br>
        </br>Our goal is to keep things fast, reliable, and easy to use. <br>
        </br>Built with care for clarity and performance,<br>
        </br>Plan4Host focuses on the tools you actually use every day:<br>
        </br>calendars, cleaning, guest overview and iCal synchronization that just works.
        </p>
      </section>

      {/* Contact */}
      <section id="contact" className={styles.contact} aria-labelledby="contact-title">
        <h2 id="contact-title">Contact</h2>
        <div className={styles.contactCard}>
          <p>We’re just an email away: <a className={styles.focusable} href="mailto:office@plan4host.com">office@plan4host.com</a>.</p>
        </div>
      </section>

      {/* Footer (expanded) */}
      <footer className={styles.footer} aria-labelledby="footer-title">
        <h2 id="footer-title" className={styles.srOnly}>Footer</h2>

        <div className={styles.footerGrid}>
          <div className={styles.footerCol}>
            <div className={styles.footerBrand}>
              <img src="/logo_fordark.png" alt="" aria-hidden="true" className={styles.logoLight} />
              <img src="/logo_fordark.png" alt="" aria-hidden="true" className={styles.logoDark} />
              <strong>Plan4host</strong>
            </div>
            <p className={styles.footerCopy}>
              Lightweight booking calendar &amp; channel sync for small accommodations.
            </p>
          </div>

          <div className={styles.footerCol}>
            <div className={styles.footerTitle}>Product</div>
            <ul className={styles.footerList}>
              <li><a className={styles.footerLink} href="#features">Features</a></li>
              <li><a className={styles.footerLink} href="#pricing">Pricing</a></li>
              {/* Start free -> login in signup mode */}
              <li><Link className={styles.footerLink} href="/auth/login?mode=signup">Start free</Link></li>
              <li><Link className={styles.footerLink} href="/auth/login">Sign in</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <div className={styles.footerTitle}>Resources</div>
            <ul className={styles.footerList}>
              <li><Link className={styles.footerLink} href="/docs">Docs</Link></li>
              <li><Link className={styles.footerLink} href="/changelog">Changelog</Link></li>
              <li><Link className={styles.footerLink} href="/status">Status</Link></li>
              <li><a className={styles.footerLink} href="mailto:office@plan4host.com">Support</a></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <div className={styles.footerTitle}>Company</div>
            <ul className={styles.footerList}>
              <li><Link className={styles.footerLink} href="/about">About us</Link></li>
              <li><Link className={styles.footerLink} href="/contact">Contact</Link></li>
              <li><Link className={styles.footerLink} href="/careers">Careers</Link></li>
              <li><Link className={styles.footerLink} href="/partners">Partners</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <div className={styles.footerTitle}>Legal</div>
            <ul className={styles.footerList}>
              <li><Link className={styles.footerLink} href="/legal/terms">Terms &amp; Conditions</Link></li>
              <li><Link className={styles.footerLink} href="/legal/privacy">Privacy Policy</Link></li>
              <li><Link className={styles.footerLink} href="/legal/dpa">Data Processing Addendum</Link></li>
              <li><Link className={styles.footerLink} href="/legal/cookies">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className={styles.legalBar}>
          <p>
            © {year} Plan4host. All rights reserved. By using Plan4host you agree to our{" "}
            <Link className={styles.footerLink} href="/legal/terms">Terms &amp; Conditions</Link> and{" "}
            <Link className={styles.footerLink} href="/legal/privacy">Privacy Policy</Link>.
          </p>
          <p className={styles.legalMeta}>
            Plan4host is not affiliated with Airbnb or Booking.com. Trademarks belong to their respective owners.
          </p>
        </div>
      </footer>
    </main>
  );
}