"use client";

import React, { useEffect, useMemo, useState } from "react";
import LanguageViewer from "./LanguageViewer";

type Details = {
  property_name?: string;
  guest_first_name?: string;
  guest_last_name?: string;
  start_date?: string;
  end_date?: string;
  room_name?: string;
  check_in_time?: string;
  check_out_time?: string;
};

type Item = { id: string; title: string; html_ro: string; html_en: string; visible: boolean };

type PropInfo = {
  name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  presentation_image_url?: string | null;
  regulation_pdf_url?: string | null;
   ai_house_rules_text?: string | null;
  contact_overlay_position?: 'top' | 'center' | 'down' | null;
  social_facebook?: string | null;
  social_instagram?: string | null;
  social_tiktok?: string | null;
  social_website?: string | null;
};

export default function MessagesView({ token, data }: { token: string; data: any }) {
  const itemsAll: Item[] = Array.isArray(data?.items) ? data.items : [];
  const items: Item[] = itemsAll.filter(it => !!it.visible);
  const details: Details = (data?.details || {}) as Details;
  const prop: PropInfo = (data?.property || {}) as PropInfo;

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [read, setRead] = useState<Record<string, boolean>>({});
  const [lang, setLang] = useState<'ro'|'en'>(() => {
    const prefer = (typeof localStorage !== 'undefined' ? localStorage.getItem('p4h:rm:lang') : null) as 'ro'|'en'|null;
    if (prefer === 'ro' || prefer === 'en') return prefer;
    return (itemsAll.find(i=>i.html_ro?.trim()) ? 'ro' : 'en');
  });
  useEffect(() => { try { localStorage.setItem('p4h:rm:lang', lang); } catch {} }, [lang]);
  const labels = useMemo(() => ({
    details: lang === 'ro' ? 'Detalii rezervare' : 'Reservation details',
    property: lang === 'ro' ? 'Locatie' : 'Property',
    guest: lang === 'ro' ? 'Oaspete' : 'Guest',
    stay: lang === 'ro' ? 'Perioada' : 'Stay',
    room: lang === 'ro' ? 'Unitate' : 'Room',
    houseRules: lang === 'ro' ? 'Regulament' : 'House Rules',
  }), [lang]);
  const [showAssistantHint, setShowAssistantHint] = useState(true);

  useEffect(() => {
    if (!showAssistantHint) return;
    const t = setTimeout(() => {
      setShowAssistantHint(false);
    }, 5000);
    return () => clearTimeout(t);
  }, [showAssistantHint]);

  useEffect(() => {
    try {
      const r: Record<string, boolean> = {};
      for (const it of items) {
        const k = `p4h:rm:read:${token}:${it.id}`;
        r[it.id] = localStorage.getItem(k) === '1';
      }
      setRead(r);
    } catch {}
  }, [token, items.map(it=>it.id).join('|')]);

  function toggle(id: string) {
    setOpen(prev => ({ ...prev, [id]: !prev[id] }));
    setRead(prev => {
      if (prev[id]) return prev;
      try { localStorage.setItem(`p4h:rm:read:${token}:${id}`, '1'); } catch {}
      return { ...prev, [id]: true };
    });
  }

  function ContactOverlay({ prop }: { prop: PropInfo }) {
    if (!prop.contact_email && !prop.contact_phone && !prop.contact_address) return null;
    const pos = (prop.contact_overlay_position || 'center') as 'top'|'center'|'down';
    const base: React.CSSProperties = {
      position: 'absolute', left:'50%', transform:'translateX(-50%)', width:'calc(100% - 24px)', maxWidth: 380,
      background: 'rgba(23, 25, 36, 0.29)', color: '#fff', WebkitBackdropFilter: 'blur(5px) saturate(140%)', backdropFilter: 'blur(5px) saturate(140%)',
      border: '1px solid rgba(255,255,255,0.22)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', padding:'12px 14px', display:'grid', gap:6,
    };
    if (pos === 'top') Object.assign(base, { top: 12, transform:'translateX(-50%)' });
    else if (pos === 'down') Object.assign(base, { bottom: 12, transform:'translateX(-50%)' });
    else Object.assign(base, { top: '50%', transform:'translate(-50%, -50%)' });
    return (
      <div style={base}>
        {prop.contact_email && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span aria-hidden>✉</span>
            <a href={`mailto:${prop.contact_email}`} style={{ color:'#fff', textDecoration:'none' }}>{prop.contact_email}</a>
          </div>
        )}
        {prop.contact_phone && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span aria-hidden>☏</span>
            <a href={`tel:${String(prop.contact_phone || '').replace(/\s+/g,'')}`} style={{ color:'#fff', textDecoration:'none' }}>{prop.contact_phone}</a>
          </div>
        )}
        {prop.contact_address && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span aria-hidden>⚐</span>
            <span>{prop.contact_address}</span>
          </div>
        )}
      </div>
    );
  }

  function SocialIcons({ prop }: { prop: PropInfo }) {
    const links = [
      { key: 'facebook', url: prop.social_facebook || null, icon: '/facebook_forlight.png', label: 'Facebook' },
      { key: 'instagram', url: prop.social_instagram || null, icon: '/instagram_forlight.png', label: 'Instagram' },
      { key: 'tiktok', url: prop.social_tiktok || null, icon: '/tiktok_forlight.png', label: 'TikTok' },
      { key: 'site', url: prop.social_website || null, icon: '/website_forlight.png', label: 'Website' },
    ].filter(x => !!x.url);
    if (links.length === 0) return null;
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:12, justifyContent:'center' }}>
        {links.map(l => (
          <a key={l.key} href={l.url!} target="_blank" rel="noreferrer" title={l.label} style={{ lineHeight:0 }}>
            <img src={l.icon} alt={l.label} width={22} height={22} />
          </a>
        ))}
      </div>
    );
  }

  return (
    <>
      
      <div
        className="rm-card"
        style={{ marginBottom: 12, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <img src="/p4h_logo_rotund.png" alt="P4H" width={28} height={28} style={{ display:'block' }} />
        <div style={{ display: 'inline-flex', gap: 8 }}>
          <button
            onClick={() => setLang('ro')}
            className="sb-btn"
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: lang === 'ro' ? 'var(--primary)' : 'var(--card)',
              color: lang === 'ro' ? '#0c111b' : 'var(--text)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <img src="/ro.png" alt="RO" width={16} height={16} />
            <span>Română</span>
          </button>
          <button
            onClick={() => setLang('en')}
            className="sb-btn"
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: lang === 'en' ? 'var(--primary)' : 'var(--card)',
              color: lang === 'en' ? '#0c111b' : 'var(--text)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <img src="/eng.png" alt="EN" width={16} height={16} />
            <span>English</span>
          </button>
        </div>
      </div>
      {/* Property contact + image overlay card (glass) */}
      {(prop && (prop.presentation_image_url || prop.contact_email || prop.contact_phone || prop.contact_address)) && (
        <section className="rm-card" style={{ padding: 0, marginBottom: 12 }}>
          {prop.presentation_image_url ? (
            <>
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                <img src={prop.presentation_image_url || ''} alt="Property" style={{ display:'block', width:'100%', height:260, objectFit:'cover' }} />
                <ContactOverlay prop={prop} />
              </div>
              <SocialIcons prop={prop} />
            </>
          ) : (
            <div style={{ padding: 12 }}>
              {prop.contact_email && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span aria-hidden>✉</span>
                  <a href={`mailto:${prop.contact_email}`} style={{ color:'var(--primary)', textDecoration:'none' }}>{prop.contact_email}</a>
                </div>
              )}
              {prop.contact_phone && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span aria-hidden>☏</span>
                  <a href={`tel:${String(prop.contact_phone || '').replace(/\s+/g,'')}`} style={{ color:'var(--primary)', textDecoration:'none' }}>{prop.contact_phone}</a>
                </div>
              )}
              {prop.contact_address && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span aria-hidden>⚐</span>
                  <span>{prop.contact_address}</span>
                </div>
              )}
              <SocialIcons prop={prop} />
            </div>
          )}
        </section>
      )}
      
      <article className="rm-card" style={{ marginBottom: 12 }}>
        <div className="rm-content">
          <h3>{labels.details}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', rowGap:8, columnGap:10, alignItems:'center' }}>
            <div aria-hidden style={{ width:18 }}><img src="/dashboard_forlight.png" alt="" width={16} height={16} /></div>
            <div><strong>{labels.property}</strong>: {details.property_name || '—'}</div>
            <div aria-hidden style={{ width:18 }}><img src="/logoguest_forlight.png" alt="" width={16} height={16} /></div>
            <div><strong>{labels.guest}</strong>: {[details.guest_first_name||'', details.guest_last_name||''].filter(Boolean).join(' ') || '—'}</div>
            <div aria-hidden style={{ width:18 }}><img src="/night_forlight.png" alt="" width={16} height={16} /></div>
            <div><strong>{labels.stay}</strong>: {details.start_date || '—'} → {details.end_date || '—'}</div>
            {details.room_name ? (
              <>
                <div aria-hidden style={{ width:18 }}><img src="/room_forlight.png" alt="" width={16} height={16} /></div>
                <div>
                  <strong>{labels.room}</strong>: {details.room_name}
                </div>
              </>
            ) : null}
            {prop?.regulation_pdf_url ? (
              <>
                <div aria-hidden style={{ width:18 }} />
                <div style={{ marginTop: 2 }}>
                  <a href={prop.regulation_pdf_url} target="_blank" rel="noreferrer" style={{ color:'var(--primary)', textDecoration:'none', fontWeight:800 }}>{labels.houseRules}</a>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </article>

      {items.length === 0 ? (
        <article className="rm-card">
          <div className="rm-content">
            <p style={{ margin: 0, fontWeight: 700 }}>
              {lang === 'ro' ? 'Momentan nu există mesaje.' : 'No messages available yet.'}
            </p>
            <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
              {lang === 'ro'
                ? 'Prin această pagină vei putea vedea toate mesajele publicate în legătură cu rezervarea ta.'
                : 'Through this page, you will be able to view any messages we publish related to your reservation.'}
            </p>
            <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
              {lang === 'ro'
                ? 'Când se postează un mesaj, vei primi un email de notificare cu un link securizat pentru a reveni aici.'
                : 'When a message is posted, you will receive an email notification with a secure link to return to this page.'}
            </p>
            <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
              {lang === 'ro' ? 'Îți mulțumim pentru înțelegere.' : 'Thank you for your understanding.'}
            </p>
          </div>
        </article>
      ) : (
        <div style={{ display:'grid', gap:12 }}>
          {items.map(it => {
            const titleFromHtml = (() => {
              const src = (lang==='ro' ? (it.html_ro || it.html_en) : (it.html_en || it.html_ro)) || '';
              const m = src.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
              if (!m) return it.title || (lang==='ro' ? 'Mesaj' : 'Message');
              const tmp = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g,' ').trim();
              return tmp || it.title || (lang==='ro' ? 'Mesaj' : 'Message');
            })();
            const btnOpen = lang === 'ro' ? 'Deschide' : 'Open';
            const btnHide = lang === 'ro' ? 'Ascunde' : 'Hide';
            return (
            <article key={it.id} className="rm-card" style={{ padding:0 }}>
              <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:12, borderBottom:'1px solid var(--border)' }}>
                <strong>{titleFromHtml}</strong>
                <button className="sb-btn" onClick={()=>toggle(it.id)} style={{ position:'relative' }}>
                  {open[it.id] ? btnHide : btnOpen}
                  {it.visible && !read[it.id] && (
                    <span style={{ position:'absolute', top:-4, right:-4, width:10, height:10, borderRadius:999, background:'var(--primary)' }} />
                  )}
                </button>
              </header>
              {open[it.id] && (
                <div style={{ padding:12 }}>
                  <LanguageViewer htmlRo={it.html_ro} htmlEn={it.html_en} lang={lang} showToggle={false} />
                </div>
              )}
            </article>
          );})}
        </div>
      )}

      {/* Floating guest assistant hint + button */}
      {showAssistantHint && (
        <button
          type="button"
          onClick={() => setShowAssistantHint(false)}
          style={{
            position: "fixed",
            right: 16,
            bottom: 92,
            maxWidth: "min(320px, calc(100vw - 32px))",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.7)",
            background:
              "linear-gradient(135deg, rgba(0,209,255,0.12), rgba(124,58,237,0.3))",
            color: "#f9fafb",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 8px 20px rgba(15,23,42,0.55)",
            cursor: "pointer",
            zIndex: 214,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "rgba(15,23,42,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            ?
          </span>
          <span style={{ fontSize: 13, textAlign: "left" }}>
            {lang === "ro"
              ? "Ai o întrebare? Guest AI assistant te poate ajuta."
              : "Have a question? Guest AI assistant can help."}
          </span>
        </button>
      )}

      <ChatFab lang={lang} prop={prop} details={details} items={items} />
    </>
  );
}

