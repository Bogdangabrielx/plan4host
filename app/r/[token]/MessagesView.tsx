"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import LanguageViewer from "./LanguageViewer";

type GuestPortalLang = "ro" | "el" | "fr" | "de" | "it" | "pt" | "es";
type PortalLang = GuestPortalLang | "en";

type Details = {
  property_name?: string;
  guest_first_name?: string;
  guest_last_name?: string;
  start_date?: string;
  end_date?: string;
  room_name?: string;
  check_in_time?: string;
  check_out_time?: string;
  guest_companions_count?: number;
};

type Item = { id: string; title: string; html_ro: string; html_secondary?: string; html_en: string; visible: boolean };

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
  social_location?: string | null;
  guest_ai_enabled?: boolean | null;
  guest_secondary_language?: GuestPortalLang | null;
};

const PORTAL_LANG_META: Record<GuestPortalLang, { label: string; flagSrc: string }> = {
  ro: { label: "Română", flagSrc: "/ro.png" },
  el: { label: "Ελληνικά", flagSrc: "/el.png" },
  fr: { label: "Français", flagSrc: "/fr.png" },
  de: { label: "Deutsch", flagSrc: "/de.png" },
  it: { label: "Italiano", flagSrc: "/it.png" },
  pt: { label: "Português", flagSrc: "/pt.png" },
  es: { label: "Español", flagSrc: "/es.png" },
};

const PORTAL_COPY: Record<PortalLang, {
  details: string;
  property: string;
  guest: string;
  guestWithCompanions: string;
  stay: string;
  room: string;
  houseRules: string;
  noMessagesTitle: string;
  noMessagesLine1: string;
  noMessagesLine2: string;
  noMessagesLine3: string;
  messageFallback: string;
  open: string;
  hide: string;
  guestAssistantHint: string;
  companionsSingle: string;
  companionsPlural: string;
}> = {
  en: {
    details: "Reservation details", property: "Property", guest: "Guest", guestWithCompanions: "Guest & companions", stay: "Stay", room: "Room", houseRules: "House Rules",
    noMessagesTitle: "No messages available yet.",
    noMessagesLine1: "Through this page, you will be able to view any messages we publish related to your reservation.",
    noMessagesLine2: "When a message is posted, you will receive an email notification with a secure link to return to this page.",
    noMessagesLine3: "Thank you for your understanding.",
    messageFallback: "Message", open: "Open", hide: "Hide",
    guestAssistantHint: "Have a question? Guest AI assistant can help.",
    companionsSingle: "companion", companionsPlural: "companions",
  },
  ro: {
    details: "Detalii rezervare", property: "Locație", guest: "Oaspete", guestWithCompanions: "Oaspete & însoțitori", stay: "Perioada", room: "Unitate", houseRules: "Regulament",
    noMessagesTitle: "Momentan nu există mesaje.",
    noMessagesLine1: "Prin această pagină vei putea vedea toate mesajele publicate în legătură cu rezervarea ta.",
    noMessagesLine2: "Când se postează un mesaj, vei primi un email de notificare cu un link securizat pentru a reveni aici.",
    noMessagesLine3: "Îți mulțumim pentru înțelegere.",
    messageFallback: "Mesaj", open: "Deschide", hide: "Ascunde",
    guestAssistantHint: "Ai o întrebare? Guest AI assistant te poate ajuta.",
    companionsSingle: "însoțitor", companionsPlural: "însoțitori",
  },
  el: {
    details: "Στοιχεία κράτησης", property: "Κατάλυμα", guest: "Επισκέπτης", guestWithCompanions: "Επισκέπτης & συνοδοί", stay: "Διαμονή", room: "Μονάδα", houseRules: "Κανόνες καταλύματος",
    noMessagesTitle: "Δεν υπάρχουν ακόμη διαθέσιμα μηνύματα.",
    noMessagesLine1: "Σε αυτή τη σελίδα θα βλέπεις όλα τα μηνύματα που δημοσιεύουμε σχετικά με την κράτησή σου.",
    noMessagesLine2: "Όταν δημοσιευτεί ένα μήνυμα, θα λάβεις email ειδοποίησης με ασφαλή σύνδεσμο για να επιστρέψεις εδώ.",
    noMessagesLine3: "Ευχαριστούμε για την κατανόηση.",
    messageFallback: "Μήνυμα", open: "Άνοιγμα", hide: "Απόκρυψη",
    guestAssistantHint: "Έχεις ερώτηση; Ο Guest AI assistant μπορεί να βοηθήσει.",
    companionsSingle: "συνοδός", companionsPlural: "συνοδοί",
  },
  fr: {
    details: "Détails de la réservation", property: "Hébergement", guest: "Voyageur", guestWithCompanions: "Voyageur & accompagnants", stay: "Séjour", room: "Unité", houseRules: "Règlement intérieur",
    noMessagesTitle: "Aucun message n’est disponible pour le moment.",
    noMessagesLine1: "Depuis cette page, vous pourrez voir tous les messages publiés concernant votre réservation.",
    noMessagesLine2: "Lorsqu’un message sera publié, vous recevrez un email avec un lien sécurisé pour revenir ici.",
    noMessagesLine3: "Merci pour votre compréhension.",
    messageFallback: "Message", open: "Ouvrir", hide: "Masquer",
    guestAssistantHint: "Une question ? Guest AI assistant peut vous aider.",
    companionsSingle: "accompagnant", companionsPlural: "accompagnants",
  },
  de: {
    details: "Reservierungsdetails", property: "Unterkunft", guest: "Gast", guestWithCompanions: "Gast & Begleiter", stay: "Aufenthalt", room: "Einheit", houseRules: "Hausregeln",
    noMessagesTitle: "Derzeit sind noch keine Nachrichten verfügbar.",
    noMessagesLine1: "Auf dieser Seite kannst du alle veröffentlichten Nachrichten zu deiner Reservierung sehen.",
    noMessagesLine2: "Sobald eine Nachricht veröffentlicht wird, erhältst du eine E-Mail mit einem sicheren Link zurück zu dieser Seite.",
    noMessagesLine3: "Vielen Dank für dein Verständnis.",
    messageFallback: "Nachricht", open: "Öffnen", hide: "Ausblenden",
    guestAssistantHint: "Hast du eine Frage? Guest AI assistant kann helfen.",
    companionsSingle: "Begleiter", companionsPlural: "Begleiter",
  },
  it: {
    details: "Dettagli della prenotazione", property: "Struttura", guest: "Ospite", guestWithCompanions: "Ospite & accompagnatori", stay: "Soggiorno", room: "Unità", houseRules: "Regole della struttura",
    noMessagesTitle: "Al momento non ci sono messaggi disponibili.",
    noMessagesLine1: "Da questa pagina potrai vedere tutti i messaggi pubblicati relativi alla tua prenotazione.",
    noMessagesLine2: "Quando verrà pubblicato un messaggio, riceverai un’email con un link sicuro per tornare qui.",
    noMessagesLine3: "Grazie per la comprensione.",
    messageFallback: "Messaggio", open: "Apri", hide: "Nascondi",
    guestAssistantHint: "Hai una domanda? Guest AI assistant può aiutarti.",
    companionsSingle: "accompagnatore", companionsPlural: "accompagnatori",
  },
  pt: {
    details: "Detalhes da reserva", property: "Alojamento", guest: "Hóspede", guestWithCompanions: "Hóspede & acompanhantes", stay: "Estadia", room: "Unidade", houseRules: "Regras da propriedade",
    noMessagesTitle: "Ainda não existem mensagens disponíveis.",
    noMessagesLine1: "Nesta página poderás ver todas as mensagens publicadas relacionadas com a tua reserva.",
    noMessagesLine2: "Quando uma mensagem for publicada, receberás um email com um link seguro para regressar aqui.",
    noMessagesLine3: "Obrigado pela compreensão.",
    messageFallback: "Mensagem", open: "Abrir", hide: "Ocultar",
    guestAssistantHint: "Tens uma pergunta? Guest AI assistant pode ajudar.",
    companionsSingle: "acompanhante", companionsPlural: "acompanhantes",
  },
  es: {
    details: "Detalles de la reserva", property: "Alojamiento", guest: "Huésped", guestWithCompanions: "Huésped & acompañantes", stay: "Estancia", room: "Unidad", houseRules: "Normas de la propiedad",
    noMessagesTitle: "Todavía no hay mensajes disponibles.",
    noMessagesLine1: "En esta página podrás ver todos los mensajes publicados relacionados con tu reserva.",
    noMessagesLine2: "Cuando se publique un mensaje, recibirás un correo con un enlace seguro para volver aquí.",
    noMessagesLine3: "Gracias por tu comprensión.",
    messageFallback: "Mensaje", open: "Abrir", hide: "Ocultar",
    guestAssistantHint: "¿Tienes una pregunta? Guest AI assistant puede ayudarte.",
    companionsSingle: "acompañante", companionsPlural: "acompañantes",
  },
};

