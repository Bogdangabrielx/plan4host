"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "../home.module.css";
import { createPortal } from "react-dom";
import AutoOpenOnLanding from "@/components/consent/AutoOpenOnLanding";

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
                 <h3 style={{ fontSize: isMobile ? 9 : undefined }}>{f.title}</h3>
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
          style={{ position:'fixed', inset:0, zIndex:120, background:'rgba(0,0,0,.55)', display:'grid', placeItems:'center', padding:12 }}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-cardglow" style={{ width:'min(520px, 92vw)', background:'var(--card)', border:'0.5px solid var(--border)', borderRadius:16, padding:16, display:'grid', gap:10 }}>
            <div style={{ alignItems:'center', gap:10 }}>
              <img src={f.icon} alt="" aria-hidden className={styles.featureIcon} />
              <h3 style={{ margin:0 }}>{f.title}</h3>
            </div>
            <p style={{ margin:0, color:'var(--muted)' }}>{f.text}</p>
            <button className="sb-btn sb-cardglow" onClick={() => setModalIdx(null)} style={{ justifySelf:'end' }}>Închide</button>
          </div>
        </div>
      ); })()}
      <button type="button" aria-label="Next features" className={`${styles.carouselBtn} ${styles.carouselBtnRight} `} onClick={next}>›</button>
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
    <div role="dialog" aria-modal="true" aria-label="Cookie consent" style={{ position: "fixed", inset: 0, zIndex: 2147483646, display: "grid", alignItems: "start", justifyItems: "center", padding: "clamp(12px, 6vh, 40px) 12px", background: "color-mix(in srgb, var(--bg, #0b1117) 55%, transparent)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }} onClick={() => setShowPrefs(false)}>
      <div onClick={(e) => e.stopPropagation()} className="modalCard" data-animate="true" style={{ width: "min(560px, calc(100vw - 32px))", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 22, padding: 20, boxShadow: "0 14px 40px rgba(0,0,0,.35)", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div aria-hidden style={{ fontSize: 28, lineHeight: 1, width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: 12, background: "radial-gradient(60% 60% at 30% 20%, rgba(255,255,255,.16), transparent), color-mix(in srgb, var(--primary) 18%, var(--card))", boxShadow: "0 8px 24px rgba(0,0,0,.35), inset 0 0 0 1px color-mix(in srgb, var(--border) 60%, transparent)" }}>🍪</div>
          <div>
            <h3 style={{ margin: 0 }}>Folosim cookies</h3>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Cookie-urile esențiale țin site-ul funcțional. Opțional, putem reține <strong>tema</strong> (light/dark).</div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={acceptPreferences} className="sb-btn sb-btn--primary" style={{ padding: "10px 14px", borderRadius: 12, fontWeight: 900 }}>Accept preferințe</button>
            <button onClick={acceptOnlyNecessary} className="sb-btn sb-btn--ghost" style={{ padding: "10px 14px", borderRadius: 12, fontWeight: 900 }}>Doar necesare</button>
            <button onClick={(e) => { e.stopPropagation(); setShowPrefs((v) => !v); }} className="sb-btn sb-btn--ghost" style={{ padding: "10px 14px", borderRadius: 12, fontWeight: 900 }}>Personalizează</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function HomePageRO() {
  const [navOpen, setNavOpen] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const featuresVideoRef = useRef<HTMLVideoElement | null>(null);
  const [featuresPlaying, setFeaturesPlaying] = useState(true);
  const [featuresHover, setFeaturesHover] = useState(false);
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
  ];

  // Recenzii (RO)
  const recenziiRo: Array<{ title: string; author: string; body: string }> = [
    {
      title: "„Recomand, mai ales dacă ai multe sosiri și plecări în aceeași zi”",
      author: "— Andrei Popa, Brașov • 3 apartamente",
      body: "La mine, când se aglomera situația, mai încurcam ordinea camerelor. De când folosesc Plan4Host, văd totul dintr-o privire și îmi e mult mai ușor să coordonez.",
    },
    {
      title: "„Un mic ajutor care chiar contează”",
      author: "— Ioana Rusu, Zona Sibiului • Guesthouse de 4 camere",
      body: "Nu pot spune că greșeam des, dar mi s-a întâmplat să trimit același mesaj la mai mulți oaspeți fără să-l ajustez. Acum aplicația personalizează automat și totul arată mult mai profesionist.",
    },
    {
      title: "„Pentru cine mai răspunde uneori prea târziu”",
      author: "— Mihai Ioniță, Cluj-Napoca • 2 studiouri Airbnb",
      body: "Eu mai prindeam uneori ore târzii până trimiteam detaliile de check-in. Cu Plan4Host mesajele pleacă la timp și oaspeții ajung mult mai liniștiți. Se simte clar în experiența lor.",
    },
    {
      title: "„Dacă ai avut măcar o dată rezervări încurcate…”",
      author: "— Elena Badea, București • Apartamente regim hotelier",
      body: "Am pățit-o și eu când am avut două check-in-uri apropiate. Calendarul din aplicație m-a scăpat de grijă — am totul în același loc și nu mai risc să greșesc.",
    },
    {
      title: "„Nu schimbă modul de lucru, doar îl face mai clar”",
      author: "— Vlad Rădulescu, Oradea • 4 apartamente în regim hotelier",
      body: "Eu sunt obișnuit să-mi notez totul, dar uneori pierdeam timp căutând informații prin mesaje. Aici e totul ordonat și nu simt că m-am complicat, dimpotrivă.",
    },
    {
      title: "„Recomand pentru modul în care trimite informațiile”",
      author: "— Alina Ghermani, Suceava • Cabana turistică",
      body: "Trimiteam de multe ori toate detaliile dintr-o dată, iar oaspeții ziceau că e cam mult. Acum mesajele vin pe rând și sunt întrebată mult mai rar lucruri în privat. Se simte că fluxul e mai natural.",
    },
    {
      title: "„Dacă ai personal la curățenie, te ajută enorm”",
      author: "— Gabriel Stan, Târgu Mureș • Pensiune",
      body: "Mai greșeam uneori camera care trebuia pregătită prima. Plan4Host îți arată clar ordinea, ora și taskurile. Pentru noi chiar a fost un upgrade.",
    },
    {
      title: "„Surprinzător de utilă”",
      author: "— Cristina Pavel, Constanța • Apartament de vacanță la malul mării",
      body: "Nu credeam că am nevoie de încă o aplicație, sincer. Dar mi-am dat seama că uitam uneori câte un detaliu. Acum primesc notificări și nu mai sar peste nimic.",
    },
    {
      title: "„Mai puțină agitație, mai mult control”",
      author: "— Radu Dumitrescu, Iași • 5 unități în regim hotelier",
      body: "Nu eram chiar copleșit, dar uneori mai scăpa câte o informație în conversațiile lungi cu oaspeții. Cu aplicația văd totul clar și îmi simt programul mult mai organizat.",
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
    <main className={styles.landing} style={{ paddingBottom: isPwa ? 'var(--safe-bottom, 0px)' : 0, minHeight: '100dvh', overflowX: 'hidden' }}>
      <AutoOpenOnLanding delay={150} />

      {/* Bară safe-area iOS */}
      <div aria-hidden style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 'var(--safe-top)', background: 'var(--bg)', zIndex: 3, pointerEvents: 'none' }} />
      {isPwa && (
        <div aria-hidden style={{ position:'fixed', bottom:0, left:0, right:0, height:'var(--safe-bottom)', background:'var(--bg)', zIndex:3, pointerEvents:'none' }} />
      )}
      <div aria-hidden style={{ position:'fixed', top:0, bottom:0, left:0, width:'var(--safe-left)', background:'var(--bg)', zIndex:3, pointerEvents:'none' }} />
      <div aria-hidden style={{ position:'fixed', top:0, bottom:0, right:0, width:'var(--safe-right)', background:'var(--bg)', zIndex:3, pointerEvents:'none' }} />

      {/* Skip link */}
      <a href="#content" className={`${styles.skipLink} ${styles.focusable}`}>Sari la conținut</a>

      {/* Navigație */}
      <nav className={styles.nav} data-open={navOpen ? "true" : "false"} aria-label="Primary">
        <div className={styles.brandWrap}>
          <Link href="/ro" className={`${styles.brand} ${styles.focusable}`}>
            <img src="/Logo_Landing.png" alt="Plan4host" className={styles.logoDark} />
          </Link>
          {/* Switch limbă (lipit de logo) */}
          <Link href="/" className={`${styles.btnLang} ${styles.focusable}`} aria-label="Switch to English">
            <img src="/ro.png" alt="" width={22} height={22} style={{ display: 'block' }} />
          </Link>
        </div>
        <div className={styles.menu} id="nav-menu">
          <a
            href="#features-title"
            className={`${styles.menuLink} ${styles.focusable}`}
            onClick={(e) => { e.preventDefault(); scrollToId('features-title'); }}
          >
            Funcții
          </a>
          <a href="#pricing" className={`${styles.menuLink} ${styles.focusable}`}>Prețuri</a>
          <a href="#about" className={`${styles.menuLink} ${styles.focusable}`}>Despre</a>
          <a href="#contact" className={`${styles.menuLink} ${styles.focusable}`}>Contact</a>
        </div>
        <div className={styles.actions}>
          <Link href="/auth/login" className={`sb-cardglow ${styles.btn} ${styles.btnGhost} ${styles.focusable}`}>Logare</Link>
          <CtaLink href="/auth/login?mode=signup" className={`sb-cardglow ${styles.btn} ${styles.btnChoose} ${styles.focusable}`}>Încearcă gratuit</CtaLink>
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
          href="#features-title"
          className={`${styles.mobileLink} ${styles.focusable}`}
          onClick={(e) => { e.preventDefault(); setNavOpen(false); scrollToId('features-title'); }}
        >
          {/* Zonă invizibilă pentru a captura tap-uri pe mobil */}
          <div
            aria-hidden
            onPointerDown={onFeaturesPointerDown}
            onPointerEnter={() => setFeaturesHover(true)}
            onPointerLeave={() => setFeaturesHover(false)}
            style={{ position:'absolute', inset:0, zIndex:1, background:'transparent', pointerEvents: featuresHover ? 'none' : 'auto' }}
          />
          Funcții
        </a>
        <a href="#pricing" className={`${styles.mobileLink} ${styles.focusable}`} onClick={() => setNavOpen(false)}>Prețuri</a>
        <a href="#about" className={`${styles.mobileLink} ${styles.focusable}`} onClick={() => setNavOpen(false)}>Despre</a>
        <a href="#contact" className={`${styles.mobileLink} ${styles.focusable}`} onClick={() => setNavOpen(false)}>Contact</a>
      </div>

      {/* Hero */}
      <section id="content" className={styles.hero}>
        <div className={styles.heroText}>
          <h1>
            Stay Smart, <br />Host <span className={styles.betterGrad}>Better</span>
          </h1>
          <h2 style={{ margin: '6px 0 10px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
            Channel Manager, PMS și Check‑in Online cu sincronizare iCal
          </h2>
          <p>
            Plan4Host ajută pensiunile și apartamentele în regim hotelier să evite overbooking,
            să sincronizeze calendarele și să pornească rapid check‑in online.
          </p>
          <div className={styles.heroCta}>
            <CtaLink href="/auth/login?mode=signup" className={`sb-cardglow ${styles.btn} ${styles.btnChoose} ${styles.focusable}`}>Încearcă gratuit</CtaLink>
            <a
              href="#features-title"
              className={`${styles.btn} ${styles.btnGhost} ${styles.focusable}`}
              onClick={(e) => { e.preventDefault(); scrollToId('features-title'); }}
            >
              Vezi funcțiile
            </a>
          </div>
        </div>
        <div className={styles.heroVisual} aria-label="Calendar preview">
          <video className={styles.focusable} src="/Hero_video2.mp4" poster="/Hero_video2.mp4" muted autoPlay loop playsInline preload="metadata" style={{ width: '100%', height: 'auto', objectFit: 'contain', borderRadius: 12 }}>
            Video preview indisponibil.
          </video>
        </div>
      </section>

      {/* Caracteristici */}
      <section id="features" className={styles.features} aria-labelledby="features-title">
        <h2 id="features-title">Funcții</h2>
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

      {/* Prețuri */}
      <section id="pricing" className={styles.pricing} aria-labelledby="pricing-title">
        <h2 id="pricing-title">Prețuri</h2>
        <div className={styles.pricingGrid}>
          <div className={`sb-cardglow ${styles.priceCard}`}>
            <div className={styles.priceTier}>BASIC</div>
            <ul className={styles.priceList}>
              {beneficii.map((b, i) => {
                const basicX = [
                  'Prioritizare curățenie camere',
                  'Listă personalizată de task-uri pentru curățenie',
                  'Actualizează în timp real statusul curățeniei',
                  'Împarte activitățile zilnice cu membrii din echipă',
                  'Sincronizare instantă a rezervărilor în calendarul aplicației',
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
                    <span>{b.startsWith('Sincronizarea automată a rezervărilor între platforme') ? 'Sincronizarea automată a rezervărilor între platforme (la 60 min)' : b}</span>
                  </li>
                );
              })}
            </ul>
            <img className={styles.priceImg} src="/basic_ron_forlight.png" alt="" aria-hidden="true" />
            <Link href="/auth/login?mode=signup&plan=basic&next=%2Fapp%2Fsubscription%3Fplan%3Dbasic%26hl%3D1" className={`${styles.btn} ${styles.btnChoose} ${styles.focusable}`}>Alege Basic</Link>
          </div>

          <div className={`sb-cardglow ${styles.priceCard}`}>
            <div className={styles.priceTier}>STANDARD</div>
            <ul className={styles.priceList}>
              {beneficii.map((b, i) => {
                const standardX = [
                  'Împarte activitățile zilnice cu membrii din echipă',
                  'Sincronizare instantă a rezervărilor în calendarul aplicației',
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
                    <span>{b.startsWith('Sincronizarea automată a rezervărilor între platforme') ? 'Sincronizarea automată a rezervărilor între platforme (la 30 min)' : b}</span>
                  </li>
                );
              })}
            </ul>
            <img className={styles.priceImg} src="/standard_ron_forlight.png" alt="" aria-hidden="true" />
            <Link href="/auth/login?mode=signup&plan=standard&next=%2Fapp%2Fsubscription%3Fplan%3Dstandard%26hl%3D1" className={`${styles.btn} ${styles.btnChoose} ${styles.focusable}`}>Alege Standard</Link>
          </div>

          <div className={`sb-cardglow ${styles.priceCard}`}>
            <div className={styles.priceTier}>PREMIUM</div>
            <ul className={styles.priceList}>
              {beneficii.map((b, i) => (
                <li key={`premium-b-${i}`}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{b.startsWith('Sincronizarea automată a rezervărilor între platforme') ? 'Sincronizarea automată a rezervărilor între platforme (la 10 min)' : b}</span>
                </li>
              ))}
            </ul>
            <img className={styles.priceImg} src="/premium_ron_forlight.png" alt="" aria-hidden="true" />
            <Link href="/auth/login?mode=signup&plan=premium&next=%2Fapp%2Fsubscription%3Fplan%3Dpremium%26hl%3D1" className={`${styles.btn} ${styles.btnChoose} ${styles.focusable}`}>Alege Premium</Link>
          </div>
        </div>
        <p style={{ marginTop: 16, color: "var(--muted)" }}>
          Prețurile sunt: 50.00 RON/lună (Basic), 75.00 RON/lună (Standard), 90.00 RON/lună (Premium). TVA inclus.
        </p>
      </section>

      {/* Despre */}
      <section id="about" className={styles.about} aria-labelledby="about-title">
        <h2 id="about-title">Despre</h2>
        <div className={styles.aboutCard}>
          <div className={styles.aboutHead}>
            <img src="/p4h_logo_rotund.png" alt="Plan4Host" />
            <div>
              <div style={{ fontWeight: 900, color: 'var(--text)' }}>Claritate. Precizie. Control fără efort.</div>
              <div className={styles.aboutSub}>Unelte simple pentru ospitalitate reală.</div>
            </div>
          </div>
          <p>
            Plan4Host aduce claritate și control în managementul ospitalității. Toate rezervările, sarcinile și interacțiunile cu oaspeții sunt centralizate într‑un calendar inteligent, direct pe telefon, oferindu‑ți o privire de ansamblu completă dintr‑o clipă.
          </p>
          <p>
            Fluxurile din recepție devin fără efort — check‑in‑urile, confirmările și actualizările se rezolvă în doar câteva click‑uri. Oaspeții primesc mesaje la timp, într‑o succesiune bine gândită, astfel încât să se simtă ghidați și susținuți pe tot parcursul sejurului.
          </p>
          <p>
            Simplificând operațiunile și ridicând nivelul comunicării, Plan4Host îi ajută pe gazde să ofere experiențe excepționale, care duc natural la recenzii excelente și recomandări călduroase.
          </p>
        </div>
      </section>

      {/* Recenzii */}
      <section className={styles.reviews} aria-labelledby="reviews-title">
        <h2 id="reviews-title">Ce spun utilizatorii noștri</h2>
        <div className={styles.reviewsBody}>
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
            <button
              type="button"
              className={`${styles.reviewsArrow} ${styles.reviewsArrowLeft}`}
              aria-label="Recenzia anterioară"
              onClick={() => setRevIdx(i => (i - 1 + recenziiRo.length) % recenziiRo.length)}
            />
            {(() => {
              const r = recenziiRo[revIdx];
              const parts = String(r.author || '').split('•');
              const left = (parts[0] || '').trim();
              const right = (parts[1] || '').trim();
              return (
                <div style={{ display: 'grid', gap: 10 }}>
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
              aria-label="Recenzia următoare"
              onClick={() => setRevIdx(i => (i + 1) % recenziiRo.length)}
            />
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className={`${styles.contact}`} aria-labelledby="contact-title">
          <h2 id="contact-title">Contact</h2>
        <div className={styles.contactCard}>
          <div style={{ display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              <span>Uneori ai nevoie doar de un răspuns rapid.</span><br />
              <span>Scrie-ne — suntem la un mesaj distanță, pe email sau WhatsApp.</span>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ opacity: .9 }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.81.33 1.6.63 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.74-1.74a2 2 0 0 1 2.11-.45c.74.3 1.53.51 2.34.63A2 2 0 0 1 22 16.92z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <a className={styles.focusable} href="https://wa.me/40721759329" target="_blank" rel="noopener noreferrer" title="Scrie-ne pe WhatsApp">+40 721 759 329</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <p className={styles.footerCopy}>Calendar de rezervări ușor și sincronizare canale pentru unități mici de cazare.</p>
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
        <div className="p4h-social-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
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
            gap: 12,
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
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }}
          >
            <img src="/ANPC.png" alt="ANPC" style={{ width: 120, height: 'auto' }} />
          </a>
          <a
            href="https://stripe.com/en-ro/payments"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Stripe Payments"
            title="Stripe Payments"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }}
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

      {/* JSON-LD Organization (RO) */}
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
              "channel manager",
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
              "Channel manager ieftin cu sincronizare iCal pentru Booking.com și Airbnb și check‑in online sigur.",
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
                  text: "Nu. Plan4Host este software PMS și channel manager. Nu vindem găzduire web."
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
                name: "Există un channel manager ieftin?",
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