type ChatFabProps = {
  lang: "ro" | "en";
  prop: PropInfo;
  details: Details;
  items: Item[];
};

type ChatLangCode =
  | "ro"
  | "en"
  | "de"
  | "fr"
  | "es"
  | "it"
  | "pt"
  | "nl"
  | "pl"
  | "hu"
  | "cs"
  | "sk";

type ChatLangOption = {
  code: ChatLangCode;
  flag: string;
  nameEn: string;
  nameRo: string;
};

const CHAT_LANG_OPTIONS: ChatLangOption[] = [
  { code: "ro", flag: "🇷🇴", nameEn: "Romanian", nameRo: "Română" },
  { code: "en", flag: "🇬🇧", nameEn: "English", nameRo: "Engleză" },
  { code: "de", flag: "🇩🇪", nameEn: "German", nameRo: "Germană" },
  { code: "fr", flag: "🇫🇷", nameEn: "French", nameRo: "Franceză" },
  { code: "es", flag: "🇪🇸", nameEn: "Spanish", nameRo: "Spaniolă" },
  { code: "it", flag: "🇮🇹", nameEn: "Italian", nameRo: "Italiană" },
  { code: "pt", flag: "🇵🇹", nameEn: "Portuguese", nameRo: "Portugheză" },
  { code: "nl", flag: "🇳🇱", nameEn: "Dutch", nameRo: "Neerlandeză" },
  { code: "pl", flag: "🇵🇱", nameEn: "Polish", nameRo: "Poloneză" },
  { code: "hu", flag: "🇭🇺", nameEn: "Hungarian", nameRo: "Maghiară" },
  { code: "cs", flag: "🇨🇿", nameEn: "Czech", nameRo: "Cehă" },
  { code: "sk", flag: "🇸🇰", nameEn: "Slovak", nameRo: "Slovacă" },
];

