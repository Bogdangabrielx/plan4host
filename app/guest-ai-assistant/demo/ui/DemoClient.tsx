"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ForceLight from "@/components/theme/ForceLight";

type Lang = "ro" | "en";

type PropInfo = {
  name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  presentation_image_url?: string | null;
  contact_overlay_position?: "top" | "center" | "down" | null;
  social_facebook?: string | null;
  social_instagram?: string | null;
  social_tiktok?: string | null;
  social_website?: string | null;
  social_location?: string | null;
};

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

const PROP: PropInfo = {
  name: "BOA aFrame",
  presentation_image_url: "/BOA.jpg",
  contact_email: "boaframe@office.com",
  contact_phone: "+400700000000",
  contact_address: "Str. 28 Mai, nr.21 - Buzau",
  contact_overlay_position: "center",
  social_facebook: "https://www.facebook.com/p/Plan4Host-61583471135124/?wtsid=rdr_1AK8AnFgBBXi6cASo&hr=1",
  social_instagram: "https://www.instagram.com/plan4host/",
  social_website: "https://plan4host.com",
  social_location: "https://maps.app.goo.gl/21U833vCYkwBZiBP6?g_st=ic",
};

const DETAILS: Details = {
  property_name: "BOA aFrame",
  guest_first_name: "John",
  guest_last_name: "Doe",
  start_date: "09.11.2025",
  end_date: "11.11.2025",
  check_in_time: "15:00",
  check_out_time: "11:00",
  guest_companions_count: 0,
};

const WIFI_SSID = "BOA_aFrame_2025";

const MINIBAR_ITEMS = [
  { itemRo: "Baton de ciocolată Twix", itemEn: "Twix chocolate bar", price: "10 RON" },
  { itemRo: "Mix nuci caju & migdale (plic)", itemEn: "Cashew & almond mix (pack)", price: "14 RON" },
  { itemRo: "Cola 0.33L", itemEn: "Cola 0.33L", price: "13 RON" },
  { itemRo: "Apă minerală 0.5L", itemEn: "Sparkling water 0.5L", price: "10 RON" },
  { itemRo: "Bere la doză 0.5L", itemEn: "Canned beer 0.5L", price: "15 RON" },
  { itemRo: "Prosecco sticlă mică (200 ml)", itemEn: "Small Prosecco bottle (200 ml)", price: "35 RON" },
];

function ContactOverlay({ prop }: { prop: PropInfo }) {
  if (!prop.contact_email && !prop.contact_phone && !prop.contact_address) return null;
  const pos = (prop.contact_overlay_position || "center") as "top" | "center" | "down";
  const base: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    width: "calc(100% - 24px)",
    maxWidth: 420,
    background: "rgba(23, 25, 36, 0.29)",
    color: "#fff",
    WebkitBackdropFilter: "blur(5px) saturate(140%)",
    backdropFilter: "blur(5px) saturate(140%)",
    border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    padding: "12px 14px",
    display: "grid",
    gap: 6,
  };
  if (pos === "top") Object.assign(base, { top: 12, transform: "translateX(-50%)" });
  else if (pos === "down") Object.assign(base, { bottom: 12, transform: "translateX(-50%)" });
  else Object.assign(base, { top: "50%", transform: "translate(-50%, -50%)" });
  return (
    <div style={base}>
      {prop.contact_email && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span aria-hidden>✉</span>
          <a href={`mailto:${prop.contact_email}`} style={{ color: "#fff", textDecoration: "none" }}>
            {prop.contact_email}
          </a>
        </div>
      )}
      {prop.contact_phone && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span aria-hidden>☏</span>
          <a
            href={`tel:${String(prop.contact_phone || "").replace(/\s+/g, "")}`}
            style={{ color: "#fff", textDecoration: "none" }}
          >
            {prop.contact_phone}
          </a>
        </div>
      )}
      {prop.contact_address && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span aria-hidden>⚐</span>
          <span>{prop.contact_address}</span>
        </div>
      )}
    </div>
  );
}

