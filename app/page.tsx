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
          {/* folosim același logo pentru ambele moduri, după cum ai cerut */}
          <img src="/logo_fordark.png" alt="Plan4host" height={24} className={styles.logoLight} />
          <img src="/logo_fordark.png" alt="Plan4host" height={24} className={styles.logoDark} />
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
          <Link href="/auth/signup" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnText} ${styles.focusable}`}>
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
          <h1>Stay Smart, Host Better</h1>
          <p>
            Plan4host helps small accommodations manage occupancy, avoid double bookings,
            and sync calendars across channels with ease.
          </p>
          <div className={styles.heroCta}>
            <Link href="/auth/signup" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnText} ${styles.focusable}`}>
              Start free
            </Link>
            <a href="#features" className={`${styles.btn} ${styles.btnGhost} ${styles.focusable}`}>See features</a>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Calendar preview">
          <Image
            src="/screens/hero-calendar.png"
            alt=""
            width={900}
            height={600}
            priority
            sizes="(max-width: 900px) 100vw, 50vw"
            className={styles.focusable}
          />
        </div>
      </section>

      {/* Features — revenite pe varianta ta + PNG icons */}
      <section id="features" className={styles.features} aria-labelledby="features-title">
        <h2 id="features-title">Features</h2>
        <div className={styles.featureGrid}>
          <article className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
            <div className={styles.featureHead}>
              <img src="/icons/sync.png" alt="" aria-hidden="true" className={styles.featureIcon} />
              <h3>iCal Import / Export</h3>
            </div>
            <p>Sync reservations with Airbnb, Booking.com and more. Retry &amp; logging built-in.</p>
          </article>

          <article className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
            <div className={styles.featureHead}>
              <img src="/icons/cleaning.png" alt="" aria-hidden="true" className={styles.featureIcon} />
              <h3>Cleaning Board</h3>
            </div>
            <p>Daily tasks with carry-over logic so your team never misses a turnover.</p>
          </article>

          <article className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
            <div className={styles.featureHead}>
              <img src="/icons/fields.png" alt="" aria-hidden="true" className={styles.featureIcon} />
              <h3>Custom Fields</h3>
            </div>
            <p>Capture what matters: guest notes, access codes, add-ons — fully configurable.</p>
          </article>

          <article className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
            <div className={styles.featureHead}>
              <img src="/icons/guard.png" alt="" aria-hidden="true" className={styles.featureIcon} />
              <h3>Plan Guard</h3>
            </div>
            <p>Feature gating with clear upgrade CTAs. No surprises, no hidden limits.</p>
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
              <li>1 property</li>
              <li>iCal export</li>
              <li>Email support</li>
            </ul>
            <img className={styles.priceImg} src="/illustrations/leaf.svg" alt="" aria-hidden="true" />
            <Link href="/auth/signup" className={`${styles.btn} ${styles.btnPrimary} ${styles.focusable}`}>Choose Basic</Link>
          </div>

          <div className={styles.priceCard}>
            <div className={styles.priceTier}>STANDARD</div>
            <ul className={styles.priceList}>
              <li>Up to 5 properties</li>
              <li>iCal import &amp; export</li>
              <li>Cleaning board</li>
            </ul>
            <img className={styles.priceImg} src="/illustrations/planet.svg" alt="" aria-hidden="true" />
            <Link href="/auth/signup" className={`${styles.btn} ${styles.btnPrimary} ${styles.focusable}`}>Choose Standard</Link>
          </div>

          <div className={styles.priceCard}>
            <div className={styles.priceTier}>PREMIUM</div>
            <ul className={styles.priceList}>
              <li>Unlimited properties</li>
              <li>Autosync + logs</li>
              <li>Priority support</li>
            </ul>
            <img className={styles.priceImg} src="/illustrations/rocket.svg" alt="" aria-hidden="true" />
            <Link href="/auth/signup" className={`${styles.btn} ${styles.btnPrimary} ${styles.focusable}`}>Choose Premium</Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className={styles.about} aria-labelledby="about-title">
        <h2 id="about-title">About</h2>
        <p>
          We build hospitality tools that are simple, fast, and fair. No dark patterns, no lock-in.
          Your data stays yours.
        </p>
      </section>

      {/* Contact */}
      <section id="contact" className={styles.contact} aria-labelledby="contact-title">
        <h2 id="contact-title">Contact</h2>
        <div className={styles.contactCard}>
          <p>Questions? Reach us at <a className={styles.focusable} href="mailto:hello@plan4host.com">hello@plan4host.com</a>.</p>
        </div>
      </section>

      {/* Footer (expanded, SaaS-style) */}
      <footer className={styles.footer} aria-labelledby="footer-title">
        <h2 id="footer-title" className="sr-only">Footer</h2>

        <div className={styles.footerGrid}>
          <div className={styles.footerCol}>
            <div className={styles.footerBrand}>
              <img src="/logo_fordark.png" alt="" aria-hidden="true" height={22} className={styles.logoLight} />
              <img src="/logo_fordark.png" alt="" aria-hidden="true" height={22} className={styles.logoDark} />
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
              <li><Link className={styles.footerLink} href="/auth/signup">Start free</Link></li>
              <li><Link className={styles.footerLink} href="/auth/login">Sign in</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <div className={styles.footerTitle}>Resources</div>
            <ul className={styles.footerList}>
              <li><Link className={styles.footerLink} href="/docs">Docs</Link></li>
              <li><Link className={styles.footerLink} href="/changelog">Changelog</Link></li>
              <li><Link className={styles.footerLink} href="/status">Status</Link></li>
              <li><a className={styles.footerLink} href="mailto:hello@plan4host.com">Support</a></li>
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