type ChatTopicId = "arrival" | "amenities" | "extras" | "checkout" | "contact_host";

type ChatLabelKey =
  | ChatTopicId
  | "back"
  | "arrival_parking"
  | "arrival_access_codes"
  | "arrival_time"
  | "amenities_wifi"
  | "amenities_iron"
  | "amenities_minibar"
  | "amenities_coffee"
  | "amenities_ac"
  | "amenities_washer"
  | "amenities_dishwasher"
  | "amenities_house_rules"
  | "extras_eat_drink"
  | "extras_visit"
  | "checkout_cta"
  | "contact_cta"
  | "tap_call"
  | "tap_email";

const BASE_LABELS: Record<ChatLabelKey, string> = {
  arrival: "Arrival details",
  amenities: "Amenities",
  extras: "Extras",
  contact_host: "Contact the host",
  checkout: "Check-out",
  back: "Back",
  arrival_parking: "Parking information",
  arrival_access_codes: "Access codes",
  arrival_time: "Arrival time",
  amenities_wifi: "Wi‑Fi (network & password)",
  amenities_iron: "Iron / ironing",
  amenities_minibar: "Minibar",
  amenities_coffee: "Coffee machine",
  amenities_ac: "Air conditioning / climate control",
  amenities_washer: "Washing machine",
  amenities_dishwasher: "Dishwasher",
  amenities_house_rules: "House Rules (full document)",
  extras_eat_drink: "Where to eat or have a coffee",
  extras_visit: "What to visit nearby",
  checkout_cta: "For late check-out or other details, contact the host",
  contact_cta: "If you still have questions, contact the host",
  tap_call: "Tap to call",
  tap_email: "Tap to email",
};