function SocialIcons({ prop }: { prop: PropInfo }) {
  const links = [
    { key: "facebook", url: prop.social_facebook || null, icon: "/facebook_forlight.png", label: "Facebook" },
    { key: "instagram", url: prop.social_instagram || null, icon: "/instagram_forlight.png", label: "Instagram" },
    { key: "tiktok", url: prop.social_tiktok || null, icon: "/tiktok_forlight.png", label: "TikTok" },
    { key: "site", url: prop.social_website || null, icon: "/website_forlight.png", label: "Website" },
    { key: "location", url: prop.social_location || null, icon: "/social_location_forlight.png", label: "Location" },
  ].filter((x) => !!x.url);
  if (links.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, justifyContent: "center" }}>
      {links.map((l) => (
        <a key={l.key} href={l.url!} target="_blank" rel="noreferrer" title={l.label} style={{ lineHeight: 0 }}>
          <img src={l.icon} alt={l.label} width={22} height={22} />
        </a>
      ))}
    </div>
  );
}

function iconMask(src: string, size = 18): React.CSSProperties {
  return {
    width: size,
    height: size,
    display: "block",
    backgroundColor: "#e5e7eb",
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    pointerEvents: "none",
    flex: "0 0 auto",
  };
}

type TopicId = "arrival" | "amenities" | "extras" | "checkout" | "forbidden" | "contact_host";
type ArrivalSubtopic = "parking" | "access_codes" | "access_instructions" | "arrival_time";
type AmenitiesSubtopic = "wifi" | "iron" | "minibar" | "coffee_machine" | "ac" | "washing_machine" | "dishwasher" | "spa";
type ExtrasSubtopic = "where_to_eat" | "what_to_visit";

type Answer = { status: "found" | "missing"; text: string };

