"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "../home.module.css";
import { createPortal } from "react-dom";
import AutoOpenOnLanding from "@/components/consent/AutoOpenOnLanding";
import MobileScrollReveal from "@/components/landing/MobileScrollReveal";
import WhatsAppPill from "@/components/landing/WhatsAppPill";
import CookieFab from "@/components/landing/CookieFab";

// Copiem componentele ușoare din landing (CTA + Cookie consent + Carousel)

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
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const isTouch = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(hover: none)").matches;
    if (isTouch) {
      e.preventDefault();
      const el = ref.current;
      el?.setAttribute("data-animate", "true");
      window.setTimeout(() => {
        el?.removeAttribute("data-animate");
        router.push(href);
        onNavigate?.();
      }, 280);
    }
  };

  return (
    <Link href={href} ref={ref} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}

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
  const getStep = () => {
    const el = trackRef.current;
    if (!el) return 0;
    const first = el.querySelector('[data-card]') as HTMLElement | null;
    if (first) return first.offsetWidth + 20;
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
    const cards = Array.from((trackRef.current||document).querySelectorAll<HTMLElement>('[data-card]'));
    const N = cards.length || 1;
    activeIdxRef.current = (activeIdxRef.current - 1 + N) % N;
    setActive(activeIdxRef.current);
  };
  const next = () => {
    const cards = Array.from((trackRef.current||document).querySelectorAll<HTMLElement>('[data-card]'));
    const N = cards.length || 1;
    activeIdxRef.current = (activeIdxRef.current + 1) % N;
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
      if (i === best) c.setAttribute('data-active','true'); else c.removeAttribute('data-active');
      if (i === prevIdx) c.setAttribute('data-prev','true'); else c.removeAttribute('data-prev');
      if (i === nextIdx) c.setAttribute('data-next','true'); else c.removeAttribute('data-next');
    });
  };
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
      window.setTimeout(() => window.clearTimeout(t), 1200);
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting && e.intersectionRatio >= 0.4) { nudge(); requestAnimationFrame(updateActive); }
    }, { threshold: [0, 0.25, 0.4, 0.75, 1] });
    io.observe(el);
    const onScroll = () => updateActive();
    const onResize = () => updateActive();
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    requestAnimationFrame(updateActive);
    return () => { try { io.disconnect(); } catch {}; track.removeEventListener('scroll', onScroll as any); window.removeEventListener('resize', onResize); };
  }, []);

  // Autoplay dezactivat — schimb doar cu săgeți sau swipe

  return (
    <div className={styles.featureCarousel} ref={wrapRef}>
      <button type="button" aria-label="Previous features" className={`${styles.carouselBtn} ${styles.carouselBtnLeft}`} onClick={prev}>‹</button>
      <div className={styles.featureTrack} ref={trackRef}>
        {/* 1) Formular check-in sigur */}
        <article data-card className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
          <div className={styles.featureHead}>
            <img src="/guest_forlight.png" alt="" aria-hidden="true" className={styles.featureIcon} />
            <h3>Formular check‑in sigur</h3>
          </div>
          <p>Colectezi datele oaspeților în siguranță înainte de sosire — upload act identitate, consimțământ și confirmare instant pe email — totul într‑un flux prietenos GDPR.</p>
        </article>
        {/* 2) Sincronizare automată */}
        <article data-card className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
          <div className={styles.featureHead}>
            <img src="/ical_forlight.png" alt="" aria-hidden="true" className={styles.featureIcon} />
            <h3>Sincronizare automată</h3>
          </div>
          <p>Sincronizezi rezervările cu Airbnb, Booking.com și altele prin iCal, conform planului — calendarele rămân actualizate fără efort.</p>
        </article>
        {/* 3+) Restul în ordinea existentă */}
        <article data-card className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
          <div className={styles.featureHead}>
            <img src="/dashboard_forlight.png" alt="" aria-hidden="true" className={styles.featureIcon} />
            <h3>Panou ușor de folosit</h3>
          </div>
          <p>Gestionezi toate proprietățile într‑un singur tablou clar și flexibil, personalizând fiecare detaliu după nevoi.</p>
        </article>
        <article data-card className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
          <div className={styles.featureHead}>
            <img src="/configurator_forlight.png" alt="" aria-hidden="true" className={styles.featureIcon} />
            <h3>Configurare proprietate</h3>
          </div>
          <p>Configurezi rapid fiecare proprietate: adaugi camere, ajustezi detalii și personalizezi setările pentru un flux lin.</p>
        </article>
        <article data-card className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
          <div className={styles.featureHead}>
            <img src="/calendar_forlight.png" alt="" aria-hidden="true" className={styles.featureIcon} />
            <h3>Calendar adaptiv</h3>
          </div>
          <p>Calendarul tău, pe stilul tău: vizualizări personalizabile, rezervări organizate și totul la vedere dintr‑o privire.</p>
        </article>
        <article data-card className={`${styles.featureCard} ${styles.focusable}`} tabIndex={0}>
          <div className={styles.featureHead}>
            <img src="/team_forlight.png" alt="" aria-hidden="true" className={styles.featureIcon} />
            <h3>Delegare sarcini</h3>
          </div>
          <p>Invită colegi (editor/vizualizare), setează acces pe arii (calendar, curățenie, canale, configurare) și delegă cu încredere sarcinile zilnice.</p>
        </article>
      </div>
      <div className={styles.featureViewport} ref={viewportRef}
        onPointerDown={(e)=>{ (e.currentTarget as any)._sx = e.clientX; }}
        onPointerUp={(e)=>{ const sx = (e.currentTarget as any)._sx as number|undefined; if (typeof sx==='number'){ const dx = e.clientX - sx; if (Math.abs(dx)>30){ if (dx<0) next(); else prev(); } } }}
      >
        {(() => {
          const feats = [
            { icon: "/guest_forlight.png", title: "Formular check‑in sigur", text: "Colectezi datele în siguranță — act, consimțământ, email instant." },
            { icon: "/ical_forlight.png", title: "Sincronizare automată", text: "Ții calendarele aliniate cu Airbnb/Booking prin iCal." },
            { icon: "/dashboard_forlight.png", title: "Panou ușor de folosit", text: "Toate proprietățile într‑un singur tablou clar." },
            { icon: "/configurator_forlight.png", title: "Configurare proprietate", text: "Adaugi camere, setări implicite și personalizări rapid." },
            { icon: "/calendar_forlight.png", title: "Calendar adaptiv", text: "Personalizezi vederi și organizezi rezervări pe loc." },
            { icon: "/team_forlight.png", title: "Delegare sarcini", text: "Invită colegi și deleagă activitățile zilnice." },
          ];
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
	                <div className={styles.featureHead}>
	                  <img src={f.icon} alt="" aria-hidden="true" className={styles.featureIcon} />
	                  <h3>{f.title}</h3>
	                </div>
                {!isMobile && <p>{f.text}</p>}
              </article>
            );
          });
        })()}
      </div>
      {isMobile && modalIdx !== null && (() => { const feats = [
        { icon: "/guest_forlight.png", title: "Formular check‑in sigur", text: "Colectezi datele în siguranță — act, consimțământ, email instant." },
        { icon: "/ical_forlight.png", title: "Sincronizare automată", text: "Ții calendarele aliniate cu Airbnb/Booking prin iCal." },
        { icon: "/dashboard_forlight.png", title: "Panou ușor de folosit", text: "Toate proprietățile într‑un singur tablou clar." },
        { icon: "/configurator_forlight.png", title: "Configurare proprietate", text: "Adaugi camere, setări implicite și personalizări rapid." },
        { icon: "/calendar_forlight.png", title: "Calendar adaptiv", text: "Personalizezi vederi și organizezi rezervări pe loc." },
        { icon: "/team_forlight.png", title: "Delegare sarcini", text: "Invită colegi și deleagă activitățile zilnice." },
      ]; const f = feats[(modalIdx!%feats.length+feats.length)%feats.length]; return (
	        <div role="dialog" aria-modal="true" onClick={() => setModalIdx(null)}
	          style={{ position:'fixed', inset:0, zIndex:120, background:'rgba(0,0,0,.55)', display:'grid', placeItems:'center', padding:16 }}>
	          <div onClick={(e)=>e.stopPropagation()} className="sb-cardglow" style={{ width:'min(520px, 92vw)', background:'var(--card)', border:'0.5px solid var(--border)', borderRadius:16, padding:16, display:'grid', gap:16 }}>
	            <div style={{ alignItems:'center', gap:8 }}>
	              <img src={f.icon} alt="" aria-hidden className={styles.featureIcon} />
	              <h3 style={{ margin:0 }}>{f.title}</h3>
	            </div>
	            <p style={{ margin:0, color:'var(--muted)' }}>{f.text}</p>
	            <button className={`sb-btn sb-cardglow ${styles.sbBtn}`} onClick={() => setModalIdx(null)} style={{ justifySelf:'end' }}>Închide</button>
	          </div>
	        </div>
      ); })()}
      <button type="button" aria-label="Next features" className={`${styles.carouselBtn} ${styles.carouselBtnRight} `} onClick={next}>›</button>
    </div>
  );
}

