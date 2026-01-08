
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
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
                  <h3>{f.title}</h3>
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
	          style={{ position:'fixed', inset:0, zIndex:120, background:'rgba(0,0,0,.55)', display:'grid', placeItems:'center', padding:16 }}>
	          <div onClick={(e)=>e.stopPropagation()} className="sb-cardglow" style={{ width:'min(520px, 92vw)', background:'var(--card)', border:'0.5px solid var(--border)', borderRadius:16, padding:16, display:'grid', gap:16 }}>
	            <div style={{ alignItems:'center', gap:8 }}>
	              <img src={f.icon} alt="" aria-hidden className={styles.featureIcon} />
	              <h3 style={{ margin:0 }}>{f.title}</h3>
	            </div>
	            <p style={{ margin:0, color:'var(--muted)' }}>{f.text}</p>
	            <button className={`sb-btn sb-cardglow ${styles.sbBtn}`} onClick={() => setModalIdx(null)} style={{ justifySelf:'end' }}>Close</button>
	          </div>
	        </div>
	      ); })()}
    </div>
  );
}

function TimeSavingsStrip() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const ref = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
          } else {
            setVisible(false);
          }
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    let frame: number;
    const duration = 800;
    const start = performance.now();
    const from = progress;
    const to = visible ? 1 : 0;
    const step = (ts: number) => {
      const t = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (to - from) * eased;
      setProgress(value);
      if (t < 1) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(!!mq.matches);
    apply();
    try {
      mq.addEventListener("change", apply);
    } catch {
      mq.addListener(apply as any);
    }
    return () => {
      try {
        mq.removeEventListener("change", apply);
      } catch {
        mq.removeListener(apply as any);
      }
    };
  }, []);

  const stats = useMemo(
    () => [
      {
        id: "setup",
        icon: "/SETUP TIME.png",
        label: "SETUP TIME",
        suffix: "min",
        target: 30,
        detail: "From first login to a ready‑to‑use check‑in.",
      },
      {
        id: "perWeek",
        icon: "/SAVE_TIME.png",
        label: "TIME SAVED",
        prefix: "+",
        suffix: "h / week",
        target: 12,
        detail: "By automating repetitive guest interactions.",
      },
      {
        id: "total",
        icon: "/CLIENT_HOURS_SAVED.png",
        label: "CLIENTS HOURS SAVED",
        prefix: "+",
        suffix: "h",
        target: 864,
        detail: "Cumulative for hosts already using Plan4Host.",
      },
    ],
    []
  );

  return (
    <div
      ref={ref}
      className="sb-cardglow"
      style={{
        maxWidth: 1120,
        margin: "0 auto 16px",
        padding: 16,
        borderRadius: 12,
        background: "var(--panel)",
        display: "grid",
        gridTemplateColumns: isMobile
          ? "minmax(0, 1fr)"
          : "repeat(3, minmax(0, 300px))",
        justifyContent: isMobile ? "stretch" : "center",
        gap: isMobile ? 16 : 24,
      }}
    >
      {stats.map((s) => {
        const value = Math.round(s.target * progress);
        return (
          <div
            key={s.id}
            style={{
              borderRadius: 12,
              border: isMobile
                ? "1px solid rgba(148,163,184,0.6)"
                : "1px solid transparent",
              padding: "8px 16px",
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
              alignItems: isMobile ? "center" : "start",
              justifyItems: "center",
              gap: 8,
              background: "color-mix(in srgb, var(--card) 82%, transparent)",
            }}
          >
            {/* Top: icon only (outline, gradient stroke) */}
            <div style={{ display: "grid", justifyItems: "center" }}>
              <div
                aria-hidden
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "999px",
                  display: "grid",
                  placeItems: "center",
                  background: "transparent",
                  color: "inherit",
                }}
              >
                <img
                  src={s.icon as string}
                  alt=""
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
            </div>

            {/* Middle: big number in AI gradient text */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "center",
                gap: 4,
                width: "100%",
              }}
            >
              {s.prefix && value > 0 ? (
                <span
                  style={{
                    fontSize: "var(--fs-b)",
                    fontWeight: "var(--fw-medium)",
                    color: "var(--muted)",
                  }}
                >
                  +
                </span>
              ) : null}
              <div
                style={{
                  fontSize: "var(--fs-h)",
                  fontWeight: "var(--fw-bold)",
                  backgroundImage:
                    "linear-gradient(135deg, #0ea5e9, #6366f1, #a855f7)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  lineHeight: 1,
                }}
              >
                {value}
              </div>
              {s.suffix ? (
                <span
                  style={{
                    fontSize: "var(--fs-s)",
                    fontWeight: "var(--fw-medium)",
                    color: "var(--muted)",
                  }}
                >
                  {s.suffix}
                </span>
              ) : null}
            </div>

            {/* Bottom: label + detail text */}
            <div
              style={{
                fontSize: "var(--fs-s)",
                color: "var(--muted)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "var(--fs-b)",
                  fontWeight: "var(--fw-bold)",
                  marginBottom: 8,
                  backgroundImage:
                    "linear-gradient(135deg, #0ea5e9, #6366f1, #a855f7)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                {s.label}
              </div>
              {s.detail}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AndroidInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    if (!isAndroid) return;

    function onBeforeInstallPrompt(e: any) {
      e.preventDefault();
      setInstallPrompt(e);
      setShow(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  if (!show || !installPrompt) return null;

  const handleInstall = async () => {
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch {
      // ignore
    } finally {
      setShow(false);
      setInstallPrompt(null);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        left: 16,
        zIndex: 120,
        maxWidth: 420,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "16px 16px",
        borderRadius: 999,
        border: "1px solid rgba(148,163,184,0.65)",
        background: "color-mix(in srgb, var(--card) 80%, #020617 20%)",
        boxShadow: "0 14px 40px rgba(15,23,42,0.6)",
      }}
    >
      <span style={{ fontSize: "var(--fs-s)" }}>
        Install <strong>Plan4Host</strong> on your phone
      </span>
      <button
        type="button"
        onClick={handleInstall}
        style={{
          borderRadius: 999,
          border: "1px solid rgba(15,23,42,0.7)",
          background:
            "linear-gradient(135deg, #0ea5e9, #6366f1, #a855f7)",
          color: "#f9fafb",
          padding: "8px 16px",
          fontSize: "var(--fs-s)",
          fontWeight: "var(--fw-bold)",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Install app
      </button>
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
      className={styles.cookieOverlay}
      onClick={() => setShowPrefs(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`modalCard ${styles.cookieModal}`}
        data-animate="true"
      >
        {/* header */}
        <div className={styles.cookieHeader}>
          <div
            aria-hidden
            className={styles.cookieIcon}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="9" cy="10" r="1.2" fill="currentColor" />
              <circle cx="14.5" cy="13" r="1.2" fill="currentColor" />
              <circle cx="11" cy="15.5" r="1.2" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h3 className={styles.cookieTitle}>We use cookies</h3>
            <div className={styles.cookieText}>
              Essential cookies keep the site working. Optionally, we can remember your <strong>theme</strong> (light/dark).
            </div>
          </div>
        </div>

        {/* actions */}
        {!showPrefs ? (
          <div className={styles.cookieActions}>
            <div className={styles.cookieButtons}>
              <button
                onClick={acceptPreferences}
                className={`sb-btn sb-btn--primary ${styles.cookieBtn} ${styles.cookieBtnPrimary}`}
              >
                Accept preferences
              </button>
              <button
                onClick={acceptOnlyNecessary}
                className={`sb-btn ${styles.cookieBtn}`}
              >
                Only necessary
              </button>
              <button
                onClick={() => setShowPrefs(true)}
                className={`sb-btn sb-btn--ghost ${styles.cookieBtn}`}
              >
                Customize
              </button>
            </div>
            <p className={styles.cookieHint}>
              Read more in our{" "}
              <Link href="/legal/cookies" className={styles.cookieLink}>
                Cookie Policy
              </Link>.
            </p>
          </div>
        ) : (
          <div className={styles.cookieActions}>
            <div
              className={styles.cookiePrefsBox}
            >
              <label className={styles.cookieLabel}>
                <div>
                  <strong>Essential</strong>
                  <div className={styles.cookieMeta}>Required for the site to function</div>
                </div>
                <input type="checkbox" checked readOnly aria-label="Essential cookies required" />
              </label>

              <label className={styles.cookieLabel}>
                <div>
                  <strong>Preferences</strong>
                  <div className={styles.cookieMeta}>Remembers your theme (light/dark)</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences}
                  onChange={(e) => setPreferences(e.currentTarget.checked)}
                  aria-label="Preferences cookie"
                />
              </label>
            </div>

            <div className={styles.cookieFooterActions}>
              <button
                onClick={() => setShowPrefs(false)}
                className={`sb-btn ${styles.cookieBtn}`}
              >
                Back
              </button>
              <button
                onClick={savePrefs}
                className={`sb-btn sb-btn--primary ${styles.cookieBtn} ${styles.cookieBtnPrimary}`}
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
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false); 
  const [isPwa, setIsPwa] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [tryModalOpen, setTryModalOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const [navHeight, setNavHeight] = useState<number>(72);
  const featuresVideoRef = useRef<HTMLVideoElement | null>(null);
  const [featuresPlaying, setFeaturesPlaying] = useState(true);
  const [featuresHover, setFeaturesHover] = useState(false);
  const [faqOpen, setFaqOpen] = useState<Record<string, boolean>>({});
  const featuresTapTimerRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const toggleFeaturesPlay = () => {
    const v = featuresVideoRef.current;
    if (!v) return;
    const wasPaused = v.paused;
    if (wasPaused) {
      try { v.play(); } catch {}
      setFeaturesPlaying(true);
      // Mobile: show briefly then hide; Desktop: hide immediately (hover handles)
      let coarse = false; try { coarse = window.matchMedia?.('(hover: none), (pointer: coarse)')?.matches ?? false; } catch {}
      setFeaturesHover(true);
      if (coarse) {
        if (featuresTapTimerRef.current) { try { clearTimeout(featuresTapTimerRef.current as any); } catch {} }
        featuresTapTimerRef.current = window.setTimeout(() => { setFeaturesHover(false); featuresTapTimerRef.current = null; }, 1500);
      } else {
        setFeaturesHover(false);
      }
    } else {
      try { v.pause(); } catch {}
      setFeaturesPlaying(false);
      // Pause: keep overlay on mobile until next tap; desktop: hide
      let coarse = false; try { coarse = window.matchMedia?.('(hover: none), (pointer: coarse)')?.matches ?? false; } catch {}
      if (featuresTapTimerRef.current) { try { clearTimeout(featuresTapTimerRef.current as any); } catch {} featuresTapTimerRef.current = null; }
      setFeaturesHover(true);
      if (!coarse) setFeaturesHover(false);
    }
  };
  const onFeaturesPointerDown = () => {
    // Mobile/PWA: tap anywhere toggles playback; on play, show button briefly; on pause, keep button visible
    let coarse = false;
    try { coarse = window.matchMedia?.('(hover: none), (pointer: coarse)')?.matches ?? false; } catch {}
    if (coarse) {
      const v = featuresVideoRef.current; if (!v) return;
      if (!v.paused) {
        try { v.pause(); } catch {}
        setFeaturesPlaying(false);
        if (featuresTapTimerRef.current) { try { clearTimeout(featuresTapTimerRef.current as any); } catch {} featuresTapTimerRef.current = null; }
        setFeaturesHover(true);
      } else {
        try { v.play(); } catch {}
        setFeaturesPlaying(true);
        setFeaturesHover(true);
        if (featuresTapTimerRef.current) { try { clearTimeout(featuresTapTimerRef.current as any); } catch {} }
        featuresTapTimerRef.current = window.setTimeout(() => { setFeaturesHover(false); featuresTapTimerRef.current = null; }, 1500);
      }
      return;
    }
    // Desktop: reveal overlay on pointer
    setFeaturesHover(true);
  };
  useEffect(() => { return () => { if (featuresTapTimerRef.current) { try { clearTimeout(featuresTapTimerRef.current as any); } catch {} } }; }, []);
  const year = new Date().getFullYear();
  const scrollToId = (id: string) => {
    try {
      const el = document.getElementById(id);
      if (!el) return;
      const header = document.querySelector('.' + styles.nav) as HTMLElement | null;
      const headerH = header?.getBoundingClientRect().height ?? 0;
      const isMobile = window.matchMedia('(max-width: 900px)').matches;
      const extra = isMobile ? 120 : 64; // more space on phones
      const y = el.getBoundingClientRect().top + window.scrollY - headerH - extra;
      window.scrollTo({ top: y < 0 ? 0 : y, behavior: 'smooth' });
    } catch {}
  };
  const closeMenuAndScroll = (id: string) => {
    setNavOpen(false);
    try {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => scrollToId(id)));
    } catch {
      scrollToId(id);
    }
  };
  // Prevent overscroll past page end while on landing
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overscrollBehaviorY;
    const prevBody = body.style.overscrollBehaviorY;
    html.style.overscrollBehaviorY = 'none';
    body.style.overscrollBehaviorY = 'none';
    return () => {
      html.style.overscrollBehaviorY = prevHtml;
      body.style.overscrollBehaviorY = prevBody;
    };
  }, []);
  // Detect PWA (installed) to apply safe-bottom only in that context
  useEffect(() => {
    try {
      const standaloneMedia = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
      // iOS Safari legacy flag
      const iOSStandalone = (window as any).navigator?.standalone === true;
      setIsPwa(!!(standaloneMedia || iOSStandalone));
    } catch { setIsPwa(false); }
  }, []);
  // Desktop detection to tweak video height
  useEffect(() => {
    try {
      const mq = window.matchMedia('(min-width: 1024px)');
      const apply = () => setIsDesktop(!!mq.matches);
      apply();
      try { mq.addEventListener('change', apply); } catch { mq.addListener(apply as any); }
      return () => { try { mq.removeEventListener('change', apply); } catch { mq.removeListener(apply as any); } };
    } catch { setIsDesktop(false); }
  }, []);

  // Mobile menu should overlay the page; lock background scroll while open
  useEffect(() => {
    if (!navOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [navOpen]);

  // Measure nav height to position the fixed mobile menu correctly
  useEffect(() => {
    const measure = () => {
      const h = navRef.current?.getBoundingClientRect?.().height ?? 0;
      if (h > 0) setNavHeight(Math.ceil(h));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  const benefits: string[] = [
    "Custom digital check-in form",
    "GDPR-ready e-signature & ID photo verification (auto-deleted once the booking is confirmed)",
    "QR code for check-in validation",
    "Push and email notifications for each new reservation",
    "Automated, reservation-aware messages",
    "Calendar integrations with multiple platforms (Booking, Airbnb, etc.)",
    "Automatic sync of reservations between platforms",
    "Unlimited properties and rooms in one account",
    "Internal notes for each reservation",
    "Custom checklists per reservation (breakfast included, daily towel change, etc.)",
    "Manage front desk from your phone (confirm/modify reservations)",
    "Export a PDF with each reservation's details",
    "Quick WhatsApp link from each reservation",
    "Prioritize room cleaning based on next check-in",
    "Personalized cleaning task lists",
    "Real-time cleaning status updates",
    "Share daily tasks with team members",
    "Instant sync of reservations in the app calendar with Sync Now button",
    "Guest AI assistant (arrival, amenities, extras, check-out)",
  ];

  // Reviews (EN)
  const reviewsEn: Array<{ title: string; author: string; body: string }> = [
    {
      title: "“I recommend it, especially if you have many arrivals and departures on the same day”",
      author: "— Andrei Popa, Brașov • 3 apartments",
      body: "When things got crowded, I sometimes mixed up the room order. Since using Plan4Host, I see everything at a glance and it’s much easier to coordinate.",
    },
    {
      title: "“A small help that truly matters”",
      author: "— Ioana Rusu, Sibiu area • 4‑room guesthouse",
      body: "I can’t say I made mistakes often, but I did sometimes send the same message to multiple guests without adjusting it. Now the app personalizes automatically and everything looks much more professional.",
    },
    {
      title: "“For anyone who sometimes replies too late”",
      author: "— Mihai Ioniță, Cluj‑Napoca • 2 Airbnb studios",
      body: "I sometimes reached late hours before sending check‑in details. With Plan4Host, messages go out on time and guests arrive much calmer. It clearly shows in their experience.",
    },
    {
      title: "“If you’ve ever had tangled bookings…”",
      author: "— Elena Badea, Bucharest • Serviced apartments",
      body: "It happened to me too when I had two close check‑ins. The app’s calendar took the worry away — everything is in one place and I no longer risk mistakes.",
    },
    {
      title: "“It doesn’t change how you work — it just makes it clearer”",
      author: "— Vlad Rădulescu, Oradea • 4 serviced apartments",
      body: "I’m used to writing everything down, but sometimes I lost time searching through messages. Here everything is organized and I don’t feel more complicated — quite the opposite.",
    },
    {
      title: "“Recommended for how it delivers information”",
      author: "— Alina Ghermani, Suceava • Mountain cabin",
      body: "I used to send all details at once and guests said it was a bit much. Now messages arrive in sequence and I’m asked far fewer private questions. The flow feels more natural.",
    },
    {
      title: "“If you have cleaning staff, it helps a lot”",
      author: "— Gabriel Stan, Târgu Mureș • Guesthouse",
      body: "I sometimes got the first room to prepare wrong. Plan4Host shows the order, time and tasks clearly. For us it really was an upgrade.",
    },
    {
      title: "“Surprisingly useful”",
      author: "— Cristina Pavel, Constanța • Seaside holiday apartment",
      body: "I didn’t think I needed another app, honestly. But I realized I sometimes missed a detail. Now I get notifications and don’t skip anything.",
    },
    {
      title: "“Less hustle, more control”",
      author: "— Radu Dumitrescu, Iași • 5 serviced units",
      body: "I wasn’t overwhelmed, but information sometimes got lost in long guest conversations. With the app I see everything clearly and my schedule feels much more organized.",
    },
  ];

  const [revIdx, setRevIdx] = useState<number>(0);
  const revStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    revStartX.current = e.touches?.[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const sx = revStartX.current; revStartX.current = null;
    if (sx == null) return;
    const ex = e.changedTouches?.[0]?.clientX ?? sx;
    const dx = ex - sx;
    const TH = 40; // px
    if (dx > TH) setRevIdx(i => (i - 1 + reviewsEn.length) % reviewsEn.length);
    else if (dx < -TH) setRevIdx(i => (i + 1) % reviewsEn.length);
  };
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') setRevIdx(i => (i - 1 + reviewsEn.length) % reviewsEn.length);
    if (e.key === 'ArrowRight') setRevIdx(i => (i + 1) % reviewsEn.length);
  };

  return (
    <main
      className={styles.landing}
      style={{
        paddingBottom: isPwa ? 'var(--safe-bottom, 0px)' : 0,
        minHeight: '100dvh',
        overflowX: 'hidden',
        ['--landing-nav-h' as any]: `${navHeight}px`,
      }}
    >
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
      {isPwa && (
        <div aria-hidden style={{ position:'fixed', bottom:0, left:0, right:0, height:'var(--safe-bottom)', background:'var(--bg)', zIndex:3, pointerEvents:'none' }} />
      )}
      <div aria-hidden style={{ position:'fixed', top:0, bottom:0, left:0, width:'var(--safe-left)', background:'var(--bg)', zIndex:3, pointerEvents:'none' }} />
      <div aria-hidden style={{ position:'fixed', top:0, bottom:0, right:0, width:'var(--safe-right)', background:'var(--bg)', zIndex:3, pointerEvents:'none' }} />

      {/* Android install banner */}
      <AndroidInstallBanner />

      {/* Accessible skip link */}
      <a href="#content" className={`${styles.skipLink} ${styles.focusable}`}>
        Skip to content
      </a>

      {/* Top Nav */}
      <nav
        ref={navRef as any}
        className={styles.nav}
        data-open={navOpen ? "true" : "false"}
        aria-label="Primary"
      >
        <div className={styles.brandWrap}>
          <Link href="/" className={`${styles.brand} ${styles.focusable}`}>
            <img src="/Logo_Landing_AI.png" alt="Plan4host" className={styles.logoDark} />
          </Link>
          {/* Language near logo (mobile-friendly, no border) */}
          <Link href="/ro" className={`${styles.btnLang} ${styles.focusable}`} aria-label="Schimbă limba în română">
            <img src="/eng.png" alt="" width={22} height={22} style={{ display: 'block' }} />
          </Link>
        </div>

        {/* Desktop menu */}
		        <div className={styles.menu} id="nav-menu">
			          <a
			            href="#insights-title"
			            className={`${styles.menuLink} ${styles.focusable}`}
			            onClick={(e) => { e.preventDefault(); closeMenuAndScroll('insights-title'); }}
			          >
			            Impact
			          </a>
		          <a
		            href="#about-title"
		            className={`${styles.menuLink} ${styles.focusable}`}
		            onClick={(e) => { e.preventDefault(); closeMenuAndScroll('about-title'); }}
		          >
		            About
		          </a>
		          <a
		            href="#features-title"
		            className={`${styles.menuLink} ${styles.focusable}`}
		            onClick={(e) => { e.preventDefault(); closeMenuAndScroll('features-title'); }}
		          >
		            Features
		          </a>
		          <a
		            href="#reviews-title"
		            className={`${styles.menuLink} ${styles.focusable}`}
		            onClick={(e) => { e.preventDefault(); closeMenuAndScroll('reviews-title'); }}
		          >
		            Reviews
		          </a>
		          <a
		            href="#pricing-title"
		            className={`${styles.menuLink} ${styles.focusable}`}
		            onClick={(e) => { e.preventDefault(); closeMenuAndScroll('pricing-title'); }}
		          >
		            Pricing
		          </a>
		          <a
		            href="#faq-title"
		            className={`${styles.menuLink} ${styles.focusable}`}
		            onClick={(e) => { e.preventDefault(); closeMenuAndScroll('faq-title'); }}
		          >
		            FAQ
		          </a>
		          <a
		            href="#contact-title"
		            className={`${styles.menuLink} ${styles.focusable}`}
		            onClick={(e) => { e.preventDefault(); closeMenuAndScroll('contact-title'); }}
		          >
		            Contact
		          </a>
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
			          href="#insights-title"
			          className={`${styles.mobileLink} ${styles.focusable}`}
			          onClick={(e) => { e.preventDefault(); closeMenuAndScroll('insights-title'); }}
			        >
			          Impact
			        </a>
			        <a
			          href="#about-title"
			          className={`${styles.mobileLink} ${styles.focusable}`}
			          onClick={(e) => { e.preventDefault(); closeMenuAndScroll('about-title'); }}
			        >
			          About
			        </a>
			        <a
			          href="#features-title"
			          className={`${styles.mobileLink} ${styles.focusable}`}
			          onClick={(e) => { e.preventDefault(); closeMenuAndScroll('features-title'); }}
			        >
			          Features
			        </a>
			        <a
			          href="#reviews-title"
			          className={`${styles.mobileLink} ${styles.focusable}`}
			          onClick={(e) => { e.preventDefault(); closeMenuAndScroll('reviews-title'); }}
			        >
			          Reviews
			        </a>
			        <a
			          href="#pricing-title"
			          className={`${styles.mobileLink} ${styles.focusable}`}
			          onClick={(e) => { e.preventDefault(); closeMenuAndScroll('pricing-title'); }}
			        >
			          Pricing
			        </a>
			        <a
			          href="#faq-title"
			          className={`${styles.mobileLink} ${styles.focusable}`}
			          onClick={(e) => { e.preventDefault(); closeMenuAndScroll('faq-title'); }}
			        >
			          FAQ
			        </a>
			        <a
			          href="#contact-title"
			          className={`${styles.mobileLink} ${styles.focusable}`}
			          onClick={(e) => { e.preventDefault(); closeMenuAndScroll('contact-title'); }}
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
          <p className={styles.heroKicker}>PMS + online check‑in with iCal sync</p>
          <p>Run reservations, tasks, and guest communication from one place.</p>
          <ul className={styles.heroBullets}>
            <li>Centralized calendar + iCal sync</li>
            <li>Automated guest messaging</li>
            <li>Guest AI assistant for arrival, amenities, recommendations, check‑out</li>
          </ul>
          <div className={styles.heroCta}>
            {/* Start free -> login in signup mode (animated) */}
            <button
              type="button"
              onClick={() => setTryModalOpen(true)}
              className={`sb-cardglow ${styles.btn}  ${styles.btnChoose} ${styles.focusable}`}
            >
              Try the guest check-in form
            </button>
            <CtaLink
              href="/guest-ai-assistant"
              className={`sb-cardglow ${styles.btn} ${styles.btnAi} ${styles.focusable}`}
              onNavigate={() => { /* no-op for now */ }}
            >
              <span className={styles.btnAiLabel}>See Guest AI assistant</span>
            </CtaLink>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Calendar preview">
          <img
            src="/Landing_Mockups2.png"
            alt="Plan4Host app mockups"
            className={styles.focusable}
          />
        </div>
      </section>

      {/* Try Check-in modal (EN) */}
	      {tryModalOpen && (
	        <div role="dialog" aria-modal="true" onClick={()=>setTryModalOpen(false)}
	             style={{ position:'fixed', inset:0, zIndex: 320, background:'rgba(0,0,0,.55)', display:'grid', placeItems:'center', padding:16 }}>
	          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(560px, 100%)', padding:16 }}>
	            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
	              <strong>Try the guest check‑in form</strong>
	              <button
	                aria-label="Close"
	                onClick={()=>setTryModalOpen(false)}
	                style={{ width:32, height:32, borderRadius:999, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', display:'grid', placeItems:'center', cursor:'pointer' }}
	              >
	                ×
	              </button>
	            </div>
	            <div style={{ display:'grid', gap:16 }}>
	              <p style={{ margin:0, color:'var(--muted)' }}>
	                You will be redirected to a demo check‑in form to experience what your guests will see.
	                For a complete experience, please use a valid email address — you’ll receive the confirmation and follow‑up just like a real guest.
	              </p>
	              <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
	                <button className={`sb-btn sb-btn--primary ${styles.sbBtn} ${styles.sbBtnPrimary}`} onClick={()=>{ router.push('/checkin?property=b1588b40-954d-4489-b36e-45659853489a&source=manual'); setTryModalOpen(false); }}>Continue</button>
	              </div>
	            </div>
	          </div>
	        </div>
	      )}

      {/* Impact (time/value stats before Features) */}
	      <section
	        id="insights"
	        aria-labelledby="insights-title"
	        className={styles.features}
	        style={{ paddingTop: 0, paddingBottom: 0 }}
	      >
        <h2 id="insights-title">Impact</h2>
        <TimeSavingsStrip />
      </section>

      {/* About */}
      <section id="about" className={styles.about} aria-labelledby="about-title">
        <h2 id="about-title">About</h2>
        <div className={styles.aboutGrid}>
          <div className={styles.aboutVisual} aria-label="Calendar sync preview">
            <img src="/Calendar_Sync.png" alt="Calendar sync preview" />
          </div>
	          <div className={styles.aboutCard}>
	            <div className={styles.aboutBrandTitle}>Plan4Host</div>
	            <div className={styles.aboutTitle}>Clarity. Precision. Effortless control.</div>
	            <div className={styles.aboutSub}>A simple toolkit for real hospitality.</div>
	            <p className={styles.aboutBody}>
	              A calm workflow for reservations and guest communication.
	            </p>
	            <ul className={styles.aboutList}>
	              <li>All bookings in one calendar (with iCal sync)</li>
	              <li>Digital check‑in links and confirmations</li>
	              <li>Automated, well‑timed guest messages</li>
	            </ul>
	          </div>
	        </div>
	      </section>

      {/* Features */}
      <section id="features" className={styles.features} aria-labelledby="features-title">
        <h2 id="features-title">Features</h2>
        <div
          className="sb-cardglow"
          style={{ borderRadius: 12, overflow: 'hidden', position: 'relative' }}
          onPointerEnter={() => setFeaturesHover(true)}
          onPointerLeave={() => setFeaturesHover(false)}
          onPointerDown={onFeaturesPointerDown}
        >
          <video
            className={styles.focusable}
            src="/functions_forlanding.mp4"
            poster="/functions_forlanding.mp4"
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            ref={featuresVideoRef}
            style={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block', ...(isDesktop ? { maxHeight: 420 } : {}) }}
          >
            Sorry, your browser doesn’t support embedded videos.
          </video>
          <button
            type="button"
            onClick={toggleFeaturesPlay}
            onPointerDown={(e) => { e.stopPropagation(); }}
            className={styles.focusable}
            aria-label={featuresPlaying ? 'Pause video' : 'Play video'}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              borderRadius: 999,
              border: '1px solid var(--border)',
              background: 'color-mix(in srgb, var(--card) 16%, transparent)',
              backdropFilter: 'blur(0.5px)',
              WebkitBackdropFilter: 'blur(0.5px)',
              color: 'var(--card)',
              width: 80,
              height: 80,
              display: 'grid',
              placeItems: 'center',
              opacity: (!featuresPlaying || featuresHover) ? 1 : 0,
              transition: 'opacity .2s ease',
              pointerEvents: (!featuresPlaying || featuresHover) ? 'auto' : 'none',
              zIndex: 2,
            }}
          >
            {featuresPlaying ? (
              <svg viewBox="0 0 24 24" width="60" height="60" aria-hidden>
                <rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
                <rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="60" height="60" aria-hidden>
                <path d="M8 5l12 7-12 7V5z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className={styles.reviews} aria-labelledby="reviews-title">
        <h2 id="reviews-title">What our users say</h2>
        <div className={styles.reviewsBody}>
          <div
            className={styles.reviewsCard}
            role="region"
            aria-roledescription="carousel"
            aria-label="User testimonials"
            aria-live="polite"
            tabIndex={0}
            onKeyDown={onKey}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
	            <button
	              type="button"
	              className={`${styles.reviewsArrow} ${styles.reviewsArrowLeft}`}
	              aria-label="Previous review"
	              onClick={() => setRevIdx(i => (i - 1 + reviewsEn.length) % reviewsEn.length)}
	            />
            {(() => {
              const r = reviewsEn[revIdx];
              const parts = String(r.author || '').split('•');
              const left = (parts[0] || '').trim();
              const right = (parts[1] || '').trim();
	              return (
	                <div style={{ display: 'grid', gap: 16 }}>
	                  <div className={styles.reviewTitle}>{r.title}</div>
	                  <div className={styles.reviewBody}>{r.body}</div>
	                  <div className={styles.reviewAuthor}>
	                    <span className={styles.authorMain}>{left}</span>
	                    {right && <span className={styles.authorDetail}> • {right}</span>}
	                  </div>
	                </div>
	              );
	            })()}
	            <button
	              type="button"
	              className={`${styles.reviewsArrow} ${styles.reviewsArrowRight}`}
	              aria-label="Next review"
	              onClick={() => setRevIdx(i => (i + 1) % reviewsEn.length)}
	            />
          </div>
        </div>
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
	                  'Prioritize room cleaning',
	                  'Personalized cleaning task',
	                  'Real-time cleaning status',
	                  'Share daily tasks',
	                  'Instant sync of reservations in the app calendar',
	                  'Guest AI assistant',
	                ].some((s) => b.includes(s));
	                return (
	                  <li key={`basic-b-${i}`}>
	                    {basicX ? (
	                      <svg viewBox="0 0 24 24" aria-hidden="true">
	                        <circle cx="12" cy="12" r="10" fill="color-mix(in srgb, var(--danger) 12%, white)" stroke="var(--danger)" strokeWidth="1.8" />
	                        <path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="var(--danger)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
	                      </svg>
	                    ) : (
	                      <svg viewBox="0 0 24 24" aria-hidden="true">
	                        <circle cx="12" cy="12" r="10" fill="color-mix(in srgb, var(--primary) 14%, white)" stroke="var(--success)" strokeWidth="1.8" />
	                        <path d="M7 12.5l3.1 3.1L17.2 8.5" fill="none" stroke="var(--success)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
	                  'Share daily tasks',
	                  'Instant sync of reservations in the app calendar',
	                  'Guest AI assistant',
	                ].some((s) => b.includes(s));
	                return (
	                  <li key={`standard-b-${i}`}>
	                    {standardX ? (
	                      <svg viewBox="0 0 24 24" aria-hidden="true">
	                        <circle cx="12" cy="12" r="10" fill="color-mix(in srgb, var(--danger) 12%, white)" stroke="var(--danger)" strokeWidth="1.8" />
	                        <path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="var(--danger)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
	                      </svg>
	                    ) : (
	                      <svg viewBox="0 0 24 24" aria-hidden="true">
	                        <circle cx="12" cy="12" r="10" fill="color-mix(in srgb, var(--primary) 14%, white)" stroke="var(--success)" strokeWidth="1.8" />
	                        <path d="M7 12.5l3.1 3.1L17.2 8.5" fill="none" stroke="var(--success)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
                    <circle cx="12" cy="12" r="10" fill="color-mix(in srgb, var(--primary) 14%, white)" stroke="var(--success)" strokeWidth="1.8" />
                    <path d="M7 12.5l3.1 3.1L17.2 8.5" fill="none" stroke="var(--success)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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

      {/* FAQ */}
      <section id="faq" className={`${styles.contact}`} aria-labelledby="faq-title">
        <h2 id="faq-title">FAQ</h2>
        {[
          {
            id: 'units',
            question: 'Can I use the app for apartments/studios (single units) as well as cabins/guesthouses (multiple units)?',
            content: (
              <>
                <p className={styles.faqLead}>
                  <strong>Short answer:</strong> yes — it works for single units and multi-unit properties.
                </p>
                <ul className={styles.faqList}>
                  <li>Single unit: set one room as the entire property and manage everything from one calendar.</li>
                  <li>Multiple units: add each room or room type and keep calendars, tasks, and messaging per unit.</li>
                  <li>Listed on OTAs with both per-room and “Entire property” options? Keep the individual rooms and add one extra Plan4Host “room” for the entire place; map iCal so room bookings and whole-property bookings block each other.</li>
                </ul>
              </>
            ),
          },
          {
            id: 'guest-data',
            question: 'How do I collect guest details?',
            content: (
              <>
                <p className={styles.faqLead}>
                  Set up your property, then generate check-in form links.
                </p>
                <ul className={styles.faqList}>
                  <li>Drop the links into auto-replies on each platform where you list the property.</li>
                  <li>Guests are guided through all steps so their stay starts smoothly.</li>
                  <li><strong>Need better tracking?</strong> Generate platform-specific links to see which channel each form came from.</li>
                </ul>
              </>
            ),
          },
          {
            id: 'access-codes',
            question: 'Can the app send access codes automatically shortly before guests arrive?',
            content: (
              <>
                <p className={styles.faqLead}>
                  Yes. Create a template and schedule it to send 1 hour before every reservation.
                </p>
                <ul className={styles.faqList}>
                  <li>The message is sent automatically, personalized for each booking.</li>
                  <li>You don’t need to lift a finger — the app lets you focus more on your guests.</li>
                </ul>
              </>
            ),
          },
          {
            id: 'reservation-notes',
            question: 'Can I add notes for each reservation?',
            content: (
              <>
                <p className={styles.faqLead}>
                  Yes. In “Property Setup” under “Reservation details”, you can create as many note fields as you need.
                </p>
                <ul className={styles.faqList}>
                  <li>Each note field is unique per reservation—perfect for staff reminders or personal cues.</li>
                  <li>You can even use checkboxes for options like “breakfast included” or “daily towel change”.</li>
                </ul>
              </>
            ),
          },
          {
            id: 'sync-calendars',
            question: 'How do I sync calendars?',
            content: (
              <>
                <p className={styles.faqLead}>
                  Align your property structure first, then import and export iCal links.
                </p>
                <ul className={styles.faqList}>
                  <li>Match your setup in Plan4Host to the same rooms/types you have on each platform.</li>
                  <li>Open “Sync Calendars” and import the iCal links from Airbnb, Booking, Travelminit, etc.</li>
                  <li>From “Sync Calendars”, copy the Plan4Host export links and paste them back into each booking platform.</li>
                </ul>
              </>
            ),
          },
          {
            id: 'checkin-confirmation',
            question: 'How does the guest know we received the check-in form?',
            content: (
              <>
                <p className={styles.faqLead}>
                  They get an immediate email copy of their submission, and you get a separate notification.
                </p>
                <ul className={styles.faqList}>
                  <li>After tapping “Submit”, the guest receives an email showing the data collected and the retention period (GDPR notice).</li>
                  <li>You receive a separate email so you can confirm the reservation.</li>
                  <li>Based on the form data, scheduled messages are sent automatically for each reservation.</li>
                </ul>
                <div style={{ marginTop: 8 }}>
                  <img
                    src="/Confirmare%20primire%20formular.png"
                    alt="Sample confirmation email after check-in form submission"
                    style={{ width: '100%', maxWidth: 520, height: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}
                  />
                </div>
              </>
            ),
          },
        ].map((item) => {
          const open = !!faqOpen[item.id];
          return (
            <div
              key={item.id}
              className={`${styles.contactCard} ${styles.faqItem}`}
              data-open={open ? "true" : "false"}
            >
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`faq-answer-${item.id}`}
                onClick={() => setFaqOpen((prev) => ({ ...prev, [item.id]: !open }))}
                className={`${styles.focusable} ${styles.faqQuestion}`}
              >
                <span>
                  <strong>Q:</strong> {item.question}
                </span>
                <span aria-hidden className={styles.faqToggle}>
                  {open ? '–' : '+'}
                </span>
              </button>
              <div
                id={`faq-answer-${item.id}`}
                hidden={!open}
                className={styles.faqAnswer}
              >
                <div className={styles.faqAnswerLabel}>A:</div>
                {item.content}
              </div>
            </div>
          );
        })}
      </section>

      {/* Contact */}
      <section id="contact" className={`${styles.contact}`} aria-labelledby="contact-title">
        <h2 id="contact-title">Contact</h2>
        <div className={styles.contactCard}>
          <div style={{ display: 'grid', gap: 16 }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              <span>Sometimes you just need a quick answer.</span><br />
              <span>Reach out — we’re one message away on email or WhatsApp.</span>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ opacity: .9 }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.81.33 1.6.63 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.74-1.74a2 2 0 0 1 2.11-.45c.74.3 1.53.51 2.34.63A2 2 0 0 1 22 16.92z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <a className={styles.focusable} href="https://wa.me/40721759329" target="_blank" rel="noopener noreferrer" title="Chat on WhatsApp">+40 721 759 329</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ opacity: .9 }}>
                <rect x="3" y="5" width="18" height="14" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M3 7l9 6 9-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <a className={styles.focusable} href="mailto:office@plan4host.com" title="Email us">office@plan4host.com</a>
            </div>
          </div>
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
              Centralized booking calendar &amp; with real-time iCal updates for modern hosts.
            </p>
            {/* Mobile-only: show footer columns directly under the short copy */}
            <div className={styles.footerStacksMobile}>
              <div>
                <div className={styles.footerTitle}>Product</div>
                <ul className={styles.footerList}>
                  <li><a className={styles.footerLink} href="#features-title">Features</a></li>
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
              <li><a className={styles.footerLink} href="#features-title">Features</a></li>
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

          <div className={styles.footerCol}>
            <div className={styles.footerTitle}>Social</div>
            <ul className={styles.footerList}>
              <li>
                <a className={styles.footerLink} href="https://www.facebook.com/share/1D5V7mG79g/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <img src="/facebook_forlight.png" alt="Facebook" width={18} height={18} style={{ display:'inline-block', verticalAlign:'middle', marginRight:8 }} />
                  Facebook
                </a>
              </li>
              <li>
                <a className={styles.footerLink} href="https://www.instagram.com/plan4host?igh=MXB3cnlzZjZxZGVvMQ%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <img src="/instagram_forlight.png" alt="Instagram" width={18} height={18} style={{ display:'inline-block', verticalAlign:'middle', marginRight:8 }} />
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Social (mobile‑only row): below menus, above badges */}
        <div className="p4h-social-row" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
          <a className={styles.footerLink} href="https://www.facebook.com/share/1D5V7mG79g/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <img src="/facebook_forlight.png" alt="Facebook" width={18} height={18} style={{ display:'inline-block', verticalAlign:'middle', marginRight:8 }} />
            Facebook
          </a>
          <a className={styles.footerLink} href="https://www.instagram.com/plan4host?igh=MXB3cnlzZjZxZGVvMQ%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <img src="/instagram_forlight.png" alt="Instagram" width={18} height={18} style={{ display:'inline-block', verticalAlign:'middle', marginRight:8 }} />
            Instagram
          </a>
        </div>
        <style jsx>{`
          @media (min-width: 561px){ .p4h-social-row{ display: none !important; } }
        `}</style>

        {/* Compliance/Payments badges row (left-aligned, room for more like Stripe) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '8px 0',
            justifyContent: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <a
            href="https://eservicii.anpc.ro/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ANPC e-Servicii"
            title="ANPC e-Servicii"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }}
          >
            <img src="/ANPC.png" alt="ANPC" style={{ width: 120, height: 'auto' }} />
          </a>
          <a
            href="https://stripe.com/en-ro/payments"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Stripe Payments"
            title="Stripe Payments"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }}
          >
            <img src="/STRIPE.png" alt="Stripe" style={{ width: 120, height: 'auto' }} />
          </a>
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
            logo: "https://www.plan4host.com/Logo_Landing_AI.png",
            sameAs: [
              "https://www.plan4host.com"
            ],
            knowsAbout: [
              "Property management system (PMS)",
              "iCal sync Airbnb",
              "iCal sync Booking.com",
              "vacation rental software",
              "online check-in",
              "online check-in form"
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
              "Property management system (PMS) with iCal sync for Booking.com and Airbnb, affordable plans and secure online check-in.",
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
      {/* JSON-LD FAQ (EN) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Do you provide web hosting?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "No. Plan4Host is property management software (PMS). We do not sell web hosting."
                }
              },
              {
                "@type": "Question",
                name: "Do you offer GDPR‑friendly online check‑in forms?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Plan4Host includes secure guest check‑in forms with consent capture and a DPA available under Legal."
                }
              },
              {
                "@type": "Question",
                name: "Which channels can I sync via iCal?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Airbnb, Booking.com, Expedia, and Travelminit via standard iCal feeds (import/export)."
                }
              },
              {
                "@type": "Question",
                name: "Is there an affordable PMS plan?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. All plans are paid, including Basic, designed to be affordable for small properties."
                }
              }
            ]
          })
        }}
      />
    </main>
  );
}