function makeAnswer(lang: Lang, topic: TopicId, subtopic?: string): Answer {
  const ro = (s: string) => ({ status: "found" as const, text: s });
  const en = (s: string) => ({ status: "found" as const, text: s });
  const missing = (roText: string, enText: string) => ({
    status: "missing" as const,
    text: lang === "ro" ? roText : enText,
  });
  const found = (roText: string, enText: string) => ({
    status: "found" as const,
    text: lang === "ro" ? roText : enText,
  });

  if (topic === "arrival") {
    if (subtopic === "arrival_time") {
      return found(
        `• CHECK-IN: ${DETAILS.check_in_time}\n• Dacă ajungi mai devreme, te rugăm să contactezi gazda.`,
        `• CHECK-IN: ${DETAILS.check_in_time}\n• If you arrive earlier, please contact the host.`,
      );
    }
    if (subtopic === "parking") {
      return missing(
        "• Nu este clar din informațiile disponibile unde se poate parca. Te rugăm să contactezi gazda.",
        "• It’s not clear from the available information where you should park. Please contact the host.",
      );
    }
    if (subtopic === "access_codes") {
      return missing(
        "• Nu există coduri de acces în informațiile disponibile. Te rugăm să contactezi gazda.",
        "• Access codes are not provided in the available information. Please contact the host.",
      );
    }
    if (subtopic === "access_instructions") {
      return missing(
        "• Nu există instrucțiuni de acces în informațiile disponibile. Te rugăm să contactezi gazda.",
        "• Access instructions are not provided in the available information. Please contact the host.",
      );
    }
  }

  if (topic === "amenities") {
    if (subtopic === "wifi") {
      return found(
        `• WIFI: Network **${WIFI_SSID}**\n• Parola nu este menționată. Te rugăm să contactezi gazda.`,
        `• WIFI: Network **${WIFI_SSID}**\n• Password is not provided. Please contact the host.`,
      );
    }
    if (subtopic === "minibar") {
      const roLines = [
        "• MINIBAR: Produsele se achită la finalul sejurului, în funcție de consum.",
        ...MINIBAR_ITEMS.map((x) => `• ${x.itemRo} — ${x.price}`),
      ];
      const enLines = [
        "• MINIBAR: Items are paid at the end of the stay, based on consumption.",
        ...MINIBAR_ITEMS.map((x) => `• ${x.itemEn} — ${x.price}`),
      ];
      return found(roLines.join("\n"), enLines.join("\n"));
    }
    if (subtopic === "coffee_machine") {
      return found(
        "• ESPRESSOR NESPRESSO: gratuit (capsulele sunt incluse).\n• Umple rezervorul cu apă → pornește → introdu capsula → alege Espresso/Lungo.\n• Aruncă capsulele uzate în compartimentul dedicat.",
        "• NESPRESSO MACHINE: free to use (capsules included).\n• Fill water tank → turn ON → insert capsule → choose Espresso/Lungo.\n• Dispose used capsules in the dedicated compartment.",
      );
    }
    if (subtopic === "iron") {
      return found(
        "• IRON: fier + masă de călcat în zona de garderobă, în dulap.\n• Te rugăm să nu lași fierul nesupravegheat când este în priză.",
        "• IRON: iron + ironing board are in the wardrobe area, inside the closet.\n• Please don’t leave the iron unattended when plugged in.",
      );
    }
    if (subtopic === "washing_machine") {
      return found(
        "• MAȘINĂ DE SPĂLAT: proprietatea nu dispune de mașină de spălat rufe.",
        "• WASHING MACHINE: the property does not have a washing machine.",
      );
    }
    if (subtopic === "dishwasher") {
      return found(
        "• DISHWASHER: proprietatea nu dispune de mașină de spălat vase.",
        "• DISHWASHER: the property does not have a dishwasher.",
      );
    }
    if (subtopic === "ac") {
      return missing(
        "• Nu este clar din informațiile disponibile dacă există aer condiționat și cum se folosește. Te rugăm să contactezi gazda.",
        "• It’s not clear from the available information whether AC is available and how to use it. Please contact the host.",
      );
    }
    if (subtopic === "spa") {
      return found(
        "• PISCINĂ (dacă este disponibilă): utilizare pe propria răspundere; fără salvamar.\n• Copiii trebuie supravegheați de un adult; nu alerga în zona piscinei; fără sticlă.",
        "• POOL (if available): use at your own risk; no lifeguard on duty.\n• Children must be supervised; no running in the pool area; no glass allowed.",
      );
    }
  }

  if (topic === "extras") {
    if (subtopic === "where_to_eat") {
      return missing(
        "• Nu sunt recomandări de restaurante/cafenele în informațiile disponibile. Te rugăm să contactezi gazda.",
        "• There are no restaurant/cafe recommendations in the available information. Please contact the host.",
      );
    }
    if (subtopic === "what_to_visit") {
      return missing(
        "• Nu sunt recomandări despre ce să vizitezi în informațiile disponibile. Te rugăm să contactezi gazda.",
        "• There are no nearby visit recommendations in the available information. Please contact the host.",
      );
    }
  }

  if (topic === "checkout") {
    return found(
      `• CHECK-OUT: ${DETAILS.check_out_time}\n• Late check-out este în funcție de disponibilitate și poate avea cost extra.\n• Te rugăm să returnezi cheile/cardurile de acces conform instrucțiunilor primite.`,
      `• CHECK-OUT: ${DETAILS.check_out_time}\n• Late check-out is subject to availability and may incur an extra fee.\n• Please return keys/access cards as instructed at check-out.`,
    );
  }

  if (topic === "forbidden") {
    return found(
      "• FĂRĂ petreceri/evenimente (decât dacă gazda a confirmat în scris).\n• FĂRĂ activități ilegale.\n• FĂRĂ fumat în interior (doar afară).\n• FĂRĂ droguri/substanțe ilegale.\n• Respectă liniștea și vecinii.\n• La piscină (dacă există): fără sticlă; nu alerga; copiii supravegheați.",
      "• NO parties/events (unless approved in writing by the host).\n• NO illegal activities.\n• NO smoking indoors (only outdoors).\n• NO illegal drugs/substances.\n• Respect quiet hours and neighbors.\n• Pool area (if applicable): no glass; no running; children must be supervised.",
    );
  }

  if (topic === "contact_host") {
    return found(
      `• Email: ${PROP.contact_email}\n• Telefon: ${PROP.contact_phone}\n• Adresă: ${PROP.contact_address}`,
      `• Email: ${PROP.contact_email}\n• Phone: ${PROP.contact_phone}\n• Address: ${PROP.contact_address}`,
    );
  }

  // fallback
  return missing(
    "• Nu este clar din informațiile disponibile. Te rugăm să contactezi gazda.",
    "• It is not clear from the available information. Please contact the host.",
  );
}

