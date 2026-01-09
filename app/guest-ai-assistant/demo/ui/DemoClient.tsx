"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Lang = "en" | "ro";

type StaticAnswer = {
  status: "found" | "missing";
  lines: string[];
};

type TopicId = "arrival" | "amenities" | "recommendations" | "checkout" | "forbidden" | "contact";

type ArrivalSubtopic = "parking" | "access_codes" | "access_instructions" | "arrival_time";
type AmenitiesSubtopic =
  | "wifi"
  | "minibar"
  | "coffee_machine"
  | "iron"
  | "ac"
  | "washing_machine"
  | "dishwasher"
  | "spa";
type RecoSubtopic = "where_to_eat" | "what_to_visit";

const DEMO = {
  propertyName: "BOA aFrame",
  guestName: "John Doe",
  startDate: "09.11.2025",
  endDate: "11.11.2025",
  checkinTime: "15:00",
  checkoutTime: "11:00",
  bannerSrc: "/BOA.jpg",
  wifiSsid: "BOA_aFrame_2025",
  minibar: [
    { item: "Twix chocolate bar", price: "10 RON" },
    { item: "Cashew & almond mix (pack)", price: "14 RON" },
    { item: "Cola 0.33L", price: "13 RON" },
    { item: "Sparkling water 0.5L", price: "10 RON" },
    { item: "Canned beer 0.5L", price: "15 RON" },
    { item: "Small Prosecco bottle (200 ml)", price: "35 RON" },
  ],
  hasDishwasher: false,
  hasWashingMachine: false,
} as const;

const DEMO_CONTACT = {
  email: "boaframe@office.com",
  phone: "+400700000000",
  address: "Str. 28 Mai, nr.21 - Buzau",
  website: "https://plan4host.com",
  facebook: "https://www.facebook.com/p/Plan4Host-61583471135124/?wtsid=rdr_1AK8AnFgBBXi6cASo&hr=1",
  instagram: "https://www.instagram.com/plan4host/",
  maps: "https://maps.app.goo.gl/21U833vCYkwBZiBP6?g_st=ic",
} as const;

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

function t(lang: Lang, ro: string, en: string) {
  return lang === "ro" ? ro : en;
}

