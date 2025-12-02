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
};

type Item = { id: string; title: string; html_ro: string; html_en: string; visible: boolean };

type PropInfo = {
  name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  presentation_image_url?: string | null;
  regulation_pdf_url?: string | null;
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

      {/* Floating chat assistant button (UI-only demo) */}
      <ChatFab lang={lang} />
    </>
  );
}

type ChatFabProps = {
  lang: "ro" | "en";
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

type ChatTopicId = "arrival" | "amenities" | "extras" | "contact_host";

const BASE_MENU_LABELS: Record<ChatTopicId, string> = {
  arrival: "Arrival details",
  amenities: "Amenities",
  extras: "Extras",
  contact_host: "Contact the host",
};

const QUESTION_GROUPS: ChatTopicId[] = [
  "arrival",
  "amenities",
  "extras",
  "contact_host",
];

function ChatFab({ lang }: ChatFabProps) {
  const [open, setOpen] = useState(false);
  const [chatLang, setChatLang] = useState<ChatLangCode | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [menuLabels, setMenuLabels] = useState<Record<ChatTopicId, string>>(
    () => BASE_MENU_LABELS
  );
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
    overflow: "hidden",
    zIndex: 215,
  };

  const headerStyle: React.CSSProperties = {
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background:
      "linear-gradient(135deg, rgba(0,209,255,0.16), rgba(124,58,237,0.32))",
    color: "#f9fafb",
  };

  const questionsBarStyle: React.CSSProperties = {
    padding: 10,
    borderTop: "1px solid rgba(148,163,184,0.35)",
    display: "grid",
    gap: 8,
    background:
      "linear-gradient(135deg, rgba(0,209,255,0.06), rgba(124,58,237,0.2))",
  };

  const questionBtnStyle: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.55)",
    background:
      "radial-gradient(circle at top left, rgba(56,189,248,0.18), rgba(15,23,42,0.96))",
    color: "#f9fafb",
    padding: "9px 12px",
    fontSize: 13,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    boxShadow: "0 6px 18px rgba(15,23,42,0.75)",
  };

  const languageBarStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(135deg, rgba(0,209,255,0.06), rgba(124,58,237,0.16))",
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
    color: "#f9fafb",
  };

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    right: 12,
    top: "calc(100% + 6px)",
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

  useEffect(() => {
    if (!chatLang || !selectedLang) {
      setMenuLabels(BASE_MENU_LABELS);
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
          | { labels?: Partial<Record<ChatTopicId, string>> }
          | null;
        if (cancelled) return;
        const labels = data?.labels || null;
        if (labels) {
          setMenuLabels((prev) => ({
            ...BASE_MENU_LABELS,
            ...prev,
            ...labels,
          }));
        } else {
          setMenuLabels(BASE_MENU_LABELS);
        }
      } catch {
        if (!cancelled) setMenuLabels(BASE_MENU_LABELS);
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
                  background: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0c111b",
                }}
              >
                {/* Simple person avatar icon */}
                <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
                  <circle cx="12" cy="7" r="3.2" fill="currentColor" />
                  <path
                    d="M6 19c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5v0.5H6V19z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  Guest assistant
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  Demo – answers are not live yet.
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
                        {opt.nameEn} · {opt.nameRo}
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
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                Choose a topic you need help with. In the final version, answers will be tailored to this property and translated into your selected language.
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {QUESTION_GROUPS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    style={questionBtnStyle}
                  >
                    <span aria-hidden style={{ fontSize: 14 }}>•</span>
                    <span>{menuLabels[id]}</span>
                  </button>
                ))}
              </div>
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
          <circle cx="12" cy="7" r="3.2" fill="#0c111b" />
          <path
            d="M6 19c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5v0.5H6V19z"
            fill="#0c111b"
          />
        </svg>
      </button>
    </>
  );
}