function TimeSavingsStripRo() {
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
        label: "TIMP SETARE",
        suffix: "min",
        target: 30,
        detail: "De la primul login la fluxul de check‑in.",
      },
      {
        id: "perWeek",
        icon: "/SAVE_TIME.png",
        label: "ORE ECONOMISITE",
        prefix: "+",
        suffix: "h / săptămână",
        target: 12,
        detail: "Prin automatizarea interacțiunilor repetitive cu oaspeții.",
      },
      {
        id: "total",
        icon: "/CLIENT_HOURS_SAVED.png",
        label: "ORE CLIENȚI ECONOMISITE",
        prefix: "+",
        suffix: "h",
        target: 864,
        detail: "Cumulate pentru gazdele care folosesc deja Plan4Host.",
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

function AndroidInstallBannerRo() {
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
        Instalează <strong>Plan4Host</strong> pe telefon
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
        Instalează aplicația
      </button>
    </div>
  );
}

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
  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setShowPrefs(true);
    };
    try { window.addEventListener("p4h:cookie:open", onOpen as any); } catch {}
    return () => { try { window.removeEventListener("p4h:cookie:open", onOpen as any); } catch {} };
  }, []);
  useEffect(() => {
    try {
      const now = Date.now();
      const lsRaw = localStorage.getItem(LS_KEY);
      const ls = lsRaw ? JSON.parse(lsRaw) : null;
      const expMs = Date.parse(ls?.exp || "");
      const valid = Number.isFinite(expMs) && expMs > now ? (ls as { consent: ConsentShape }) : null;
      const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
      const ck = m ? JSON.parse(decodeURIComponent(m[1] || "")) : null;
      const chosen = valid ?? (ck?.consent ? ck : ck ? { consent: ck } : null);
      if (chosen?.consent) {
        setPreferences(!!chosen.consent.preferences);
        document.documentElement.setAttribute("data-consent-preferences", String(!!chosen.consent.preferences));
        setOpen(false);
      } else setOpen(true);
    } catch { setOpen(true); }
  }, []);
  useEffect(() => {
    if (!mounted) return;
    const main = document.querySelector("main") as HTMLElement | null;
    if (open) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      if (main) (main as any).inert = true;
      return () => { document.body.style.overflow = prevOverflow; if (main) (main as any).inert = false; };
    } else if (main) (main as any).inert = false;
  }, [open, mounted]);
  function persist(consent: ConsentShape) {
    const now = new Date();
    const exp = new Date(now.getTime() + EXPIRE_DAYS * 24 * 60 * 60 * 1000);
    const payload = { v: 2, ts: now.toISOString(), exp: exp.toISOString(), consent };
    try { localStorage.setItem(LS_KEY, JSON.stringify(payload)); } catch {}
    try {
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(payload))}; Max-Age=${EXPIRE_DAYS * 24 * 60 * 60}; Path=/; SameSite=Lax${secure}`;
    } catch {}
    document.documentElement.setAttribute("data-consent-preferences", String(!!consent.preferences));
    try { window.dispatchEvent(new CustomEvent("p4h:consent", { detail: payload })); } catch {}
  }
  const acceptOnlyNecessary = () => { persist({ necessary: true, preferences: false }); setOpen(false); };
  const acceptPreferences = () => { persist({ necessary: true, preferences: true }); setOpen(false); };
  const savePrefs = () => { persist({ necessary: true, preferences }); setOpen(false); };
  if (!mounted || !open) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie consent"
      className={styles.cookieOverlay}
      onClick={() => setShowPrefs(false)}
    >
      <div onClick={(e) => e.stopPropagation()} className={`modalCard ${styles.cookieModal}`} data-animate="true">
	        <div className={styles.cookieHeader}>
	          <div aria-hidden className={styles.cookieIcon}>
              <span aria-hidden>🍪</span>
	          </div>
	          <div>
	            <h3 className={styles.cookieTitle}>Folosim cookies</h3>
	            <div className={styles.cookieText}>
	              Cookie-urile esențiale țin site-ul funcțional. Opțional, putem reține <strong>tema</strong> (light/dark).
            </div>
          </div>
        </div>

        {!showPrefs ? (
          <div className={styles.cookieActions}>
            <div className={styles.cookieButtons}>
              <button
                onClick={acceptPreferences}
                className={`sb-btn sb-btn--primary ${styles.cookieBtn} ${styles.cookieBtnPrimary}`}
              >
                Accept preferințe
              </button>
              <button onClick={acceptOnlyNecessary} className={`sb-btn ${styles.cookieBtn}`}>
                Doar necesare
              </button>
              <button onClick={() => setShowPrefs(true)} className={`sb-btn sb-btn--ghost ${styles.cookieBtn}`}>
                Personalizează
              </button>
            </div>
            <p className={styles.cookieHint}>
              Citește mai mult în{" "}
              <Link href="/legal/cookies" className={styles.cookieLink}>
                Politica Cookie
              </Link>.
            </p>
          </div>
        ) : (
          <div className={styles.cookieActions}>
            <div className={styles.cookiePrefsBox}>
              <label className={styles.cookieLabel}>
                <div>
                  <strong>Esențiale</strong>
                  <div className={styles.cookieMeta}>Necesare pentru funcționarea site-ului</div>
                </div>
                <input type="checkbox" checked readOnly aria-label="Cookie esențiale necesare" />
              </label>
              <label className={styles.cookieLabel}>
                <div>
                  <strong>Preferințe</strong>
                  <div className={styles.cookieMeta}>Reține tema (light/dark)</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences}
                  onChange={(e) => setPreferences(e.currentTarget.checked)}
                  aria-label="Cookie preferințe"
                />
              </label>
            </div>
            <div className={styles.cookieFooterActions}>
              <button onClick={() => setShowPrefs(false)} className={`sb-btn ${styles.cookieBtn}`}>
                Înapoi
              </button>
              <button
                onClick={savePrefs}
                className={`sb-btn sb-btn--primary ${styles.cookieBtn} ${styles.cookieBtnPrimary}`}
              >
                Salvează preferințe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function HomePageRO() {
  const [navOpen, setNavOpen] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const [navHeight, setNavHeight] = useState<number>(72);
  const featuresVideoRef = useRef<HTMLVideoElement | null>(null);
  const [featuresPlaying, setFeaturesPlaying] = useState(true);
  const [featuresHover, setFeaturesHover] = useState(false);
  const [faqOpen, setFaqOpen] = useState<Record<string, boolean>>({});
  const toggleFeaturesPlay = () => {
    const v = featuresVideoRef.current;
    if (!v) return;
    if (v.paused) { try { v.play(); } catch {} setFeaturesPlaying(true); }
    else { try { v.pause(); } catch {} setFeaturesPlaying(false); }
    let coarse = false;
    try { coarse = window.matchMedia?.('(hover: none), (pointer: coarse)')?.matches ?? false; } catch {}
    if (!coarse) setFeaturesHover(false);
  };
  const onFeaturesPointerDown = () => {
    let coarse = false;
    try { coarse = window.matchMedia?.('(hover: none), (pointer: coarse)')?.matches ?? false; } catch {}
    if (coarse) {
      const v = featuresVideoRef.current; if (!v) return;
      if (v.paused) { try { v.play(); } catch {}; setFeaturesPlaying(true); }
      else { try { v.pause(); } catch {}; setFeaturesPlaying(false); }
      setFeaturesHover(false);
      return;
    }
    setFeaturesHover(true);
  };
  const year = new Date().getFullYear();
  const scrollToId = (id: string) => {
    try {
      const el = document.getElementById(id);
      if (!el) return;
      const header = document.querySelector('.' + styles.nav) as HTMLElement | null;
      const headerH = header?.getBoundingClientRect().height ?? 0;
      const isMobile = window.matchMedia('(max-width: 900px)').matches;
      const extra = isMobile ? 120 : 64; // spațiu mai generos pe telefon
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
  // Blochează overscroll (bounce) dincolo de capătul paginii pe landing
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
  const router = useRouter();
  const [tryModalOpen, setTryModalOpen] = useState(false);
  // Detect PWA (installed) and apply safe-bottom only in PWA
  useEffect(() => {
    try {
      const standaloneMedia = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
      const iOSStandalone = (window as any).navigator?.standalone === true;
      setIsPwa(!!(standaloneMedia || iOSStandalone));
    } catch { setIsPwa(false); }
  }, []);
  // Detect desktop to constrain video height slightly
  useEffect(() => {
    try {
      const mq = window.matchMedia('(min-width: 1024px)');
      const apply = () => setIsDesktop(!!mq.matches);
      apply();
      try { mq.addEventListener('change', apply); } catch { mq.addListener(apply as any); }
      return () => { try { mq.removeEventListener('change', apply); } catch { mq.removeListener(apply as any); } };
    } catch { setIsDesktop(false); }
  }, []);

  // Meniul mobil trebuie să se deschidă peste pagină; blocăm scroll-ul din fundal cât timp e deschis
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

  // Măsurăm înălțimea header-ului pentru a poziționa corect meniul fix pe mobil
  useEffect(() => {
    const measure = () => {
      const h = navRef.current?.getBoundingClientRect?.().height ?? 0;
      if (h > 0) setNavHeight(Math.ceil(h));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  const beneficii: string[] = [
    "Formular personalizat pentru check-in digital",
    "Semnătură electronică conformă GDPR și verificare foto ID (ștearsă automat la confirmarea rezervării)",
    "QR cod pentru validare check-in",
    "Notificare push și email pentru fiecare nouă rezervare",
    "Mesaje automate, programate conform rezervării",
    "Integrarea calendarelor din diferite platforme (Booking, Airbnb etc.)",
    "Sincronizarea automată a rezervărilor între platforme",
    "Nelimitat proprietăți și camere listate într-un singur cont",
    "Note interne pentru fiecare rezervare",
    "Liste de verificare personalizate conform fiecărei rezervări (mic dejun inclus, schimbare prosoape zilnic etc.)",
    "Front desk direct de pe telefon (confirmă/modifică rezervare)",
    "Exportă PDF-ul cu detaliile fiecărei rezervări",
    "Redirecționare către mesaj WhatsApp direct din rezervare",
    "Prioritizare curățenie camere în funcție de următorul check-in",
    "Listă personalizată de task-uri pentru curățenie",
    "Actualizează în timp real statusul curățeniei",
    "Împarte activitățile zilnice cu membrii din echipă",
    "Sincronizare instantă a rezervărilor în calendarul aplicației prin butonul (Sync Now)",
    "Guest AI assistant (detalii sosire, facilități, recomandări și check-out)",
  ];

  // Recenzii (RO)
  const recenziiRo: Array<{ title: string; author: string; body: string }> = [
    {
      title: "„De când folosesc Plan4Host, văd totul dintr-o privire și îmi e mult mai ușor să coordonez.”",
      author: "— Andrei Popa, Brașov • 3 apartamente",
      body: "",
    },
  ];
  const [revIdx, setRevIdx] = useState<number>(0);
  const revStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => { revStartX.current = e.touches?.[0]?.clientX ?? null; };
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const sx = revStartX.current; revStartX.current = null; if (sx == null) return;
    const ex = e.changedTouches?.[0]?.clientX ?? sx; const dx = ex - sx; const TH = 40;
    if (dx > TH) setRevIdx(i => (i - 1 + recenziiRo.length) % recenziiRo.length);
    else if (dx < -TH) setRevIdx(i => (i + 1) % recenziiRo.length);
  };
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') setRevIdx(i => (i - 1 + recenziiRo.length) % recenziiRo.length);
    if (e.key === 'ArrowRight') setRevIdx(i => (i + 1) % recenziiRo.length);
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
	      <AutoOpenOnLanding delay={150} />
	      <MobileScrollReveal />

      {/* Bară safe-area iOS */}
      <div aria-hidden style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 'var(--safe-top)', background: 'var(--bg)', zIndex: 3, pointerEvents: 'none' }} />
      {isPwa && (
        <div aria-hidden style={{ position:'fixed', bottom:0, left:0, right:0, height:'var(--safe-bottom)', background:'var(--bg)', zIndex:3, pointerEvents:'none' }} />
      )}
      <div aria-hidden style={{ position:'fixed', top:0, bottom:0, left:0, width:'var(--safe-left)', background:'var(--bg)', zIndex:3, pointerEvents:'none' }} />
      <div aria-hidden style={{ position:'fixed', top:0, bottom:0, right:0, width:'var(--safe-right)', background:'var(--bg)', zIndex:3, pointerEvents:'none' }} />

      {/* Android install banner */}
      <AndroidInstallBannerRo />

      {/* Skip link */}
      <a href="#content" className={`${styles.skipLink} ${styles.focusable}`}>Sari la conținut</a>

      {/* Navigație */}
      <nav ref={navRef as any} className={styles.nav} data-open={navOpen ? "true" : "false"} aria-label="Primary">
        <div className={styles.brandWrap}>
          <Link href="/ro" className={`${styles.brand} ${styles.focusable}`}>
            <img src="/Logo_Landing_AI.png" alt="Plan4host" className={styles.logoDark} />
          </Link>
          {/* Switch limbă (lipit de logo) */}
          <Link href="/" className={`${styles.btnLang} ${styles.focusable}`} aria-label="Switch to English">
            <img src="/ro.png" alt="" width={22} height={22} style={{ display: 'block' }} />
          </Link>
        </div>
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
		            Despre
		          </a>
		          <a
		            href="#features-title"
		            className={`${styles.menuLink} ${styles.focusable}`}
		            onClick={(e) => { e.preventDefault(); closeMenuAndScroll('features-title'); }}
		          >
		            Funcții
		          </a>
		          <a
		            href="#reviews-title"
		            className={`${styles.menuLink} ${styles.focusable}`}
		            onClick={(e) => { e.preventDefault(); closeMenuAndScroll('reviews-title'); }}
		          >
		            Recenzii
		          </a>
		          <a
		            href="#pricing-title"
		            className={`${styles.menuLink} ${styles.focusable}`}
		            onClick={(e) => { e.preventDefault(); closeMenuAndScroll('pricing-title'); }}
		          >
		            Prețuri
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
        <div className={styles.actions}>
          <Link href="/auth/login" className={`sb-cardglow ${styles.btn} ${styles.btnGhost} ${styles.focusable}`}>Logare</Link>
          <CtaLink href="/auth/login?mode=signup" className={`sb-cardglow ${styles.btn} ${styles.btnChoose} ${styles.focusable}`}>Încearcă</CtaLink>
          <button
            type="button"
            className={`${styles.btn} ${styles.menuToggle} ${styles.focusable}`}
            aria-controls="mobile-menu"
            aria-expanded={navOpen}
            aria-label={navOpen ? "Închide meniul" : "Deschide meniul"}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className={styles.srOnly}>{navOpen ? "Închide" : "Meniu"}</span>
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

      {/* Meniu mobil */}
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
		          Despre
		        </a>
		        <a
		          href="#features-title"
		          className={`${styles.mobileLink} ${styles.focusable}`}
		          onClick={(e) => { e.preventDefault(); closeMenuAndScroll('features-title'); }}
		        >
		          Funcții
		        </a>
		        <a
		          href="#reviews-title"
		          className={`${styles.mobileLink} ${styles.focusable}`}
		          onClick={(e) => { e.preventDefault(); closeMenuAndScroll('reviews-title'); }}
		        >
		          Recenzii
		        </a>
		        <a
		          href="#pricing-title"
		          className={`${styles.mobileLink} ${styles.focusable}`}
		          onClick={(e) => { e.preventDefault(); closeMenuAndScroll('pricing-title'); }}
		        >
		          Prețuri
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
	          <h1 className={styles.heroHeadline}>
	            <span className={styles.heroHeadlineLine}>
	              <span className={styles.heroHeadlineTag}>Mai puține</span>
	              <span>mesaje.</span>
	            </span>
	            <span className={styles.heroHeadlineLine}>
	              <span className={styles.heroHeadlineTag}>Mai puțin</span>
	              <span>haos.</span>
	            </span>
	            <span className={styles.heroHeadlineLine}>
	              <span className={`${styles.heroHeadlineTag} ${styles.heroHeadlineTagSuccess}`}>Mai mult</span>
	              <span className={styles.heroHeadlineAccent}>control.</span>
	            </span>
	          </h1>
	          <p className={styles.heroKicker}>
	            Un singur sistem care conectează oaspeți, rezervări și curățenie — ca să nu scape nimic.
	          </p>
	          <div className={styles.heroCta}>
            <button
              type="button"
              onClick={() => scrollToId("features-title")}
              className={`sb-cardglow ${styles.btn} ${styles.btnChoose} ${styles.focusable}`}
            >
              Vezi cum funcționează
            </button>
            <Link href="/auth/login?mode=signup" className={`sb-cardglow ${styles.btn} ${styles.focusable}`}>
              Începe gratuit
            </Link>
          </div>
        </div>
        <div className={styles.heroVisual} aria-label="Calendar preview" data-p4h-reveal>
          <img
            src="/Landing_Mockups2.png"
            alt="Mockup-uri aplicația Plan4Host"
            className={styles.focusable}
          />
        </div>
      </section>

      {/* Try Check-in modal (RO) */}
	      {tryModalOpen && (
	        <div role="dialog" aria-modal="true" onClick={()=>setTryModalOpen(false)}
	             style={{ position:'fixed', inset:0, zIndex: 320, background:'rgba(0,0,0,.55)', display:'grid', placeItems:'center', padding:16 }}>
	          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(560px, 100%)', padding:16 }}>
	            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
	              <strong>Testează formularul de check‑in</strong>
	              <button
	                aria-label="Închide"
	                onClick={()=>setTryModalOpen(false)}
	                style={{ width:32, height:32, borderRadius:999, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', display:'grid', placeItems:'center', cursor:'pointer' }}
	              >
	                ×
	              </button>
	            </div>
	            <div style={{ display:'grid', gap:16 }}>
	              <p style={{ margin:0, color:'var(--muted)' }}>
	                Vei fi redirecționat către un formular de check‑in de test, ca să vezi exact experiența pe care o are un oaspete.
	                Pentru o experiență completă, folosește o adresă de email validă — vei primi confirmarea și pașii următori ca un client real.
	              </p>
	              <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
	                <button className={`sb-btn sb-btn--primary ${styles.sbBtn} ${styles.sbBtnPrimary}`} onClick={()=>{ router.push('/checkin?property=b1588b40-954d-4489-b36e-45659853489a&source=manual'); setTryModalOpen(false); }}>Continuă</button>
	              </div>
	            </div>
	          </div>
	        </div>
	      )}

	      {/* Dovadă */}
	      <section id="insights" aria-labelledby="insights-title" className={styles.features} style={{ paddingTop: 0 }}>
          <h2 id="insights-title" data-p4h-reveal>
            Gândit pentru hosting real, nu pentru demo‑uri
          </h2>
          <ul className={styles.proofList} data-p4h-reveal>
            <li>De la primul login la check‑in gata de folosit, în câteva minute</li>
            <li>Fără training</li>
            <li>Funcționează pentru apartamente single și proprietăți cu mai multe unități</li>
          </ul>
        </section>

	      {/* Identificare */}
	      <section id="about" className={styles.about} aria-labelledby="about-title">
	        <h2 id="about-title" data-p4h-reveal>Îți sună familiar?</h2>
	        <div className={styles.aboutGrid}>
	          <div className={styles.aboutVisual} aria-label="Previzualizare sincronizare calendare" data-p4h-reveal>
	            <img src="/Calendar_Sync.png" alt="Previzualizare sincronizare calendare" />
	          </div>
	          <div className={styles.aboutCard} data-p4h-reveal>
              <ul className={styles.problemList}>
                <li>Oaspeții pun aceleași întrebări, iar și iar</li>
                <li>Rezervările vin din mai multe platforme</li>
                <li>Curățenia se coordonează pe WhatsApp</li>
                <li>Verifici totul de două ori — „ca să fii sigur”</li>
              </ul>
              <p className={styles.problemClose}>Plan4Host a fost construit ca să oprească asta.</p>
            </div>
	        </div>
	      </section>

	      {/* Cum rulează totul */}
	      <section id="features" className={styles.features} aria-labelledby="features-title">
        <h2 id="features-title" data-p4h-reveal>Totul rulează dintr‑un singur loc, calm</h2>

	        <div className={styles.calmGrid}>
	          <div className={`sb-cardglow ${styles.calmCard}`} data-p4h-reveal>
	            <div className={styles.calmHead}>
	              <div className={styles.calmEmoji} aria-hidden>
	                <img className={styles.calmEmojiImg} src="/landing_guest.png" alt="" />
	              </div>
	              <h3>Oaspeți</h3>
	            </div>
	            <ul className={styles.calmList}>
	              <li>Un singur link cu tot ce au nevoie</li>
	              <li>Check‑in, sosire, facilități, check‑out</li>
              <li>În limba lor, fără să te întrebe</li>
            </ul>
          </div>
	          <div className={`sb-cardglow ${styles.calmCard}`} data-p4h-reveal>
	            <div className={styles.calmHead}>
	              <div className={styles.calmEmoji} aria-hidden>
	                <img className={styles.calmEmojiImg} src="/landing_calendar.png" alt="" />
	              </div>
	              <h3>Rezervări</h3>
	            </div>
	            <ul className={styles.calmList}>
	              <li>Toate rezervările într‑un singur calendar</li>
	              <li>iCal sync în timp real între platforme</li>
              <li>Fără ghicit, fără suprapuneri</li>
            </ul>
          </div>
	          <div className={`sb-cardglow ${styles.calmCard}`} data-p4h-reveal>
	            <div className={styles.calmHead}>
	              <div className={styles.calmEmoji} aria-hidden>
	                <img className={styles.calmEmojiImg} src="/landing_cleaning.png" alt="" />
	              </div>
	              <h3>Curățenie</h3>
	            </div>
	            <ul className={styles.calmList}>
	              <li>Task-urile urmează automat check‑out‑urile</li>
	              <li>Priorități clare pentru azi</li>
              <li>Toată lumea știe ce urmează</li>
            </ul>
          </div>
        </div>
        <div
          className="sb-cardglow"
          data-p4h-reveal
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
            Video indisponibil.
          </video>
          <button
            type="button"
            onClick={toggleFeaturesPlay}
            onPointerDown={(e) => { e.stopPropagation(); }}
            className={styles.focusable}
            aria-label={featuresPlaying ? 'Pauză video' : 'Redă video'}
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

      {/* Testimonial */}
      <section id="recenzii" className={styles.reviews} aria-labelledby="reviews-title">
        <h2 id="reviews-title" data-p4h-reveal>Ce spun gazdele</h2>
        <div className={styles.reviewsBody} data-p4h-reveal>
          <div
            className={styles.reviewsCard}
            role="region"
            aria-roledescription="carousel"
            aria-label="Recenzii utilizatori"
            aria-live="polite"
            tabIndex={0}
            onKeyDown={onKey}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {recenziiRo.length > 1 && (
              <button
                type="button"
                className={`${styles.reviewsArrow} ${styles.reviewsArrowLeft}`}
                aria-label="Recenzia anterioară"
                onClick={() => setRevIdx(i => (i - 1 + recenziiRo.length) % recenziiRo.length)}
              />
            )}
            {(() => {
              const r = recenziiRo[revIdx];
              const parts = String(r.author || '').split('•');
              const left = (parts[0] || '').trim();
              const right = (parts[1] || '').trim();
	              return (
	                <div style={{ display: 'grid', gap: 16 }}>
	                  <div className={styles.reviewTitle}>{r.title}</div>
	                  {r.body ? <div className={styles.reviewBody}>{r.body}</div> : null}
	                  <div className={styles.reviewAuthor}>
	                    <span className={styles.authorMain}>{left}</span>
	                    {right && <span className={styles.authorDetail}> • {right}</span>}
	                  </div>
	                </div>
	              );
	            })()}
            {recenziiRo.length > 1 && (
              <button
                type="button"
                className={`${styles.reviewsArrow} ${styles.reviewsArrowRight}`}
                aria-label="Recenzia următoare"
                onClick={() => setRevIdx(i => (i + 1) % recenziiRo.length)}
              />
            )}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className={styles.features} aria-labelledby="cta-title">
        <div className={`sb-cardglow ${styles.finalCtaCard}`} data-p4h-reveal>
          <h2 id="cta-title">Oprește haosul. Începe să găzduiești calm.</h2>
          <div className={styles.finalCtaActions}>
            <Link
              href="/auth/login?mode=signup"
              className={`sb-cardglow ${styles.btn} ${styles.btnChoose} ${styles.focusable}`}
            >
              Încearcă Plan4Host gratuit
            </Link>
          </div>
        </div>
      </section>

	      {/* Prețuri */}
		      <section id="pricing" className={styles.pricing} aria-labelledby="pricing-title">
		        <h2 id="pricing-title" data-p4h-reveal>Prețuri simple. Totul conectat.</h2>
	          <p className={styles.pricingLead} data-p4h-reveal>
	            Toate planurile includ comunicare cu oaspeții și sincronizare rezervări. Curățenia este inclusă din Standard în sus.
	          </p>
	          <div className={styles.includedBox} data-p4h-reveal>
	            <div className={styles.includedTitle}>Inclus în orice plan</div>
	            <ul className={styles.includedList}>
	              <li>Calendar unificat cu iCal sync</li>
	              <li>Check‑in digital & confirmări</li>
	              <li>Mesaje automate, în funcție de rezervare</li>
	              <li>Ghid oaspeți (sosire, coduri acces, locație, reguli, check‑out)</li>
	              <li>Proprietăți și camere nelimitate</li>
	            </ul>
	          </div>
	        <div className={styles.pricingGrid}>
		          <div className={`sb-cardglow ${styles.priceCard}`} data-p4h-reveal>
		            <div className={styles.priceTier}>BASIC</div>
	              <span className={styles.srOnly}>50 RON / lună</span>
	              <p className={styles.planMeta}>Pentru gazde mici</p>
	              <ul className={styles.includedList}>
	                <li>Sync calendar la 60 minute</li>
	                <li>Automatizare mesaje standard</li>
	                <li>Ghid esențial pentru sosire</li>
	              </ul>
	            <img className={styles.priceImg} src="/basic_ron_forlight.png" alt="" aria-hidden="true" />
	            <Link href="/auth/login?mode=signup&plan=basic&next=%2Fapp%2Fsubscription%3Fplan%3Dbasic%26hl%3D1" className={`${styles.btn} ${styles.btnChoose} ${styles.focusable}`}>Alege Basic</Link>
	          </div>

		          <div className={`sb-cardglow ${styles.priceCard}`} data-p4h-reveal>
	            <div className={styles.priceTier}>STANDARD</div>
	              <div className={styles.planBadge}>Pentru proprietăți în creștere ⭐</div>
	              <span className={styles.srOnly}>75 RON / lună</span>
	              <ul className={styles.includedList}>
	                <li>Sync calendar la 30 minute</li>
	                <li>Mesaje automate mai rapide</li>
	                <li>Task-uri de curățenie legate de check‑out</li>
	              </ul>
	            <img className={styles.priceImg} src="/standard_ron_forlight.png" alt="" aria-hidden="true" />
	            <Link href="/auth/login?mode=signup&plan=standard&next=%2Fapp%2Fsubscription%3Fplan%3Dstandard%26hl%3D1" className={`${styles.btn} ${styles.btnChoose} ${styles.focusable}`}>Alege Standard</Link>
	          </div>

		          <div className={`sb-cardglow ${styles.priceCard}`} data-p4h-reveal>
	            <div className={styles.priceTier}>PREMIUM</div>
	              <span className={styles.srOnly}>90 RON / lună</span>
	              <p className={styles.planMeta}>Pentru operațiuni aglomerate</p>
	              <ul className={styles.includedList}>
	                <li>Sync calendar la 10 minute</li>
	                <li>Status curățenie în timp real</li>
	                <li>Smart Guest Guide</li>
	              </ul>
	            <img className={styles.priceImg} src="/premium_ron_forlight.png" alt="" aria-hidden="true" />
	            <Link href="/auth/login?mode=signup&plan=premium&next=%2Fapp%2Fsubscription%3Fplan%3Dpremium%26hl%3D1" className={`${styles.btn} ${styles.btnChoose} ${styles.focusable}`}>Alege Premium</Link>
	          </div>
	        </div>
	        <p className={styles.srOnly}>
	          Prețurile sunt: 50.00 RON/lună (Basic), 75.00 RON/lună (Standard), 90.00 RON/lună (Premium). TVA inclus.
	        </p>
	      </section>

      {/* FAQ */}
	      <section id="faq" className={`${styles.contact}`} aria-labelledby="faq-title">
	        <h2 id="faq-title" data-p4h-reveal>FAQ</h2>
        {[
          {
            id: 'units',
            question: 'Pot să folosesc aplicația atât pentru apartamente/studiouri (unități singulare), cât și pentru cabane/pensiuni (unități multiple)?',
            content: (
              <>
                <p className={styles.faqLead}>
                  <strong>Pe scurt:</strong> da — funcționează și pentru o singură unitate, și pentru proprietăți cu mai multe unități.
                </p>
                <ul className={styles.faqList}>
                  <li>Unitate singulară: setezi o cameră ca întreaga proprietate și gestionezi totul dintr-un singur calendar.</li>
                  <li>Unități multiple: adaugi fiecare cameră sau tip de cameră și ai calendare, task-uri și mesaje per unitate.</li>
                  <li>Listată pe platforme atât pe cameră, cât și cu opțiunea „Întreaga proprietate”? Păstrează camerele separate și adaugă o „cameră” în Plan4Host pentru întreaga cabană; leagi iCal astfel încât rezervările pe camere și pe întreaga proprietate să se blocheze reciproc.</li>
                </ul>
              </>
            ),
          },
          {
            id: 'guest-data',
            question: 'Cum colectez datele oaspeților?',
            content: (
              <>
                <p className={styles.faqLead}>
                  Configurezi proprietatea, apoi generezi linkuri de formular de check-in.
                </p>
                <ul className={styles.faqList}>
                  <li>Pui linkurile ca răspuns automat pe platformele unde ai listată proprietatea.</li>
                  <li>Oaspeții sunt ghidați să parcurgă toți pașii, ca sosirea să fie simplă.</li>
                  <li><strong>Vrei o evidență mai bună?</strong> Generează linkuri specifice pentru fiecare platformă și vezi sursa fiecărui formular completat.</li>
                </ul>
              </>
            ),
          },
          {
            id: 'access-codes',
            question: 'Aplicația îmi permite să trimit automat codurile de acces cu puțin timp înainte de a ajunge oaspetele?',
            content: (
              <>
                <p className={styles.faqLead}>
                  Da. Configurezi un template și îl programezi să plece automat cu o oră înainte de fiecare rezervare.
                </p>
                <ul className={styles.faqList}>
                  <li>Mesajul este trimis automat și personalizat pentru fiecare rezervare.</li>
                  <li>Nu mai trebuie să faci nimic — aplicația te ajută să acorzi mai multă atenție oaspeților tăi.</li>
                </ul>
              </>
            ),
          },
          {
            id: 'reservation-notes',
            question: 'Pot să am o rubrică unde să pun notițe pentru fiecare rezervare?',
            content: (
              <>
                <p className={styles.faqLead}>
                  Da. În meniul „Property Setup”, la „Reservation details”, poți crea câte casete de note vrei.
                </p>
                <ul className={styles.faqList}>
                  <li>Fiecare câmp de notă este unic pentru fiecare rezervare — util pentru staff sau pentru tine.</li>
                  <li>Poți folosi și bife pentru opțiuni precum „mic dejun inclus” sau „schimbare prosoape zilnic”.</li>
                </ul>
              </>
            ),
          },
          {
            id: 'sync-calendars',
            question: 'Cum sincronizez calendarele?',
            content: (
              <>
                <p className={styles.faqLead}>
                  Aliniază mai întâi structura proprietății, apoi importă și exportă linkurile iCal.
                </p>
                <ul className={styles.faqList}>
                  <li>Asigură-te că în Plan4Host ai aceeași structură (camere/tipuri) ca pe platformele pe care le sincronizezi.</li>
                  <li>Intră la „Sync Calendars” și importă linkurile iCal din Airbnb, Booking, Travelminit etc.</li>
                  <li>Tot din „Sync Calendars”, copiază linkurile de export Plan4Host și inserează-le în platformele de booking.</li>
                </ul>
              </>
            ),
          },
          {
            id: 'checkin-confirmation',
            question: 'Cum știe oaspetele că am primit formularul de check-in?',
            content: (
              <>
                <p className={styles.faqLead}>
                  Primește imediat un email cu formularul trimis, iar tu primești un email separat.
                </p>
                <ul className={styles.faqList}>
                  <li>După ce apasă „Submit”, oaspetele primește un email cu datele colectate și perioada de retenție (GDPR).</li>
                  <li>Tu primești un email separat ca să poți confirma rezervarea.</li>
                  <li>În baza datelor din formular, se vor trimite automat și mesajele programate, conform fiecărei rezervări.</li>
                </ul>
                <div style={{ marginTop: 8 }}>
                  <img
                    src="/Confirmare%20primire%20formular.png"
                    alt="Email de confirmare după trimiterea formularului de check-in"
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
              data-p4h-reveal
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
	          <h2 id="contact-title" data-p4h-reveal>Contact</h2>
	        <div className={styles.contactCard} data-p4h-reveal>
	          <div style={{ display: 'grid', gap: 16 }}>
	            <p style={{ margin: 0, color: 'var(--muted)' }}>
	              <span>Uneori ai nevoie doar de un răspuns rapid.</span><br />
	              <span>Scrie-ne — suntem la un mesaj distanță, pe email sau WhatsApp.</span>
	            </p>
	            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
	              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ opacity: .9 }}>
	                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.81.33 1.6.63 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.74-1.74a2 2 0 0 1 2.11-.45c.74.3 1.53.51 2.34.63A2 2 0 0 1 22 16.92z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
	              </svg>
	              <a className={styles.focusable} href="https://wa.me/40721759329" target="_blank" rel="noopener noreferrer" title="Scrie-ne pe WhatsApp">+40 721 759 329</a>
	            </div>
	            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
	              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ opacity: .9 }}>
	                <rect x="3" y="5" width="18" height="14" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="2" />
	                <path d="M3 7l9 6 9-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
	              </svg>
	              <a className={styles.focusable} href="mailto:office@plan4host.com" title="Trimite-ne un e-mail">office@plan4host.com</a>
	            </div>
	          </div>
	        </div>
      </section>

      {/* Footer (extins) — etichete în RO, linkuri către paginile EN */}
      <footer className={styles.footer} aria-labelledby="footer-title">
        <h2 id="footer-title" className={styles.srOnly}>Subsol</h2>
        <div className={styles.footerGrid}>
          <div className={styles.footerCol}>
            <div className={styles.footerBrand}>
              <img src="/Logo_Landing.png" alt="" aria-hidden="true" className={styles.logoDark} />
              <strong>Plan4Host</strong>
            </div>
            <p className={styles.footerCopy}>Calendar centralizat de rezervări cu actualizări iCal în timp real, dedicat proprietăților mici. </p>
            {/* Mobile-only: show footer columns directly under the short copy */}
            <div className={styles.footerStacksMobile}>
              <div>
                <div className={styles.footerTitle}>Produs</div>
                <ul className={styles.footerList}>
                  <li><a className={styles.footerLink} href="#features-title">Funcții</a></li>
                  <li><a className={styles.footerLink} href="#pricing">Prețuri</a></li>
                  <li><Link className={styles.footerLink} href="/auth/login?mode=signup">Încearcă gratuit</Link></li>
                  <li><Link className={styles.footerLink} href="/auth/login">Autentificare</Link></li>
                </ul>
              </div>
              <div>
                <div className={styles.footerTitle}>Resurse</div>
                <ul className={styles.footerList}>
                  <li><Link className={styles.footerLink} href="/docs">Documentație</Link></li>
                  <li><Link className={styles.footerLink} href="/changelog">Changelog</Link></li>
                  <li><Link className={styles.footerLink} href="/status">Status</Link></li>
                  <li><a className={styles.footerLink} href="mailto:office@plan4host.com">Suport</a></li>
                </ul>
              </div>
              <div>
                <div className={styles.footerTitle}>Companie</div>
                <ul className={styles.footerList}>
                  <li><Link className={styles.footerLink} href="/about">Despre noi</Link></li>
                  <li><Link className={styles.footerLink} href="#contact">Contact</Link></li>
                  <li><Link className={styles.footerLink} href="/careers">Cariere</Link></li>
                  <li><Link className={styles.footerLink} href="/partners">Parteneri</Link></li>
                </ul>
              </div>
              <div>
                <div className={styles.footerTitle}>Legal</div>
                <ul className={styles.footerList}>
                  <li><Link className={styles.footerLink} href="/legal/terms">Termeni & condiții</Link></li>
                  <li><Link className={styles.footerLink} href="/legal/privacy">Politica de confidențialitate</Link></li>
                  <li><Link className={styles.footerLink} href="/legal/dpa">Acord de prelucrare a datelor</Link></li>
                  <li><Link className={styles.footerLink} href="/legal/cookies">Politica Cookie</Link></li>
                </ul>
              </div>
              
            </div>
          </div>

          <div className={styles.footerCol}>
            <div className={styles.footerTitle}>Produs</div>
            <ul className={styles.footerList}>
              <li><a className={styles.footerLink} href="#features-title">Funcții</a></li>
              <li><a className={styles.footerLink} href="#pricing">Prețuri</a></li>
              <li><Link className={styles.footerLink} href="/auth/login?mode=signup">Încearcă gratuit</Link></li>
              <li><Link className={styles.footerLink} href="/auth/login">Autentificare</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <div className={styles.footerTitle}>Resurse</div>
            <ul className={styles.footerList}>
              <li><Link className={styles.footerLink} href="/docs">Documentație</Link></li>
              <li><Link className={styles.footerLink} href="/changelog">Changelog</Link></li>
              <li><Link className={styles.footerLink} href="/status">Status</Link></li>
              <li><a className={styles.footerLink} href="mailto:office@plan4host.com">Suport</a></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <div className={styles.footerTitle}>Companie</div>
            <ul className={styles.footerList}>
              <li><Link className={styles.footerLink} href="/about">Despre noi</Link></li>
              <li><Link className={styles.footerLink} href="#contact">Contact</Link></li>
              <li><Link className={styles.footerLink} href="/careers">Cariere</Link></li>
              <li><Link className={styles.footerLink} href="/partners">Parteneri</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <div className={styles.footerTitle}>Legal</div>
            <ul className={styles.footerList}>
              <li><Link className={styles.footerLink} href="/legal/terms">Termeni și condiții</Link></li>
              <li><Link className={styles.footerLink} href="/legal/privacy">Politica de confidențialitate</Link></li>
              <li><Link className={styles.footerLink} href="/legal/dpa">Acord de prelucrare a datelor</Link></li>
              <li><Link className={styles.footerLink} href="/legal/cookies">Politica Cookie</Link></li>
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

        {/* Social (mobile‑only) — sub meniuri, deasupra insigne ANPC/Stripe */}
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
        <style jsx>{`@media (min-width: 561px){ .p4h-social-row{ display: none !important; } }`}</style>

        {/* Insigne conformitate/plăți (aliniate la stânga; loc și pentru Stripe) */}
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
            © {year} Plan4Host. Toate drepturile rezervate. Prin utilizarea Plan4Host ești de acord cu <Link className={styles.footerLink} href="/legal/terms">Termeni și condiții</Link> și <Link className={styles.footerLink} href="/legal/privacy">Politica de confidențialitate</Link>.
          </p>
          <p className={styles.legalMeta}>Plan4Host nu este afiliat cu Airbnb sau Booking.com. Mărcile aparțin proprietarilor.</p>
        </div>
      </footer>

      {/* Cookie consent */}
      <CookieConsentLanding />

      <WhatsAppPill lang="ro" />
      <CookieFab lang="ro" />

      {/* JSON-LD Organization (RO) */}
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
              "sistem de management al proprietății (PMS)",
              "sincronizare iCal Airbnb",
              "sincronizare iCal Booking.com",
              "software cazare",
              "check‑in online",
              "formular check‑in online"
            ]
          })
        }}
      />

      {/* JSON-LD oferte (RO) */}
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
              "PMS (sistem de management al proprietății) cu sincronizare iCal pentru Booking.com și Airbnb și check‑in online sigur.",
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "RON",
              lowPrice: "50.00",
              highPrice: "90.00",
              offerCount: 3,
              offers: [
                { "@type": "Offer", price: "50.00", priceCurrency: "RON", category: "Basic" },
                { "@type": "Offer", price: "75.00", priceCurrency: "RON", category: "Standard" },
                { "@type": "Offer", price: "90.00", priceCurrency: "RON", category: "Premium" },
              ],
            },
          }),
        }}
      />
      {/* JSON-LD FAQ (RO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Oferiți găzduire web?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Nu. Plan4Host este software PMS. Nu vindem găzduire web."
                }
              },
              {
                "@type": "Question",
                name: "Aveți formulare de check‑in online conforme GDPR?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Da. Plan4Host include formulare securizate de check‑in cu captarea consimțământului și DPA în zona Legal."
                }
              },
              {
                "@type": "Question",
                name: "Ce canale pot sincroniza prin iCal?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Airbnb, Booking.com, Expedia și Travelminit, prin feed‑uri standard iCal (import/export)."
                }
              },
              {
                "@type": "Question",
                name: "Există un plan PMS accesibil?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Da. Toate planurile sunt plătite, inclusiv Basic, gândite pentru proprietăți mici."
                }
              }
            ]
          })
        }}
      />
    </main>
  );
}