export default function MessagesView({ token, data }: { token: string; data: any }) {
  const itemsAll: Item[] = Array.isArray(data?.items) ? data.items : [];
  const items: Item[] = itemsAll.filter(it => !!it.visible);
  const details: Details = (data?.details || {}) as Details;
  const prop: PropInfo = (data?.property || {}) as PropInfo;
  const secondaryLang: GuestPortalLang = (["ro", "el", "fr", "de", "it", "pt", "es"] as GuestPortalLang[]).includes(
    String(prop?.guest_secondary_language || "") as GuestPortalLang
  )
    ? (String(prop.guest_secondary_language) as GuestPortalLang)
    : "ro";
  const secondaryMeta = PORTAL_LANG_META[secondaryLang];

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [read, setRead] = useState<Record<string, boolean>>({});
  const [lang, setLang] = useState<PortalLang>(() => {
    const prefer = (typeof localStorage !== "undefined" ? localStorage.getItem("p4h:rm:lang") : null) as PortalLang | null;
    if (prefer === "en" || prefer === secondaryLang) return prefer;
    return (itemsAll.find((i) => (i.html_secondary || i.html_ro)?.trim()) ? secondaryLang : "en");
  });
  useEffect(() => { try { localStorage.setItem("p4h:rm:lang", lang); } catch {} }, [lang]);
  useEffect(() => {
    setLang((prev) => (prev === "en" ? "en" : secondaryLang));
  }, [secondaryLang]);
  const labels = useMemo(() => PORTAL_COPY[lang], [lang]);
  const [showAssistantHint, setShowAssistantHint] = useState(
    () => !!prop?.guest_ai_enabled,
  );

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
    const overlayIcon = (src: string): React.CSSProperties => ({
      width: 16,
      height: 16,
      display: "block",
      flex: "0 0 auto",
      backgroundColor: "rgba(255,255,255,0.92)",
      WebkitMaskImage: `url(${src})`,
      maskImage: `url(${src})`,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      WebkitMaskSize: "contain",
      maskSize: "contain",
    });
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
            <span aria-hidden style={overlayIcon("/svg_email_demo.svg")} />
            <a href={`mailto:${prop.contact_email}`} style={{ color:'#fff', textDecoration:'none' }}>{prop.contact_email}</a>
          </div>
        )}
        {prop.contact_phone && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span aria-hidden style={overlayIcon("/svg_phone_demo.svg")} />
            <a href={`tel:${String(prop.contact_phone || '').replace(/\s+/g,'')}`} style={{ color:'#fff', textDecoration:'none' }}>{prop.contact_phone}</a>
          </div>
        )}
        {prop.contact_address && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span aria-hidden style={overlayIcon("/svg_location_demo.svg")} />
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
      { key: 'location', url: prop.social_location || null, icon: '/social_location_forlight.png', label: 'Location' },
    ].filter(x => !!x.url);
    if (links.length === 0) return null;
    return (
      <div style={{ padding: 12, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.68)",
            WebkitBackdropFilter: "blur(10px) saturate(130%)",
            backdropFilter: "blur(10px) saturate(130%)",
            boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
          }}
        >
          {links.map((l) => (
            <a
              key={l.key}
              href={l.url!}
              target="_blank"
              rel="noreferrer"
              title={l.label}
              style={{ lineHeight: 0, padding: 4, borderRadius: 10 }}
            >
              <img src={l.icon} alt={l.label} width={22} height={22} />
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      
      <div
        className="rm-card rm-topbar"
        style={{
          marginBottom: 12,
          background: "rgba(255,255,255,0.70)",
          WebkitBackdropFilter: "blur(12px)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="rm-topbarInner">
          <div className="rm-topbarLeft">
            <span className="rm-propAvatar" aria-hidden>
              <img src={prop.presentation_image_url || "/p4h_logo_rotund.png"} alt="" />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="rm-topbarTitle">{prop.name || "Plan4Host"}</div>
              <div className="rm-topbarMeta">
                {(details.start_date || "—")} → {(details.end_date || "—")} · {(details.check_in_time || "—")} /{" "}
                {(details.check_out_time || "—")}
              </div>
            </div>
          </div>

          <div style={{ display: "inline-flex", gap: 8, flex: "0 0 auto" }}>
          <button
            onClick={() => setLang(secondaryLang)}
            className="sb-btn"
            style={{
              width: 30,
              height: 30,
              padding: 0,
              borderRadius: 999,
              border: lang === secondaryLang ? "1px solid rgba(59,130,246,0.45)" : "1px solid var(--border)",
              background: "rgba(255,255,255,0.65)",
              color: "var(--text)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              WebkitBackdropFilter: "blur(10px)",
              backdropFilter: "blur(10px)",
              boxShadow: lang === secondaryLang ? "0 0 0 2px rgba(59,130,246,0.12)" : "none",
            }}
            aria-label={secondaryMeta.label}
          >
            <img
              src={secondaryMeta.flagSrc}
              alt=""
              width={28}
              height={28}
              style={{ borderRadius: 999, display: "block", transform: "scale(1.08)" }}
            />
          </button>
          <button
            onClick={() => setLang('en')}
            className="sb-btn"
            style={{
              width: 30,
              height: 30,
              padding: 0,
              borderRadius: 999,
              border: lang === "en" ? "1px solid rgba(59,130,246,0.45)" : "1px solid var(--border)",
              background: "rgba(255,255,255,0.65)",
              color: "var(--text)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              WebkitBackdropFilter: "blur(10px)",
              backdropFilter: "blur(10px)",
              boxShadow: lang === "en" ? "0 0 0 2px rgba(59,130,246,0.12)" : "none",
            }}
            aria-label="English"
          >
            <img
              src="/eng.png"
              alt=""
              width={28}
              height={28}
              style={{ borderRadius: 999, display: "block", transform: "scale(1.08)" }}
            />
          </button>
          </div>
        </div>
      </div>
      {/* Property contact + image overlay card (glass) */}
      {(prop && (prop.presentation_image_url || prop.contact_email || prop.contact_phone || prop.contact_address)) && (
        <section className="rm-card" style={{ padding: 0, marginBottom: 12 }}>
          {prop.presentation_image_url ? (
            <>
              <div className="rm-heroMedia">
                <img src={prop.presentation_image_url || ''} alt="Property" />
                <ContactOverlay prop={prop} />
              </div>
              <SocialIcons prop={prop} />
            </>
          ) : (
            <div style={{ padding: 12 }}>
              {prop.contact_email && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 16,
                      height: 16,
                      display: "block",
                      backgroundColor: "var(--primary)",
                      WebkitMaskImage: "url(/svg_email_demo.svg)",
                      maskImage: "url(/svg_email_demo.svg)",
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                      pointerEvents: "none",
                      flex: "0 0 auto",
                    }}
                  />
                  <a href={`mailto:${prop.contact_email}`} style={{ color:'var(--primary)', textDecoration:'none' }}>{prop.contact_email}</a>
                </div>
              )}
              {prop.contact_phone && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 16,
                      height: 16,
                      display: "block",
                      backgroundColor: "var(--primary)",
                      WebkitMaskImage: "url(/svg_phone_demo.svg)",
                      maskImage: "url(/svg_phone_demo.svg)",
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                      pointerEvents: "none",
                      flex: "0 0 auto",
                    }}
                  />
                  <a href={`tel:${String(prop.contact_phone || '').replace(/\s+/g,'')}`} style={{ color:'var(--primary)', textDecoration:'none' }}>{prop.contact_phone}</a>
                </div>
              )}
              {prop.contact_address && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 16,
                      height: 16,
                      display: "block",
                      backgroundColor: "var(--primary)",
                      WebkitMaskImage: "url(/svg_location_demo.svg)",
                      maskImage: "url(/svg_location_demo.svg)",
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                      pointerEvents: "none",
                      flex: "0 0 auto",
                    }}
                  />
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
            <div aria-hidden className="rm-iconCell"><img src="/dashboard_forlight.png" alt="" width={16} height={16} style={{ display:'block' }} /></div>
            <div>
              <div className="rm-detailLine">
                <span className="rm-detailLabel">{labels.property}</span>
                <span className="rm-detailValue">{details.property_name || '—'}</span>
              </div>
            </div>
            <div aria-hidden className="rm-iconCell"><img src="/logoguest_forlight.png" alt="" width={16} height={16} style={{ display:'block' }} /></div>
            <div>
              <div className="rm-detailLine">
                <span className="rm-detailLabel">
                  {details.guest_companions_count && details.guest_companions_count > 0
                    ? labels.guestWithCompanions
                    : labels.guest}
                </span>
                <span className="rm-detailValue">
                  {(() => {
                    const fullName = [details.guest_first_name || '', details.guest_last_name || ''].filter(Boolean).join(' ') || '—';
                    const count = details.guest_companions_count || 0;
                    if (!count) return fullName;
                    return `${fullName} + ${count} ${count > 1 ? labels.companionsPlural : labels.companionsSingle}`;
                  })()}
                </span>
              </div>
            </div>
            <div aria-hidden className="rm-iconCell"><img src="/night_forlight.png" alt="" width={16} height={16} style={{ display:'block' }} /></div>
            <div>
              <div className="rm-detailLine">
                <span className="rm-detailLabel">{labels.stay}</span>
                <span className="rm-detailValue">{details.start_date || '—'} → {details.end_date || '—'}</span>
              </div>
            </div>
            {details.room_name ? (
              <>
                <div aria-hidden className="rm-iconCell"><img src="/room_forlight.png" alt="" width={16} height={16} style={{ display:'block' }} /></div>
                <div>
                  <div className="rm-detailLine">
                    <span className="rm-detailLabel">{labels.room}</span>
                    <span className="rm-detailValue">{details.room_name}</span>
                  </div>
                </div>
              </>
            ) : null}
            {prop?.regulation_pdf_url ? (
              <>
                <div aria-hidden style={{ width:18 }} />
                <div style={{ marginTop: 2 }}>
                  <a href={prop.regulation_pdf_url} target="_blank" rel="noreferrer" style={{ color:'var(--primary)', textDecoration:'none', fontWeight:800, fontSize:'var(--rm-font-s)', letterSpacing:'.10em', textTransform:'uppercase' }}>{labels.houseRules}</a>
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
              {labels.noMessagesTitle}
            </p>
            <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
              {labels.noMessagesLine1}
            </p>
            <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
              {labels.noMessagesLine2}
            </p>
            <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
              {labels.noMessagesLine3}
            </p>
          </div>
        </article>
      ) : (
        <div style={{ display:'grid', gap:12 }}>
          {items.map(it => {
            const titleFromHtml = (() => {
              const secondaryHtml = it.html_secondary || it.html_ro;
              const src = (lang==='en' ? (it.html_en || secondaryHtml) : (secondaryHtml || it.html_en)) || '';
              const m = src.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
              if (!m) return it.title || labels.messageFallback;
              const tmp = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g,' ').trim();
              return tmp || it.title || labels.messageFallback;
            })();
            const btnOpen = labels.open;
            const btnHide = labels.hide;
            return (
            <article key={it.id} className="rm-card" style={{ padding:0 }}>
              <header
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: open[it.id] ? 'center' : 'space-between',
                  padding: 12,
                  borderBottom: open[it.id] ? '1px solid var(--border)' : 'none',
                }}
              >
                {!open[it.id] && <strong>{titleFromHtml}</strong>}
                <button className="sb-btn" onClick={()=>toggle(it.id)} style={{ position:'relative' }}>
                  {open[it.id] ? btnHide : btnOpen}
                  {!open[it.id] && it.visible && !read[it.id] && (
                    <span style={{ position:'absolute', top:-4, right:-4, width:10, height:10, borderRadius:999, background:'var(--primary)' }} />
                  )}
                </button>
              </header>
              {open[it.id] && (
                <div style={{ padding:12 }}>
                  <LanguageViewer htmlRo={it.html_secondary || it.html_ro} htmlEn={it.html_en} lang={lang} showToggle={false} />
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
            {labels.guestAssistantHint}
          </span>
        </button>
      )}

      {prop?.guest_ai_enabled && (
        <ChatFab
          lang={lang}
          prop={prop}
          details={details}
          items={items}
          token={token}
        />
      )}
    </>
  );
}

type ChatFabProps = {
  lang: PortalLang;
  prop: PropInfo;
  details: Details;
  items: Item[];
  token: string;
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
  | "sk"
  | "bg"
  | "ru"
  | "uk"
  | "el"
  | "tr"
  | "sv"
  | "no"
  | "da"
  | "fi"
  | "hr"
  | "sr"
  | "sl";

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
  { code: "bg", flag: "🇧🇬", nameEn: "Bulgarian", nameRo: "Bulgară" },
  { code: "ru", flag: "🇷🇺", nameEn: "Russian", nameRo: "Rusă" },
  { code: "uk", flag: "🇺🇦", nameEn: "Ukrainian", nameRo: "Ucraineană" },
  { code: "el", flag: "🇬🇷", nameEn: "Greek", nameRo: "Greacă" },
  { code: "tr", flag: "🇹🇷", nameEn: "Turkish", nameRo: "Turcă" },
  { code: "sv", flag: "🇸🇪", nameEn: "Swedish", nameRo: "Suedeză" },
  { code: "no", flag: "🇳🇴", nameEn: "Norwegian", nameRo: "Norvegiană" },
  { code: "da", flag: "🇩🇰", nameEn: "Danish", nameRo: "Daneză" },
  { code: "fi", flag: "🇫🇮", nameEn: "Finnish", nameRo: "Finlandeză" },
  { code: "hr", flag: "🇭🇷", nameEn: "Croatian", nameRo: "Croată" },
  { code: "sr", flag: "🇷🇸", nameEn: "Serbian", nameRo: "Sârbă" },
  { code: "sl", flag: "🇸🇮", nameEn: "Slovenian", nameRo: "Slovenă" },
];

type ChatTopicId =
  | "arrival"
  | "amenities"
  | "extras"
  | "checkout"
  | "forbidden"
  | "contact_host";

type ChatLabelKey =
  | ChatTopicId
  | "back"
  | "arrival_parking"
  | "arrival_access_codes"
  | "arrival_time"
  | "arrival_access_instructions"
  | "amenities_wifi"
  | "amenities_iron"
  | "amenities_minibar"
  | "amenities_coffee"
  | "amenities_ac"
  | "amenities_washer"
  | "amenities_dishwasher"
  | "amenities_spa"
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
  extras: "Recommendations",
  contact_host: "Contact the host",
  checkout: "Check-out",
  forbidden: "What is forbidden",
  back: "Back",
  arrival_parking: "Parking information",
  arrival_access_codes: "Access codes",
  arrival_time: "Arrival time",
  arrival_access_instructions: "Access instructions (how to enter)",
  amenities_wifi: "Wi‑Fi (network & password)",
  amenities_iron: "Iron / ironing",
  amenities_minibar: "Minibar",
  amenities_coffee: "Coffee machine",
  amenities_ac: "Air conditioning / climate control",
  amenities_washer: "Washing machine",
  amenities_dishwasher: "Dishwasher",
  amenities_spa: "Spa / pool / sauna",
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
   "forbidden",
  "contact_host",
];

function ChatFab({ lang, prop, details, items, token }: ChatFabProps) {
  const [open, setOpen] = useState(false);
  const [chatLang, setChatLang] = useState<ChatLangCode | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [langMenuPlacement, setLangMenuPlacement] = useState<"up" | "down">("down");
  const [langMenuMaxHeight, setLangMenuMaxHeight] = useState<number>(260);
  const langTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuLabels, setMenuLabels] = useState<Record<ChatLabelKey, string>>(
    () => BASE_LABELS,
  );
  const [activeTopic, setActiveTopic] = useState<ChatTopicId | null>(null);
  const [arrivalSubtopic, setArrivalSubtopic] = useState<
    "parking" | "access_codes" | "access_instructions" | "arrival_time" | null
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
  | "dishwasher"
  | "spa";

const AMENITIES_ICON_BY_SUBTOPIC: Record<AmenitiesSubtopic, string> = {
  wifi: "/svg_wifi.svg",
  iron: "/svg_iron.svg",
  minibar: "/svg_minibar.svg",
  coffee_machine: "/svg_coffee_machine.svg",
  ac: "/svg_air_conditioning.svg",
  washing_machine: "/svg_washing_machine.svg",
  dishwasher: "/svg_dishwasher.svg",
  spa: "/svg_spa.svg",
};
  const [amenitiesSubtopic, setAmenitiesSubtopic] = useState<AmenitiesSubtopic | null>(null);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const [amenitiesAnswer, setAmenitiesAnswer] = useState<string | null>(null);
  type ExtrasSubtopic = "eat_drink" | "visit";
  const [extrasSubtopic, setExtrasSubtopic] = useState<ExtrasSubtopic | null>(null);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [extrasAnswer, setExtrasAnswer] = useState<string | null>(null);
  const [forbiddenLoading, setForbiddenLoading] = useState(false);
  const [forbiddenAnswer, setForbiddenAnswer] = useState<string | null>(null);
  const AI_LIMIT = 30;
  const [aiUsage, setAiUsage] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const raw = window.localStorage.getItem(`p4h:guestai:usage:${token}`);
      const n = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch {
      return 0;
    }
  });
  const [aiLimitReached, setAiLimitReached] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(`p4h:guestai:usage:${token}`);
      const n = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(n) && n >= AI_LIMIT;
    } catch {
      return false;
    }
  });
  const [contactFromLimit, setContactFromLimit] = useState(false);
  const selectedLang = useMemo(
    () => (chatLang ? CHAT_LANG_OPTIONS.find((o) => o.code === chatLang) ?? null : null),
    [chatLang]
  );

  function renderAiAnswer(text: string) {
    // Render answer with support for simple Markdown bold (**text**),
    // preserving line breaks for the bullet-style lines returned by AI.
    const lines = text.split(/\r?\n/);
    return lines.map((line, lineIdx) => (
      <div key={lineIdx}>
        {line.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
          const m = part.match(/^\*\*(.*)\*\*$/);
          if (m) {
            return (
              <strong key={idx}>
                {m[1]}
              </strong>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </div>
    ));
  }

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
    gridTemplateRows: "auto auto 1fr",
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
    overflowY: "auto",
    minHeight: 0,
    overscrollBehavior: "contain",
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
    width: "min(260px, calc(100vw - 48px))",
    overflowY: "auto",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--panel)",
    boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
    padding: "6px 6px 14px",
    zIndex: 240,
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

  function incrementAiUsage() {
    setAiUsage((prev) => {
      const next = prev + 1;
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            `p4h:guestai:usage:${token}`,
            String(next),
          );
        }
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  function ensureAiQuota(): boolean {
    if (aiUsage >= AI_LIMIT) {
      setAiLimitReached(true);
      return false;
    }
    incrementAiUsage();
    if (aiUsage + 1 >= AI_LIMIT) {
      setAiLimitReached(true);
    }
    return true;
  }

  useEffect(() => {
    if (aiUsage >= AI_LIMIT) {
      setAiLimitReached(true);
    }
  }, [aiUsage]);

  async function handleArrivalSubtopic(kind: "parking" | "access_codes" | "access_instructions" | "arrival_time") {
    if (!chatLang) return;
    setArrivalSubtopic(kind);
    setArrivalAnswer(null);
    setArrivalStatus(null);

    if (kind === "arrival_time") {
      // No AI logic for arrival time; we just read the configured value.
      setArrivalLoading(false);
      return;
    }

    if (!ensureAiQuota()) {
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
            social_location: prop?.social_location || null,
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
    if (!ensureAiQuota()) {
      return;
    }
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
    if (!ensureAiQuota()) {
      return;
    }
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
    if (!ensureAiQuota()) {
      return;
    }
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

  async function handleForbidden() {
    if (!chatLang) return;
    if (!ensureAiQuota()) {
      return;
    }
    setForbiddenLoading(true);
    setForbiddenAnswer(null);

    try {
      const res = await fetch("/api/guest-assistant/forbidden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language:
            selectedLang?.nameEn || (chatLang === "ro" ? "Romanian" : "English"),
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
        setForbiddenAnswer(
          chatLang === "ro"
            ? "Din informațiile disponibile nu rezultă o listă clară de lucruri interzise. Te rugăm să consulți Regulamentul casei sau să contactezi gazda pentru detalii."
            : "From the available information there is no clear list of forbidden actions. Please check the House Rules or contact the host for details.",
        );
      } else {
        setForbiddenAnswer(data.answer);
      }
    } catch {
      setForbiddenAnswer(
        chatLang === "ro"
          ? "Din informațiile disponibile nu rezultă o listă clară de lucruri interzise. Te rugăm să consulți Regulamentul casei sau să contactezi gazda pentru detalii."
          : "From the available information there is no clear list of forbidden actions. Please check the House Rules or contact the host for details.",
      );
    } finally {
      setForbiddenLoading(false);
    }
  }

  useEffect(() => {
    if (!chatLang || !selectedLang || aiUsage >= AI_LIMIT) {
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
  }, [chatLang, selectedLang?.nameEn, aiUsage]);

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
	                <span
	                  aria-hidden
	                  style={{
	                    width: 18,
	                    height: 18,
	                    display: "block",
	                    backgroundColor: "#ffffff",
	                    WebkitMaskImage: "url(/svg_guest_assistant.svg)",
	                    maskImage: "url(/svg_guest_assistant.svg)",
	                    WebkitMaskRepeat: "no-repeat",
	                    maskRepeat: "no-repeat",
	                    WebkitMaskPosition: "center",
	                    maskPosition: "center",
	                    WebkitMaskSize: "contain",
	                    maskSize: "contain",
	                    pointerEvents: "none",
	                  }}
	                />
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

	          <div
              style={{
                ...languageBarStyle,
                position: "relative",
                zIndex: 2,
                ...(chatLang
                  ? {}
                  : {
                      borderBottomLeftRadius: 16,
                      borderBottomRightRadius: 16,
                      overflow: showLangMenu ? "visible" : "hidden",
                      borderBottom: "none",
                    }),
              }}
            >
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
                ref={langTriggerRef}
	              style={langTriggerStyle}
	              onClick={() =>
	                setShowLangMenu((v) => {
	                  const next = !v;
	                  if (next) {
	                    try {
	                      requestAnimationFrame(() => {
	                        const el = langTriggerRef.current;
	                        if (!el) return;
	                        const rect = el.getBoundingClientRect();
	                        const spaceBelow = window.innerHeight - rect.bottom;
	                        const spaceAbove = rect.top;
	                        const preferDown = spaceAbove < 180 && spaceBelow > spaceAbove;
	                        const avail = (preferDown ? spaceBelow : spaceAbove) - 16;
	                        setLangMenuPlacement(preferDown ? "down" : "up");
	                        setLangMenuMaxHeight(Math.max(140, Math.min(260, Math.floor(avail))));
	                      });
	                    } catch {}
	                  }
	                  return next;
	                })
	              }
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
	              <div
	                style={{
	                  ...dropdownStyle,
	                  zIndex: 9999,
	                  maxHeight: langMenuMaxHeight,
	                  ...(langMenuPlacement === "up"
	                    ? { bottom: "calc(100% + 6px)", top: "auto" }
	                    : { top: "calc(100% + 6px)", bottom: "auto" }),
	                }}
	                role="listbox"
	              >
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
              {aiLimitReached ? (
                <div
                  style={{
                    marginTop: 0,
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--panel)",
                    fontSize: 11,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#0c111b" }}>
                    {lang === "ro"
                      ? "Ai atins limita maximă de întrebări pentru acest asistent."
                      : "You’ve reached the maximum number of questions for this assistant."}
                  </div>
                  <div style={{ opacity: 0.95, color: "#0c111b" }}>
                    {lang === "ro"
                      ? "Pentru alte detalii poți consulta Regulamentul casei sau poți contacta oricând gazda."
                      : "For anything else, please check the House Rules or contact the host directly."}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 2,
                    }}
                  >
                    {prop?.regulation_pdf_url && (
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            window.open(
                              prop.regulation_pdf_url as string,
                              "_blank",
                              "noopener,noreferrer",
                            );
                          } catch {
                            // ignore
                          }
                        }}
                        style={{
                          ...questionBtnStyle,
                          padding: "6px 10px",
                          fontSize: 11,
                          background: "rgba(15,23,42,0.92)",
                          borderColor: "rgba(148,163,184,0.8)",
                        }}
                      >
                        {lang === "ro"
                          ? "Deschide Regulamentul casei"
                          : "Open House Rules"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setContactFromLimit(true);
                      }}
                      style={{
                        ...questionBtnStyle,
                        padding: "6px 10px",
                        fontSize: 11,
                        background: "rgba(15,23,42,0.92)",
                        borderColor: "rgba(148,163,184,0.8)",
                        justifyContent: "center",
                      }}
                    >
                      {lang === "ro"
                        ? "Contactează gazda"
                        : "Contact the host"}
                    </button>
                  </div>
                  {contactFromLimit && (prop?.contact_phone || prop?.contact_email) && (
                    <div
                      style={{
                        marginTop: 8,
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      {prop.contact_phone && (
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const tel = String(prop.contact_phone || "").replace(
                                /\s+/g,
                                "",
                              );
                              if (tel) window.location.href = `tel:${tel}`;
                            } catch {
                              // ignore
                            }
                          }}
                          style={{
                            ...questionBtnStyle,
                            justifyContent: "flex-start",
                            padding: "6px 10px",
                            fontSize: 11,
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                width: 16,
                                height: 16,
                                display: "block",
                                backgroundColor: "#e5e7eb",
                                WebkitMaskImage: "url(/svg_phone_demo.svg)",
                                maskImage: "url(/svg_phone_demo.svg)",
                                WebkitMaskRepeat: "no-repeat",
                                maskRepeat: "no-repeat",
                                WebkitMaskPosition: "center",
                                maskPosition: "center",
                                WebkitMaskSize: "contain",
                                maskSize: "contain",
                                pointerEvents: "none",
                                flex: "0 0 auto",
                              }}
                            />
                            <span>{prop.contact_phone}</span>
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
                            justifyContent: "flex-start",
                            padding: "6px 10px",
                            fontSize: 11,
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                width: 16,
                                height: 16,
                                display: "block",
                                backgroundColor: "#e5e7eb",
                                WebkitMaskImage: "url(/svg_email_demo.svg)",
                                maskImage: "url(/svg_email_demo.svg)",
                                WebkitMaskRepeat: "no-repeat",
                                maskRepeat: "no-repeat",
                                WebkitMaskPosition: "center",
                                maskPosition: "center",
                                WebkitMaskSize: "contain",
                                maskSize: "contain",
                                pointerEvents: "none",
                                flex: "0 0 auto",
                              }}
                            />
                            <span>{prop.contact_email}</span>
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <>
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
                              } else if (id === "forbidden") {
                                handleForbidden();
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
                                <span
                                  aria-hidden
                                  style={{
                                    width: 16,
                                    height: 16,
                                    display: "block",
                                    backgroundColor: "#e5e7eb",
                                    WebkitMaskImage: "url(/svg_arrival_details.svg)",
                                    maskImage: "url(/svg_arrival_details.svg)",
                                    WebkitMaskRepeat: "no-repeat",
                                    maskRepeat: "no-repeat",
                                    WebkitMaskPosition: "center",
                                    maskPosition: "center",
                                    WebkitMaskSize: "contain",
                                    maskSize: "contain",
                                    pointerEvents: "none",
                                  }}
                                />
                              )}
                              {id === "amenities" && (
                                <span
                                  aria-hidden
                                  style={{
                                    width: 16,
                                    height: 16,
                                    display: "block",
                                    backgroundColor: "#e5e7eb",
                                    WebkitMaskImage: "url(/svg_amenities.svg)",
                                    maskImage: "url(/svg_amenities.svg)",
                                    WebkitMaskRepeat: "no-repeat",
                                    maskRepeat: "no-repeat",
                                    WebkitMaskPosition: "center",
                                    maskPosition: "center",
                                    WebkitMaskSize: "contain",
                                    maskSize: "contain",
                                    pointerEvents: "none",
                                  }}
                                />
                              )}
                              {id === "extras" && (
                                <span
                                  aria-hidden
                                  style={{
                                    width: 16,
                                    height: 16,
                                    display: "block",
                                    backgroundColor: "#e5e7eb",
                                    WebkitMaskImage: "url(/svg_recommendations.svg)",
                                    maskImage: "url(/svg_recommendations.svg)",
                                    WebkitMaskRepeat: "no-repeat",
                                    maskRepeat: "no-repeat",
                                    WebkitMaskPosition: "center",
                                    maskPosition: "center",
                                    WebkitMaskSize: "contain",
                                    maskSize: "contain",
                                    pointerEvents: "none",
                                  }}
                                />
                              )}
                              {id === "checkout" && (
                                <span
                                  aria-hidden
                                  style={{
                                    width: 16,
                                    height: 16,
                                    display: "block",
                                    backgroundColor: "#e5e7eb",
                                    WebkitMaskImage: "url(/svg_logout.svg)",
                                    maskImage: "url(/svg_logout.svg)",
                                    WebkitMaskRepeat: "no-repeat",
                                    maskRepeat: "no-repeat",
                                    WebkitMaskPosition: "center",
                                    maskPosition: "center",
                                    WebkitMaskSize: "contain",
                                    maskSize: "contain",
                                    pointerEvents: "none",
                                  }}
                                />
                              )}
                              {id === "forbidden" && (
                                <span
                                  aria-hidden
                                  style={{
                                    width: 16,
                                    height: 16,
                                    display: "block",
                                    backgroundColor: "#e5e7eb",
                                    WebkitMaskImage: "url(/svg_forbidden.svg)",
                                    maskImage: "url(/svg_forbidden.svg)",
                                    WebkitMaskRepeat: "no-repeat",
                                    maskRepeat: "no-repeat",
                                    WebkitMaskPosition: "center",
                                    maskPosition: "center",
                                    WebkitMaskSize: "contain",
                                    maskSize: "contain",
                                    pointerEvents: "none",
                                  }}
                                />
                              )}
                              {id === "contact_host" && (
                                <span
                                  aria-hidden
                                  style={{
                                    width: 18,
                                    height: 18,
                                    display: "block",
                                    backgroundColor: "#e5e7eb",
                                    WebkitMaskImage: "url(/svg_contact_the_host.svg)",
                                    maskImage: "url(/svg_contact_the_host.svg)",
                                    WebkitMaskRepeat: "no-repeat",
                                    maskRepeat: "no-repeat",
                                    WebkitMaskPosition: "center",
                                    maskPosition: "center",
                                    WebkitMaskSize: "contain",
                                    maskSize: "contain",
                                    pointerEvents: "none",
                                  }}
                                />
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
                    <span
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        display: "block",
                        backgroundColor: "#e5e7eb",
                        WebkitMaskImage: "url(/svg_parking.svg)",
                        maskImage: "url(/svg_parking.svg)",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        pointerEvents: "none",
                      }}
                    />
                    <span>{menuLabels.arrival_parking}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleArrivalSubtopic("access_codes")}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        display: "block",
                        backgroundColor: "#e5e7eb",
                        WebkitMaskImage: "url(/svg_access_codes.svg)",
                        maskImage: "url(/svg_access_codes.svg)",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        pointerEvents: "none",
                      }}
                    />
                    <span>{menuLabels.arrival_access_codes}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleArrivalSubtopic("access_instructions")}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        display: "block",
                        backgroundColor: "#e5e7eb",
                        WebkitMaskImage: "url(/svg_access_instructions.svg)",
                        maskImage: "url(/svg_access_instructions.svg)",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        pointerEvents: "none",
                      }}
                    />
                    <span>{menuLabels.arrival_access_instructions}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleArrivalSubtopic("arrival_time")}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        display: "block",
                        backgroundColor: "#e5e7eb",
                        WebkitMaskImage: "url(/svg_arrival_time.svg)",
                        maskImage: "url(/svg_arrival_time.svg)",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        pointerEvents: "none",
                      }}
                    />
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
                          <div>{renderAiAnswer(arrivalAnswer)}</div>
                        )}
                      </div>
                      {arrivalSubtopic === "access_instructions" &&
                        prop?.social_location && (
                          <button
                            type="button"
                            style={{
                              ...questionBtnStyle,
                              justifyContent: "flex-start",
                            }}
                            onClick={() => {
                              try {
                                window.open(
                                  prop.social_location as string,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                              } catch {
                                // ignore
                              }
                            }}
                          >
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <img
                                src="/social_location_fordark.png"
                                alt={
                                  lang === "ro"
                                    ? "Deschide locația proprietății"
                                    : "Open property location"
                                }
                                style={{ width: 18, height: 18 }}
                              />
                              <span>
                                {lang === "ro"
                                  ? "Vezi locația proprietății"
                                  : "Open property location"}
                              </span>
                            </span>
                          </button>
                        )}
                      <button
                        type="button"
                        style={{
                          ...questionBtnStyle,
                          justifyContent: "center",
                        }}
                        onClick={() => {
                          setContactFromLimit(false);
                          setActiveTopic("contact_host");
                        }}
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
                      <div style={{ whiteSpace: "pre-line" }}>{checkoutAnswer}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{
                      ...questionBtnStyle,
                      justifyContent: "center",
                    }}
                    onClick={() => {
                      setContactFromLimit(false);
                      setActiveTopic("contact_host");
                    }}
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

              {activeTopic === "forbidden" && (
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
                    {forbiddenLoading && (
                      <span style={{ color: "var(--muted)" }}>
                        {chatLang === "ro" ? "Se încarcă..." : "Loading..."}
                      </span>
                    )}
                    {!forbiddenLoading && forbiddenAnswer && (
                      <div>{renderAiAnswer(forbiddenAnswer)}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{
                      ...questionBtnStyle,
                      justifyContent: "center",
                    }}
                    onClick={() => {
                      setContactFromLimit(false);
                      setActiveTopic("contact_host");
                    }}
                  >
                    {contactCtaLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTopic(null);
                      setForbiddenAnswer(null);
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
                    <span
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        display: "block",
                        backgroundColor: "#e5e7eb",
                        WebkitMaskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.wifi})`,
                        maskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.wifi})`,
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        pointerEvents: "none",
                      }}
                    />
                    <span>{menuLabels.amenities_wifi}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleAmenitiesSubtopic("iron")}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        display: "block",
                        backgroundColor: "#e5e7eb",
                        WebkitMaskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.iron})`,
                        maskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.iron})`,
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        pointerEvents: "none",
                      }}
                    />
                    <span>{menuLabels.amenities_iron}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleAmenitiesSubtopic("minibar")}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        display: "block",
                        backgroundColor: "#e5e7eb",
                        WebkitMaskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.minibar})`,
                        maskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.minibar})`,
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        pointerEvents: "none",
                      }}
                    />
                    <span>{menuLabels.amenities_minibar}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleAmenitiesSubtopic("coffee_machine")}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        display: "block",
                        backgroundColor: "#e5e7eb",
                        WebkitMaskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.coffee_machine})`,
                        maskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.coffee_machine})`,
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        pointerEvents: "none",
                      }}
                    />
                    <span>{menuLabels.amenities_coffee}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleAmenitiesSubtopic("ac")}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        display: "block",
                        backgroundColor: "#e5e7eb",
                        WebkitMaskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.ac})`,
                        maskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.ac})`,
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        pointerEvents: "none",
                      }}
                    />
                    <span>{menuLabels.amenities_ac}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleAmenitiesSubtopic("washing_machine")}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        display: "block",
                        backgroundColor: "#e5e7eb",
                        WebkitMaskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.washing_machine})`,
                        maskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.washing_machine})`,
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        pointerEvents: "none",
                      }}
                    />
                    <span>{menuLabels.amenities_washer}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleAmenitiesSubtopic("dishwasher")}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        display: "block",
                        backgroundColor: "#e5e7eb",
                        WebkitMaskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.dishwasher})`,
                        maskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.dishwasher})`,
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        pointerEvents: "none",
                      }}
                    />
                    <span>{menuLabels.amenities_dishwasher}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleAmenitiesSubtopic("spa")}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 18,
                        display: "block",
                        backgroundColor: "#e5e7eb",
                        WebkitMaskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.spa})`,
                        maskImage: `url(${AMENITIES_ICON_BY_SUBTOPIC.spa})`,
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        pointerEvents: "none",
                      }}
                    />
                    <span>{menuLabels.amenities_spa}</span>
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
                      <div>{renderAiAnswer(amenitiesAnswer)}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{
                      ...questionBtnStyle,
                      justifyContent: "center",
                    }}
                    onClick={() => {
                      setContactFromLimit(false);
                      setActiveTopic("contact_host");
                    }}
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
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 18,
                        display: "block",
                        backgroundColor: "#e5e7eb",
                        WebkitMaskImage: "url(/svg_where_to_eat.svg)",
                        maskImage: "url(/svg_where_to_eat.svg)",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        pointerEvents: "none",
                      }}
                    />
                    <span>{menuLabels.extras_eat_drink}</span>
                  </button>
                  <button
                    type="button"
                    style={questionBtnStyle}
                    onClick={() => handleExtrasSubtopic("visit")}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        display: "block",
                        backgroundColor: "#e5e7eb",
                        WebkitMaskImage: "url(/svg_what_to_visit.svg)",
                        maskImage: "url(/svg_what_to_visit.svg)",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        pointerEvents: "none",
                      }}
                    />
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
                      <div>{renderAiAnswer(extrasAnswer)}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{
                      ...questionBtnStyle,
                      justifyContent: "center",
                    }}
                    onClick={() => {
                      setContactFromLimit(false);
                      setActiveTopic("contact_host");
                    }}
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
                        <span
                          aria-hidden
                          style={{
                            width: 16,
                            height: 16,
                            display: "block",
                            backgroundColor: "#e5e7eb",
                            WebkitMaskImage: "url(/svg_phone_demo.svg)",
                            maskImage: "url(/svg_phone_demo.svg)",
                            WebkitMaskRepeat: "no-repeat",
                            maskRepeat: "no-repeat",
                            WebkitMaskPosition: "center",
                            maskPosition: "center",
                            WebkitMaskSize: "contain",
                            maskSize: "contain",
                            pointerEvents: "none",
                            flex: "0 0 auto",
                          }}
                        />
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
                        <span
                          aria-hidden
                          style={{
                            width: 16,
                            height: 16,
                            display: "block",
                            backgroundColor: "#e5e7eb",
                            WebkitMaskImage: "url(/svg_email_demo.svg)",
                            maskImage: "url(/svg_email_demo.svg)",
                            WebkitMaskRepeat: "no-repeat",
                            maskRepeat: "no-repeat",
                            WebkitMaskPosition: "center",
                            maskPosition: "center",
                            WebkitMaskSize: "contain",
                            maskSize: "contain",
                            pointerEvents: "none",
                            flex: "0 0 auto",
                          }}
                        />
                        <span>{prop.contact_email}</span>
                      </span>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>
                        {menuLabels.tap_email}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setContactFromLimit(false);
                      setActiveTopic(null);
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
                </>
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
		        <span
		          aria-hidden
		          style={{
		            width: 30,
		            height: 30,
		            display: "block",
		            backgroundColor: "#ffffff",
		            WebkitMaskImage: "url(/svg_guest_assistant.svg)",
		            maskImage: "url(/svg_guest_assistant.svg)",
	            WebkitMaskRepeat: "no-repeat",
	            maskRepeat: "no-repeat",
	            WebkitMaskPosition: "center",
	            maskPosition: "center",
	            WebkitMaskSize: "contain",
	            maskSize: "contain",
	            pointerEvents: "none",
	          }}
	        />
	      </button>
    </>
  );
}