const QUESTION_GROUPS: ChatTopicId[] = [
  "arrival",
  "amenities",
  "extras",
  "checkout",
  "contact_host",
];

function ChatFab({ lang, prop, details, items }: ChatFabProps) {
  const [open, setOpen] = useState(false);
  const [chatLang, setChatLang] = useState<ChatLangCode | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [menuLabels, setMenuLabels] = useState<Record<ChatLabelKey, string>>(
    () => BASE_LABELS,
  );
  const [activeTopic, setActiveTopic] = useState<ChatTopicId | null>(null);
  const [arrivalSubtopic, setArrivalSubtopic] = useState<
    "parking" | "access_codes" | "arrival_time" | null
  >(null);
  const [arrivalLoading, setArrivalLoading] = useState(false);
  const [arrivalAnswer, setArrivalAnswer] = useState<string | null>(null);
  const [arrivalStatus, setArrivalStatus] = useState<"found" | "missing" | null>(
    null,
  );
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutAnswer, setCheckoutAnswer] = useState<string | null>(null);
  type AmenitiesSubtopic =
    | "wifi"
    | "iron"
    | "minibar"
    | "coffee_machine"
    | "ac"
    | "washing_machine"
    | "dishwasher";
  const [amenitiesSubtopic, setAmenitiesSubtopic] = useState<AmenitiesSubtopic | null>(null);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const [amenitiesAnswer, setAmenitiesAnswer] = useState<string | null>(null);
  type ExtrasSubtopic = "eat_drink" | "visit";
  const [extrasSubtopic, setExtrasSubtopic] = useState<ExtrasSubtopic | null>(null);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [extrasAnswer, setExtrasAnswer] = useState<string | null>(null);
  const selectedLang = useMemo(
    () => (chatLang ? CHAT_LANG_OPTIONS.find((o) => o.code === chatLang) ?? null : null),
    [chatLang]
  );

  const fabStyle: React.CSSProperties = {
    position: "fixed",
    right: 16,
    bottom: 16,
    width: 60,
    height: 60,
    borderRadius: "50%",
    border: "none",
    background: "linear-gradient(135deg, #00d1ff, #7c3aed)",
    color: "#0c111b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    cursor: "pointer",
    zIndex: 210,
  };

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    right: 16,
    bottom: 88,
    width: "min(360px, calc(100vw - 32px))",
    maxHeight: "min(440px, calc(100vh - 120px))",
    background: "radial-gradient(circle at top, rgba(0,209,255,0.08), transparent 55%), var(--panel)",
    borderRadius: 16,
    border: "1px solid var(--border)",
    boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
    display: "grid",
    gridTemplateRows: "auto auto auto",
    overflow: "visible",
    zIndex: 215,
  };

  const headerStyle: React.CSSProperties = {
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "linear-gradient(135deg, #00d1ff, #7c3aed)",
    color: "#f9fafb",
  };

  const questionsBarStyle: React.CSSProperties = {
    padding: 10,
    borderTop: "1px solid var(--border)",
    display: "grid",
    gap: 8,
    background: "#ffffff",
  };

  const questionBtnStyle: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(15,23,42,0.92)",
    color: "#e5e7eb",
    padding: "7px 10px",
    fontSize: 12,
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
    letterSpacing: 0.02,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  const languageBarStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(135deg, rgba(0,209,255,0.3), rgba(124,58,237,0.7))",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 11,
  };

  const langTriggerStyle: React.CSSProperties = {
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.45)",
    background: "rgba(12,17,27,0.12)",
    padding: "6px 10px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    fontSize: 12,
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
    letterSpacing: 0.02,
    color: "#f9fafb",
  };

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    right: 12,
    bottom: "calc(100% + 6px)",
    width: "min(260px, calc(100vw - 48px))",
    maxHeight: 260,
    overflowY: "auto",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--panel)",
    boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
    padding: "6px 6px 14px",
    zIndex: 220,
  };

  const dropdownItemStyle: React.CSSProperties = {
    width: "100%",
    border: "none",
    background: "transparent",
    padding: "6px 8px",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 12,
    cursor: "pointer",
    color: "var(--text)",
  };

  const backLabel = menuLabels.back;
  const contactCtaLabel = menuLabels.contact_cta;

  async function handleArrivalSubtopic(kind: "parking" | "access_codes" | "arrival_time") {
    if (!chatLang) return;
    setArrivalSubtopic(kind);
    setArrivalAnswer(null);
    setArrivalStatus(null);

    if (kind === "arrival_time") {
      // No AI logic for arrival time; we just read the configured value.
      setArrivalLoading(false);
      return;
    }

    setArrivalLoading(true);

    try {
      const res = await fetch("/api/guest-assistant/arrival", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLang?.nameEn || (chatLang === "ro" ? "Romanian" : "English"),
          topic: kind,
          details,
          property: {
            name: prop?.name || null,
            regulation_pdf_url: prop?.regulation_pdf_url || null,
            ai_house_rules_text: prop?.ai_house_rules_text || null,
          },
          messages: items.map((it) => ({
            title: it.title,
            html_ro: it.html_ro,
            html_en: it.html_en,
          })),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { status?: "found" | "missing"; answer?: string }
        | null;
      if (!data || !data.answer) {
        setArrivalStatus("missing");
        setArrivalAnswer(
          chatLang === "ro"
            ? "Nu este clar din informațiile disponibile. Te rugăm să contactezi gazda pentru detalii exacte."
            : "It is not clear from the available information. Please contact the host for precise details.",
        );
      } else {
        setArrivalStatus((data.status as any) || "found");
        setArrivalAnswer(data.answer);
      }
    } catch {
      setArrivalStatus("missing");
      setArrivalAnswer(
        chatLang === "ro"
          ? "Nu este clar din informațiile disponibile. Te rugăm să contactezi gazda pentru detalii exacte."
          : "It is not clear from the available information. Please contact the host for precise details.",
      );
    } finally {
      setArrivalLoading(false);
    }
  }

  async function handleCheckout() {
    if (!chatLang) return;
    setCheckoutLoading(true);
    setCheckoutAnswer(null);

    try {
      const res = await fetch("/api/guest-assistant/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLang?.nameEn || (chatLang === "ro" ? "Romanian" : "English"),
          details,
          property: {
            name: prop?.name || null,
            regulation_pdf_url: prop?.regulation_pdf_url || null,
            ai_house_rules_text: prop?.ai_house_rules_text || null,
            check_out_time: (details as any).check_out_time || null,
          },
          messages: items.map((it) => ({
            title: it.title,
            html_ro: it.html_ro,
            html_en: it.html_en,
          })),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { status?: "found" | "missing"; answer?: string }
        | null;
      if (!data || !data.answer) {
        setCheckoutAnswer(
          chatLang === "ro"
            ? "Nu este clar din informațiile disponibile. Te rugăm să contactezi gazda pentru detalii exacte."
            : "It is not clear from the available information. Please contact the host for precise details.",
        );
      } else {
        setCheckoutAnswer(data.answer);
      }
    } catch {
      setCheckoutAnswer(
        chatLang === "ro"
          ? "Nu este clar din informațiile disponibile. Te rugăm să contactezi gazda pentru detalii exacte."
          : "It is not clear from the available information. Please contact the host for precise details.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleAmenitiesSubtopic(kind: AmenitiesSubtopic) {
    if (!chatLang) return;
    setAmenitiesSubtopic(kind);
    setAmenitiesAnswer(null);
    setAmenitiesLoading(true);

    try {
      const res = await fetch("/api/guest-assistant/amenities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLang?.nameEn || (chatLang === "ro" ? "Romanian" : "English"),
          topic: kind,
          details,
          property: {
            name: prop?.name || null,
            regulation_pdf_url: prop?.regulation_pdf_url || null,
            ai_house_rules_text: prop?.ai_house_rules_text || null,
          },
          messages: items.map((it) => ({
            title: it.title,
            html_ro: it.html_ro,
            html_en: it.html_en,
          })),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { status?: "found" | "missing"; answer?: string }
        | null;
      if (!data || !data.answer) {
        setAmenitiesAnswer(
          chatLang === "ro"
            ? "Nu este clar din informațiile disponibile. Te rugăm să contactezi gazda pentru detalii exacte."
            : "It is not clear from the available information. Please contact the host for precise details.",
        );
      } else {
        setAmenitiesAnswer(data.answer);
      }
    } catch {
      setAmenitiesAnswer(
        chatLang === "ro"
          ? "Nu este clar din informațiile disponibile. Te rugăm să contactezi gazda pentru detalii exacte."
          : "It is not clear from the available information. Please contact the host for precise details.",
      );
    } finally {
      setAmenitiesLoading(false);
    }
  }

  async function handleExtrasSubtopic(kind: ExtrasSubtopic) {
    if (!chatLang) return;
    setExtrasSubtopic(kind);
    setExtrasAnswer(null);
    setExtrasLoading(true);

    try {
      const res = await fetch("/api/guest-assistant/extras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLang?.nameEn || (chatLang === "ro" ? "Romanian" : "English"),
          topic: kind,
          details,
          property: {
            name: prop?.name || null,
            regulation_pdf_url: prop?.regulation_pdf_url || null,
            ai_house_rules_text: prop?.ai_house_rules_text || null,
          },
          messages: items.map((it) => ({
            title: it.title,
            html_ro: it.html_ro,
            html_en: it.html_en,
          })),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { status?: "found" | "missing"; answer?: string }
        | null;
      if (!data || !data.answer) {
        setExtrasAnswer(
          chatLang === "ro"
            ? "Nu există informații clare în acest moment. Te rugăm să soliciți detalii de la gazdă."
            : "There is no clear information available right now. Please ask the host for more details.",
        );
      } else {
        setExtrasAnswer(data.answer);
      }
    } catch {
      setExtrasAnswer(
        chatLang === "ro"
          ? "Nu există informații clare în acest moment. Te rugăm să soliciți detalii de la gazdă."
          : "There is no clear information available right now. Please ask the host for more details.",
      );
    } finally {
      setExtrasLoading(false);
    }
  }

  useEffect(() => {
    if (!chatLang || !selectedLang) {
      setMenuLabels(BASE_LABELS);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/guest-assistant/menus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: selectedLang.nameEn }),
        });
        const data = (await res.json().catch(() => null)) as
          | { labels?: Partial<Record<ChatLabelKey, string>> }
          | null;
        if (cancelled) return;
        const labels = data?.labels || null;
        if (labels) {
          setMenuLabels((prev) => ({
            ...BASE_LABELS,
            ...prev,
            ...labels,
          }));
        } else {
          setMenuLabels(BASE_LABELS);
        }
      } catch {
        if (!cancelled) setMenuLabels(BASE_LABELS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chatLang, selectedLang?.nameEn]);

  function handleSelectLanguage(option: ChatLangOption) {
    setChatLang(option.code);
    setShowLangMenu(false);
  }

  return (
    <>
      {open && (
        <div style={panelStyle} aria-label="Guest assistant">
          <div style={headerStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                aria-hidden
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #00d1ff, #7c3aed)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0c111b",
                }}
              >
                {/* Simple person avatar icon */}
                <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
                  <circle cx="12" cy="7" r="3.2" fill="#ffffff" />
                  <path
                    d="M6 19c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5v0.5H6V19z"
                    fill="#ffffff"
                  />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  Guest AI assistant
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--muted)",
                fontSize: 16,
                lineHeight: 1,
              }}
              aria-label="Close assistant"
            >
              ×
            </button>
          </div>

          <div style={{ ...languageBarStyle, position: "relative" }}>
            <div style={{ display: "grid", gap: 2 }}>
              <span style={{ opacity: 0.9 }}>
                Select language
              </span>
              <span style={{ opacity: 0.7 }}>
                Answers will be automatically translated into your selected language.
              </span>
            </div>
            <button
              type="button"
              style={langTriggerStyle}
              onClick={() => setShowLangMenu((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={showLangMenu}
            >
              <span aria-hidden style={{ fontSize: 15 }}>
                {selectedLang ? selectedLang.flag : "🌍"}
              </span>
              <span>
                {selectedLang
                  ? selectedLang.nameEn
                  : "Choose language"}
              </span>
              <span aria-hidden style={{ fontSize: 10, opacity: 0.8 }}>
                ▾
              </span>
            </button>
            {showLangMenu && (
              <div style={dropdownStyle} role="listbox">
                {CHAT_LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    style={{
                      ...dropdownItemStyle,
                      background:
                        chatLang === opt.code
                          ? "rgba(0,209,255,0.08)"
                          : "transparent",
                    }}
                    onClick={() => handleSelectLanguage(opt)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span aria-hidden style={{ fontSize: 16 }}>
                        {opt.flag}
                      </span>
                      <span>
                        {opt.nameEn}
                      </span>
                    </div>
                    {chatLang === opt.code && (
                      <span
                        aria-hidden
                        style={{
                          fontSize: 12,
                          color: "var(--primary)",
                          fontWeight: 600,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {chatLang && (
            <div style={questionsBarStyle}>
              {!activeTopic && (
                <>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {lang === "ro"
                      ? "Alege un subiect pentru care ai nevoie de ajutor. În versiunea finală, răspunsurile vor fi adaptate acestei proprietăți și traduse în limba selectată."
                      : "Choose a topic you need help with. In the final version, answers will be tailored to this property and translated into your selected language."}
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {QUESTION_GROUPS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        style={questionBtnStyle}
                        onClick={() => {
                          setActiveTopic(id);
                          if (id === "checkout") {
                            handleCheckout();
                          }
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            border: "1px solid rgba(148,163,184,0.7)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(15,23,42,0.9)",
                          }}
                        >
                          {id === "arrival" && (
                            <svg
                              viewBox="0 0 24 24"
                              width={16}
                              height={16}
                              aria-hidden="true"
                            >
                              <path
                                d="M8 11a4 4 0 118 0"
                                fill="#e5e7eb"
                              />
                              <rect
                                x="7"
                                y="11"
                                width="10"
                                height="3"
                                rx="1.5"
                                fill="#e5e7eb"
                              />
                              <rect
                                x="5"
                                y="16"
                                width="14"
                                height="1.5"
                                rx="0.75"
                                fill="#e5e7eb"
                              />
                              <circle cx="12" cy="6" r="0.9" fill="#e5e7eb" />
                            </svg>
                          )}
                          {id === "amenities" && (
                            <svg
                              viewBox="0 0 24 24"
                              width={16}
                              height={16}
                              aria-hidden="true"
                            >
                              <path
                                d="M12 3a5 5 0 00-3.8 8.2c.6.7.8 1.2.8 1.8V15h6v-2c0-.6.2-1.1.8-1.8A5 5 0 0012 3z"
                                fill="#e5e7eb"
                              />
                              <rect
                                x="10"
                                y="15"
                                width="4"
                                height="1.5"
                                rx="0.75"
                                fill="#e5e7eb"
                              />
                              <rect
                                x="9"
                                y="17"
                                width="6"
                                height="1.5"
                                rx="0.75"
                                fill="#e5e7eb"
                              />
                              <rect
                                x="11"
                                y="19"
                                width="2"
                                height="1.5"
                                rx="0.75"
                                fill="#e5e7eb"
                              />
                            </svg>
                      )}
                          {id === "extras" && (
                            <svg
                              viewBox="0 0 24 24"
                              width={16}
                              height={16}
                              aria-hidden="true"
                            >
                              <path
                                d="M12 3a5 5 0 00-5 5c0 3.3 4.2 8 5 9 0.8-1 5-5.7 5-9a5 5 0 00-5-5zm0 2a3 3 0 110 6 3 3 0 010-6z"
                                fill="#e5e7eb"
                              />
                            </svg>
                          )}
                          {id === "checkout" && (
                            <svg
                              viewBox="0 0 24 24"
                              width={16}
                              height={16}
                              aria-hidden="true"
                            >
                              <path
                                d="M5 4h8a1 1 0 011 1v14H5a1 1 0 01-1-1V5a1 1 0 011-1zm2 2v10h6V6H7z"
                                fill="#e5e7eb"
                              />
                              <path
                                d="M16 10l3 2-3 2v-1.5h-3v-1h3V10z"
                                fill="#e5e7eb"
                              />
                            </svg>
                          )}
                          {id === "contact_host" && (
                            <svg
                              viewBox="0 0 24 24"
                              width={16}
                              height={16}
                              aria-hidden="true"
                            >
                              <path
                                d="M7.3 5.3L9.6 7.6a1 1 0 01.2 1.1l-1 2.3a10.5 10.5 0 004.2 4.2l2.3-1a1 1 0 011.1.2l2.3 2.3a1 1 0 01.1 1.3l-1.4 2a2 2 0 01-2.1.8c-2.5-.6-4.9-2-7.1-4.2-2.2-2.2-3.6-4.6-4.2-7.1a2 2 0 01.8-2.1l2-1.4a1 1 0 011.3.1z"
                                fill="#e5e7eb"
                              />
                            </svg>
                          )}
                        </span>
                        <span>{menuLabels[id]}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {activeTopic === "arrival" && arrivalSubtopic === null && (
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleArrivalSubtopic("parking")}
                  >
                    <span>{menuLabels.arrival_parking}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleArrivalSubtopic("access_codes")}
                  >
                    <span>{menuLabels.arrival_access_codes}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleArrivalSubtopic("arrival_time")}
                  >
                    <span>{menuLabels.arrival_time}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTopic(null)}
                    style={{
                      ...questionBtnStyle,
                      justifyContent: "center",
                      background: "transparent",
                      color: "var(--muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {backLabel}
                  </button>
                </div>
              )}

              {activeTopic === "arrival" && arrivalSubtopic !== null && (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                  }}
                >
                  {arrivalSubtopic !== "arrival_time" && (
                    <>
                      <div
                        style={{
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "var(--panel)",
                          padding: 10,
                          fontSize: 13,
                        }}
                      >
                        {arrivalLoading && (
                          <span style={{ color: "var(--muted)" }}>
                            {chatLang === "ro" ? "Se încarcă..." : "Loading..."}
                          </span>
                        )}
                        {!arrivalLoading && arrivalAnswer && (
                          <span>{arrivalAnswer}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        style={{
                          ...questionBtnStyle,
                          justifyContent: "center",
                        }}
                        onClick={() => setActiveTopic("contact_host")}
                      >
                        {contactCtaLabel}
                      </button>
                    </>
                  )}
                  {arrivalSubtopic === "arrival_time" && (
                    <div
                      style={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--panel)",
                        padding: 10,
                        fontSize: 13,
                      }}
                    >
                      {details.check_in_time ? (
                        <span>
                          {chatLang === "ro"
                            ? `Ora ta de check-in pentru această rezervare este ${details.check_in_time}.`
                            : `Your check-in time for this reservation is ${details.check_in_time}.`}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>
                          {chatLang === "ro"
                            ? "Nu avem o oră de check-in configurată pentru această rezervare. Te rugăm să contactezi gazda."
                            : "There is no check-in time configured for this reservation. Please contact the host."}
                        </span>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setArrivalSubtopic(null);
                      setArrivalAnswer(null);
                      setArrivalStatus(null);
                    }}
                    style={{
                      ...questionBtnStyle,
                      justifyContent: "center",
                      background: "transparent",
                      color: "var(--muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {backLabel}
                  </button>
                </div>
              )}

              {activeTopic === "checkout" && (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--panel)",
                      padding: 10,
                      fontSize: 13,
                    }}
                  >
                    {checkoutLoading && (
                      <span style={{ color: "var(--muted)" }}>
                        {chatLang === "ro" ? "Se încarcă..." : "Loading..."}
                      </span>
                    )}
                    {!checkoutLoading && checkoutAnswer && (
                      <span>{checkoutAnswer}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{
                      ...questionBtnStyle,
                      justifyContent: "center",
                    }}
                    onClick={() => setActiveTopic("contact_host")}
                  >
                    {menuLabels.checkout_cta}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTopic(null);
                      setCheckoutAnswer(null);
                    }}
                    style={{
                      ...questionBtnStyle,
                      justifyContent: "center",
                      background: "transparent",
                      color: "var(--muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {backLabel}
                  </button>
                </div>
              )}

              {activeTopic === "amenities" && amenitiesSubtopic === null && (
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleAmenitiesSubtopic("wifi")}
                  >
                    <span>{menuLabels.amenities_wifi}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleAmenitiesSubtopic("iron")}
                  >
                    <span>{menuLabels.amenities_iron}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleAmenitiesSubtopic("minibar")}
                  >
                    <span>{menuLabels.amenities_minibar}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleAmenitiesSubtopic("coffee_machine")}
                  >
                    <span>{menuLabels.amenities_coffee}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleAmenitiesSubtopic("ac")}
                  >
                    <span>{menuLabels.amenities_ac}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleAmenitiesSubtopic("washing_machine")}
                  >
                    <span>{menuLabels.amenities_washer}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleAmenitiesSubtopic("dishwasher")}
                  >
                    <span>{menuLabels.amenities_dishwasher}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => {
                      try {
                        if (prop?.regulation_pdf_url) {
                          window.open(prop.regulation_pdf_url, "_blank", "noopener,noreferrer");
                        } else {
                          alert(
                            chatLang === "ro"
                              ? "Regulile casei nu sunt disponibile momentan."
                              : "House Rules are not available right now.",
                          );
                        }
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <span>{menuLabels.amenities_house_rules}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTopic(null);
                      setAmenitiesSubtopic(null);
                      setAmenitiesAnswer(null);
                    }}
                    style={{
                      ...questionBtnStyle,
                      justifyContent: "center",
                      background: "transparent",
                      color: "var(--muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {backLabel}
                  </button>
                </div>
              )}

              {activeTopic === "amenities" && amenitiesSubtopic !== null && (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--panel)",
                      padding: 10,
                      fontSize: 13,
                    }}
                  >
                    {amenitiesLoading && (
                      <span style={{ color: "var(--muted)" }}>
                        {chatLang === "ro" ? "Se încarcă..." : "Loading..."}
                      </span>
                    )}
                    {!amenitiesLoading && amenitiesAnswer && (
                      <span>{amenitiesAnswer}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{
                      ...questionBtnStyle,
                      justifyContent: "center",
                    }}
                    onClick={() => setActiveTopic("contact_host")}
                  >
                    {contactCtaLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAmenitiesSubtopic(null);
                      setAmenitiesAnswer(null);
                    }}
                    style={{
                      ...questionBtnStyle,
                      justifyContent: "center",
                      background: "transparent",
                      color: "var(--muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {backLabel}
                  </button>
                </div>
              )}

              {activeTopic === "extras" && extrasSubtopic === null && (
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleExtrasSubtopic("eat_drink")}
                  >
                    <span>{menuLabels.extras_eat_drink}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleExtrasSubtopic("visit")}
                  >
                    <span>{menuLabels.extras_visit}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTopic(null);
                      setExtrasSubtopic(null);
                      setExtrasAnswer(null);
                    }}
                    style={{
                      ...questionBtnStyle,
                      justifyContent: "center",
                      background: "transparent",
                      color: "var(--muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {backLabel}
                  </button>
                </div>
              )}

              {activeTopic === "extras" && extrasSubtopic !== null && (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--panel)",
                      padding: 10,
                      fontSize: 13,
                    }}
                  >
                    {extrasLoading && (
                      <span style={{ color: "var(--muted)" }}>
                        {chatLang === "ro" ? "Se încarcă..." : "Loading..."}
                      </span>
                    )}
                    {!extrasLoading && extrasAnswer && (
                      <span>{extrasAnswer}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{
                      ...questionBtnStyle,
                      justifyContent: "center",
                    }}
                    onClick={() => setActiveTopic("contact_host")}
                  >
                    {contactCtaLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExtrasSubtopic(null);
                      setExtrasAnswer(null);
                    }}
                    style={{
                      ...questionBtnStyle,
                      justifyContent: "center",
                      background: "transparent",
                      color: "var(--muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {backLabel}
                  </button>
                </div>
              )}

              {activeTopic === "contact_host" && prop && (prop.contact_phone || prop.contact_email) && (
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: "1px solid var(--border)",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  {prop.contact_phone && (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const tel = String(prop.contact_phone || "").replace(/\s+/g, "");
                          if (tel) window.location.href = `tel:${tel}`;
                        } catch {
                          // ignore
                        }
                      }}
                      style={{
                        ...questionBtnStyle,
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span aria-hidden>📞</span>
                        <span>{prop.contact_phone}</span>
                      </span>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>
                        {menuLabels.tap_call}
                      </span>
                    </button>
                  )}
                  {prop.contact_email && (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          if (prop.contact_email) {
                            window.location.href = `mailto:${prop.contact_email}`;
                          }
                        } catch {
                          // ignore
                        }
                      }}
                      style={{
                        ...questionBtnStyle,
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span aria-hidden>✉</span>
                        <span>{prop.contact_email}</span>
                      </span>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>
                        {menuLabels.tap_email}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTopic(null)}
                    style={{
                      ...questionBtnStyle,
                      justifyContent: "center",
                      background: "transparent",
                      color: "var(--muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {backLabel}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={fabStyle}
        aria-label="Open guest assistant"
      >
        <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden="true">
          <circle cx="12" cy="7" r="3.2" fill="#ffffff" />
          <path
            d="M6 19c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5v0.5H6V19z"
            fill="#ffffff"
          />
        </svg>
      </button>
    </>
  );
}