function StaticChatFab({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [showAssistantHint, setShowAssistantHint] = useState(true);

  useEffect(() => {
    if (!showAssistantHint) return;
    const t = setTimeout(() => setShowAssistantHint(false), 5000);
    return () => clearTimeout(t);
  }, [showAssistantHint]);

  const [chatLang, setChatLang] = useState<Lang>(lang);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [langMenuPlacement, setLangMenuPlacement] = useState<"up" | "down">("down");
  const [langMenuMaxHeight, setLangMenuMaxHeight] = useState<number>(260);
  const langTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => setChatLang(lang), [lang]);

  const [activeTopic, setActiveTopic] = useState<TopicId | null>(null);
  const [arrivalSubtopic, setArrivalSubtopic] = useState<ArrivalSubtopic | null>(null);
  const [amenitiesSubtopic, setAmenitiesSubtopic] = useState<AmenitiesSubtopic | null>(null);
  const [extrasSubtopic, setExtrasSubtopic] = useState<ExtrasSubtopic | null>(null);

  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);

  const renderedAnswer = useMemo(() => {
    if (!answer?.text) return null;
    const lines = answer.text.split(/\r?\n/);
    return lines.map((line, lineIdx) => (
      <div key={lineIdx}>
        {line.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
          const m = part.match(/^\*\*(.*)\*\*$/);
          if (m) return <strong key={idx}>{m[1]}</strong>;
          return <span key={idx}>{part}</span>;
        })}
      </div>
    ));
  }, [answer?.text]);

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
    background: "linear-gradient(135deg, rgba(0,209,255,0.3), rgba(124,58,237,0.7))",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 11,
    position: "relative",
    zIndex: 2,
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
    cursor: "pointer",
    color: "var(--text)",
    fontSize: 12,
  };

  const backLabel = chatLang === "ro" ? "Înapoi" : "Back";
  const contactCtaLabel =
    chatLang === "ro" ? "Încă ai întrebări? Contactează gazda" : "Still have questions? Contact the host";

  const ask = (topic: TopicId, sub?: string) => {
    setLoading(true);
    setAnswer(null);
    window.setTimeout(() => {
      setAnswer(makeAnswer(chatLang, topic, sub));
      setLoading(false);
    }, 450);
  };

  const resetToTopics = () => {
    setActiveTopic(null);
    setArrivalSubtopic(null);
    setAmenitiesSubtopic(null);
    setExtrasSubtopic(null);
    setAnswer(null);
    setLoading(false);
  };

  const openLangMenu = () => {
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
            const preferDown = spaceBelow >= 220 || spaceBelow >= spaceAbove;
            const avail = (preferDown ? spaceBelow : spaceAbove) - 16;
            setLangMenuPlacement(preferDown ? "down" : "up");
            setLangMenuMaxHeight(Math.max(140, Math.min(260, Math.floor(avail))));
          });
        } catch {}
      }
      return next;
    });
  };

  const topicButtons: Array<{ id: TopicId; label: string; icon: string }> = [
    { id: "arrival", label: chatLang === "ro" ? "Detalii sosire" : "Arrival details", icon: "/svg_arrival_details.svg" },
    { id: "amenities", label: chatLang === "ro" ? "Facilități" : "Amenities", icon: "/svg_amenities.svg" },
    { id: "extras", label: chatLang === "ro" ? "Recomandări" : "Recommendations", icon: "/svg_recommendations.svg" },
    { id: "checkout", label: chatLang === "ro" ? "Check‑out" : "Check‑out", icon: "/svg_logout.svg" },
    { id: "forbidden", label: chatLang === "ro" ? "Ce este interzis" : "What is forbidden", icon: "/svg_forbidden.svg" },
    { id: "contact_host", label: chatLang === "ro" ? "Contactează gazda" : "Contact the host", icon: "/svg_contact_the_host.svg" },
  ];

  const arrivalButtons: Array<{ id: ArrivalSubtopic; label: string; icon: string }> = [
    { id: "parking", label: chatLang === "ro" ? "Parcare" : "Parking information", icon: "/svg_parking.svg" },
    { id: "access_codes", label: chatLang === "ro" ? "Coduri acces" : "Access codes", icon: "/svg_access_codes.svg" },
    { id: "access_instructions", label: chatLang === "ro" ? "Instrucțiuni acces" : "Access instructions", icon: "/svg_access_instructions.svg" },
    { id: "arrival_time", label: chatLang === "ro" ? "Ora de check‑in" : "Arrival time", icon: "/svg_arrival_time.svg" },
  ];

  const amenitiesButtons: Array<{ id: AmenitiesSubtopic; label: string; icon: string }> = [
    { id: "wifi", label: chatLang === "ro" ? "Wi‑Fi (rețea)" : "Wi‑Fi (network)", icon: "/svg_wifi.svg" },
    { id: "iron", label: chatLang === "ro" ? "Fier de călcat" : "Iron / ironing", icon: "/svg_iron.svg" },
    { id: "minibar", label: chatLang === "ro" ? "Minibar" : "Minibar", icon: "/svg_minibar.svg" },
    { id: "coffee_machine", label: chatLang === "ro" ? "Espressor" : "Coffee machine", icon: "/svg_coffee_machine.svg" },
    { id: "ac", label: chatLang === "ro" ? "Aer condiționat" : "Air conditioning", icon: "/svg_air_conditioning.svg" },
    { id: "washing_machine", label: chatLang === "ro" ? "Mașină de spălat" : "Washing machine", icon: "/svg_washing_machine.svg" },
    { id: "dishwasher", label: chatLang === "ro" ? "Mașină de spălat vase" : "Dishwasher", icon: "/svg_dishwasher.svg" },
    { id: "spa", label: chatLang === "ro" ? "Spa / piscină / saună" : "Spa / pool / sauna", icon: "/svg_spa.svg" },
  ];

  const extrasButtons: Array<{ id: ExtrasSubtopic; label: string; icon: string }> = [
    { id: "where_to_eat", label: chatLang === "ro" ? "Unde mănânc / cafea" : "Where to eat / coffee", icon: "/svg_where_to_eat.svg" },
    { id: "what_to_visit", label: chatLang === "ro" ? "Ce să vizitez" : "What to visit nearby", icon: "/svg_what_to_visit.svg" },
  ];

  const renderAnswerCard = () => (
    <div style={{ display: "grid", gap: 8 }}>
      <div
        style={{
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          padding: 10,
          fontSize: 13,
        }}
      >
        {loading && <span style={{ color: "var(--muted)" }}>{chatLang === "ro" ? "Se încarcă..." : "Loading..."}</span>}
        {!loading && renderedAnswer && <div>{renderedAnswer}</div>}
      </div>
      <button
        type="button"
        style={{ ...questionBtnStyle, justifyContent: "center" }}
        onClick={() => {
          setActiveTopic("contact_host");
          setArrivalSubtopic(null);
          setAmenitiesSubtopic(null);
          setExtrasSubtopic(null);
          ask("contact_host");
        }}
      >
        <span aria-hidden style={iconMask("/svg_contact_the_host.svg", 18)} />
        <span>{contactCtaLabel}</span>
      </button>
      <button
        type="button"
        onClick={() => resetToTopics()}
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
  );

  const content = (() => {
    if (!activeTopic) {
      return (
        <>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            {chatLang === "ro"
              ? "Alege un subiect pentru care ai nevoie de ajutor."
              : "Choose a topic you need help with."}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {topicButtons.map((it) => (
              <button
                key={it.id}
                type="button"
                style={questionBtnStyle}
                onClick={() => {
                  setActiveTopic(it.id);
                  setArrivalSubtopic(null);
                  setAmenitiesSubtopic(null);
                  setExtrasSubtopic(null);
                  if (it.id === "checkout" || it.id === "forbidden" || it.id === "contact_host") {
                    ask(it.id);
                  } else {
                    setAnswer(null);
                  }
                }}
              >
                <span aria-hidden style={iconMask(it.icon, it.id === "contact_host" ? 20 : 18)} />
                <span>{it.label}</span>
              </button>
            ))}
          </div>
        </>
      );
    }

    if (activeTopic === "arrival") {
      if (!arrivalSubtopic) {
        return (
          <div style={{ display: "grid", gap: 6 }}>
            {arrivalButtons.map((it) => (
              <button
                key={it.id}
                type="button"
                style={questionBtnStyle}
                onClick={() => {
                  setArrivalSubtopic(it.id);
                  ask("arrival", it.id);
                }}
              >
                <span aria-hidden style={iconMask(it.icon, 18)} />
                <span>{it.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => resetToTopics()}
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
        );
      }
      return renderAnswerCard();
    }

    if (activeTopic === "amenities") {
      if (!amenitiesSubtopic) {
        return (
          <div style={{ display: "grid", gap: 6 }}>
            {amenitiesButtons.map((it) => (
              <button
                key={it.id}
                type="button"
                style={questionBtnStyle}
                onClick={() => {
                  setAmenitiesSubtopic(it.id);
                  ask("amenities", it.id);
                }}
              >
                <span aria-hidden style={iconMask(it.icon, it.id === "spa" ? 20 : 18)} />
                <span>{it.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => resetToTopics()}
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
        );
      }
      return renderAnswerCard();
    }

    if (activeTopic === "extras") {
      if (!extrasSubtopic) {
        return (
          <div style={{ display: "grid", gap: 6 }}>
            {extrasButtons.map((it) => (
              <button
                key={it.id}
                type="button"
                style={questionBtnStyle}
                onClick={() => {
                  setExtrasSubtopic(it.id);
                  ask("extras", it.id);
                }}
              >
                <span aria-hidden style={iconMask(it.icon, it.id === "where_to_eat" ? 20 : 18)} />
                <span>{it.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => resetToTopics()}
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
        );
      }
      return renderAnswerCard();
    }

    if (activeTopic === "checkout" || activeTopic === "forbidden" || activeTopic === "contact_host") {
      return renderAnswerCard();
    }

    return null;
  })();

  return (
    <>
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
            background: "linear-gradient(135deg, rgba(0,209,255,0.12), rgba(124,58,237,0.3))",
            color: "#0c111b",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 8px 20px rgba(15,23,42,0.24)",
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
              background: "rgba(255,255,255,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              border: "1px solid rgba(148,163,184,0.6)",
            }}
          >
            ?
          </span>
          <span style={{ fontSize: 13, textAlign: "left" }}>
            {chatLang === "ro"
              ? "Ai o întrebare? Guest AI assistant te poate ajuta."
              : "Have a question? Guest AI assistant can help."}
          </span>
        </button>
      )}

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
                  background: "linear-gradient(135deg, #00d1ff, #7c3aed)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span aria-hidden style={iconMask("/svg_guest_assistant.svg", 18)} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                Guest AI assistant
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "rgba(255,255,255,0.95)",
                fontSize: 18,
                lineHeight: 1,
              }}
              aria-label="Close assistant"
            >
              ×
            </button>
          </div>

          <div style={languageBarStyle}>
            <div style={{ display: "grid", gap: 2 }}>
              <span style={{ opacity: 0.9 }}>
                {chatLang === "ro" ? "Selectează limba" : "Select language"}
              </span>
              <span style={{ opacity: 0.7 }}>
                {chatLang === "ro"
                  ? "Răspunsuri în Română sau Engleză."
                  : "Answers in Romanian or English."}
              </span>
            </div>
            <button
              type="button"
              ref={langTriggerRef}
              style={langTriggerStyle}
              onClick={openLangMenu}
              aria-haspopup="listbox"
              aria-expanded={showLangMenu}
            >
              <span aria-hidden style={{ fontSize: 15 }}>
                {chatLang === "ro" ? "🇷🇴" : "🇬🇧"}
              </span>
              <span>{chatLang === "ro" ? "Română" : "English"}</span>
              <span aria-hidden style={{ fontSize: 10, opacity: 0.8 }}>
                ▾
              </span>
            </button>
            {showLangMenu && (
              <div
                style={{
                  ...dropdownStyle,
                  maxHeight: langMenuMaxHeight,
                  ...(langMenuPlacement === "up"
                    ? { bottom: "calc(100% + 6px)", top: "auto" }
                    : { top: "calc(100% + 6px)", bottom: "auto" }),
                }}
                role="listbox"
              >
                <button
                  type="button"
                  style={{
                    ...dropdownItemStyle,
                    background: chatLang === "ro" ? "rgba(0,209,255,0.08)" : "transparent",
                  }}
                  onClick={() => {
                    setChatLang("ro");
                    setShowLangMenu(false);
                    resetToTopics();
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span aria-hidden style={{ fontSize: 16 }}>
                      🇷🇴
                    </span>
                    <span>Română</span>
                  </div>
                  {chatLang === "ro" && (
                    <span aria-hidden style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>
                      ✓
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  style={{
                    ...dropdownItemStyle,
                    background: chatLang === "en" ? "rgba(0,209,255,0.08)" : "transparent",
                  }}
                  onClick={() => {
                    setChatLang("en");
                    setShowLangMenu(false);
                    resetToTopics();
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span aria-hidden style={{ fontSize: 16 }}>
                      🇬🇧
                    </span>
                    <span>English</span>
                  </div>
                  {chatLang === "en" && (
                    <span aria-hidden style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>
                      ✓
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          <div style={questionsBarStyle}>{content}</div>
        </div>
      )}

      <button type="button" onClick={() => setOpen((v) => !v)} style={fabStyle} aria-label="Open guest assistant">
        <span aria-hidden style={iconMask("/svg_guest_assistant.svg", 32)} />
      </button>
    </>
  );
}

function labelsFor(lang: Lang) {
  return {
    details: lang === "ro" ? "Detalii rezervare" : "Reservation details",
    property: lang === "ro" ? "Locatie" : "Property",
    guest: lang === "ro" ? "Oaspete" : "Guest",
    guestWithCompanions: lang === "ro" ? "Oaspete" : "Guest",
    stay: lang === "ro" ? "Sejur" : "Stay",
    room: lang === "ro" ? "Camera" : "Room",
  };
}

export default function DemoClient() {
  const params = useSearchParams();
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const v = (params?.get("lang") || "").toLowerCase();
    if (v === "ro" || v === "en") setLang(v);
  }, [params]);

  const labels = labelsFor(lang);

  return (
    <>
      <ForceLight />

      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "start center", padding: 16 }}>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .rm-card{ background: var(--panel); border:1px solid var(--border); border-radius:14px; padding:18px; box-shadow: 0 10px 30px rgba(0,0,0,.20); }
              .rm-content{ color: var(--text); font-family: Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; white-space: pre-wrap; }
              .rm-content h1,.rm-content h2,.rm-content h3{ margin: 0 0 10px; line-height: 1.25; }
              .rm-content h3:first-of-type{ font-size: 20px; font-weight: 900; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 12px; }
              .rm-content p{ margin: 10px 0; line-height: 1.6; }
              .rm-content hr{ border: 0; border-top: 1px solid var(--border); margin: 14px 0; opacity: .75; }
            `,
          }}
        />

        <main style={{ width: "min(860px, calc(100vw - 32px))" }}>
          <div
            className="rm-card"
            style={{
              marginBottom: 12,
              padding: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <img src="/p4h_logo_rotund.png" alt="P4H" width={28} height={28} style={{ display: "block" }} />
            <div style={{ display: "inline-flex", gap: 8 }}>
              <button
                onClick={() => setLang("ro")}
                className="sb-btn"
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: lang === "ro" ? "var(--primary)" : "var(--card)",
                  color: lang === "ro" ? "#0c111b" : "var(--text)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <img src="/ro.png" alt="RO" width={16} height={16} />
                <span>Română</span>
              </button>
              <button
                onClick={() => setLang("en")}
                className="sb-btn"
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: lang === "en" ? "var(--primary)" : "var(--card)",
                  color: lang === "en" ? "#0c111b" : "var(--text)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <img src="/eng.png" alt="EN" width={16} height={16} />
                <span>English</span>
              </button>
            </div>
          </div>

          {/* Property contact + image overlay card (glass) */}
          <section className="rm-card" style={{ padding: 0, marginBottom: 12 }}>
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
              <img
                src={PROP.presentation_image_url || ""}
                alt="Property"
                style={{ display: "block", width: "100%", height: 260, objectFit: "cover" }}
              />
              <ContactOverlay prop={PROP} />
            </div>
            <SocialIcons prop={PROP} />
          </section>

          <article className="rm-card" style={{ marginBottom: 12 }}>
            <div className="rm-content">
              <h3>{labels.details}</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  rowGap: 8,
                  columnGap: 10,
                  alignItems: "center",
                }}
              >
                <div aria-hidden style={{ width: 18 }}>
                  <img src="/dashboard_forlight.png" alt="" width={16} height={16} />
                </div>
                <div>
                  <strong>{labels.property}</strong>: {DETAILS.property_name || "—"}
                </div>

                <div aria-hidden style={{ width: 18 }}>
                  <img src="/logoguest_forlight.png" alt="" width={16} height={16} />
                </div>
                <div>
                  <strong>{labels.guest}</strong>:{" "}
                  {[DETAILS.guest_first_name || "", DETAILS.guest_last_name || ""].filter(Boolean).join(" ") || "—"}
                </div>

                <div aria-hidden style={{ width: 18 }}>
                  <img src="/night_forlight.png" alt="" width={16} height={16} />
                </div>
                <div>
                  <strong>{labels.stay}</strong>: {DETAILS.start_date || "—"} → {DETAILS.end_date || "—"}
                </div>

                <div aria-hidden style={{ width: 18 }} />
                <div style={{ marginTop: 2 }}>
                  <span style={{ color: "var(--muted)" }}>
                    {lang === "ro"
                      ? `Check-in ${DETAILS.check_in_time} · Check-out ${DETAILS.check_out_time}`
                      : `Check-in ${DETAILS.check_in_time} · Check-out ${DETAILS.check_out_time}`}
                  </span>
                </div>
              </div>
            </div>
          </article>

          <p style={{ color: "var(--muted)", textAlign: "center", fontSize: 12, marginTop: 12 }}>
            Powered by Plan4Host.
          </p>
        </main>
      </div>

      <StaticChatFab lang={lang} />
    </>
  );
}

