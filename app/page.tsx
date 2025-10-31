
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeIdxRef = useRef<number>(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [modalIdx, setModalIdx] = useState<number|null>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => setIsMobile(!!mq.matches);
    apply();
    try { mq.addEventListener('change', apply); } catch { mq.addListener(apply as any); }
    return () => { try { mq.removeEventListener('change', apply); } catch { mq.removeListener(apply as any); } };
  }, []);

  const feats = [
    { icon: "/guest_forlight.png", title: "Secured Check-in Form", text: "Collect guest details safely — ID upload, consent, instant email." },
    { icon: "/ical_forlight.png", title: "Automatic Sync", text: "Keep calendars aligned with Airbnb/Booking via iCal." },
    { icon: "/dashboard_forlight.png", title: "Easy Dashboard", text: "Manage all properties in one simple place." },
    { icon: "/configurator_forlight.png", title: "Property Setup", text: "Add rooms, set defaults, tailor settings in minutes." },
    { icon: "/calendar_forlight.png", title: "Adaptive Calendar", text: "Customize views and organize bookings at a glance." },
    { icon: "/team_forlight.png", title: "Delegate Tasks", text: "Invite teammates and delegate daily tasks." },
  ];

  const getStep = () => {
    const el = trackRef.current;
    if (!el) return 0;
    const first = el.querySelector('[data-card]') as HTMLElement | null;
    if (first) return first.offsetWidth + 20; // include gap
    return Math.max(280, Math.floor(el.clientWidth * 0.9));
  };

  const centerCard = (idx: number) => {
    const track = trackRef.current; if (!track) return;
    const cards = Array.from(track.querySelectorAll<HTMLElement>('[data-card]'));
    const target = cards[idx]; if (!target) return;
    const targetCenter = target.offsetLeft + target.offsetWidth / 2;
    const left = Math.max(0, targetCenter - track.clientWidth / 2);
    track.scrollTo({ left, behavior: 'smooth' });
  };

  const prev = () => {
    const track = trackRef.current; if (!track) return;
    const cards = Array.from(track.querySelectorAll<HTMLElement>('[data-card]'));
    const N = cards.length || 1;
    activeIdxRef.current = (activeIdxRef.current - 1 + N) % N;
    centerCard(activeIdxRef.current);
    setActive(activeIdxRef.current);
  };
  const next = () => {
    const track = trackRef.current; if (!track) return;
    const cards = Array.from(track.querySelectorAll<HTMLElement>('[data-card]'));
    activeIdxRef.current = (activeIdxRef.current + 1) % cards.length;
    centerCard(activeIdxRef.current);
    setActive(activeIdxRef.current);
  };

  const updateActive = () => {
    const track = trackRef.current; if (!track) return;
    const cards = Array.from(track.querySelectorAll<HTMLElement>('[data-card]'));
    if (!cards.length) return;
    const viewportCenter = track.scrollLeft + track.clientWidth / 2;
    let best = 0; let min = Infinity;
    cards.forEach((c, i) => {
      const cc = c.offsetLeft + c.offsetWidth / 2;
      const dist = Math.abs(cc - viewportCenter);
      if (dist < min) { min = dist; best = i; }
    });
    activeIdxRef.current = best;
    const N = cards.length;
    const prevIdx = (best - 1 + N) % N;
    const nextIdx = (best + 1) % N;
    cards.forEach((c, i) => {
      if (i === best) c.setAttribute('data-active', 'true'); else c.removeAttribute('data-active');
      if (i === prevIdx) c.setAttribute('data-prev', 'true'); else c.removeAttribute('data-prev');
      if (i === nextIdx) c.setAttribute('data-next', 'true'); else c.removeAttribute('data-next');
    });
  };

  // Mobile-only nudge effect when section scrolls into view
  useEffect(() => {
    const el = wrapRef.current;
    const track = trackRef.current;
    if (!el || !track) return;

    let nudged = false;
    const isMobile = () => {
      try { return window.matchMedia?.('(hover: none), (pointer: coarse), (max-width: 640px)')?.matches ?? false; } catch { return false; }
    };
    const canScroll = () => track.scrollWidth - track.clientWidth > 8;
    const nudge = () => {
      if (nudged || !isMobile() || !canScroll() || track.scrollLeft > 4) return;
      nudged = true;
      const dx = Math.min(48, Math.max(24, track.clientWidth * 0.12));
      try { track.scrollBy({ left: dx, behavior: 'smooth' }); } catch { track.scrollLeft += dx; }
      const t = window.setTimeout(() => {
        try { track.scrollBy({ left: -dx, behavior: 'smooth' }); } catch { track.scrollLeft -= dx; }
      }, 420);
      // safety clear
      window.setTimeout(() => window.clearTimeout(t), 1200);
    };

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio >= 0.4) {
          nudge();
          // initialize active on first reveal
          requestAnimationFrame(updateActive);
        }
      }
    }, { threshold: [0, 0.25, 0.4, 0.75, 1] });
    io.observe(el);
    const onScroll = () => updateActive();
    const onResize = () => updateActive();
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    // initial active
    requestAnimationFrame(updateActive);
    return () => { try { io.disconnect(); } catch {}; track.removeEventListener('scroll', onScroll as any); window.removeEventListener('resize', onResize); };
  }, []);

  // Autoplay disabled — slide changes only via arrows or swipe

  return (
    <div className={styles.featureCarousel} ref={wrapRef}>
      <button type="button" aria-label="Previous features" className={`${styles.carouselBtn} ${styles.carouselBtnLeft}`} onClick={prev}>‹</button>
      <div className={styles.featureTrack} ref={trackRef}>
        {/* 1) Secured Check-in Form (first) */}
        <article data-card className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
          <div className={styles.featureHead}>
            <img src="/guest_forlight.png" alt="" aria-hidden="true" className={styles.featureIcon} />
            <h3>Secured Check-in Form</h3>
          </div>
          <p>Collect guest details safely before arrival—identity document upload, consent and instant email confirmation—all in a streamlined, GDPR‑friendly flow.</p>
        </article>

        {/* 2) Automatic Sync (second) */}
        <article data-card className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
          <div className={styles.featureHead}>
            <img src="/ical_forlight.png" alt="" aria-hidden="true" className={styles.featureIcon} />
            <h3>Automatic Sync</h3>
          </div>
          <p>Sync reservations with Airbnb, Booking.com and more; according to your subscription plan—keeping calendars always up to date, effortlessly.</p>
        </article>

        {/* 3+) Rest in original order */}
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
            <img src="/team_forlight.png" alt="" aria-hidden="true" className={styles.featureIcon} />
            <h3>Delegate Tasks</h3>
          </div>
          <p>Invite teammates (editor/viewer), assign scope‑based access (calendar, cleaning, channels, property setup) and delegate daily tasks with confidence.</p>
        </article>
      </div>
      <div className={styles.featureViewport} ref={viewportRef}
        onPointerDown={(e)=>{ (e.currentTarget as any)._sx = e.clientX; }}
        onPointerUp={(e)=>{ const sx = (e.currentTarget as any)._sx as number|undefined; if (typeof sx==='number'){ const dx = e.clientX - sx; if (Math.abs(dx)>30){ if (dx<0) next(); else prev(); } } }}
      >
        {(() => {
          const n = feats.length; const i = ((active % n) + n) % n;
          const prevIdx = (i - 1 + n) % n; const nextIdx = (i + 1) % n;
          const order = [prevIdx, i, nextIdx];
          return order.map((idx, k) => {
            const f = feats[idx]; const role = k===0?'prev':k===1?'active':'next';
            return (
              <article key={idx} data-card data-prev={role==='prev'||undefined} data-active={role==='active'||undefined} data-next={role==='next'||undefined} className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}
                role={isMobile ? 'button' : undefined}
                onClick={() => { if (isMobile) setModalIdx(idx); }}
              >
                <div className={styles.featureHead} >
                  <img src={f.icon} alt="" aria-hidden="true" className={styles.featureIcon} />
                 <h3 style={{ fontSize: isMobile ? 9 : undefined }}>{f.title}</h3>
                </div>
                {!isMobile && <p>{f.text}</p>}
              </article>
            );
          });
        })()}
      </div>
      <button type="button" aria-label="Next features" className={`${styles.carouselBtn} ${styles.carouselBtnRight}`} onClick={next}>›</button>
      {isMobile && modalIdx !== null && (() => { const f = feats[(modalIdx!%feats.length+feats.length)%feats.length]; return (
        <div role="dialog" aria-modal="true" onClick={() => setModalIdx(null)}
          style={{ position:'fixed', inset:0, zIndex:120, background:'rgba(0,0,0,.55)', display:'grid', placeItems:'center', padding:12 }}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-cardglow" style={{ width:'min(520px, 92vw)', background:'var(--card)', border:'0.5px solid var(--border)', borderRadius:16, padding:16, display:'grid', gap:10 }}>
            <div style={{ alignItems:'center', gap:10 }}>
              <img src={f.icon} alt="" aria-hidden className={styles.featureIcon} />
              <h3 style={{ margin:0 }}>{f.title}</h3>
            </div>
            <p style={{ margin:0, color:'var(--muted)' }}>{f.text}</p>
            <button className="sb-btn sb-cardglow" onClick={() => setModalIdx(null)} style={{ justifySelf:'end' }}>Close</button>
          </div>
        </div>
      ); })()}
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
  const benefits: string[] = [
    "Custom digital check-in form",
    "GDPR consent, digital signature and ID copy",
    "QR code for check-in validation",
    "Push and email notification for each new reservation",
    "Automated messages scheduled by reservation",
    "Calendar integrations with multiple platforms (Booking, Airbnb, etc.)",
    "Automatic sync of reservations between platforms",
    "Unlimited properties and rooms in one account",
    "Internal notes for each reservation",
    "Custom checklists per reservation (breakfast included, daily towel change, etc.)",
    "Front desk from your phone (confirm/modify reservation)",
    "Export a PDF with each reservation's details",
    "Redirect to WhatsApp directly from reservation",
    "Prioritize room cleaning based on next check-in",
    "Personalized cleaning task list",
    "Real-time cleaning status updates",
    "Share daily activities with team members",
    "Instant sync of reservations in the app calendar",
  ];

  return (
    <main className={styles.landing} style={{ paddingBottom: "var(--safe-bottom, 0px)" }}>
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
        <div className={styles.brandWrap}>
          <Link href="/" className={`${styles.brand} ${styles.focusable}`}>
            <img src="/Logo_Landing.png" alt="Plan4host" className={styles.logoDark} />
          </Link>
          {/* Language near logo (mobile-friendly, no border) */}
          <Link href="/ro" className={`${styles.btnLang} ${styles.focusable}`} aria-label="Schimbă limba în română">
            <img src="/eng.png" alt="" width={22} height={22} style={{ display: 'block' }} />
          </Link>
        </div>

        {/* Desktop menu */}
        <div className={styles.menu} id="nav-menu">
          <a href="#features" className={`${styles.menuLink} ${styles.focusable}`}>Features</a>
          <a href="#pricing" className={`${styles.menuLink} ${styles.focusable}`}>Pricing</a>
          <a href="#about" className={`${styles.menuLink} ${styles.focusable}`}>About</a>
          <a href="#contact" className={`${styles.menuLink} ${styles.focusable}`}>Contact</a>
        </div>

        {/* Actions + Mobile toggle */}
        <div className={styles.actions}>
          <Link href="/auth/login" className={`sb-cardglow ${styles.btn} ${styles.btnGhost} ${styles.focusable}`}>
            Sign in
          </Link>

          {/* Get started -> login in signup mode (animated) */}
          <CtaLink
            href="/auth/login?mode=signup"
            className={`sb-cardglow ${styles.btn}  ${styles.btnChoose} ${styles.focusable}`}
          >
            Get started
          </CtaLink>

          <button
            type="button"
            className={`${styles.btn} ${styles.menuToggle} ${styles.focusable}`}
            aria-controls="mobile-menu"
            aria-expanded={navOpen}
            aria-label={navOpen ? "Close menu" : "Open menu"}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className={styles.srOnly}>{navOpen ? "Close" : "Menu"}</span>
            <span className={styles.menuIcon} aria-hidden>
              <svg viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 2h20"/>
                <path d="M2 8h20"/>
                <path d="M2 14h20"/>
              </svg>
            </span>
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
              className={`sb-cardglow ${styles.btn}  ${styles.btnChoose} ${styles.focusable}`}
            >
              Start free
            </CtaLink>
            <a href="#features" className={`sb-cardglow ${styles.btn} ${styles.btnGhost} ${styles.focusable}`}>
              See features
            </a>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Calendar preview">
          <video
            className={styles.focusable}
            src="/Hero_video2.mp4"
            poster="/Hero_video2.mp4"
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            style={{ width: '100%', height: 'auto', objectFit: 'contain', borderRadius: 12 }}
          >
            Sorry, your browser doesn’t support embedded videos.
          </video>
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
          <div className={`sb-cardglow ${styles.priceCard}`}>
            <div className={styles.priceTier}>BASIC</div>
            <ul className={styles.priceList}>
              {benefits.map((b, i) => {
                const basicX = [
                  'Prioritize room cleaning based on next check-in',
                  'Personalized cleaning task list',
                  'Real-time cleaning status updates',
                  'Share daily activities with team members',
                  'Instant sync of reservations in the app calendar',
                ].some((s) => b.includes(s));
                return (
                  <li key={`basic-b-${i}`}>
                    {basicX ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'var(--text)' }}>
                        <path d="M6 6L18 18M6 18L18 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <span>{b.startsWith('Automatic sync of reservations between platforms') ? 'Automatic sync of reservations between platforms (every 60 min)' : b}</span>
                  </li>
                );
              })}
            </ul>
            <img className={styles.priceImg} src="/basic_forlight.png" alt="" aria-hidden="true" />
            <Link
              href="/auth/login?mode=signup&plan=basic&next=%2Fapp%2Fsubscription%3Fplan%3Dbasic%26hl%3D1"
              className={`${styles.btn} ${styles.btnChoose} ${styles.focusable}`}
            >
              Choose Basic
            </Link>
          </div>

          <div className={`sb-cardglow ${styles.priceCard}`}>
            <div className={styles.priceTier}>STANDARD</div>
            <ul className={styles.priceList}>
              {benefits.map((b, i) => {
                const standardX = [
                  'Share daily activities with team members',
                  'Instant sync of reservations in the app calendar',
                ].some((s) => b.includes(s));
                return (
                  <li key={`standard-b-${i}`}>
                    {standardX ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'var(--text)' }}>
                        <path d="M6 6L18 18M6 18L18 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <span>{b.startsWith('Automatic sync of reservations between platforms') ? 'Automatic sync of reservations between platforms (every 30 min)' : b}</span>
                  </li>
                );
              })}
            </ul>
            <img className={styles.priceImg} src="/standard_forlight.png" alt="" aria-hidden="true" />
            <Link
              href="/auth/login?mode=signup&plan=standard&next=%2Fapp%2Fsubscription%3Fplan%3Dstandard%26hl%3D1"
              className={`${styles.btn} ${styles.btnChoose} ${styles.focusable}`}
            >
              Choose Standard
            </Link>
          </div>

          <div className={`sb-cardglow ${styles.priceCard}`}>
            <div className={styles.priceTier}>PREMIUM</div>
            <ul className={styles.priceList}>
              {benefits.map((b, i) => (
                <li key={`premium-b-${i}`}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{b.startsWith('Automatic sync of reservations between platforms') ? 'Automatic sync of reservations between platforms (every 10 min)' : b}</span>
                </li>
              ))}
            </ul>
            <img className={styles.priceImg} src="/premium_forlight.png" alt="" aria-hidden="true" />
            <Link
              href="/auth/login?mode=signup&plan=premium&next=%2Fapp%2Fsubscription%3Fplan%3Dpremium%26hl%3D1"
              className={`${styles.btn} ${styles.btnChoose} ${styles.focusable}`}
            >
              Choose Premium
            </Link>
          </div>
        </div>
        {/* Textual prices for SEO (VAT included) */}
        <p style={{ marginTop: 16, color: "var(--muted)" }}>
          Prices: €9.99/month (Basic), €14.99/month (Standard), €17.99/month (Premium). VAT included.
        </p>
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
      <section id="contact" className={`sb-cardglow ${styles.contact}`} aria-labelledby="contact-title">
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
              <img src="/Logo_Landing.png" alt="" aria-hidden="true" className={styles.logoDark} />
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
      {/* JSON-LD Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Plan4Host",
            url: "https://www.plan4host.com",
            logo: "https://www.plan4host.com/Logo_Landing.png",
            sameAs: [
              "https://www.plan4host.com"
            ],
            knowsAbout: [
              "Channel manager",
              "iCal sync Airbnb",
              "iCal sync Booking.com",
              "vacation rental software",
              "online check-in"
            ]
          })
        }}
      />
      {/* JSON-LD for offers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Plan4Host",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "Channel manager with iCal sync for Booking.com and Airbnb, affordable plans and secure online check-in.",
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "EUR",
              lowPrice: "9.99",
              highPrice: "17.99",
              offerCount: 3,
              offers: [
                { "@type": "Offer", price: "9.99", priceCurrency: "EUR", category: "Basic" },
                { "@type": "Offer", price: "14.99", priceCurrency: "EUR", category: "Standard" },
                { "@type": "Offer", price: "17.99", priceCurrency: "EUR", category: "Premium" },
              ],
            },
          }),
        }}
      />
    </main>
  );
}
