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

type ChatMessage = {
  id: number;
  from: "guest" | "assistant";
  text: string;
};

function ChatFab({ lang }: ChatFabProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 1,
      from: "assistant",
      text:
        lang === "ro"
          ? "Bună! Sunt asistentul tău virtual. Îți pot răspunde la întrebări despre cazare pe baza regulilor casei și a mesajelor de rezervare. Momentan este doar un demo UI."
          : "Hi! I’m your virtual assistant. I can answer questions about your stay based on house rules and reservation messages. For now this is only a UI demo.",
    },
  ]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    setMessages((prev) => {
      const nextId = (prev[prev.length - 1]?.id ?? 0) + 1;
      const withGuest: ChatMessage[] = [...prev, { id: nextId, from: "guest", text: trimmed }];
      const replyText =
        lang === "ro"
          ? "Mulțumim pentru mesaj! În versiunea finală, aici vei primi răspunsuri automate bazate pe regulile casei și informațiile rezervării."
          : "Thanks for your message! In the final version, this area will show automatic answers based on house rules and your reservation details.";
      return [
        ...withGuest,
        { id: nextId + 1, from: "assistant", text: replyText },
      ];
    });
  }

  const fabStyle: React.CSSProperties = {
    position: "fixed",
    right: 16,
    bottom: 16,
    width: 60,
    height: 60,
    borderRadius: "50%",
    border: "none",
    background: "var(--primary)",
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
    background: "var(--panel)",
    borderRadius: 16,
    border: "1px solid var(--border)",
    boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    overflow: "hidden",
    zIndex: 215,
  };

  const headerStyle: React.CSSProperties = {
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderBottom: "1px solid var(--border)",
  };

  const listStyle: React.CSSProperties = {
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowY: "auto",
  };

  const formStyle: React.CSSProperties = {
    padding: 10,
    borderTop: "1px solid var(--border)",
    display: "flex",
    gap: 8,
    alignItems: "center",
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    borderRadius: 999,
    border: "1px solid var(--border)",
    padding: "8px 12px",
    fontFamily: "inherit",
    fontSize: 14,
    outline: "none",
    background: "var(--card)",
    color: "var(--text)",
  };

  const sendBtnStyle: React.CSSProperties = {
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "var(--primary)",
    color: "#0c111b",
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <>
      {open && (
        <div style={panelStyle} aria-label={lang === "ro" ? "Asistent pentru oaspeți" : "Guest assistant"}>
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
                {/* Simple valet / concierge style SVG icon */}
                <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
                  <circle cx="12" cy="7" r="3.2" fill="currentColor" />
                  <path
                    d="M7 19.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5v0.5H7v-0.5z"
                    fill="currentColor"
                  />
                  <path
                    d="M8.5 11.5h7l-0.6-3.2c-0.1-0.5-0.6-0.8-1.1-0.8H10.2c-0.5 0-1 .3-1.1.8L8.5 11.5z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {lang === "ro" ? "Asistent pentru oaspeți" : "Guest assistant"}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {lang === "ro"
                    ? "Demo — răspunsurile nu sunt încă reale."
                    : "Demo – answers are not live yet."}
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
              aria-label={lang === "ro" ? "Închide asistent" : "Close assistant"}
            >
              ×
            </button>
          </div>

          <div style={listStyle}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.from === "guest" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  padding: "6px 10px",
                  borderRadius: 14,
                  fontSize: 13,
                  lineHeight: 1.4,
                  background: m.from === "guest" ? "var(--primary)" : "var(--card)",
                  color: m.from === "guest" ? "#0c111b" : "var(--text)",
                }}
              >
                {m.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} style={formStyle}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder={lang === "ro" ? "Scrie o întrebare..." : "Type a question..."}
              style={inputStyle}
            />
            <button type="submit" style={sendBtnStyle}>
              {lang === "ro" ? "Trimite" : "Send"}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={fabStyle}
        aria-label={lang === "ro" ? "Deschide asistentul pentru oaspeți" : "Open guest assistant"}
      >
        <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden="true">
          <circle cx="12" cy="7" r="3.2" fill="#0c111b" />
          <path
            d="M7 19.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5v0.5H7v-0.5z"
            fill="#0c111b"
          />
          <path
            d="M5 10.5h14v1.5H5z"
            fill="#0c111b"
          />
        </svg>
      </button>
    </>
  );
}