function DemoMessages({ lang }: { lang: Lang }) {
  const cardStyle: React.CSSProperties = {
    borderRadius: 16,
    border: "1px solid var(--border)",
    background: "var(--panel)",
    boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
    overflow: "hidden",
  };
  const bannerStyle: React.CSSProperties = {
    width: "100%",
    height: 160,
    display: "block",
    objectFit: "cover",
    background: "var(--card)",
  };
  const headerStyle: React.CSSProperties = {
    padding: 16,
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background:
      "radial-gradient(circle at top left, rgba(0,209,255,0.10), transparent 55%), radial-gradient(circle at bottom right, rgba(124,58,237,0.14), transparent 55%), var(--panel)",
  };
  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  };

  return (
    <section style={cardStyle}>
      <img src={DEMO.bannerSrc} alt={DEMO.propertyName} style={bannerStyle} />
      <header style={headerStyle}>
        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <h2 style={titleStyle}>Reservation Messages (Demo)</h2>
          <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.4 }}>
            {t(
              lang,
              `Rezervare: ${DEMO.guestName} · ${DEMO.startDate} → ${DEMO.endDate} · Check-in ${DEMO.checkinTime} · Check-out ${DEMO.checkoutTime}`,
              `Reservation: ${DEMO.guestName} · ${DEMO.startDate} → ${DEMO.endDate} · Check-in ${DEMO.checkinTime} · Check-out ${DEMO.checkoutTime}`,
            )}
          </div>
        </div>
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "var(--card)",
            fontSize: 12,
            color: "var(--muted)",
            whiteSpace: "nowrap",
          }}
        >
          {DEMO.propertyName}
        </div>
      </header>
      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 700 }}>
            {t(lang, "House Rules & Safety Guidelines (extras)", "House Rules & Safety Guidelines (excerpt)")}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
            {t(
              lang,
              "Răspunsurile din demo sunt statice, bazate pe textul de House Rules + detaliile rezervării. În aplicație, asistentul folosește mesajele + House Rules reale.",
              "Demo answers are static, based on the House Rules text + reservation details. In the app, the assistant uses your real messages + House Rules.",
            )}
          </div>
          <div
            style={{
              marginTop: 6,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--card)",
              padding: 12,
              fontSize: 13,
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
            }}
          >
            {t(
              lang,
              `Check-in: ${DEMO.checkinTime}\nCheck-out: ${DEMO.checkoutTime}\n\n- Fumatul este interzis în interior.\n- Petrecerile/evenimentele nu sunt permise.\n- Activitățile ilegale sunt strict interzise.\n- Zona piscinei (dacă există) este pe propria răspundere; fără sticlă; nu alerga; copiii supravegheați.`,
              `Check-in: ${DEMO.checkinTime}\nCheck-out: ${DEMO.checkoutTime}\n\n- No smoking indoors.\n- No parties/events.\n- Illegal activities are strictly prohibited.\n- Pool area rules (if applicable): use at own risk; no glass; no running; children must be supervised.`,
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function makeAnswer(lang: Lang, topic: TopicId, subtopic?: string): StaticAnswer {
  const missing = (ro: string, en: string): StaticAnswer => ({
    status: "missing",
    lines: [t(lang, ro, en)],
  });
  const found = (linesRo: string[], linesEn: string[]): StaticAnswer => ({
    status: "found",
    lines: lang === "ro" ? linesRo : linesEn,
  });

  if (topic === "arrival") {
    if (subtopic === "arrival_time") {
      return found(
        [`• CHECK-IN: ${DEMO.checkinTime}`, `• Dacă ajungi mai devreme, te rugăm să contactezi gazda.`],
        [`• CHECK-IN: ${DEMO.checkinTime}`, `• If you arrive earlier, please contact the host.`],
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
        [`• WIFI: Network **${DEMO.wifiSsid}**`, `• Parola nu este menționată. Te rugăm să contactezi gazda.`],
        [`• WIFI: Network **${DEMO.wifiSsid}**`, `• Password is not provided. Please contact the host.`],
      );
    }
    if (subtopic === "minibar") {
      return found(
        [
          "• MINIBAR: Produsele se achită la final, în funcție de consum.",
          ...DEMO.minibar.map((x) => `• ${x.item} — ${x.price}`),
        ],
        [
          "• MINIBAR: Items are paid at the end of the stay, based on consumption.",
          ...DEMO.minibar.map((x) => `• ${x.item} — ${x.price}`),
        ],
      );
    }
    if (subtopic === "coffee_machine") {
      return found(
        [
          "• ESPRESSOR NESPRESSO: gratuit (capsulele sunt incluse).",
          "• Umple rezervorul cu apă → pornește → introdu capsula → alege Espresso/Lungo.",
          "• Aruncă capsulele uzate în compartimentul dedicat.",
        ],
        [
          "• NESPRESSO MACHINE: free to use (capsules included).",
          "• Fill water tank → turn ON → insert capsule → choose Espresso/Lungo.",
          "• Dispose used capsules in the dedicated compartment.",
        ],
      );
    }
    if (subtopic === "iron") {
      return found(
        [
          "• IRON: fier + masă de călcat în zona de garderobă, în dulap.",
          "• Te rugăm să nu lași fierul nesupravegheat când este în priză.",
        ],
        [
          "• IRON: iron + ironing board are in the wardrobe area, inside the closet.",
          "• Please don’t leave the iron unattended when plugged in.",
        ],
      );
    }
    if (subtopic === "washing_machine") {
      return found(
        ["• MAȘINĂ DE SPĂLAT: proprietatea nu dispune de mașină de spălat rufe."],
        ["• WASHING MACHINE: the property does not have a washing machine."],
      );
    }
    if (subtopic === "dishwasher") {
      return found(
        ["• DISHWASHER: proprietatea nu dispune de mașină de spălat vase."],
        ["• DISHWASHER: the property does not have a dishwasher."],
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
        [
          "• PISCINĂ (dacă este disponibilă): utilizare pe propria răspundere; fără salvamar.",
          "• Copiii trebuie supravegheați de un adult; nu alerga în zona piscinei; fără sticlă.",
        ],
        [
          "• POOL (if available): use at your own risk; no lifeguard on duty.",
          "• Children must be supervised; no running in the pool area; no glass allowed.",
        ],
      );
    }
  }

  if (topic === "checkout") {
    return found(
      [
        `• CHECK-OUT: ${DEMO.checkoutTime}`,
        "• Late check-out este în funcție de disponibilitate și poate avea cost extra.",
        "• Te rugăm să returnezi cheile/cardurile de acces conform instrucțiunilor primite.",
      ],
      [
        `• CHECK-OUT: ${DEMO.checkoutTime}`,
        "• Late check-out is subject to availability and may incur an extra fee.",
        "• Please return keys/access cards as instructed at check-out.",
      ],
    );
  }

  if (topic === "forbidden") {
    return found(
      [
        "• FĂRĂ petreceri/evenimente (decât dacă gazda a confirmat în scris).",
        "• FĂRĂ activități ilegale.",
        "• FĂRĂ fumat în interior (doar afară).",
        "• FĂRĂ droguri/substanțe ilegale.",
        "• Respectă liniștea și vecinii.",
        "• La piscină (dacă există): fără sticlă; nu alerga; copiii supravegheați.",
      ],
      [
        "• NO parties/events (unless approved in writing by the host).",
        "• NO illegal activities.",
        "• NO smoking indoors (only outdoors).",
        "• NO illegal drugs/substances.",
        "• Respect quiet hours and neighbors.",
        "• Pool area (if applicable): no glass; no running; children must be supervised.",
      ],
    );
  }

  if (topic === "recommendations") {
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

  if (topic === "contact") {
    return found(
      [
        "• Dacă ai întrebări, contactează gazda:",
        `• Email: ${DEMO_CONTACT.email}`,
        `• Telefon: ${DEMO_CONTACT.phone}`,
        `• Adresă: ${DEMO_CONTACT.address}`,
      ],
      [
        "• If you still have questions, contact the host:",
        `• Email: ${DEMO_CONTACT.email}`,
        `• Phone: ${DEMO_CONTACT.phone}`,
        `• Address: ${DEMO_CONTACT.address}`,
      ],
    );
  }

  return missing(
    "• Nu este clar din informațiile disponibile. Te rugăm să contactezi gazda.",
    "• It is not clear from the available information. Please contact the host.",
  );
}

function DemoAssistant({ lang, onLangChange }: { lang: Lang; onLangChange: (lang: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [topic, setTopic] = useState<TopicId | null>(null);
  const [subtopic, setSubtopic] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [placement, setPlacement] = useState<"up" | "down">("down");
  const [maxHeight, setMaxHeight] = useState(260);

  const answer = useMemo(() => {
    if (!topic) return null;
    return makeAnswer(lang, topic, subtopic ?? undefined);
  }, [lang, topic, subtopic]);

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
    maxHeight: "min(520px, calc(100vh - 120px))",
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
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
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

  const contentStyle: React.CSSProperties = {
    padding: 10,
    display: "grid",
    gap: 8,
    minHeight: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
    background: "#ffffff",
  };

  const questionBtnStyle: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(15,23,42,0.92)",
    color: "#e5e7eb",
    padding: "8px 10px",
    fontSize: 12,
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
    letterSpacing: 0.02,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  const softBtnStyle: React.CSSProperties = {
    ...questionBtnStyle,
    justifyContent: "center",
    background: "transparent",
    color: "var(--muted)",
    border: "1px solid var(--border)",
  };

  const topicButtons: Array<{ id: TopicId; label: { ro: string; en: string }; icon: string }> = [
    { id: "arrival", label: { ro: "Detalii sosire", en: "Arrival details" }, icon: "/svg_arrival_details.svg" },
    { id: "amenities", label: { ro: "Facilități", en: "Amenities" }, icon: "/svg_amenities.svg" },
    { id: "recommendations", label: { ro: "Recomandări", en: "Recommendations" }, icon: "/svg_recommendations.svg" },
    { id: "checkout", label: { ro: "Check-out", en: "Check-out" }, icon: "/svg_logout.svg" },
    { id: "forbidden", label: { ro: "Ce este interzis", en: "What is forbidden" }, icon: "/svg_forbidden.svg" },
    { id: "contact", label: { ro: "Contactează gazda", en: "Contact the host" }, icon: "/svg_contact_the_host.svg" },
  ];

  const arrivalButtons: Array<{ id: ArrivalSubtopic; label: { ro: string; en: string }; icon: string }> = [
    { id: "parking", label: { ro: "Parcare", en: "Parking information" }, icon: "/svg_parking.svg" },
    { id: "access_codes", label: { ro: "Coduri acces", en: "Access codes" }, icon: "/svg_access_codes.svg" },
    { id: "access_instructions", label: { ro: "Instrucțiuni acces", en: "Access instructions" }, icon: "/svg_access_instructions.svg" },
    { id: "arrival_time", label: { ro: "Ora de check-in", en: "Arrival time" }, icon: "/svg_arrival_time.svg" },
  ];

  const amenitiesButtons: Array<{ id: AmenitiesSubtopic; label: { ro: string; en: string }; icon: string }> = [
    { id: "wifi", label: { ro: "Wi‑Fi", en: "Wi‑Fi (network & password)" }, icon: "/svg_wifi.svg" },
    { id: "minibar", label: { ro: "Minibar", en: "Minibar" }, icon: "/svg_minibar.svg" },
    { id: "coffee_machine", label: { ro: "Espressor", en: "Coffee machine" }, icon: "/svg_coffee_machine.svg" },
    { id: "iron", label: { ro: "Fier de călcat", en: "Iron / ironing" }, icon: "/svg_iron.svg" },
    { id: "ac", label: { ro: "Aer condiționat", en: "Air conditioning" }, icon: "/svg_air_conditioning.svg" },
    { id: "washing_machine", label: { ro: "Mașină de spălat", en: "Washing machine" }, icon: "/svg_washing_machine.svg" },
    { id: "dishwasher", label: { ro: "Mașină de spălat vase", en: "Dishwasher" }, icon: "/svg_dishwasher.svg" },
    { id: "spa", label: { ro: "Spa / piscină / saună", en: "Spa / pool / sauna" }, icon: "/svg_spa.svg" },
  ];

  const recoButtons: Array<{ id: RecoSubtopic; label: { ro: string; en: string }; icon: string }> = [
    { id: "where_to_eat", label: { ro: "Unde mănânc / cafea", en: "Where to eat / coffee" }, icon: "/svg_where_to_eat.svg" },
    { id: "what_to_visit", label: { ro: "Ce să vizitez", en: "What to visit nearby" }, icon: "/svg_what_to_visit.svg" },
  ];

  const openLangMenu = () => {
    setShowLangMenu((v) => {
      const next = !v;
      if (next) {
        try {
          requestAnimationFrame(() => {
            const el = triggerRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const preferDown = spaceBelow >= 220 || spaceBelow >= spaceAbove;
            const avail = (preferDown ? spaceBelow : spaceAbove) - 16;
            setPlacement(preferDown ? "down" : "up");
            setMaxHeight(Math.max(140, Math.min(260, Math.floor(avail))));
          });
        } catch {}
      }
      return next;
    });
  };

  const renderAnswer = () => {
    if (!answer) return null;
    const badgeBg = answer.status === "found" ? "rgba(22,185,129,0.12)" : "rgba(239,68,68,0.10)";
    const badgeBorder = answer.status === "found" ? "rgba(22,185,129,0.40)" : "rgba(239,68,68,0.30)";
    const badgeText = answer.status === "found" ? t(lang, "Găsit", "Found") : t(lang, "Lipsă", "Missing");
    return (
      <div style={{ display: "grid", gap: 8, minHeight: 0 }}>
        <div
          style={{
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            padding: 10,
            display: "grid",
            gap: 10,
            minHeight: 0,
          }}
        >
          <div
            style={{
              alignSelf: "start",
              justifySelf: "start",
              padding: "4px 10px",
              borderRadius: 999,
              border: `1px solid ${badgeBorder}`,
              background: badgeBg,
              color: "var(--text)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {badgeText}
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--text)",
              overflowY: "auto",
              maxHeight: 260,
              paddingRight: 6,
            }}
          >
            {answer.lines.map((line, idx) => (
              <div key={idx} style={{ whiteSpace: "pre-wrap" }}>
                {line}
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          style={{ ...questionBtnStyle, justifyContent: "center" }}
          onClick={() => {
            setTopic("contact");
            setSubtopic(null);
          }}
        >
          <span aria-hidden style={iconMask("/svg_contact_the_host.svg", 18)} />
          <span>{t(lang, "Încă ai întrebări? Contactează gazda", "Still have questions? Contact the host")}</span>
        </button>
        <button
          type="button"
          style={softBtnStyle}
          onClick={() => {
            setSubtopic(null);
            setTopic(null);
          }}
        >
          {t(lang, "Înapoi", "Back")}
        </button>
      </div>
    );
  };

  const renderContent = () => {
    if (!topic) {
      return (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            {t(
              lang,
              "Alege un subiect. Demo-ul folosește răspunsuri statice RO/EN.",
              "Pick a topic. This demo uses static EN/RO answers.",
            )}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {topicButtons.map((it) => (
              <button
                key={it.id}
                type="button"
                style={questionBtnStyle}
                onClick={() => {
                  setTopic(it.id);
                  setSubtopic(null);
                }}
              >
                <span aria-hidden style={iconMask(it.icon, 18)} />
                <span style={{ minWidth: 0 }}>
                  {t(lang, it.label.ro, it.label.en)}
                </span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (topic === "arrival" && !subtopic) {
      return (
        <div style={{ display: "grid", gap: 6 }}>
          {arrivalButtons.map((it) => (
            <button
              key={it.id}
              type="button"
              style={questionBtnStyle}
              onClick={() => setSubtopic(it.id)}
            >
              <span aria-hidden style={iconMask(it.icon, 18)} />
              <span>{t(lang, it.label.ro, it.label.en)}</span>
            </button>
          ))}
          <button type="button" style={softBtnStyle} onClick={() => setTopic(null)}>
            {t(lang, "Înapoi", "Back")}
          </button>
        </div>
      );
    }

    if (topic === "amenities" && !subtopic) {
      return (
        <div style={{ display: "grid", gap: 6 }}>
          {amenitiesButtons.map((it) => (
            <button key={it.id} type="button" style={questionBtnStyle} onClick={() => setSubtopic(it.id)}>
              <span aria-hidden style={iconMask(it.icon, 18)} />
              <span>{t(lang, it.label.ro, it.label.en)}</span>
            </button>
          ))}
          <button type="button" style={softBtnStyle} onClick={() => setTopic(null)}>
            {t(lang, "Înapoi", "Back")}
          </button>
        </div>
      );
    }

    if (topic === "recommendations" && !subtopic) {
      return (
        <div style={{ display: "grid", gap: 6 }}>
          {recoButtons.map((it) => (
            <button key={it.id} type="button" style={questionBtnStyle} onClick={() => setSubtopic(it.id)}>
              <span aria-hidden style={iconMask(it.icon, 18)} />
              <span>{t(lang, it.label.ro, it.label.en)}</span>
            </button>
          ))}
          <button type="button" style={softBtnStyle} onClick={() => setTopic(null)}>
            {t(lang, "Înapoi", "Back")}
          </button>
        </div>
      );
    }

    if (topic === "contact") {
      return (
        <div style={{ display: "grid", gap: 8 }}>
          <div
            style={{
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              padding: 10,
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--text)",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              {t(lang, "Contactează gazda", "Contact the host")}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 10 }}>
              {t(
                lang,
                "Demo — date de contact statice pentru BOA aFrame.",
                "Demo — static contact details for BOA aFrame.",
              )}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <a
                href={`mailto:${DEMO_CONTACT.email}`}
                style={{
                  ...questionBtnStyle,
                  background: "rgba(15,23,42,0.04)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                }}
              >
                <span aria-hidden style={{ fontSize: 16 }}>✉</span>
                <span style={{ minWidth: 0 }}>{DEMO_CONTACT.email}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>
                  {t(lang, "Email", "Email")}
                </span>
              </a>

              <a
                href={`tel:${DEMO_CONTACT.phone.replace(/\s+/g, "")}`}
                style={{
                  ...questionBtnStyle,
                  background: "rgba(15,23,42,0.04)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                }}
              >
                <span aria-hidden style={{ fontSize: 16 }}>📞</span>
                <span style={{ minWidth: 0 }}>{DEMO_CONTACT.phone}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>
                  {t(lang, "Sună", "Call")}
                </span>
              </a>

              <a
                href={DEMO_CONTACT.maps}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...questionBtnStyle,
                  background: "rgba(15,23,42,0.04)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                }}
              >
                <span aria-hidden style={{ fontSize: 16 }}>📍</span>
                <span style={{ minWidth: 0 }}>{DEMO_CONTACT.address}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>
                  {t(lang, "Harta", "Map")}
                </span>
              </a>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <a
                  href={DEMO_CONTACT.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...questionBtnStyle,
                    justifyContent: "center",
                    background: "rgba(15,23,42,0.04)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    textDecoration: "none",
                  }}
                >
                  <span aria-hidden style={{ fontSize: 16 }}>f</span>
                  <span>Facebook</span>
                </a>
                <a
                  href={DEMO_CONTACT.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...questionBtnStyle,
                    justifyContent: "center",
                    background: "rgba(15,23,42,0.04)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    textDecoration: "none",
                  }}
                >
                  <span aria-hidden style={{ fontSize: 16 }}>⌁</span>
                  <span>Instagram</span>
                </a>
              </div>

              <a
                href={DEMO_CONTACT.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...questionBtnStyle,
                  justifyContent: "center",
                  background: "rgba(15,23,42,0.04)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                }}
              >
                <span aria-hidden style={{ fontSize: 16 }}>🌐</span>
                <span>{DEMO_CONTACT.website.replace(/^https?:\/\//, "")}</span>
              </a>
            </div>
          </div>
          <button type="button" style={softBtnStyle} onClick={() => setTopic(null)}>
            {t(lang, "Înapoi", "Back")}
          </button>
        </div>
      );
    }

    if (subtopic) {
      return renderAnswer();
    }

    return (
      <div style={{ display: "grid", gap: 8 }}>
        <button type="button" style={softBtnStyle} onClick={() => setTopic(null)}>
          {t(lang, "Înapoi", "Back")}
        </button>
      </div>
    );
  };

  return (
    <>
      {open && (
        <div style={panelStyle} aria-label="Guest assistant demo">
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
              <div style={{ fontSize: 13, fontWeight: 800 }}>
                {t(lang, "Guest AI assistant (Demo)", "Guest AI assistant (Demo)")}
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
              <span style={{ opacity: 0.9 }}>{t(lang, "Selectează limba", "Select language")}</span>
              <span style={{ opacity: 0.75 }}>{t(lang, "Demo: doar RO/EN", "Demo: RO/EN only")}</span>
            </div>
            <button
              type="button"
              ref={triggerRef}
              style={langTriggerStyle}
              onClick={openLangMenu}
              aria-haspopup="listbox"
              aria-expanded={showLangMenu}
            >
              <span aria-hidden style={{ fontSize: 15 }}>
                {lang === "ro" ? "🇷🇴" : "🇬🇧"}
              </span>
              <span>{lang === "ro" ? "Română" : "English"}</span>
              <span aria-hidden style={{ fontSize: 10, opacity: 0.8 }}>
                ▾
              </span>
            </button>

            {showLangMenu && (
              <div
                style={{
                  ...dropdownStyle,
                  maxHeight,
                  ...(placement === "up"
                    ? { bottom: "calc(100% + 6px)", top: "auto" }
                    : { top: "calc(100% + 6px)", bottom: "auto" }),
                }}
                role="listbox"
              >
                <button
                  type="button"
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    padding: "8px 10px",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    onLangChange("en");
                    setShowLangMenu(false);
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span aria-hidden style={{ fontSize: 16 }}>🇬🇧</span>
                    <span>English</span>
                  </span>
                  {lang === "en" && <span style={{ color: "var(--primary)", fontWeight: 700 }}>✓</span>}
                </button>
                <button
                  type="button"
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    padding: "8px 10px",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    onLangChange("ro");
                    setShowLangMenu(false);
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span aria-hidden style={{ fontSize: 16 }}>🇷🇴</span>
                    <span>Română</span>
                  </span>
                  {lang === "ro" && <span style={{ color: "var(--primary)", fontWeight: 700 }}>✓</span>}
                </button>
              </div>
            )}
          </div>

          <div style={contentStyle}>{renderContent()}</div>
        </div>
      )}

      <button type="button" onClick={() => setOpen((v) => !v)} style={fabStyle} aria-label="Open guest assistant">
        <span aria-hidden style={iconMask("/svg_guest_assistant.svg", 32)} />
      </button>
    </>
  );
}

export default function DemoClient() {
  const [lang, setLang] = useState<Lang>("en");
  const searchParams = useSearchParams();

  useEffect(() => {
    const initial = (searchParams?.get("lang") || "").toLowerCase();
    if (initial === "ro" || initial === "en") setLang(initial);
  }, [searchParams]);

  return (
    <main style={{ padding: 16, minHeight: "100dvh", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ width: "min(980px, calc(100vw - 32px))", margin: "0 auto", display: "grid", gap: 16 }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <h1 style={{ margin: 0, fontSize: 22, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Guest AI assistant — Public demo
            </h1>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              {t(
                lang,
                "Pagina este publică și folosește răspunsuri statice (fără AI).",
                "This page is public and uses static answers (no AI).",
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setLang("en")}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: lang === "en" ? "var(--card)" : "transparent",
                color: "var(--text)",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("ro")}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: lang === "ro" ? "var(--card)" : "transparent",
                color: "var(--text)",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              RO
            </button>
            <Link
              href="/"
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text)",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              {t(lang, "Înapoi la landing", "Back to landing")}
            </Link>
          </div>
        </header>

        <DemoMessages lang={lang} />
        <DemoAssistant lang={lang} onLangChange={setLang} />
      </div>
    </main>
  );
}
