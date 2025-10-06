
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./home.module.css";
import { createPortal } from "react-dom";
import AutoOpenOnLanding from "@/components/consent/AutoOpenOnLanding";
// ...

<AutoOpenOnLanding delay={150} />

/** CTA Link that triggers the sparkle animation on touch devices before navigating */
function CtaLink({
  href,
  className,
  children,
  onNavigate,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    // Allow new tab / middle click / modified clicks to behave normally
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    const isTouch =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(hover: none)").matches;

    if (isTouch) {
      e.preventDefault();
      const el = ref.current;
      // Start animation
      el?.setAttribute("data-animate", "true");
      // Let the animation play a bit, then navigate
      window.setTimeout(() => {
        el?.removeAttribute("data-animate");
        router.push(href);
        onNavigate?.();
      }, 280);
    }
    // On non-touch devices we let normal navigation happen (hover already animates)
  };

  return (
    <Link href={href} ref={ref} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}

/* ──────────────────────────────────────────────────────────────
   FeatureCarousel — responsive: full-width slides on mobile,
   scrollable carousel with arrows on desktop.
   ────────────────────────────────────────────────────────────── */
function FeatureCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  const getStep = () => {
    const el = trackRef.current;
    if (!el) return 0;
    const first = el.querySelector('[data-card]') as HTMLElement | null;
    if (first) return first.offsetWidth + 20; // include gap
    return Math.max(280, Math.floor(el.clientWidth * 0.9));
  };

  const prev = () => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: -getStep(), behavior: 'smooth' });
  };
  const next = () => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: getStep(), behavior: 'smooth' });
  };

  return (
    <div className={styles.featureCarousel}>
      <button type="button" aria-label="Previous features" className={`${styles.carouselBtn} ${styles.carouselBtnLeft}`} onClick={prev}>‹</button>
      <div className={styles.featureTrack} ref={trackRef}>
        <article data-card className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
          <div className={styles.featureHead}>
            <img src="/dashboard_forlight.png" alt="" aria-hidden="true" className={styles.featureIcon} />
            <h3>Easy-to-use Dashboard</h3>
          </div>
          <p>Bring all your properties into one simple dashboard and shape it your way, with flexibility to customize every detail.</p>
        </article>

        <article data-card className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
          <div className={styles.featureHead}>
            <img src="/configurator_forlight.png" alt="" aria-hidden="true" className={styles.featureIcon} />
            <h3>Property Setup</h3>
          </div>
          <p>Quickly configure each property to match your needs—add rooms, adjust details, and personalize settings for a smooth workflow.</p>
        </article>

        <article data-card className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
          <div className={styles.featureHead}>
            <img src="/calendar_forlight.png" alt="" aria-hidden="true" className={styles.featureIcon} />
            <h3>Adaptive Calendar</h3>
          </div>
          <p>Your calendar, your way. Customize views, organize reservations, and keep everything visible at a glance.</p>
        </article>

        <article data-card className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
          <div className={styles.featureHead}>
            <img src="/ical_forlight.png" alt="" aria-hidden="true" className={styles.featureIcon} />
            <h3>Automatic Sync</h3>
          </div>
          <p>Sync reservations with Airbnb, Booking.com and more; according to your subscription plan—keeping calendars always up to date, effortlessly.</p>
        </article>

        <article data-card className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
          <div className={styles.featureHead}>
            <img src="/guest_fordark.png" alt="" aria-hidden="true" className={styles.featureIcon} />
            <h3>Secured Check-in Form</h3>
          </div>
          <p>Collect guest details safely before arrival—identity document upload, consent and instant email confirmation—all in a streamlined, GDPR‑friendly flow.</p>
        </article>

        <article data-card className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
          <div className={styles.featureHead}>
            <img src="/team_forlight.png" alt="" aria-hidden="true" className={styles.featureIcon} />
            <h3>Delegate Tasks</h3>
          </div>
          <p>Invite teammates (editor/viewer), assign scope‑based access (calendar, cleaning, channels, property setup) and delegate daily tasks with confidence.</p>
        </article>
      </div>
      <button type="button" aria-label="Next features" className={`${styles.carouselBtn} ${styles.carouselBtnRight}`} onClick={next}>›</button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   CookieConsentLanding — doar Necessary + Preferences (tema)
   - persistă 180 zile în localStorage + cookie
   - blochează pagina până se alege o opțiune
   - UI: Accept preferences / Only necessary / Customize (+ Save)
   - folosește .modalFlipWrapper / .modalCard din globals.css
   ────────────────────────────────────────────────────────────── */
function CookieConsentLanding() {
  type ConsentShape = { necessary: true; preferences: boolean };
  const LS_KEY = "p4h:consent:v2";
  const COOKIE_NAME = "p4h_consent";
  const EXPIRE_DAYS = 180;

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [preferences, setPreferences] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // citește consimțământ existent
  useEffect(() => {
    try {
      const now = Date.now();

      const ls = (() => {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        const expMs = Date.parse(obj?.exp || "");
        if (Number.isFinite(expMs) && expMs > now) return obj as { consent: ConsentShape };
        return null;
      })();

      const ck = (() => {
        const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
        if (!m) return null;
        try {
          const obj = JSON.parse(decodeURIComponent(m[1] || ""));
          if (obj?.consent?.necessary) return obj as { consent: ConsentShape };
          if (obj?.necessary) return { consent: obj as ConsentShape };
        } catch {}
        return null;
      })();

      const existing = ls ?? ck;
      if (existing?.consent) {
        setPreferences(!!existing.consent.preferences);
        document.documentElement.setAttribute("data-consent-preferences", String(!!existing.consent.preferences));
        setOpen(false);
      } else {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  // blochează scroll & pune inert pe main când e deschis
  useEffect(() => {
    if (!mounted) return;
    const main = document.querySelector("main") as HTMLElement | null;

    if (open) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      if (main) (main as any).inert = true; // inert nativ (suportat modern)
      return () => {
        document.body.style.overflow = prevOverflow;
        if (main) (main as any).inert = false;
      };
    } else {
      if (main) (main as any).inert = false;
    }
  }, [open, mounted]);

  function persist(consent: ConsentShape) {
    const now = new Date();
    const exp = new Date(now.getTime() + EXPIRE_DAYS * 24 * 60 * 60 * 1000);
    const payload = { v: 2, ts: now.toISOString(), exp: exp.toISOString(), consent };

    try { localStorage.setItem(LS_KEY, JSON.stringify(payload)); } catch {}

    try {
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie =
        `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(payload))}; Max-Age=${EXPIRE_DAYS * 24 * 60 * 60}; Path=/; SameSite=Lax${secure}`;
    } catch {}

    document.documentElement.setAttribute("data-consent-preferences", String(!!consent.preferences));
    try { window.dispatchEvent(new CustomEvent("p4h:consent", { detail: payload })); } catch {}
  }

  const acceptOnlyNecessary = () => { persist({ necessary: true, preferences: false }); setOpen(false); };
  const acceptPreferences   = () => { persist({ necessary: true, preferences: true  }); setOpen(false); };
  const savePrefs           = () => { persist({ necessary: true, preferences       }); setOpen(false); };

  if (!mounted || !open) return null;

  // 🔝 randăm ÎN BODY ca să scăpăm de stacking-context & gating
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie consent"
      // TOP of viewport: schimbi alignItems în "center" dacă vrei centrat
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483646,
        display: "grid",
        alignItems: "start",
        justifyItems: "center",
        padding: "clamp(12px, 6vh, 40px) 12px",
        background: "color-mix(in srgb, var(--bg, #0b1117) 55%, transparent)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
      onClick={() => setShowPrefs(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modalCard"
        data-animate="true"
        style={{
          width: "min(560px, calc(100vw - 32px))",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 22,
          padding: 20,
          boxShadow: "0 14px 40px rgba(0,0,0,.35)",
          display: "grid",
          gap: 12,
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            aria-hidden
            style={{
              fontSize: 28,
              lineHeight: 1,
              width: 44,
              height: 44,
              display: "grid",
              placeItems: "center",
              borderRadius: 12,
              background:
                "radial-gradient(60% 60% at 30% 20%, rgba(255,255,255,.16), transparent), color-mix(in srgb, var(--primary) 18%, var(--card))",
              boxShadow: "0 8px 24px rgba(0,0,0,.35), inset 0 0 0 1px color-mix(in srgb, var(--border) 60%, transparent)",
            }}
          >
            🍪
          </div>
          <div>
            <h3 style={{ margin: 0 }}>We use cookies</h3>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Essential cookies keep the site working. Optionally, we can remember your <strong>theme</strong> (light/dark).
            </div>
          </div>
        </div>

        {/* actions */}
        {!showPrefs ? (
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={acceptPreferences}
                className="sb-btn sb-btn--primary"
                style={{ padding: "10px 14px", borderRadius: 12, fontWeight: 900 }}
              >
                Accept preferences
              </button>
              <button
                onClick={acceptOnlyNecessary}
                className="sb-btn"
                style={{ padding: "10px 14px", borderRadius: 12, background: "var(--card)", fontWeight: 900 }}
              >
                Only necessary
              </button>
              <button
                onClick={() => setShowPrefs(true)}
                className="sb-btn"
                style={{ padding: "10px 14px", borderRadius: 12, background: "transparent", border: "1px solid var(--border)", fontWeight: 900 }}
              >
                Customize
              </button>
            </div>
            <small style={{ color: "var(--muted)" }}>
              Read more in our{" "}
              <Link href="/legal/cookies" style={{ color: "var(--primary)", textDecoration: "none" }}>
                Cookie Policy
              </Link>.
            </small>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                border: "1px solid var(--border)",
                background: "var(--panel)",
                borderRadius: 12,
                padding: 12,
                display: "grid",
                gap: 10,
              }}
            >
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>Essential</strong>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>Required for the site to function</div>
                </div>
                <input type="checkbox" checked readOnly aria-label="Essential cookies required" />
              </label>

              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>Preferences</strong>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>Remembers your theme (light/dark)</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences}
                  onChange={(e) => setPreferences(e.currentTarget.checked)}
                  aria-label="Preferences cookie"
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                onClick={() => setShowPrefs(false)}
                className="sb-btn"
                style={{ padding: "10px 14px", borderRadius: 12 }}
              >
                Back
              </button>
              <button
                onClick={savePrefs}
                className="sb-btn sb-btn--primary"
                style={{ padding: "10px 14px", borderRadius: 12, fontWeight: 900 }}
              >
                Save preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
export default function HomePage() {
  const [navOpen, setNavOpen] = useState(false);
  const year = new Date().getFullYear();

  return (
    <main className={styles.landing}>
      {/* Safe-area cover (iOS notch) — landing only */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 'var(--safe-top)',
          background: 'var(--bg)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />
      {/* Left/right/bottom safe-area covers to avoid see-through on iOS bounce/edges */}
      <div aria-hidden style={{ position:'fixed', bottom:0, left:0, right:0, height:'var(--safe-bottom)', background:'var(--bg)', zIndex:3, pointerEvents:'none' }} />
      <div aria-hidden style={{ position:'fixed', top:0, bottom:0, left:0, width:'var(--safe-left)', background:'var(--bg)', zIndex:3, pointerEvents:'none' }} />
      <div aria-hidden style={{ position:'fixed', top:0, bottom:0, right:0, width:'var(--safe-right)', background:'var(--bg)', zIndex:3, pointerEvents:'none' }} />

      {/* Accessible skip link */}
      <a href="#content" className={`${styles.skipLink} ${styles.focusable}`}>
        Skip to content
      </a>

      {/* Top Nav */}
      <nav
        className={styles.nav}
        data-open={navOpen ? "true" : "false"}
        aria-label="Primary"
      >
        <Link href="/" className={`${styles.brand} ${styles.focusable}`}>
          <img src="/logo_forlight.png" alt="Plan4host" className={styles.logoDark} />
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
          <Link href="/auth/login" className={`${styles.btn} ${styles.btnGhost} ${styles.focusable}`}>
            Sign in
          </Link>

          {/* Get started -> login in signup mode (animated) */}
          <CtaLink
            href="/auth/login?mode=signup"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnText} ${styles.focusable}`}
          >
            Get started
          </CtaLink>

          <button
            type="button"
            className={`${styles.btn} ${styles.menuToggle} ${styles.focusable}`}
            aria-controls="mobile-menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            {navOpen ? "Close" : "Menu"}
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      <div id="mobile-menu" className={styles.mobileMenu} hidden={!navOpen}>
        <a
          href="#features"
          className={`${styles.mobileLink} ${styles.focusable}`}
          onClick={() => setNavOpen(false)}
        >
          Features
        </a>
        <a
          href="#pricing"
          className={`${styles.mobileLink} ${styles.focusable}`}
          onClick={() => setNavOpen(false)}
        >
          Pricing
        </a>
        <a
          href="#about"
          className={`${styles.mobileLink} ${styles.focusable}`}
          onClick={() => setNavOpen(false)}
        >
          About
        </a>
        <a
          href="#contact"
          className={`${styles.mobileLink} ${styles.focusable}`}
          onClick={() => setNavOpen(false)}
        >
          Contact
        </a>
      </div>

      {/* Hero */}
      <section id="content" className={styles.hero}>
        <div className={styles.heroText}>
          <h1>
            Stay Smart, <br />Host <span className={styles.betterGrad}>Better</span>
          </h1>
          <p>
            Plan4Host helps small accommodations manage occupancy, avoid double bookings
            and sync calendars across channels with ease.
          </p>
          <div className={styles.heroCta}>
            {/* Start free -> login in signup mode (animated) */}
            <CtaLink
              href="/auth/login?mode=signup"
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnText} ${styles.focusable}`}
            >
              Start free
            </CtaLink>
            <a href="#features" className={`${styles.btn} ${styles.btnGhost} ${styles.focusable}`}>
              See features
            </a>
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

      {/* Features */}
      <section id="features" className={styles.features} aria-labelledby="features-title">
        <h2 id="features-title">Features</h2>
        <FeatureCarousel />
      </section>

      {/* Pricing */}
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
            <Link
              href="/auth/login?mode=signup&plan=basic&next=%2Fapp%2Fsubscription%3Fplan%3Dbasic%26hl%3D1"
              className={`${styles.btn} ${styles.btnChoose} ${styles.focusable}`}
            >
              Choose Basic
            </Link>
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
            <Link
              href="/auth/login?mode=signup&plan=standard&next=%2Fapp%2Fsubscription%3Fplan%3Dstandard%26hl%3D1"
              className={`${styles.btn} ${styles.btnChoose} ${styles.focusable}`}
            >
              Choose Standard
            </Link>
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
            <Link
              href="/auth/login?mode=signup&plan=premium&next=%2Fapp%2Fsubscription%3Fplan%3Dpremium%26hl%3D1"
              className={`${styles.btn} ${styles.btnChoose} ${styles.focusable}`}
            >
              Choose Premium
            </Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className={styles.about} aria-labelledby="about-title">
        <h2 id="about-title">About</h2>
        <p>
          Plan4Host helps small hotels and property managers run smoother operations
          <br />
          with an adaptive calendar, simple property setup and powerful team workflows. 
          <br />
          Our goal is to keep things fast, reliable and easy to use.
          <br />
          Built with care for clarity and performance,
          <br />
          Plan4Host focuses on the tools you actually use every day:
          <br />
          calendars, cleaning, guest overview and iCal synchronization that just works.
        </p>
      </section>

      {/* Contact */}
      <section id="contact" className={styles.contact} aria-labelledby="contact-title">
        <h2 id="contact-title">Contact</h2>
        <div className={styles.contactCard}>
          <p>
            We’re just an email away:{" "}
            <a className={styles.focusable} href="mailto:office@plan4host.com">
              office@plan4host.com
            </a>.
          </p>
        </div>
      </section>

      {/* Footer (expanded) */}
      <footer className={styles.footer} aria-labelledby="footer-title">
        <h2 id="footer-title" className={styles.srOnly}>
          Footer
        </h2>

        <div className={styles.footerGrid}>
          <div className={styles.footerCol}>
            <div className={styles.footerBrand}>
              <img src="/logo_forlight.png" alt="" aria-hidden="true" className={styles.logoDark} />
              <strong>Plan4Host</strong>
            </div>
            <p className={styles.footerCopy}>
              Lightweight booking calendar &amp; channel sync for small accommodations.
            </p>
            {/* Mobile-only: show footer columns directly under the short copy */}
            <div className={styles.footerStacksMobile}>
              <div>
                <div className={styles.footerTitle}>Product</div>
                <ul className={styles.footerList}>
                  <li><a className={styles.footerLink} href="#features">Features</a></li>
                  <li><a className={styles.footerLink} href="#pricing">Pricing</a></li>
                  <li><Link className={styles.footerLink} href="/auth/login?mode=signup">Start free</Link></li>
                  <li><Link className={styles.footerLink} href="/auth/login">Sign in</Link></li>
                </ul>
              </div>
              <div>
                <div className={styles.footerTitle}>Resources</div>
                <ul className={styles.footerList}>
                  <li><Link className={styles.footerLink} href="/docs">Docs</Link></li>
                  <li><Link className={styles.footerLink} href="/changelog">Changelog</Link></li>
                  <li><Link className={styles.footerLink} href="/status">Status</Link></li>
                  <li><a className={styles.footerLink} href="mailto:office@plan4host.com">Support</a></li>
                </ul>
              </div>
              <div>
                <div className={styles.footerTitle}>Company</div>
                <ul className={styles.footerList}>
                  <li><Link className={styles.footerLink} href="/about">About us</Link></li>
                  <li><Link className={styles.footerLink} href="#contact">Contact</Link></li>
                  <li><Link className={styles.footerLink} href="/careers">Careers</Link></li>
                  <li><Link className={styles.footerLink} href="/partners">Partners</Link></li>
                </ul>
              </div>
              <div>
                <div className={styles.footerTitle}>Legal</div>
                <ul className={styles.footerList}>
                  <li><Link className={styles.footerLink} href="/legal/terms">Terms &amp; Conditions</Link></li>
                  <li><Link className={styles.footerLink} href="/legal/privacy">Privacy Policy</Link></li>
                  <li><Link className={styles.footerLink} href="/legal/dpa">Data Processing Addendum</Link></li>
                  <li><Link className={styles.footerLink} href="/legal/cookies">Cookie Policy</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className={styles.footerCol}>
            <div className={styles.footerTitle}>Product</div>
            <ul className={styles.footerList}>
              <li><a className={styles.footerLink} href="#features">Features</a></li>
              <li><a className={styles.footerLink} href="#pricing">Pricing</a></li>
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
              <li><Link className={styles.footerLink} href="#contact">Contact</Link></li>
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
            © {year} Plan4Host. All rights reserved. By using Plan4Host you agree to our{" "}
            <Link className={styles.footerLink} href="/legal/terms">Terms &amp; Conditions</Link> and{" "}
            <Link className={styles.footerLink} href="/legal/privacy">Privacy Policy</Link>.
          </p>
          <p className={styles.legalMeta}>
            Plan4Host is not affiliated with Airbnb or Booking.com. Trademarks belong to their respective owners.
          </p>
        </div>
      </footer>

      {/* 🍪 Cookie consent — doar pe landing */}
      <CookieConsentLanding />
    </main>
  );
}
