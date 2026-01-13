// app/checkin/ui/CheckinClient.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState, useImperativeHandle } from "react";
import Image from "next/image";
import QrWithLogo from "@/components/QrWithLogo";
import { DIAL_OPTIONS } from "@/lib/phone/dialOptions";

type PropertyInfo = {
  id: string;
  name: string;
  regulation_pdf_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  presentation_image_url?: string | null;
  contact_overlay_position?: 'top' | 'center' | 'down' | null;
  social_facebook?: string | null;
  social_instagram?: string | null;
  social_tiktok?: string | null;
  social_website?: string | null;
  social_location?: string | null;
};

type RoomType = { id: string; name: string };
type Room     = { id: string; name: string; room_type_id?: string | null };
type SubmitState = "idle" | "submitting" | "success" | "error";

type Country = { iso2: string; name: string; nationality_en?: string | null };

type CompanionDocType = "id_card" | "passport" | "";
type Companion = {
  firstName: string;
  lastName: string;
  birthDate: string;
  citizenship: string;
  residenceCountry: string;
  isMinor: boolean;
  guardianName: string;
  docType: CompanionDocType;
  docSeries: string;
  docNumber: string;
  docNationality: string;
};

// Small helper to render emoji flags from ISO country code
function flagEmoji(cc: string | null | undefined): string {
  if (!cc) return "";
  const up = cc.toUpperCase();
  if (up.length !== 2) return "";
  const A = 0x1f1e6;
  const code1 = up.charCodeAt(0) - 65 + A;
  const code2 = up.charCodeAt(1) - 65 + A;
  return String.fromCodePoint(code1, code2);
}

function getQueryParam(k: string): string | null {
  if (typeof window === "undefined") return null;
  const u = new URL(window.location.href);
  return u.searchParams.get(k);
}

function todayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function addDaysYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate() + 0).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** ---------- Reusable Combobox (decoupled from parent) ---------- */
type ComboboxHandle = {
  getText: () => string;
  commit: () => void;
};
type ComboboxProps = {
  value: string;                    // committed value from parent
  onCommit: (v: string) => void;    // called on blur, Enter or option select
  options: string[];
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  minChars?: number;                // min chars to start listing options (typing is always free)
  inputStyle?: React.CSSProperties;
};

const Combobox = React.forwardRef<ComboboxHandle, ComboboxProps>(function Combobox(
  { value, onCommit, options, placeholder, ariaLabel, id, minChars = 0, inputStyle },
  ref
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [hi, setHi] = useState<number>(-1);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Precompute a lowercase view for fast includes()
  const lowerOptions = useMemo(() => options.map(o => [o, o.toLowerCase()] as const), [options]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < minChars) return [];
    const out: string[] = [];
    for (let i = 0; i < lowerOptions.length; i++) {
      const [orig, low] = lowerOptions[i];
      if (low.includes(q)) out.push(orig);
      if (out.length >= 50) break; // safety cap
    }
    return out;
  }, [query, minChars, lowerOptions]);

  // Sync external value only when not actively typing here
  useEffect(() => {
    if (!focused) setQuery(value || "");
  }, [value, focused]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // (moved) canvas init on agree is handled in CheckinClient component

  function select(v: string) {
    setQuery(v);
    onCommit(v.trim());
    setOpen(false);
  }

  React.useImperativeHandle(ref, () => ({
    getText: () => query,
    commit: () => onCommit(query.trim()),
  }));

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        id={id}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={open}
        aria-controls={id ? id + "-listbox" : undefined}
        aria-autocomplete="list"
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => { setFocused(false); setOpen(false); onCommit(query.trim()); }}
        onChange={(e) => {
          const v = e.currentTarget.value;
          setQuery(v);            // local only → no parent re-render per key
          if (!open) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setOpen(true); return; }
          if (e.key === "ArrowDown") { setHi((i) => Math.min(i + 1, list.length - 1)); e.preventDefault(); }
          else if (e.key === "ArrowUp") { setHi((i) => Math.max(i - 1, 0)); e.preventDefault(); }
          else if (e.key === "Enter") {
            if (open && hi >= 0 && hi < list.length) { select(list[hi]); e.preventDefault(); }
            else { onCommit(query.trim()); setOpen(false); }
          }
          else if (e.key === "Escape") { setOpen(false); }
        }}
        style={inputStyle}
      />
      {open && (
        <ul
          role="listbox"
          id={id ? id + "-listbox" : undefined}
          
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            marginTop: 6,
            maxHeight: 220,
            overflow: "auto",
            padding: 6,
            listStyle: "none",
            display: list.length > 0 ? "block" : "none",
          }}
        >
          {list.map((opt, idx) => (
            <li
              key={opt + idx}
              role="option"
              aria-selected={idx === hi}
              onMouseEnter={() => setHi(idx)}
              onMouseDown={(e) => { e.preventDefault(); select(opt); }}
              
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                cursor: "pointer",
                background: idx === hi ? "var(--primary)" : "transparent",
                color: idx === hi ? "#0c111b" : "var(--text)",
                fontWeight: 700,
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default function CheckinClient() {
  // strict pe ?property=<id>
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [bookingId, setBookingId]   = useState<string | null>(null); // opțional
  const [providerHint, setProviderHint] = useState<string | null>(null);

  // catalog încărcat prin endpoint public (bypass RLS)
  const [prop, setProp]   = useState<PropertyInfo | null>(null);
  const [types, setTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Always start with the property intro (no fast path).
  const [stage, setStage] = useState<"intro" | "form">("intro");
  const formTopRef = useRef<HTMLDivElement | null>(null);

  // selections (deprecated UI; kept for compatibility, not used)
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  // form fields
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");

  // One-time info popup before uploading ID photo
  const [showIdUploadInfo, setShowIdUploadInfo] = useState<boolean>(false);
  const [pendingOpenAfterInfo, setPendingOpenAfterInfo] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // WhatsApp mini chat (public check-in)
  const [waOpen, setWaOpen] = useState(false);
  const [waText, setWaText] = useState("");
  const waInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Language toggle (EN/RO)
  type Lang = 'en' | 'ro';
  function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  const [lang, setLang] = useState<Lang>(() => {
    const qp = (typeof window !== 'undefined') ? new URL(window.location.href).searchParams.get('lang') : null;
    const fromQ = qp && /^(ro|en)$/i.test(qp) ? (qp.toLowerCase() as Lang) : null;
    if (fromQ) return fromQ;
    const ck = readCookie('site_lang');
    if (ck && /^(ro|en)$/i.test(ck)) return ck.toLowerCase() as Lang;
    if (typeof navigator !== 'undefined' && /^ro\b/i.test(navigator.language || '')) return 'ro';
    return 'en';
  });
  useEffect(() => {
    try { document.cookie = `site_lang=${lang}; path=/; max-age=${60*60*24*365}`; } catch {}
    try { document.documentElement.setAttribute('lang', lang); } catch {}
  }, [lang]);

  const TXT = useMemo(() => ({
    en: {
      checkinTitle: 'Check-in',
      intro1: 'Thank you for choosing us!',
      intro2: 'Please fill in the fields below with the requested information.',
      intro3: (propName: string) => `Once you complete the online check-in, you will automatically receive an email confirming your check-in for ${propName}.`,
      intro4: 'The email will also include a QR code you can present at reception, or use as proof that you have completed this form.',
      intro5: 'Please note that all information you provide is strictly confidential.',
      intro6: 'Thank you for your patience!',
      preBody: 'Next, please complete the accommodation form so we can prepare everything in advance and make your stay as smooth as possible.',
      preCta: 'Complete the form',
      preMapTitle: 'Location',
      preContactTitle: 'Contact',
      loading: 'Loading…',
      thanksTitle: 'Thank you! ✅',
      thanksMsg: 'Your check-in details were submitted successfully.',
      checkinDate: 'Check-in date*',
      checkoutDate: 'Check-out date*',
      firstName: 'First name*',
      lastName: 'Last name*',
      email: 'Email*',
      phone: 'Phone*',
      address: 'Address',
      city: 'City',
      country: 'Country*',
      ariaCountry: 'Country',
      selectDocType: 'Select document type…',
      nationality: 'Nationality (citizenship)*',
      ariaNationality: 'Nationality',
      uploadId: 'Upload ID document (photo/PDF)*',
      waPill: 'Message us on WhatsApp',
      waHello: 'Hi! How can we help you?',
      waPlaceholder: 'Type a message…',
      waSend: 'Send',
      docTypeLabel: 'Document type*',
      docOptionId: 'Identity card',
      docOptionPassport: 'Passport',
      docSeriesLabel: 'Series*',
      docNumberLabel: 'Number*',
      selected: 'Selected:',
      consentPrefix: 'I have read and agree to the ',
      houseRules: 'House Rules',
      openPdfHint: '(Please open the PDF to enable the checkbox)',
      signaturePrompt: 'Please draw your signature below (mouse or touch). By signing, you confirm that the information provided is accurate and that you have read the Privacy Policy / GDPR information and the property\'s House Rules.',
      submitSubmitting: 'Submitting…',
      submit: 'Submit check-in',
      confirmEmailTitle: 'Confirmation Email',
      confirmEmailWait: 'Please wait while we send your confirmation email.',
      privacyTitle: 'Privacy & GDPR information',
      privacyPrompt: 'Please review our Privacy Policy and GDPR information. After reading it, confirm below to continue.',
      privacyAcknowledge: 'I have read and understood the Privacy Policy / GDPR information.',
      privacyConfirm: 'Confirm & Continue',
      missingIdError: 'Please upload your ID document.',
      submitFailed: 'Submission failed. Please try again.',
      unexpectedError: 'Unexpected error. Please try again.',
      langEN: 'EN',
      langRO: 'RO',
      totalGuestsLabel: 'Total guests',
      totalGuestsHint: (first: string, last: string) => `Please select the total number of guests, including ${first} ${last}.`,
      editCompanions: 'Edit companions',
      companionTitle: (current: number, total: number) => `Guest ${current} of ${total}`,
      birthDate: 'Birth date',
      residenceCountry: 'Country of residence',
      isMinor: 'Guest is a minor',
      guardianLabel: 'Parent/guardian name',
      next: 'Next',
      back: 'Back',
      saveAndClose: 'Save & close',
      companionMissing: 'Please fill in all required fields for this guest.',
    },
    ro: {
      checkinTitle: 'Check‑in',
      intro1: 'Îți mulțumim că ne-ai ales!',
      intro2: 'Te rugăm să completezi câmpurile de mai jos cu informațiile solicitate.',
      intro3: (propName: string) => `După ce finalizezi check‑in‑ul online, vei primi automat un email de confirmare pentru ${propName}.`,
      intro4: 'Emailul va include și un cod QR pe care îl poți prezenta la recepție sau îl poți folosi drept dovadă că ai completat acest formular.',
      intro5: 'Toate informațiile furnizate sunt strict confidențiale.',
      intro6: 'Îți mulțumim pentru răbdare!',
      preBody: 'În cele ce urmează, te rugăm să completezi fișa de cazare, ca să pregătim din timp totul pentru ca șederea ta să fie cât mai plăcută.',
      preCta: 'Completează formularul',
      preMapTitle: 'Locație',
      preContactTitle: 'Contact',
      loading: 'Se încarcă…',
      thanksTitle: 'Mulțumim! ✅',
      thanksMsg: 'Detaliile tale de check‑in au fost trimise cu succes.',
      checkinDate: 'Data check‑in*',
      checkoutDate: 'Data check‑out*',
      firstName: 'Prenume*',
      lastName: 'Nume*',
      email: 'Email*',
      phone: 'Telefon*',
      address: 'Adresă',
      city: 'Oraș',
      country: 'Țară*',
      ariaCountry: 'Țară',
      selectDocType: 'Selectează tipul documentului…',
      nationality: 'Naționalitate (cetățenie)*',
      ariaNationality: 'Naționalitate',
      uploadId: 'Încarcă actul de identitate (poză/PDF)*',
      waPill: 'Scrie-ne pe WhatsApp',
      waHello: 'Bună! Cu ce te putem ajuta?',
      waPlaceholder: 'Scrie un mesaj…',
      waSend: 'Trimite',
      docTypeLabel: 'Tip document*',
      docOptionId: 'Buletin',
      docOptionPassport: 'Pașaport',
      docSeriesLabel: 'Serie*',
      docNumberLabel: 'Număr*',
      selected: 'Selectat:',
      consentPrefix: 'Am citit și sunt de acord cu ',
      houseRules: 'Regulamentul de ordine interioară',
      openPdfHint: '(Te rugăm să deschizi PDF‑ul pentru a activa această bifă)',
      signaturePrompt: 'Te rugăm să desenezi semnătura mai jos (mouse sau touch). Prin semnătură confirmi că datele completate sunt corecte și că ai luat la cunoștință Politica de confidențialitate / GDPR și regulile proprietății (House Rules).',
      submitSubmitting: 'Se trimite…',
      submit: 'Trimite check‑in',
      confirmEmailTitle: 'Email de confirmare',
      confirmEmailWait: 'Te rugăm să aștepți cât timp trimitem emailul de confirmare.',
      privacyTitle: 'Politica de confidențialitate & GDPR',
      privacyPrompt: 'Te rugăm să consulți Politica de confidențialitate și informațiile GDPR. După ce le-ai citit, confirmă mai jos pentru a continua.',
      privacyAcknowledge: 'Am citit și am înțeles Politica de confidențialitate / informațiile GDPR.',
      privacyConfirm: 'Confirmă și continuă',
      missingIdError: 'Te rugăm să încarci actul de identitate.',
      submitFailed: 'Trimiterea a eșuat. Încearcă din nou.',
      unexpectedError: 'Eroare neașteptată. Încearcă din nou.',
      langEN: 'EN',
      langRO: 'RO',
      totalGuestsLabel: 'Număr total de oaspeți',
      totalGuestsHint: (first: string, last: string) => `Te rugăm să selectezi numărul total de oaspeți, incluzând ${first} ${last}.`,
      editCompanions: 'Editează însoțitorii',
      companionTitle: (current: number, total: number) => `Oaspete ${current} din ${total}`,
      birthDate: 'Data nașterii',
      residenceCountry: 'Țara de rezidență',
      isMinor: 'Oaspetele este minor',
      guardianLabel: 'Nume părinte/tutore',
      next: 'Următorul',
      back: 'Înapoi',
      saveAndClose: 'Salvează și închide',
      companionMissing: 'Te rugăm să completezi toate câmpurile obligatorii pentru acest oaspete.',
    }
  }), []);
  const T = (key: keyof typeof TXT['en']) => (TXT as any)[lang][key];
  const Intro3 = ({ name }: { name: string }) => (
    lang === 'en' ? (
      <>
        Once you complete the online check-in, you will automatically receive an email confirming your check-in for{' '}
        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{name}</span>.
      </>
    ) : (
      <>
        După ce finalizezi check‑in‑ul online, vei primi automat un email de confirmare pentru{' '}
        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{name}</span>.
      </>
    )
  );
  const [phoneDial, setPhoneDial] = useState<string>("+40");
  const [dialOpen,  setDialOpen]  = useState<boolean>(false);
  const dialWrapRef = useRef<HTMLDivElement | null>(null);
  const [address,   setAddress]   = useState("");
  const [city,      setCity]      = useState("");

  // Country & Nationality
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryText, setCountryText] = useState<string>("");           // committed
  const [docNationality, setDocNationality] = useState<string>("");     // committed

  // Refs to read the current draft (non-committed) text without re-render
  const countryRef = useRef<ComboboxHandle | null>(null);
  const nationalityRef = useRef<ComboboxHandle | null>(null);

  // click-away to close dial dropdown
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!dialWrapRef.current) return;
      if (t && dialWrapRef.current.contains(t)) return;
      setDialOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Read provider/source hint from URL (?source=...)
  useEffect(() => {
    try {
      const src = getQueryParam('source');
      setProviderHint(src ? src.toString() : null);
    } catch {}
  }, []);

  const waPhoneDigits = useMemo(() => {
    const raw = (prop?.contact_phone || "").trim();
    if (!raw) return null;
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.length < 8) return null;
    return digits;
  }, [prop?.contact_phone]);

  useEffect(() => {
    if (!waOpen) return;
    try {
      requestAnimationFrame(() => waInputRef.current?.focus());
    } catch {}
  }, [waOpen]);

  // Document section
  type DocType = "" | "id_card" | "passport";
  const [docType, setDocType] = useState<DocType>("");
  const [docSeries, setDocSeries] = useState<string>("");   // doar CI (uppercase)
  const [docNumber, setDocNumber] = useState<string>("");   // comun

  // Upload file (foto/PDF) — obligatoriu
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docFilePreview, setDocFilePreview] = useState<string | null>(null);

  // Signature pad
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sigCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sigScaleRef = useRef<number>(1);
  const sigDrawingRef = useRef<boolean>(false);
  const [sigDirty, setSigDirty] = useState<boolean>(false);

  // Initialize/rescale signature canvas for crisp drawing
  useEffect(() => {
    function initCanvas() {
      const el = sigCanvasRef.current;
      if (!el) return;
      // snapshot current content before resizing (to avoid clearing on viewport/keyboard changes)
      let snapshot: HTMLCanvasElement | null = null;
      if (el.width > 0 && el.height > 0) {
        snapshot = document.createElement('canvas');
        snapshot.width = el.width;
        snapshot.height = el.height;
        const sctx = snapshot.getContext('2d');
        if (sctx) sctx.drawImage(el, 0, 0);
      }

      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      const rect = el.getBoundingClientRect();
      el.width = Math.max(1, Math.floor(rect.width * dpr));
      el.height = Math.max(1, Math.floor(rect.height * dpr));
      sigScaleRef.current = dpr;
      const ctx = el.getContext('2d');
      if (!ctx) return;
      sigCtxRef.current = ctx;
      // white background for better readability when exported
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, el.width, el.height);
      // restore previous drawing scaled to new size
      if (snapshot) {
        try { ctx.drawImage(snapshot, 0, 0, snapshot.width, snapshot.height, 0, 0, el.width, el.height); } catch {}
      }
      ctx.lineWidth = 2 * dpr;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#111827';
    }
    initCanvas();
    const onResize = () => initCanvas();
    window.addEventListener('resize', onResize);
    // Observe element size changes (not only window resize)
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => initCanvas());
      const el = sigCanvasRef.current; if (el) ro.observe(el);
    } catch {}
    return () => {
      window.removeEventListener('resize', onResize);
      try { ro?.disconnect(); } catch {}
    };
  }, []);

  function sigPointFromClient(el: HTMLCanvasElement, clientX: number, clientY: number) {
    const rect = el.getBoundingClientRect();
    const s = sigScaleRef.current || 1;
    return { x: (clientX - rect.left) * s, y: (clientY - rect.top) * s };
  }
  function sigPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    return sigPointFromClient(e.currentTarget, e.clientX, e.clientY);
  }
  function onSigDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    try { (e.currentTarget as any).setPointerCapture?.(e.pointerId); } catch {}
    const ctx = sigCtxRef.current; if (!ctx) return;
    const p = sigPoint(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    // draw a tiny dot so a simple click counts as a signature
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
    sigDrawingRef.current = true;
    setSigDirty(true);
  }
  function onSigMove(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!sigDrawingRef.current) return;
    const ctx = sigCtxRef.current; if (!ctx) return;
    const p = sigPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setSigDirty(true);
  }
  function onSigUp(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    sigDrawingRef.current = false;
  }

  // Fallback handlers for browsers without Pointer Events
  function onSigMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const el = e.currentTarget; const ctx = sigCtxRef.current; if (!ctx) return;
    const p = sigPointFromClient(el, e.clientX, e.clientY);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
    sigDrawingRef.current = true; setSigDirty(true);
  }
  function onSigMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!sigDrawingRef.current) return; e.preventDefault();
    const el = e.currentTarget; const ctx = sigCtxRef.current; if (!ctx) return;
    const p = sigPointFromClient(el, e.clientX, e.clientY);
    ctx.lineTo(p.x, p.y); ctx.stroke(); setSigDirty(true);
  }
  function onSigMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault(); sigDrawingRef.current = false;
  }
  function onSigMouseLeave(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault(); sigDrawingRef.current = false;
  }
  function onSigTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    if (e.touches.length === 0) return; e.preventDefault();
    const el = e.currentTarget; const ctx = sigCtxRef.current; if (!ctx) return;
    const t = e.touches[0];
    const p = sigPointFromClient(el, t.clientX, t.clientY);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.1, p.y + 0.1); ctx.stroke();
    sigDrawingRef.current = true; setSigDirty(true);
  }
  function onSigTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    if (!sigDrawingRef.current) return; if (e.touches.length === 0) return; e.preventDefault();
    const el = e.currentTarget; const ctx = sigCtxRef.current; if (!ctx) return;
    const t = e.touches[0];
    const p = sigPointFromClient(el, t.clientX, t.clientY);
    ctx.lineTo(p.x, p.y); ctx.stroke(); setSigDirty(true);
  }
  function onSigTouchEnd(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault(); sigDrawingRef.current = false;
  }
  function clearSignature() {
    const el = sigCanvasRef.current; const ctx = sigCtxRef.current; if (!el || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, el.width, el.height);
    ctx.fillStyle = '#111827';
    ctx.lineWidth = 2 * (sigScaleRef.current || 1);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    setSigDirty(false);
  }

  // dates
  const [startDate, setStartDate] = useState<string>(() => todayYMD());
  const [endDate,   setEndDate]   = useState<string>(() => addDaysYMD(todayYMD(), 1));
  const [dateError, setDateError] = useState<string>("");

  // house rules gate
  const [pdfViewed, setPdfViewed] = useState(false);
  const [agree, setAgree] = useState(false);

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Privacy Policy acknowledgement gate
  const [privacyAck, setPrivacyAck] = useState<boolean>(() => {
    try {
      const pid = getQueryParam('property');
      if (!pid) return false;
      return localStorage.getItem(`p4h:checkin:privacyAck:${pid}`) === '1';
    } catch { return false; }
  });
  const [privacyOpen, setPrivacyOpen] = useState<boolean>(false);
  const [privacyVisited, setPrivacyVisited] = useState<boolean>(false);
  const [privacyConfirm, setPrivacyConfirm] = useState<boolean>(false);
  const [privacySaving, setPrivacySaving] = useState<boolean>(false);

  // Companions (additional guests)
  const [guestCount, setGuestCount] = useState<number>(1);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [companionsOpen, setCompanionsOpen] = useState<boolean>(false);
  const [companionsIndex, setCompanionsIndex] = useState<number>(0);
  const [companionsError, setCompanionsError] = useState<string>("");

  // Confirmation email modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<"idle"|"sending"|"sent"|"error">("idle");
  const [confirmError, setConfirmError] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string>("");
  const confirmCardRef = useRef<HTMLDivElement | null>(null);

  // Ensure the confirmation modal is visible and focused when opened
  useEffect(() => {
    if (confirmOpen) {
      try { window.scrollTo({ top: 0, left: 0, behavior: 'smooth' }); } catch {}
      try { confirmCardRef.current?.focus(); } catch {}
    }
  }, [confirmOpen]);

  // responsive helper: 1 col sub 560px
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 560px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsNarrow("matches" in e ? e.matches : (e as MediaQueryList).matches);
    handler(mq);
    mq.addEventListener?.("change", handler as any);
    mq.addListener?.(handler as any); // fallback safari vechi
    return () => {
      mq.removeEventListener?.("change", handler as any);
      mq.removeListener?.(handler as any);
    };
  }, []);

  // revoke preview URLs
  useEffect(() => {
    return () => { if (docFilePreview) URL.revokeObjectURL(docFilePreview); };
  }, [docFilePreview]);

  // Force dark theme on this page, restore previous on unmount
  useEffect(() => {
    try {
      const root = document.documentElement;
      const prev = root.getAttribute('data-theme');
      root.setAttribute('data-theme', 'dark');
      return () => { if (prev) root.setAttribute('data-theme', prev); else root.removeAttribute('data-theme'); };
    } catch { /* ignore */ }
  }, []);

  // Scroll to top on mount/refresh and disable scroll restoration
  useEffect(() => {
    try {
      if ('scrollRestoration' in history) (history as any).scrollRestoration = 'manual';
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch { /* ignore */ }
  }, []);

  // ---------- THEME & ICONS ----------
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark") return true;
    if (attr === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });
  // Small screen / mobile detection for layout tweaks
  const [isSmall, setIsSmall] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(max-width: 560px), (pointer: coarse)')?.matches ?? false;
  });
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    try { m?.addEventListener("change", onChange); } catch { m?.addListener?.(onChange); }
    return () => {
      try { m?.removeEventListener("change", onChange); } catch { m?.removeListener?.(onChange); }
    };
  }, []);
  useEffect(() => {
    const mq = window.matchMedia?.('(max-width: 560px), (pointer: coarse)');
    const on = (e: MediaQueryListEvent) => setIsSmall(e.matches);
    try { mq?.addEventListener('change', on); } catch { mq?.addListener?.(on); }
    return () => { try { mq?.removeEventListener('change', on); } catch { mq?.removeListener?.(on); } };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const ob = new MutationObserver(() => {
      const t = root.getAttribute("data-theme");
      if (t === "dark") setIsDark(true);
      if (t === "light") setIsDark(false);
    });
    ob.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => ob.disconnect();
  }, []);

  // formular_* icons — use light variant (check-in page is styled as light)
  const formIcon = (key: "email"|"phone"|"address"|"city"|"country"|"id"|"firstname"|"lastname") => {
    const token = {
      email: "email",
      phone: "phone",
      address: "address",
      city: "city",
      country: "country",
      id: "id",
      firstname: "firstname",
      lastname: "lastname",
    }[key];
    return `/formular_${token}_forlight.png`;
  };

  // generic icons — use light variant in check-in
  const themedIcon = (base: "room") => `/${base}_forlight.png`;


  
  // ---------- STYLES ----------
  const CARD: React.CSSProperties = useMemo(() => ({
    background: "color-mix(in srgb, var(--panel) 92%, transparent)",
    border: "1px solid var(--border)",
    borderRadius: isSmall ? 14 : 16,
    padding: isSmall ? 14 : 16,
    boxShadow: "0 14px 36px rgba(15,23,42,0.10)",
    overflow: "hidden",
  }), [isSmall]);

  const OUTER_WRAP: React.CSSProperties = useMemo(
    () => ({
      maxWidth: 860,
      margin: isSmall ? "12px auto" : "24px auto",
      padding: isSmall ? 10 : 12,
      display: "grid",
      gap: isSmall ? 12 : 16,
      fontFamily:
        "Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    }),
    [isSmall],
  );
  const INPUT: React.CSSProperties = useMemo(() => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    fontFamily: 'inherit',
    borderRadius: 10,
    fontSize: 14,
  }), []);
  const INPUT_DATE: React.CSSProperties = useMemo(() => ({
    ...INPUT,
    // Desktop: full width like First/Last Name (no maxWidth)
    // Mobile/narrow: keep a reasonable cap for layout
    ...(isNarrow ? { maxWidth: 260 } : {}),
  }), [INPUT, isNarrow]);
  const SELECT: React.CSSProperties = INPUT;
  const LABEL: React.CSSProperties = useMemo(() => ({
    fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 6, display: "block",
  }), []);
  const LABEL_ROW: React.CSSProperties = useMemo(() => ({
    ...LABEL,
    display: "flex",
    alignItems: "center",
    gap: 6,
  }), [LABEL]);
  const BTN_PRIMARY: React.CSSProperties = useMemo(() => ({
    padding: "12px 16px", borderRadius: 12, border: "1px solid var(--primary)",
    background: "var(--primary)", color: "#0c111b", fontWeight: 900, cursor: "pointer",
  }), []);
  const BTN_GHOST: React.CSSProperties = useMemo(() => ({
    padding: "10px 14px", borderRadius: 12, border: "1px solid var(--border)",
    background: "transparent", color: "var(--text)", fontWeight: 800, cursor: "pointer",
  }), []);
  const ROW_2: React.CSSProperties = useMemo(() => ({
    display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  }), []);
  const ROW_1: React.CSSProperties = useMemo(() => ({
    display: "grid", gap: 12, gridTemplateColumns: "1fr",
  }), []);


  // 1) URL params
  useEffect(() => {
    const pid = getQueryParam("property");
    setPropertyId(pid);
    setBookingId(getQueryParam("booking"));
    if (pid) setStage("intro");
  }, []);

  // 2) catalog public
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setProp(null);
      setTypes([]); setRooms([]);
      setPdfUrl(null);
      setSelectedTypeId(""); setSelectedRoomId("");
      setAgree(false); setPdfViewed(false);

      if (!propertyId) { setLoading(false); return; }

      try {
        const res = await fetch(`/api/public/property-catalog?property=${encodeURIComponent(propertyId)}`, { cache: "no-store" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Failed to load property catalog (${res.status})`);
        }
        const j = await res.json();
        if (!alive) return;

        const p = j.property as PropertyInfo;
        const t = (j.room_types ?? []) as Array<{id:string; name:string}>;
        const r = (j.rooms ?? []) as Array<{id:string; name:string; room_type_id?: string|null}>;

        setProp(p);
        setPdfUrl(p?.regulation_pdf_url ?? null);
        setTypes(t.map(x => ({ id: String(x.id), name: String(x.name ?? "Type") })));
        setRooms(r.map(x => ({ id: String(x.id), name: String(x.name ?? "Room"), room_type_id: x.room_type_id ?? null })));
      } catch (e: any) {
        setErrorMsg(e?.message || "Failed to load property data.");
        setSubmitState("error");
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [propertyId]);

  // 2.1) țări + naționalități
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/public/countries", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (!alive) return;
        const arr: Country[] = Array.isArray(j?.countries) ? j.countries : [];
        arr.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
        setCountries(arr);
      } catch { /* fallback text */ }
    })();
    return () => { alive = false; };
  }, []);

  // 3) validare date
  useEffect(() => {
    if (!startDate || !endDate) { setDateError(""); return; }
    setDateError(endDate <= startDate ? "Check-out must be after check-in." : "");
  }, [startDate, endDate]);

  // Intercept first interaction to show Privacy Policy modal
  function onFirstInteract(e: React.PointerEvent<HTMLFormElement>) {
    if (!privacyAck) {
      e.preventDefault();
      e.stopPropagation();
      setPrivacyOpen(true);
    }
  }

  async function acceptPrivacyAck() {
    try {
      if (!propertyId) { setPrivacyOpen(false); return; }
      setPrivacySaving(true);
      // Version label can be the visible last updated date or a semantic version
      const text_version = 'PrivacyPolicy-ack';
      await fetch('/api/checkin/consent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: propertyId, purpose: 'privacy_ack', text_version })
      });
      try { localStorage.setItem(`p4h:checkin:privacyAck:${propertyId}`, '1'); } catch {}
      setPrivacyAck(true);
      setPrivacyOpen(false);
    } finally {
      setPrivacySaving(false);
    }
  }

  const nationalityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of countries) {
      const n = (c.nationality_en ?? "").trim();
      if (n) set.add(n);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [countries]);

  const hasTypes = types.length > 0;

  const [mapEmbedUrl, setMapEmbedUrl] = useState<string | null>(null);
  const [mapOpenUrl, setMapOpenUrl] = useState<string | null>(null);
  const [mapBusy, setMapBusy] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;
    const loc = (prop?.social_location || "").trim();
    const fallbackQuery = (prop?.contact_address || prop?.name || "").trim();

    const extractLatLng = (url: string): { lat: string; lng: string } | null => {
      const at = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
      if (at) return { lat: at[1]!, lng: at[2]! };
      const pb = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
      if (pb) return { lat: pb[1]!, lng: pb[2]! };
      return null;
    };

    (async () => {
      setMapBusy(true);
      try {
        if (loc) {
          // Always embed based on social_location (pin link). Never derive from address when link exists.
          setMapOpenUrl(loc);

          // Already embeddable?
          if (/\/maps\/embed\b/i.test(loc) || /output=embed/i.test(loc)) {
            if (alive) setMapEmbedUrl(loc);
            return;
          }

          // Quick parse for direct google.com/maps links with coordinates.
          const coords = extractLatLng(loc);
          if (coords) {
            if (alive) setMapEmbedUrl(`https://www.google.com/maps?q=${encodeURIComponent(`${coords.lat},${coords.lng}`)}&output=embed`);
            return;
          }

          // Resolve short links / redirects on the server to avoid "custom content" iframe errors.
          const res = await fetch(`/api/public/map-embed?url=${encodeURIComponent(loc)}`, { cache: "no-store" });
          const j = await res.json().catch(() => ({} as any));
          if (!alive) return;
          if (res.ok) {
            setMapEmbedUrl((j?.embed_url as string | null) || null);
            setMapOpenUrl((j?.open_url as string | null) || loc);
          } else {
            setMapEmbedUrl(null);
            setMapOpenUrl(loc);
          }
          return;
        }

        // Fallback when no location link exists: embed based on address/name.
        if (fallbackQuery) {
          setMapEmbedUrl(`https://www.google.com/maps?q=${encodeURIComponent(fallbackQuery)}&output=embed`);
          setMapOpenUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQuery)}`);
        } else {
          setMapEmbedUrl(null);
          setMapOpenUrl(null);
        }
      } finally {
        if (alive) setMapBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [prop?.social_location, prop?.contact_address, prop?.name]);

  function maybeShowIdUploadInfo(e?: React.MouseEvent) {
    try {
      const k = 'p4h:checkin:idUploadInfoShown';
      const seen = typeof window !== 'undefined' ? (localStorage.getItem(k) === '1') : true;
      if (!seen) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        setShowIdUploadInfo(true);
        setPendingOpenAfterInfo(true);
        return true; // intercepted
      }
    } catch {}
    return false;
  }

  function onConfirmIdUploadInfo() {
    try { localStorage.setItem('p4h:checkin:idUploadInfoShown', '1'); } catch {}
    setShowIdUploadInfo(false);
    if (pendingOpenAfterInfo) {
      setPendingOpenAfterInfo(false);
      try { fileInputRef.current?.click(); } catch {}
    }
  }

  // trebuie să fie deschis PDF-ul dacă există
  const consentGatePassed = !pdfUrl || pdfViewed;

  // Folosim textul curent din input-uri chiar dacă nu e "commit"
  const currentCountry = (countryRef.current?.getText() ?? countryText).trim();
  const currentNationality = (nationalityRef.current?.getText() ?? docNationality).trim();

  const countryValid = currentCountry.length > 0;

  const docValid = (() => {
    if (docType === "") return false;
    if (docNumber.trim().length < 1) return false;
    if (docType === "id_card") return docSeries.trim().length > 0;
    if (docType === "passport") return currentNationality.length > 0;
    return false;
  })();

  function ContactOverlay({ prop }: { prop: PropertyInfo }) {
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
      position: 'absolute', left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 24px)', maxWidth: 380, background: 'rgba(23, 25, 37, 0.29)', color: '#fff',
      WebkitBackdropFilter: 'blur(5px) saturate(140%)', backdropFilter: 'blur(5px) saturate(140%)',
      border: '1px solid rgba(255,255,255,0.22)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      padding: '12px 14px', display: 'grid', gap: 6,
    };
    if (pos === 'top') Object.assign(base, { top: 14, transform: 'translateX(-50%)' });
    else if (pos === 'down') Object.assign(base, { bottom: 14, transform: 'translateX(-50%)' });
    else Object.assign(base, { top: '50%', transform: 'translate(-50%, -50%)' });
    return (
      <div style={base}>
        {prop.contact_email && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span aria-hidden style={overlayIcon("/svg_email_demo.svg")} />
            <a href={`mailto:${prop.contact_email}`} style={{ color: '#fff', textDecoration: 'none' }}>{prop.contact_email}</a>
          </div>
        )}
        {prop.contact_phone && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span aria-hidden style={overlayIcon("/svg_phone_demo.svg")} />
            <a href={`tel:${(prop.contact_phone || '').replace(/\s+/g,'')}`} style={{ color: '#fff', textDecoration: 'none' }}>{prop.contact_phone}</a>
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

  function SocialPills({ prop }: { prop: PropertyInfo }) {
    const links = [
      { key: "facebook", url: prop.social_facebook || null, icon: "/facebook_forlight.png", label: "Facebook" },
      { key: "instagram", url: prop.social_instagram || null, icon: "/instagram_forlight.png", label: "Instagram" },
      { key: "tiktok", url: prop.social_tiktok || null, icon: "/tiktok_forlight.png", label: "TikTok" },
      { key: "site", url: prop.social_website || null, icon: "/website_forlight.png", label: "Website" },
      { key: "location", url: prop.social_location || null, icon: "/social_location_forlight.png", label: "Location" },
    ].filter((l) => !!l.url);
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

  const normalizedPhone = `${phoneDial}${(phone || '').replace(/\D/g, '')}`;
  const expectedCompanions = Math.max(guestCount - 1, 0);
  function validateCompanion(c: Companion): boolean {
    if (!c.firstName.trim() || !c.lastName.trim() || !c.birthDate || !c.citizenship.trim() || !c.residenceCountry.trim()) {
      return false;
    }
    if (c.isMinor) {
      return !!c.guardianName.trim();
    }
    if (!c.docType || !c.docNumber.trim()) return false;
    if (c.docType === "id_card" && !c.docSeries.trim()) return false;
    return true;
  }
  const companionsValid =
    expectedCompanions === 0 ||
    (companions.length === expectedCompanions && companions.every(validateCompanion));

  const canSubmit =
    !!propertyId &&
    !!prop?.id &&
    firstName.trim().length >= 1 &&
    lastName.trim().length  >= 1 &&
    /\S+@\S+\.\S+/.test(email) &&
    normalizedPhone.replace(/\D/g,'').length >= 8 &&
    (!dateError && !!startDate && !!endDate) &&
    // No room/type selection required at check-in
    countryValid &&
    docValid &&
    !!docFile && // document upload obligatoriu
    sigDirty && // semnătura este obligatorie
    companionsValid &&
    consentGatePassed && agree &&
    submitState !== "submitting";

  // deschide PDF-ul (marchează vizualizat)
  function onOpenPdf() {
    if (!pdfUrl) return;
    try { setPdfViewed(true); } catch {}
  }

  // Initialize canvas when it becomes visible (after agreeing to House Rules)
  useEffect(() => {
    if (!agree) return;
    const t = window.setTimeout(() => {
      try {
        const el = sigCanvasRef.current; if (!el) return;
        const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
        const rect = el.getBoundingClientRect();
        el.width = Math.max(1, Math.floor(rect.width * dpr));
        el.height = Math.max(1, Math.floor(rect.height * dpr));
        sigScaleRef.current = dpr;
        const ctx = el.getContext('2d'); if (!ctx) return;
        sigCtxRef.current = ctx;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, el.width, el.height);
        ctx.lineWidth = 2 * dpr;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#111827';
      } catch {}
    }, 0);
    return () => { try { window.clearTimeout(t); } catch {} };
  }, [agree]);

  // upload helper
  async function uploadDocFile(): Promise<{ path: string; mime: string } | null> {
    if (!docFile || !propertyId) return null;
    const fd = new FormData();
    fd.append("file", docFile);
    fd.append("property", propertyId);
    if (bookingId) fd.append("booking", bookingId);
    const res = await fetch("/api/checkin/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || "Upload failed");
    }
    const j = await res.json();
    return { path: j?.path as string, mime: docFile.type || "application/octet-stream" };
  }

  async function uploadSignature(): Promise<{ path: string; mime: string } | null> {
    if (!sigDirty || !propertyId) return null;
    const el = sigCanvasRef.current; if (!el) return null;
    function dataURLToBlob(dataUrl: string): Blob | null {
      try {
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(parts[1]);
        let n = bstr.length; const u8 = new Uint8Array(n);
        while (n--) u8[n] = bstr.charCodeAt(n);
        return new Blob([u8], { type: mime });
      } catch { return null; }
    }
    const blob: Blob = await new Promise((resolve) => el.toBlob ? el.toBlob(b => resolve(b || new Blob([])), 'image/png') : resolve(new Blob([])));
    let finalBlob = blob;
    if (!finalBlob || finalBlob.size === 0) {
      const dataUrl = el.toDataURL('image/png');
      const b = dataURLToBlob(dataUrl);
      if (!b) return null; finalBlob = b;
    }
    const file = new File([finalBlob], 'signature.png', { type: 'image/png' });
    const fd = new FormData();
    fd.append('file', file);
    fd.append('property', propertyId);
    if (bookingId) fd.append('booking', bookingId);
    const res = await fetch('/api/checkin/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || 'Signature upload failed');
    }
    const j = await res.json();
    return { path: j?.path as string, mime: 'image/png' };
  }

  // 4) submit
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitState("submitting");
    setErrorMsg("");
    // Show confirmation modal immediately to indicate progress
    setConfirmOpen(true);
    setConfirmStatus("sending");
    setConfirmError("");

    // asigură „commit” din combobox-uri înainte de trimis
    countryRef.current?.commit();
    nationalityRef.current?.commit();

    const countryToSend = (countryRef.current?.getText() ?? countryText).trim();
    const nationalityToSend = (nationalityRef.current?.getText() ?? docNationality).trim();

    try {
      // 4.1 upload fișier (obligatoriu) + semnătură (opțional)
      const uploaded = await uploadDocFile();
      if (!uploaded) throw new Error((TXT as any)[lang].missingIdError);
      const uploadedSig = await uploadSignature();

      // 4.2 payload
      const payload: any = {
        property_id: propertyId!,
        booking_id: bookingId,
        start_date: startDate,
        end_date: endDate,
        guest_first_name: firstName.trim(),
        guest_last_name:  lastName.trim(),
        email: email.trim(),
        phone: normalizedPhone,
        address: address.trim(),
        city: city.trim(),
        country: countryToSend,
        requested_room_type_id: null,
        requested_room_id:     null,

        // document
        doc_type: docType, // "id_card" | "passport"
        doc_series: docType === "id_card" ? docSeries.trim() : null,
        doc_number: docNumber.trim(),
        doc_nationality: docType === "passport" ? nationalityToSend : null,
        // multiple docs (id + optional signature)
        docs: [
          {
            doc_type: docType,
            doc_series: docType === 'id_card' ? docSeries.trim() : null,
            doc_number: docNumber.trim(),
            doc_nationality: docType === 'passport' ? nationalityToSend : null,
            storage_bucket: 'guest_docs',
            storage_path: uploaded.path,
            mime_type: uploaded.mime,
          },
          ...(uploadedSig ? [{
            doc_type: 'signature',
            storage_bucket: 'guest_docs',
            storage_path: uploadedSig.path,
            mime_type: uploadedSig.mime,
          }] : []),
        ],
        guest_companions: expectedCompanions > 0 ? companions.slice(0, expectedCompanions).map(c => ({
          first_name: c.firstName.trim(),
          last_name: c.lastName.trim(),
          birth_date: c.birthDate || null,
          citizenship: c.citizenship.trim() || null,
          residence_country: c.residenceCountry.trim() || null,
          is_minor: !!c.isMinor,
          guardian_name: c.isMinor ? (c.guardianName.trim() || null) : null,
          doc_type: c.isMinor ? null : (c.docType || null),
          doc_series: c.isMinor || c.docType !== "id_card" ? null : (c.docSeries.trim() || null),
          doc_number: c.isMinor ? null : (c.docNumber.trim() || null),
          doc_nationality: null,
        })) : [],
        ota_provider_hint: providerHint || null,
      };

      const res = await fetch("/api/checkin/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = j?.error || j?.message || (TXT as any)[lang].submitFailed;
        setErrorMsg(msg);
        setSubmitState("error");
        setConfirmOpen(false);
        return;
      }

      // păstrăm în parent și valorile finale „committed”
      setCountryText(countryToSend);
      if (docType === "passport") setDocNationality(nationalityToSend);

      // Trigger confirmation email modal + send
      const j = await res.json().catch(() => ({}));
      const booking = (j?.id || null) as string | null;
      if (booking) {
        try { setQrUrl(`${window.location.origin.replace(/\/+$/, '')}/r/ci/${encodeURIComponent(booking)}`); } catch {}
        try {
          const r = await fetch('/api/checkin/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: booking, property_id: propertyId, email })
          });
          const jj = await r.json().catch(()=>({}));
          if (r.ok && jj?.sent) setConfirmStatus("sent");
          else { setConfirmStatus("error"); setConfirmError(jj?.error || jj?.message || 'Failed to send'); }
        } catch (er:any) {
          setConfirmStatus("error"); setConfirmError(er?.message || 'Failed to send');
        }
      }
      // Mark submit success, but show final Thank you only after email is sent
      setSubmitState("success");
    } catch (err: any) {
      setErrorMsg(err?.message || (TXT as any)[lang].unexpectedError);
      setSubmitState("error");
      setConfirmOpen(false);
    }
  }

  // Auto-close confirmation modal on successful send
  useEffect(() => {
    if (confirmStatus === 'sent') {
      setConfirmOpen(false);
    }
  }, [confirmStatus]);

  // 5) render
  if (!propertyId) {
    return (
      <div style={{ ...OUTER_WRAP, maxWidth: 720 }}>
        <div style={CARD}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
            <h1 style={{ marginTop: 0, marginBottom: 8 }}>{T('checkinTitle')}</h1>
            <div style={{ display: "inline-flex", gap: 8, alignSelf: "flex-start" }}>
              <button
                type="button"
                onClick={() => setLang("ro")}
                aria-label="Română"
                title="Română"
                style={{
                  width: 32,
                  height: 32,
                  padding: 0,
                  borderRadius: 999,
                  border: "none",
                  background: "transparent",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  boxShadow: "none",
                }}
              >
                <img
                  src="/ro.png"
                  alt=""
                  width={26}
                  height={26}
                  style={{
                    borderRadius: 999,
                    display: "block",
                    boxShadow: lang === "ro" ? "0 0 0 2px color-mix(in srgb, var(--primary) 26%, transparent)" : "none",
                  }}
                />
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                aria-label="English"
                title="English"
                style={{
                  width: 32,
                  height: 32,
                  padding: 0,
                  borderRadius: 999,
                  border: "none",
                  background: "transparent",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  boxShadow: "none",
                }}
              >
                <img
                  src="/eng.png"
                  alt=""
                  width={26}
                  height={26}
                  style={{
                    borderRadius: 999,
                    display: "block",
                    boxShadow: lang === "en" ? "0 0 0 2px color-mix(in srgb, var(--primary) 26%, transparent)" : "none",
                  }}
                />
              </button>
            </div>
          </div>
          <p style={{ color: "var(--muted)" }}>
            Missing property. This link must include <code>?property=&lt;PROPERTY_ID&gt;</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={OUTER_WRAP}>
      {/* Light CSS for pulse animation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes p4h-pulse{0%{opacity:.6}50%{opacity:1}100%{opacity:.6}}
            @keyframes p4h-dotwave{0%,100%{transform:translateY(0);opacity:.55}50%{transform:translateY(-4px);opacity:1}}
            .p4h-dots{display:inline-flex;align-items:center;gap:6px}
            .p4h-dot{width:8px;height:8px;border-radius:999px;animation:p4h-dotwave 1.1s ease-in-out infinite}
            .p4h-dot:nth-child(1){background:color-mix(in srgb,var(--primary) 65%, white);animation-delay:0ms}
            .p4h-dot:nth-child(2){background:color-mix(in srgb,var(--primary) 80%, white);animation-delay:120ms}
            .p4h-dot:nth-child(3){background:color-mix(in srgb,var(--primary) 95%, white);animation-delay:240ms}
            .ci-heroCard{ position: relative; overflow: hidden; }
            .ci-heroCard::before{ display:none; }
            .ci-heroInner{ position: relative; z-index: 1; display:grid; justify-items:center; text-align:center; padding: 4px 6px 0; }
            .ci-heroText{ max-width: 64ch; }
            .ci-langSwitch{ position:absolute; top: 12px; right: 12px; display:flex; gap: 8px; }
            .ci-type{
              --ci-font-h:28px; --ci-font-b:14px; --ci-font-s:12px; --ci-weight-m:600; --ci-weight-b:800;
              font-family: inherit;
            }
            .ci-heroTitle{ margin:0; }
            .ci-hTitle{
              margin:0;
              font-size: var(--ci-font-h);
              font-weight: var(--ci-weight-b);
              letter-spacing: .02em;
              line-height: 1.15;
              color: color-mix(in srgb, var(--text) 92%, transparent);
            }
            .ci-hSubtitle{
              --ci-accent: var(--success, var(--primary));
              margin: 6px 0 0;
              font-size: var(--ci-font-b);
              font-weight: var(--ci-weight-m);
              line-height: 1.45;
              color: color-mix(in srgb, var(--ci-accent) 78%, black);
              display: inline-flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 6px;
            }
            .ci-hKicker{
              margin: 10px 0 0;
              font-size: var(--ci-font-b);
              font-weight: var(--ci-weight-m);
              color: color-mix(in srgb, var(--text) 70%, transparent);
              text-align: center;
            }
            .ci-pillInline{
              --ci-accent: var(--success, var(--primary));
              display: inline-block;
              vertical-align: baseline;
              font-size: inherit;
              line-height: inherit;
              padding: 0 10px;
              border-radius: 999px;
              border: 1px solid color-mix(in srgb, var(--ci-accent) 34%, transparent);
              background: color-mix(in srgb, var(--ci-accent) 12%, white);
              color: color-mix(in srgb, var(--ci-accent) 86%, black);
              font-weight: inherit;
              white-space: nowrap;
            }
            .ci-pillProp{
              --ci-accent: var(--success, var(--primary));
              display: inline-block;
              vertical-align: baseline;
              font-size: inherit;
              line-height: inherit;
              padding: 2px 10px;
              border-radius: 12px;
              border: 1px solid color-mix(in srgb, var(--ci-accent) 26%, transparent);
              background: color-mix(in srgb, var(--ci-accent) 10%, white);
              color: color-mix(in srgb, var(--ci-accent) 80%, black);
              font-weight: 500;
              white-space: nowrap;
            }
            .ci-heroStack{ margin-top: 12px; display:grid; gap: 10px; }
            .ci-heroLead{ margin:0; font-size: var(--ci-font-b); font-weight: var(--ci-weight-b); color: color-mix(in srgb, var(--text) 92%, transparent); line-height: 1.55; }
            .ci-heroBody{ margin:0; font-size: var(--ci-font-b); font-weight: var(--ci-weight-m); color: color-mix(in srgb, var(--text) 78%, transparent); line-height: 1.55; }
            .ci-heroSmall{ margin:0; font-size: var(--ci-font-s); font-weight: var(--ci-weight-m); color: color-mix(in srgb, var(--text) 66%, transparent); line-height: 1.55; }
            .ci-heroNote{ margin-top: 6px; display:grid; gap: 10px; padding: 12px 14px; border-radius: 14px; border: 1px solid color-mix(in srgb, var(--border) 90%, transparent); background: #fff; box-shadow: 0 12px 28px rgba(15,23,42,0.08); text-align: left; }
            .ci-heroNoteTitle{ font-size: var(--ci-font-s); font-weight: var(--ci-weight-b); letter-spacing: .12em; text-transform: uppercase; color: color-mix(in srgb, var(--text) 82%, transparent); text-align: center; }
            .ci-heroList{ list-style: none; padding: 0; margin: 0; display:grid; gap: 8px; text-align: left; }
            .ci-heroList li{ display:block; }
            .ci-infoIntro{ margin: 0; font-size: var(--ci-font-b); font-weight: 700; color: color-mix(in srgb, var(--text) 88%, transparent); }
            .ci-infoMain{ margin: 0; font-size: var(--ci-font-b); font-weight: var(--ci-weight-m); color: color-mix(in srgb, var(--text) 78%, transparent); }
            .ci-infoLabel{ margin: 0; font-size: var(--ci-font-b); font-weight: 700; color: color-mix(in srgb, var(--text) 82%, transparent); }
            .ci-infoMeta{ margin: 0; font-size: var(--ci-font-s); font-weight: var(--ci-weight-m); color: color-mix(in srgb, var(--text) 66%, transparent); line-height: 1.5; }
            .ci-infoClose{ margin: 0; font-size: var(--ci-font-s); font-weight: var(--ci-weight-m); color: color-mix(in srgb, var(--text) 70%, transparent); line-height: 1.5; text-align: center; }
            .ci-infoSep{ height: 1px; border: 0; margin: 6px 0; background: color-mix(in srgb, var(--border) 70%, transparent); }
            .ci-infoList{ list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
            .ci-infoList li{ display: grid; grid-template-columns: 14px 1fr; gap: 10px; align-items: start; color: color-mix(in srgb, var(--text) 78%, transparent); }
            .ci-infoList li::before{ content: "•"; color: color-mix(in srgb, var(--text) 48%, transparent); line-height: 1.2; margin-top: 2px; }
            .ci-actionBtn{
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 16px 24px;
              border-radius: 999px;
              font-weight: 650;
              line-height: 1.1;
              color: var(--text);
              background: var(--card);
              border: 1px solid var(--border);
              transition: transform .05s ease, box-shadow .2s ease, border-color .2s ease, background .2s ease, color .2s ease;
              text-decoration: none;
            }
            .ci-actionBtn:hover{
              border-color: color-mix(in srgb, var(--muted) 70%, var(--border));
              box-shadow: 0 10px 24px rgba(0,0,0,0.18);
            }
            .ci-actionBtn:active{ transform: scale(0.99); }
            .ci-actionBtn:focus-visible{
              outline: none;
              box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 16%, transparent), 0 10px 24px rgba(0,0,0,0.18);
            }
            .ci-actionBtn[aria-disabled="true"], .ci-actionBtn:disabled{
              opacity: .55;
              cursor: not-allowed !important;
            }
            .ci-formBlock{ width: 100%; max-width: 520px; margin: 0 auto; }
            @media (max-width: 560px){ .ci-formBlock{ max-width: none; margin: 0; } }
            .ci-sectionHead{ display:flex; align-items:center; gap: 10px; margin-bottom: 10px; }
            .ci-sectionIcon{
              width: 32px;
              height: 32px;
              border-radius: 12px;
              border: 1px solid var(--border);
              background: color-mix(in srgb, var(--card) 86%, transparent);
              display:grid;
              place-items:center;
              flex: 0 0 auto;
              box-shadow: 0 10px 24px rgba(0,0,0,0.14);
            }
            .ci-sectionIcon::before{
              content:"";
              width: 18px;
              height: 18px;
              background-color: color-mix(in srgb, var(--text) 65%, transparent);
              -webkit-mask-image: url(/svg_what_to_visit.svg);
                      mask-image: url(/svg_what_to_visit.svg);
              -webkit-mask-repeat: no-repeat;
                      mask-repeat: no-repeat;
              -webkit-mask-position: center;
                      mask-position: center;
              -webkit-mask-size: contain;
                      mask-size: contain;
            }
            .ci-sectionTitle{
              font-size: 12px;
              font-weight: 800;
              letter-spacing: .12em;
              text-transform: uppercase;
              color: var(--muted);
              line-height: 1.2;
            }
            .ci-uploadBtn{ justify-content: center; }
            .ci-uploadMetaRow{
              margin-top: 10px;
              display:flex;
              align-items:center;
              justify-content:space-between;
              gap: 12px;
              flex-wrap: wrap;
              color: var(--muted);
              font-size: 12px;
            }
            .ci-consentCard{
              padding: 12px 14px;
              border-radius: 12px;
              border: 1px solid var(--border);
              background: var(--card);
              display: flex;
              align-items: flex-start;
              gap: 10px;
            }
            .ci-consentText{ font-size: 13px; color: var(--muted); line-height: 1.45; }
            .ci-consentHint{ margin-top: 6px; font-size: 12px; color: color-mix(in srgb, var(--muted) 92%, transparent); }
            @media (max-width: 560px){ .ci-type{ --ci-font-h:24px; } }
            @media (max-width: 900px){
              .ci-langSwitch{
                position: fixed;
                top: 14px;
                right: 14px;
                z-index: 1200;
                padding: 6px;
                border-radius: 999px;
                border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
                background: rgba(255,255,255,0.78);
                -webkit-backdrop-filter: blur(12px) saturate(130%);
                        backdrop-filter: blur(12px) saturate(130%);
                box-shadow: 0 14px 34px rgba(15,23,42,0.16);
              }
              .ci-langSwitch .ci-flagBtn{
                width: 34px !important;
                height: 34px !important;
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
              }
              .ci-langSwitch .ci-flagBtn img{
                width: 30px !important;
                height: 30px !important;
                border-radius: 999px;
              }
              .ci-langSwitch .ci-flagBtn[data-active="1"] img{
                box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 26%, transparent);
              }
            }

            .ci-waFab{
              position: fixed;
              right: 16px;
              bottom: calc(16px + env(safe-area-inset-bottom));
              z-index: 980;
              pointer-events: auto;
            }
            .ci-waPill{
              display: inline-flex;
              align-items: center;
              gap: 10px;
              height: 44px;
              padding: 0 12px 0 0;
              max-width: min(320px, calc(100vw - 32px));
              border-radius: 999px;
              border: 1px solid rgba(255,255,255,0.14);
              background: linear-gradient(135deg, #25D366, #128C7E);
              box-shadow: 0 16px 40px rgba(0,0,0,0.26);
              color: #fff;
              font-weight: 650;
              cursor: pointer;
              user-select: none;
              transition: transform .05s ease, box-shadow .2s ease, border-color .2s ease;
            }
            .ci-waPill:hover{
              border-color: rgba(255,255,255,0.22);
              box-shadow: 0 22px 58px rgba(0,0,0,0.32);
            }
            .ci-waPill:active{ transform: scale(0.99); }
            .ci-waPill img{
              width: 44px;
              height: 44px;
              display: block;
              box-shadow: none;
              filter: drop-shadow(0 10px 18px rgba(0,0,0,0.18));
              flex: 0 0 auto;
            }
            .ci-waPill span{ white-space: nowrap; font-size: 13px; overflow: hidden; text-overflow: ellipsis; }

            .ci-waOverlay{
              position: fixed;
              inset: 0;
              z-index: 990;
              background: rgba(2,6,23,.55);
              -webkit-backdrop-filter: blur(8px);
                      backdrop-filter: blur(8px);
              display: grid;
              place-items: end;
              padding: 16px;
            }
            .ci-waChat{
              width: min(520px, 100%);
              border-radius: 18px;
              border: 1px solid rgba(255,255,255,0.10);
              background: #0b141a;
              font-family: inherit;
              font-weight: 400;
              box-shadow: 0 22px 60px rgba(0,0,0,0.34);
              overflow: hidden;
              display: grid;
              grid-template-rows: auto 1fr auto;
              max-height: min(540px, calc(100vh - 32px - env(safe-area-inset-bottom)));
            }
            .ci-waTop{
              display:flex;
              align-items:center;
              justify-content:space-between;
              gap: 12px;
              padding: 12px;
              background: #128C7E;
              border-bottom: 1px solid rgba(0,0,0,0.10);
            }
            .ci-waTopTitle{
              display:flex;
              align-items:center;
              gap: 10px;
              min-width: 0;
              color: #fff;
              font-weight: 850;
              font-size: 12px;
              letter-spacing: .10em;
              text-transform: uppercase;
            }
            .ci-waTopTitle small{
              font-weight: 650;
              letter-spacing: normal;
              text-transform: none;
              color: rgba(255,255,255,0.88);
              font-size: 12px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .ci-waClose{
              width: 36px;
              height: 36px;
              border-radius: 999px;
              border: 1px solid rgba(255,255,255,0.18);
              background: rgba(0,0,0,0.10);
              color: #fff;
              font-weight: 900;
              cursor: pointer;
              display:grid;
              place-items:center;
              line-height: 1;
            }
            .ci-waClose:hover{ background: rgba(0,0,0,0.14); }
            .ci-waMessages{
              padding: 14px;
              display: grid;
              gap: 10px;
              overflow: auto;
              background-color: #0b141a;
              background-image:
                linear-gradient(rgba(11,20,26,0.90), rgba(11,20,26,0.90)),
                url(/whatsapp_background.jpg);
              background-repeat: repeat;
              background-position: top left;
              background-size: clamp(360px, 72vw, 520px);
            }
            .ci-waBubble{
              max-width: 88%;
              padding: 10px 12px;
              border-radius: 14px;
              font-size: 14px;
              line-height: 1.45;
              color: #fff;
              font-weight: 400;
              border: 1px solid rgba(255,255,255,0.08);
            }
            .ci-waLeft{
              justify-self: start;
              background: #202c33;
              border-bottom-left-radius: 6px;
            }
            .ci-waRight{
              justify-self: end;
              background: #005c4b;
              border-color: rgba(0,168,132,0.20);
              border-bottom-right-radius: 6px;
            }
            .ci-waComposer{
              display: grid;
              grid-template-columns: 1fr auto;
              gap: 10px;
              padding: 12px;
              background: #111b21;
              border-top: 1px solid rgba(255,255,255,0.08);
            }
            .ci-waInput{
              width: 100%;
              resize: none;
              min-height: 38px;
              max-height: 92px;
              padding: 9px 12px;
              border-radius: 999px;
              border: 1px solid rgba(255,255,255,0.08);
              background: #202c33;
              color: #fff;
              outline: none;
              font-size: 14px;
              line-height: 1.25;
              font-family: inherit;
              font-weight: 400;
            }
            .ci-waInput::placeholder{ color: rgba(255,255,255,0.65); }
            .ci-waInput:focus{
              border-color: rgba(255,255,255,0.14);
              box-shadow: 0 0 0 4px rgba(37,211,102,0.10);
            }
            .ci-waSend{
              width: 44px;
              height: 44px;
              border-radius: 999px;
              border: 1px solid rgba(0,168,132,0.45);
              background: #00a884;
              cursor: pointer;
              display: grid;
              place-items: center;
              transition: transform .05s ease, box-shadow .2s ease, background .2s ease;
            }
            .ci-waSend::before{
              content:"";
              width: 18px;
              height: 18px;
              background-color: #fff;
              -webkit-mask-image: url(/svg_send_demo.svg);
                      mask-image: url(/svg_send_demo.svg);
              -webkit-mask-repeat: no-repeat;
                      mask-repeat: no-repeat;
              -webkit-mask-position: center;
                      mask-position: center;
              -webkit-mask-size: contain;
                      mask-size: contain;
            }
            .ci-waSend:hover{
              background: #00b195;
              box-shadow: 0 16px 40px rgba(0,0,0,0.18);
            }
            .ci-waSend:active{ transform: scale(0.99); }
            .ci-waSend:disabled{
              opacity: .55;
              cursor: not-allowed;
              box-shadow: none;
            }

            @media (max-width: 560px){
              .ci-waOverlay{ place-items: end center; padding: 12px 12px calc(12px + env(safe-area-inset-bottom) + 48px); }
              .ci-waChat{ width: 100%; }
            }
          `,
        }}
      />

      {/* Page loading overlay (initial fetch) */}
      {loading && (
        <div
          aria-live="polite"
          aria-label={lang === "ro" ? "Se încarcă" : "Loading"}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: "rgba(255,255,255,0.92)",
            WebkitBackdropFilter: "blur(8px)",
            backdropFilter: "blur(8px)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 999,
              border: "1px solid color-mix(in srgb, var(--border) 90%, transparent)",
              background: "rgba(255,255,255,0.86)",
              WebkitBackdropFilter: "blur(10px) saturate(130%)",
              backdropFilter: "blur(10px) saturate(130%)",
              boxShadow: "0 16px 40px rgba(15,23,42,0.12)",
            }}
          >
            <span className="p4h-dots" aria-hidden>
              <span className="p4h-dot" />
              <span className="p4h-dot" />
              <span className="p4h-dot" />
            </span>
            <span style={{ fontWeight: 650, color: "var(--text)" }}>{T("loading")}</span>
          </div>
        </div>
      )}
      {/* Header */}
      <section style={CARD} className="ci-heroCard ci-type">
        <div className="ci-heroInner">
          <div className="ci-heroText">
            <h1 className="ci-heroTitle">
              {lang === "ro" ? (
                <span className="ci-hTitle">Completează check-in-ul</span>
              ) : (
                <span className="ci-hTitle">Complete your check-in</span>
              )}
            </h1>
            <p className="ci-hSubtitle">
              {lang === "ro" ? (
                <>
                  <span>În doar</span>
                  <span className="ci-pillInline">câteva minute</span>
                  <span>și primești confirmarea QR.</span>
                </>
              ) : (
                <>
                  <span>In just</span>
                  <span className="ci-pillInline">a few minutes</span>
                  <span>and receive your QR confirmation.</span>
                </>
              )}
            </p>
            <p className="ci-hKicker">{T("intro2")}</p>
            <div className="ci-heroStack">
              <div className="ci-heroNote">
                <div className="ci-heroNoteTitle">{lang === "ro" ? "Informații" : "Info"}</div>
                {lang === "ro" ? (
                  <>
                    <p className="ci-infoIntro">Îți mulțumim că ai ales să stai la noi.</p>
                    <hr className="ci-infoSep" />
                    <p className="ci-infoMain">
                      Pentru o sosire cât mai ușoară, te rugăm să completezi formularul de check-in online de mai jos.
                      După trimitere, vei primi automat un email de confirmare pentru sejurul tău la{" "}
                      <span className="ci-pillProp">{prop?.name ?? "proprietate"}</span>.
                    </p>
                    <hr className="ci-infoSep" />
                    <p className="ci-infoLabel">Emailul tău de confirmare va include:</p>
                    <ul className="ci-infoList">
                      <li>un cod QR ce poate fi prezentat la recepție (dacă este cazul), sau</li>
                      <li>folosit ca dovadă că check-in-ul a fost completat.</li>
                    </ul>
                    <hr className="ci-infoSep" />
                    <p className="ci-infoMeta">
                      Toate informațiile sunt gestionate în siguranță și folosite doar pentru check-in și cerințe legale.
                    </p>
                    <hr className="ci-infoSep" />
                    <p className="ci-infoClose">Îți mulțumim pentru cooperare — abia așteptăm să te primim.</p>
                  </>
                ) : (
                  <>
                    <p className="ci-infoIntro">Thank you for choosing to stay with us.</p>
                    <hr className="ci-infoSep" />
                    <p className="ci-infoMain">
                      To ensure a smooth arrival, please complete the online check-in form below. Once submitted, you will
                      automatically receive a confirmation email for your stay at{" "}
                      <span className="ci-pillProp">{prop?.name ?? "the property"}</span>.
                    </p>
                    <hr className="ci-infoSep" />
                    <p className="ci-infoLabel">Your confirmation email will include:</p>
                    <ul className="ci-infoList">
                      <li>a QR code that can be presented at reception (if applicable), or</li>
                      <li>used as proof that your check-in has been completed.</li>
                    </ul>
                    <hr className="ci-infoSep" />
                    <p className="ci-infoMeta">
                      All information you provide is handled securely and used only for check-in and legal requirements.
                    </p>
                    <hr className="ci-infoSep" />
                    <p className="ci-infoClose">Thank you for your cooperation — we look forward to welcoming you.</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="ci-langSwitch">
            <button
              type="button"
              onClick={() => setLang("ro")}
              aria-label="Română"
              title="Română"
              className="ci-flagBtn"
              data-active={lang === "ro" ? "1" : "0"}
              style={{
                width: 32,
                height: 32,
                padding: 0,
                borderRadius: 999,
                border: "none",
                background: "transparent",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                boxShadow: "none",
              }}
            >
              <img
                src="/ro.png"
                alt=""
                width={26}
                height={26}
                style={{
                  borderRadius: 999,
                  display: "block",
                  boxShadow: lang === "ro" ? "0 0 0 2px color-mix(in srgb, var(--primary) 26%, transparent)" : "none",
                }}
              />
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              aria-label="English"
              title="English"
              className="ci-flagBtn"
              data-active={lang === "en" ? "1" : "0"}
              style={{
                width: 32,
                height: 32,
                padding: 0,
                borderRadius: 999,
                border: "none",
                background: "transparent",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                boxShadow: "none",
              }}
            >
              <img
                src="/eng.png"
                alt=""
                width={26}
                height={26}
                style={{
                  borderRadius: 999,
                  display: "block",
                  boxShadow: lang === "en" ? "0 0 0 2px color-mix(in srgb, var(--primary) 26%, transparent)" : "none",
                }}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Property info (contact + image) — always visible */}
      {prop && (
        <section style={{ ...CARD, padding: 0 }}>
          {prop.presentation_image_url ? (
            <>
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', maxWidth: 900, margin: '0 auto' }}>
                <img
                  src={prop.presentation_image_url}
                  alt="Property"
                  style={{ display:'block', width: '100%', height: 300, objectFit: 'cover' }}
                />
                <ContactOverlay prop={prop} />
              </div>
              <SocialPills prop={prop} />
              {stage === "intro" && (
                <div style={{ padding: 16, borderTop: "1px solid var(--border)", display: "grid", gap: 12, textAlign: "center", justifyItems: "center" }}>
                  <p style={{ margin: 0, color: "var(--muted)", maxWidth: 62 * 12 }}>
                    {T("preBody")}
                  </p>
                  <button
                    type="button"
                    className="ci-actionBtn"
                    style={{
                      width: "100%",
                      maxWidth: isNarrow ? undefined : 520,
                      margin: isNarrow ? undefined : "0 auto",
                    }}
                    onClick={() => {
                      setStage("form");
                      try {
                        requestAnimationFrame(() => {
                          formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        });
                      } catch {}
                    }}
                  >
                    {T("preCta")}
                  </button>
                </div>
              )}
            </>
          ) : (
            (prop.contact_email || prop.contact_phone || prop.contact_address) ? (
              <div style={{ padding: 12, display:'grid', gap:6 }}>
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
                    <a href={`mailto:${prop.contact_email}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{prop.contact_email}</a>
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
                    <a href={`tel:${(prop.contact_phone || '').replace(/\s+/g,'')}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{prop.contact_phone}</a>
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
                <SocialPills prop={prop} />
                {stage === "intro" && (
                  <div style={{ paddingTop: 10, borderTop: "1px solid var(--border)", display: "grid", gap: 12, textAlign: "center", justifyItems: "center" }}>
                    <p style={{ margin: 0, color: "var(--muted)", maxWidth: 62 * 12 }}>
                      {T("preBody")}
                    </p>
                    <button
                      type="button"
                      className="ci-actionBtn"
                      style={{
                        width: "100%",
                        maxWidth: isNarrow ? undefined : 520,
                        margin: isNarrow ? undefined : "0 auto",
                      }}
                      onClick={() => {
                        setStage("form");
                        try {
                          requestAnimationFrame(() => {
                            formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          });
                        } catch {}
                      }}
                    >
                      {T("preCta")}
                    </button>
                  </div>
                )}
              </div>
            ) : null
          )}
        </section>
      )}

      {stage === "intro" && prop && (
        <section style={CARD}>
          <div
            style={{
              border: "1px solid var(--border)",
              background: "var(--card)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", fontWeight: 900, fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)" }}>
              {T("preMapTitle")}
            </div>
            {mapEmbedUrl ? (
              <iframe
                title="Google Maps"
                src={mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                style={{ width: "100%", height: 260, border: 0, display: "block" }}
              />
            ) : (
              <div style={{ padding: 12, color: "var(--muted)" }}>
                {mapBusy
                  ? (lang === "ro" ? "Se încarcă harta…" : "Loading map…")
                  : (lang === "ro"
                      ? "Previzualizarea hărții nu este disponibilă. Deschide locația în Google Maps."
                      : "Map preview is not available. Open the location in Google Maps.")}
              </div>
            )}
            {mapOpenUrl ? (
              <div style={{ padding: 10, borderTop: "1px solid var(--border)", display: "grid", gap: 6 }}>
                <a
                  href={mapOpenUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 800, fontSize: 12 }}
                >
                  {lang === "ro" ? "Deschide în Google Maps" : "Open in Google Maps"}
                </a>
                {!prop.social_location && prop.contact_address ? (
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {prop.contact_address}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      )}

      {stage === "form" && (
        <>
          <div ref={formTopRef} />
          {/* Form */}
          <section style={CARD}>
            {loading ? (
              <div style={{ color: "var(--muted)" }}>{T('loading')}</div>
            ) : (submitState === "success" && confirmStatus === "sent") ? (
              <div>
                <h2 style={{ marginTop: 0 }}>{T('thanksTitle')}</h2>
                <p style={{ color: "var(--muted)" }}>{T('thanksMsg')}</p>
              </div>
            ) : (
              <form
                onSubmit={onSubmit}
                onPointerDownCapture={onFirstInteract}
                style={{ display: "grid", gap: 14 }}
                translate="no"
                className="notranslate"
                aria-busy={submitState === "submitting"}
              >
            {/* Dates */}
            <div style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
              alignItems: "start",
            }}>
              <div>
                <label style={LABEL}>{T('checkinDate')}</label>
                <input
                  style={INPUT_DATE}
                  type="date"
                  value={startDate}
                  min={todayYMD()}
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    setStartDate(v);
                    if (endDate <= v) setEndDate(addDaysYMD(v, 1));
                  }}
                />
              </div>
              <div>
                <label style={LABEL}>{T('checkoutDate')}</label>
                <input
                  style={INPUT_DATE}
                  type="date"
                  value={endDate}
                  min={addDaysYMD(startDate, 1)}
                  onChange={(e) => setEndDate(e.currentTarget.value)}
                />
              </div>
            </div>
            {dateError && (
              <div role="alert" style={{ padding: 10, borderRadius: 10, background: "var(--danger)", color: "#0c111b", fontWeight: 800 }}>
                {dateError}
              </div>
            )}

            {/* Room selection removed — allocation is managed by the property after confirmation */}

            {/* Name */}
            <div style={ROW_2}>
              <div>
                <label htmlFor="checkin-first-name" style={LABEL_ROW}>
                  <Image src={formIcon("firstname")} alt="" width={16} height={16} />
                  <span>{T('firstName')}</span>
                </label>
                <input id="checkin-first-name" style={INPUT} value={firstName} onChange={e => setFirstName(e.currentTarget.value)} placeholder="First Name" />
              </div>
              <div>
                <label htmlFor="checkin-last-name" style={LABEL_ROW}>
                  <Image src={formIcon("lastname")} alt="" width={16} height={16} />
                  <span>{T('lastName')}</span>
                </label>
                <input id="checkin-last-name" style={INPUT} value={lastName} onChange={e => setLastName(e.currentTarget.value)} placeholder="Last Name" />
              </div>
            </div>

            {/* Total guests selector (after name) */}
            {(firstName.trim().length > 0 && lastName.trim().length > 0) && (
              <div style={ROW_1}>
                <div>
                  <label htmlFor="checkin-total-guests" style={LABEL_ROW}>
                    <span>{(TXT as any)[lang].totalGuestsLabel}</span>
                  </label>
                  <select
                    id="checkin-total-guests"
                    style={SELECT}
                    value={guestCount}
                    onChange={(e) => {
                      const n = Math.max(1, Math.min(99, parseInt(e.currentTarget.value || "1", 10) || 1));
                      setGuestCount(n);
                      setCompanions(prev => {
                        const target = Math.max(n - 1, 0);
                        const trimmed = prev.slice(0, target);
                        if (trimmed.length < target) {
                          const extra: Companion[] = [];
                          for (let i = trimmed.length; i < target; i++) {
                            extra.push({
                              firstName: "",
                              lastName: "",
                              birthDate: "",
                              citizenship: "",
                              residenceCountry: "",
                              isMinor: false,
                              guardianName: "",
                              docType: "",
                              docSeries: "",
                              docNumber: "",
                              docNationality: "",
                            });
                          }
                          return [...trimmed, ...extra];
                        }
                        return trimmed;
                      });
                      if (n > 1) {
                        setCompanionsIndex(0);
                        setCompanionsError("");
                        setCompanionsOpen(true);
                      } else {
                        setCompanions([]);
                        setCompanionsOpen(false);
                      }
                    }}
                  >
                    {Array.from({ length: 99 }, (_, i) => i + 1).map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <p style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
                    {(TXT as any)[lang].totalGuestsHint(firstName.trim(), lastName.trim())}
                  </p>
                  {guestCount > 1 && expectedCompanions > 0 && companions.length === expectedCompanions && (
                    <button
                      type="button"
                      onClick={() => { setCompanionsIndex(0); setCompanionsError(""); setCompanionsOpen(true); }}
                      style={{ marginTop: 6, ...BTN_GHOST }}
                    >
                      {(TXT as any)[lang].editCompanions}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Contact */}
            <div style={isSmall ? ROW_1 : ROW_2}>
              <div>
                <label htmlFor="checkin-email" style={LABEL_ROW}>
                  <Image src={formIcon("email")} alt="" width={16} height={16} />
                  <span>{T('email')}</span>
                </label>
                <input id="checkin-email" style={INPUT} type="email" value={email} onChange={e => setEmail(e.currentTarget.value)} placeholder="***@example.com" />
              </div>
              <div>
                <label htmlFor="checkin-phone" style={LABEL_ROW}>
                  <Image src={formIcon("phone")} alt="" width={16} height={16} />
                  <span>{T('phone')}</span>
                </label>
                <div ref={dialWrapRef} style={{ position:'relative' }}>
                  <button type="button" onClick={()=>setDialOpen(v=>!v)} aria-label="Dial code"
                    style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', zIndex:2,
                             border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', borderRadius:8, padding:'6px 8px', fontWeight:800, cursor:'pointer' }}>
                    <span style={{ marginRight:6 }}>{flagEmoji((DIAL_OPTIONS.find(d=>d.code===phoneDial)?.cc) || 'RO')}</span>
                    {phoneDial}
                  </button>
                  <input id="checkin-phone" style={{ ...INPUT, paddingLeft: 90 }} value={phone} onChange={e => setPhone(e.currentTarget.value)} placeholder="700 000 000" type="tel" inputMode="numeric" pattern="[0-9]*" />
                  {dialOpen && (
                    <div role="listbox" style={{ position:'absolute', left:8, top:'calc(100% + 6px)', zIndex:3, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:10, padding:6, display:'grid', gap:4, maxHeight:220, overflow:'auto' }}>
                      {DIAL_OPTIONS.map(opt => (
                        <button key={opt.code} type="button" onClick={()=>{ setPhoneDial(opt.code); setDialOpen(false); }}
                          style={{ padding:'6px 8px', borderRadius:8, border:'1px solid var(--border)', background: opt.code===phoneDial? 'var(--primary)':'var(--card)', color: opt.code===phoneDial? '#0c111b':'var(--text)', fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
                          <span>{flagEmoji(opt.cc)}</span>
                          <span style={{ width:56, display:'inline-block' }}>{opt.code}</span>
                          <span style={{ color:'var(--muted)', fontWeight:600 }}>{opt.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Address */}
            <div style={ROW_1}>
              <div>
                <label htmlFor="checkin-address" style={LABEL_ROW}>
                  <Image src={formIcon("address")} alt="" width={16} height={16} />
                  <span>{T('address')}</span>
                </label>
                <input id="checkin-address" style={INPUT} value={address} onChange={e => setAddress(e.currentTarget.value)} placeholder="Street, number, apt." />
              </div>

              <div style={ROW_2}>
                <div>
                  <label htmlFor="checkin-city" style={LABEL_ROW}>
                    <Image src={formIcon("city")} alt="" width={16} height={16} />
                    <span>{T('city')}</span>
                  </label>
                  <input id="checkin-city" style={INPUT} value={city} onChange={e => setCity(e.currentTarget.value)} placeholder="Bucharest" />
                </div>

                <div>
                  <label htmlFor="checkin-country" style={LABEL_ROW}>
                    <Image src={formIcon("country")} alt="" width={16} height={16} />
                    <span>{T('country')}</span>
                  </label>
                  <Combobox
                    ref={countryRef}
                    id="checkin-country"
                    ariaLabel={T('ariaCountry')}
                    value={countryText}
                    onCommit={setCountryText}
                    options={countries.map(c => c.name)}
                    placeholder="Start typing… e.g. Romania"
                    minChars={0}
                    inputStyle={INPUT}
                  />
                </div>
              </div>
            </div>

            {/* Identity document */}
            <div  style={{ ...ROW_1, marginTop: 6 }}>
              <div>
                <label htmlFor="checkin-doc-type" style={LABEL_ROW}>
                  <Image src={formIcon("id")} alt="" width={16} height={16} />
                  <span>{T('docTypeLabel')}</span>
                </label>
                <select 
                  id="checkin-doc-type"
                  className="sb-select sb-cardglow" 
                  style={SELECT}
                  value={docType}
                  onChange={(e) => {
                    const v = e.currentTarget.value as DocType;
                    setDocType(v);
                    setDocSeries("");
                    setDocNumber("");
                    setDocNationality("");
                    // Reset combobox draft for nationality when switching types
                    if (nationalityRef.current) nationalityRef.current.commit();
                  }}
                > 
                  <option value="" disabled>{T('selectDocType')}</option>
                  <option value="id_card">{T('docOptionId')}</option>
                  <option value="passport">{T('docOptionPassport')}</option>
                </select>
              </div>

              {/* Conditional fields */}
              {docType === "id_card" && (
                <div style={ROW_2}>
                  <div>
                    <label style={LABEL}>{(TXT as any)[lang].docSeriesLabel}</label>
                    <input
                      style={{ ...INPUT, textTransform: "uppercase" }}
                      value={docSeries}
                      onChange={(e) => setDocSeries(e.currentTarget.value.toUpperCase())}
                      placeholder="e.g. AB"
                      inputMode="text"
                    />
                  </div>
                  <div>
                    <label style={LABEL}>{(TXT as any)[lang].docNumberLabel}</label>
                    <input
                      style={INPUT}
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.currentTarget.value)}
                      placeholder="e.g. 123456"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              )}

              {docType === "passport" && (
                <div style={ROW_2}>
                  <div>
                    <label style={LABEL}>{T('nationality')}</label>
                    <Combobox
                      ref={nationalityRef}
                      id="checkin-nationality"
                      ariaLabel={T('ariaNationality')}
                      value={docNationality}
                      onCommit={setDocNationality}
                      options={nationalityOptions}
                      placeholder="Start typing… e.g. Romanian"
                      minChars={0}
                      inputStyle={INPUT}
                    />
                  </div>
                  <div>
                    <label style={LABEL}>{(TXT as any)[lang].docNumberLabel}</label>
                    <input
                      style={INPUT}
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.currentTarget.value)}
                      placeholder="e.g. X1234567"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Upload ID document (photo/PDF) — obligatoriu */}
            <div className="ci-formBlock" style={{ marginTop: 16 }}>
              <div className="ci-sectionHead">
                <span className="ci-sectionIcon" aria-hidden />
                <div className="ci-sectionTitle">{T('uploadId')}</div>
              </div>

              <label
                className="ci-actionBtn ci-uploadBtn"
                style={{
                  display: "flex",
                  width: "100%",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  userSelect: "none",
                  gap: 10,
                  minWidth: 0,
                }}
                htmlFor="p4h-id-upload"
                onClick={(e) => { if (maybeShowIdUploadInfo(e)) return; }}
              >
                {lang === "ro" ? "Alege fișier…" : "Choose file…"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  ref={fileInputRef}
                  id="p4h-id-upload"
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0] ?? null;
                    setDocFile(f || null);
                    if (f && f.type.startsWith('image/')) {
                      const url = URL.createObjectURL(f);
                      setDocFilePreview(url);
                    } else {
                      setDocFilePreview(null);
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </label>

              {docFile && (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <div className="ci-uploadMetaRow">
                    <div>
                      {T('selected')} <strong style={{ color: "var(--text)" }}>{docFile.name}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setDocFile(null); setDocFilePreview(null); }}
                      style={BTN_GHOST}
                    >
                      {lang === "ro" ? "Șterge" : "Remove"}
                    </button>
                  </div>
                  {docFilePreview ? (
                    <img
                      src={docFilePreview}
                      alt="Preview"
                      style={{
                        width: "100%",
                        maxWidth: 240,
                        height: 150,
                        objectFit: "contain",
                        objectPosition: "center",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "#fff",
                        justifySelf: "center",
                      }}
                    />
                  ) : (
                    <small style={{ color: "var(--muted)", justifySelf: "center" }}>
                      {docFile.name} ({docFile.type || "application/octet-stream"})
                    </small>
                  )}
                </div>
              )}
            </div>

            {showIdUploadInfo && (
              <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.5)', display:'grid', placeItems:'center', padding:16 }}>
                <div className="sb-card" style={{ position:'relative', width:'min(720px, 100%)', maxWidth:'96vw', background:'var(--panel)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:16, padding:16, boxShadow:'0 10px 30px rgba(0,0,0,0.35)' }}>
                  <button aria-label="Close" onClick={onConfirmIdUploadInfo} style={{ position:'absolute', top:8, right:8, width:36, height:36, borderRadius:999, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', fontWeight:900, cursor:'pointer' }}>×</button>
                  <div style={{ display:'grid', gap:10 }}>
                    <div style={{ fontWeight:900, fontSize:18 }}>Info</div>
                    {lang === 'ro' ? (
                      <>
                        <p style={{ margin:0 }}>
                          Încarcă o fotografie a actului de identitate pentru a verifica datele de self check‑in (GDPR art. 6(1)(f));
                          este folosită doar pentru această verificare și se șterge automat la alocarea camerei (art. 5(1)(e)).
                        </p>
                        <p style={{ margin:0 }}>
                          Poți ascunde câmpurile sensibile — păstrează fața și câmpurile completate; maschează CNP/număr personal,
                          seria/numărul documentului, adresa și zona MRZ a pașaportului.
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ margin:0 }}>
                          Upload an ID photo to verify your self check-in details (GDPR Art. 6(1)(f)); it’s used only for this check and auto-deleted at room assignment (Art. 5(1)(e)).
                        </p>
                        <p style={{ margin:0 }}>
                          You may redact sensitive fields—keep your face and the fields you typed; mask CNP/personal number, document series/number, address, and passport MRZ.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Consent — ALWAYS visible; checkbox enabled only after opening the PDF (if exists) */}
            <div className="ci-formBlock" style={{ marginTop: 12 }}>
              <div className="ci-consentCard">
                <input
                  id="agree"
                  type="checkbox"
                  checked={agree}
                  disabled={!!pdfUrl && !pdfViewed}
                  onChange={(e) => setAgree(e.currentTarget.checked)}
                  style={{ marginTop: 2, cursor: (!!pdfUrl && !pdfViewed) ? "not-allowed" : "pointer" }}
                  title={!!pdfUrl && !pdfViewed ? "Open the House Rules to enable this checkbox." : undefined}
                />
                <div style={{ minWidth: 0 }}>
                  <label htmlFor="agree" className="ci-consentText">
                    {T('consentPrefix')}
                    {pdfUrl ? (
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onOpenPdf}
                        style={{ fontWeight: 700, fontSize: 12, color: 'var(--primary)' }}
                      >
                        Property Rules (pdf)
                      </a>
                    ) : (
                      <span style={{ fontStyle: "italic" }}>{T('houseRules')}</span>
                    )}
                    .
                    {!!pdfUrl && pdfViewed && (
                      <span style={{ marginLeft: 8, color: "var(--text)", fontWeight: 700, fontSize: 11 }}>
                        Opened
                      </span>
                    )}
                  </label>
                  {!!pdfUrl && !pdfViewed && (
                    <div className="ci-consentHint">{T('openPdfHint')}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Signature — show only after guest agrees to House Rules */}
            {agree && (
              <div style={{ marginTop: 6 }}>
                <label style={LABEL}>Signature*</label>
                <div
                  style={{
                    border: '1px dashed var(--border)',
                    background: 'var(--card)',
                    borderRadius: 10,
                    padding: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <small style={{ color: 'var(--muted)' }}>{T('signaturePrompt')}</small>
                    <button type="button" onClick={clearSignature} style={BTN_GHOST}>
                      Clear
                    </button>
                  </div>
                  <div style={{ width: '100%', height: 180 }}>
                    <canvas
                      ref={sigCanvasRef}
                      onPointerDown={onSigDown}
                      onPointerMove={onSigMove}
                      onPointerUp={onSigUp}
                      onPointerCancel={onSigUp}
                      onMouseDown={onSigMouseDown}
                      onMouseMove={onSigMouseMove}
                      onMouseUp={onSigMouseUp}
                      onMouseLeave={onSigMouseLeave}
                      onTouchStart={onSigTouchStart}
                      onTouchMove={onSigTouchMove}
                      onTouchEnd={onSigTouchEnd}
                      onTouchCancel={onSigTouchEnd}
                      style={{ width: '100%', height: '100%', touchAction: 'none', display: 'block', borderRadius: 8, background: '#fff', cursor: 'crosshair' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {submitState === "error" && errorMsg && (
              <div role="alert" style={{ padding: 12, borderRadius: 12, background: "var(--danger)", color: "#0c111b", fontWeight: 800 }}>
                {errorMsg}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "grid", gap: 10, justifyItems: isNarrow ? "stretch" : "center" }}>
              <button
                type="submit"
                disabled={!canSubmit}
                className="ci-actionBtn"
                style={{
                  width: "100%",
                  maxWidth: isNarrow ? undefined : 520,
                  margin: isNarrow ? undefined : "0 auto",
                }}
              >
                {submitState === "submitting" ? T('submitSubmitting') : T('submit')}
              </button>
            </div>
          </form>
        )}
      </section>
        </>
      )}

      {/* WhatsApp mini chat (available from the first screen; outside <form> to avoid privacy capture) */}
      {waPhoneDigits && (
        <div className="ci-waFab">
          <button
            type="button"
            className="ci-waPill"
            onClick={() => setWaOpen(true)}
            aria-label={T("waPill")}
            title={T("waPill")}
          >
            <img src="/logo_whatsapp.png" alt="" />
            <span>{T("waPill")}</span>
          </button>
        </div>
      )}

      {waOpen && waPhoneDigits && (
        <div
          className="ci-waOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="WhatsApp"
          onClick={() => setWaOpen(false)}
        >
          <div className="ci-waChat" onClick={(e) => e.stopPropagation()}>
            <div className="ci-waTop">
              <div className="ci-waTopTitle">
                <img src="/logo_whatsapp.png" alt="" style={{ width: 22, height: 22, display: "block", filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.16))" }} />
                <div style={{ minWidth: 0 }}>
                  WhatsApp{" "}
                  <small>
                    {(prop?.contact_phone || "").trim().length > 0
                      ? prop!.contact_phone
                      : `+${waPhoneDigits}`}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="ci-waClose"
                aria-label={lang === "ro" ? "Închide" : "Close"}
                onClick={() => setWaOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="ci-waMessages">
              <div className="ci-waBubble ci-waLeft">{T("waHello")}</div>
              {waText.trim().length > 0 && (
                <div className="ci-waBubble ci-waRight">{waText.trim()}</div>
              )}
            </div>

            <div className="ci-waComposer">
              <textarea
                ref={waInputRef}
                className="ci-waInput"
                rows={2}
                value={waText}
                onChange={(e) => setWaText(e.currentTarget.value)}
                placeholder={T("waPlaceholder")}
                aria-label={T("waPlaceholder")}
              />
              <button
                type="button"
                className="ci-waSend"
                aria-label={T("waSend")}
                title={T("waSend")}
                disabled={waText.trim().length === 0}
                onClick={() => {
                  const text = waText.trim();
                  if (!text) return;
                  const url = `https://wa.me/${waPhoneDigits}?text=${encodeURIComponent(text)}`;
                  try {
                    window.open(url, "_blank", "noopener,noreferrer");
                  } catch {
                    try { window.location.assign(url); } catch {}
                  }
                  setWaOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Companions wizard modal */}
      {companionsOpen && expectedCompanions > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setCompanionsOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 340, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", padding: 12 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="sb-card"
            style={{ width: "min(560px, 100%)", padding: 16 }}
          >
            {(() => {
              const total = guestCount;
              const index = Math.min(companionsIndex, Math.max(expectedCompanions - 1, 0));
              const currentNumber = index + 2; // guest numbering includes main guest
              const existing = companions[index] || {
                firstName: "",
                lastName: "",
                birthDate: "",
                citizenship: "",
                residenceCountry: "",
                isMinor: false,
                guardianName: "",
                docType: "",
                docSeries: "",
                docNumber: "",
                docNationality: "",
              };

              function update(field: keyof Companion, value: any) {
                setCompanions(prev => {
                  const next = [...prev];
                  while (next.length < expectedCompanions) {
                    next.push({
                      firstName: "",
                      lastName: "",
                      birthDate: "",
                      citizenship: "",
                      residenceCountry: "",
                      isMinor: false,
                      guardianName: "",
                      docType: "",
                      docSeries: "",
                      docNumber: "",
                      docNationality: "",
                    });
                  }
                  next[index] = { ...next[index], [field]: value };
                  return next;
                });
              }

              function onNext() {
                const c = companions[index] || existing;
                if (!validateCompanion(c)) {
                  setCompanionsError((TXT as any)[lang].companionMissing);
                  return;
                }
                setCompanionsError("");
                if (index < expectedCompanions - 1) {
                  setCompanionsIndex(index + 1);
                } else {
                  setCompanionsOpen(false);
                }
              }

              function onBack() {
                if (index > 0) {
                  setCompanionsIndex(index - 1);
                  setCompanionsError("");
                }
              }

              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <strong>
                      {(TXT as any)[lang].companionTitle(currentNumber, total)}
                    </strong>
                    <button
                      type="button"
                      onClick={() => setCompanionsOpen(false)}
                      aria-label="Close"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>×</span>
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div
                      style={{
                        display: "grid",
                        gap: 12,
                        gridTemplateColumns: isSmall ? "1fr" : "repeat(2, minmax(0, 1fr))",
                      }}
                    >
                      <div>
                        <label style={LABEL_ROW}>
                          <Image src={formIcon("firstname")} alt="" width={16} height={16} />
                          <span>{T('firstName').replace('*', '')}</span>
                        </label>
                        <input
                          style={INPUT}
                          value={existing.firstName}
                          onChange={e => update("firstName", e.currentTarget.value)}
                        />
                      </div>
                      <div>
                        <label style={LABEL_ROW}>
                          <Image src={formIcon("lastname")} alt="" width={16} height={16} />
                          <span>{T('lastName').replace('*', '')}</span>
                        </label>
                        <input
                          style={INPUT}
                          value={existing.lastName}
                          onChange={e => update("lastName", e.currentTarget.value)}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gap: 12,
                        gridTemplateColumns: isSmall ? "1fr" : "repeat(2, minmax(0, 1fr))",
                      }}
                    >
                      <div>
                        <label style={{ ...LABEL, display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{(TXT as any)[lang].birthDate}</span>
                          <svg
                            width={16}
                            height={16}
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            style={{ display: "block", flexShrink: 0 }}
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="4.5"
                              fill="none"
                              stroke="#6b7280"
                              strokeWidth={1.6}
                            />
                            <line
                              x1="12"
                              y1="2.5"
                              x2="12"
                              y2="5.5"
                              stroke="#6b7280"
                              strokeWidth={1.4}
                              strokeLinecap="round"
                            />
                            <line
                              x1="12"
                              y1="18.5"
                              x2="12"
                              y2="21.5"
                              stroke="#6b7280"
                              strokeWidth={1.4}
                              strokeLinecap="round"
                            />
                            <line
                              x1={4.22}
                              y1={4.22}
                              x2={6.0}
                              y2={5.98}
                              stroke="#6b7280"
                              strokeWidth={1.4}
                              strokeLinecap="round"
                            />
                            <line
                              x1={18.0}
                              y1={18.0}
                              x2={19.78}
                              y2={19.78}
                              stroke="#6b7280"
                              strokeWidth={1.4}
                              strokeLinecap="round"
                            />
                            <line
                              x1={2.5}
                              y1={12}
                              x2={5.5}
                              y2={12}
                              stroke="#6b7280"
                              strokeWidth={1.4}
                              strokeLinecap="round"
                            />
                            <line
                              x1={18.5}
                              y1={12}
                              x2={21.5}
                              y2={12}
                              stroke="#6b7280"
                              strokeWidth={1.4}
                              strokeLinecap="round"
                            />
                            <line
                              x1={4.22}
                              y1={19.78}
                              x2={6.0}
                              y2={18.02}
                              stroke="#6b7280"
                              strokeWidth={1.4}
                              strokeLinecap="round"
                            />
                            <line
                              x1={18.0}
                              y1={6.0}
                              x2={19.78}
                              y2={4.22}
                              stroke="#6b7280"
                              strokeWidth={1.4}
                              strokeLinecap="round"
                            />
                          </svg>
                        </label>
                        <input
                          type="date"
                          style={{
                            ...INPUT,
                            WebkitAppearance: "none",
                            appearance: "none",
                          }}
                          value={existing.birthDate}
                          onChange={e => update("birthDate", e.currentTarget.value)}
                        />
                      </div>
                      <div>
                        <label style={LABEL_ROW}>
                          <Image src={formIcon("country")} alt="" width={16} height={16} />
                          <span>{T('nationality').replace('*', '')}</span>
                        </label>
                        <Combobox
                          value={existing.citizenship}
                          onCommit={(v) => update("citizenship", v)}
                          options={countries.map(c => c.name)}
                          placeholder="Start typing… e.g. Romania"
                          minChars={0}
                          inputStyle={INPUT}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={LABEL_ROW}>
                        <Image src={formIcon("country")} alt="" width={16} height={16} />
                        <span>{(TXT as any)[lang].residenceCountry}</span>
                      </label>
                      <Combobox
                        value={existing.residenceCountry}
                        onCommit={(v) => update("residenceCountry", v)}
                        options={countries.map(c => c.name)}
                        placeholder="Start typing… e.g. Romania"
                        minChars={0}
                        inputStyle={INPUT}
                      />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={existing.isMinor}
                        onChange={e => update("isMinor", e.currentTarget.checked)}
                      />
                      <span>{(TXT as any)[lang].isMinor}</span>
                    </label>
                    {existing.isMinor ? (
                      <div>
                        <label style={LABEL}>{(TXT as any)[lang].guardianLabel}</label>
                        <input
                          style={INPUT}
                          value={existing.guardianName}
                          onChange={e => update("guardianName", e.currentTarget.value)}
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label style={LABEL_ROW}>
                            <Image src={formIcon("id")} alt="" width={16} height={16} />
                            <span>{T('docTypeLabel').replace('*', '')}</span>
                          </label>
                          <select
                            style={SELECT}
                            value={existing.docType}
                            onChange={e => update("docType", e.currentTarget.value as CompanionDocType)}
                          >
                            <option value="">{T('selectDocType')}</option>
                            <option value="id_card">{T('docOptionId')}</option>
                            <option value="passport">{T('docOptionPassport')}</option>
                          </select>
                        </div>
                        {!existing.isMinor && existing.docType === "id_card" && (
                          <div style={ROW_2}>
                            <div>
                              <label style={LABEL}>Series*</label>
                              <input
                                style={INPUT}
                                value={existing.docSeries}
                                onChange={e => update("docSeries", e.currentTarget.value.toUpperCase())}
                              />
                            </div>
                            <div>
                              <label style={LABEL}>Number*</label>
                              <input
                                style={INPUT}
                                value={existing.docNumber}
                                onChange={e => update("docNumber", e.currentTarget.value)}
                              />
                            </div>
                          </div>
                        )}
                        {!existing.isMinor && existing.docType === "passport" && (
                          <div>
                            <label style={LABEL}>Number*</label>
                            <input
                              style={INPUT}
                              value={existing.docNumber}
                              onChange={e => update("docNumber", e.currentTarget.value)}
                            />
                          </div>
                        )}
                      </>
                    )}
                    {companionsError && (
                      <div style={{ fontSize: 12, color: "var(--danger)", fontWeight: 700 }}>
                        {companionsError}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        className="sb-btn"
                        onClick={onBack}
                        disabled={index === 0}
                      >
                        {(TXT as any)[lang].back}
                      </button>
                      <button
                        type="button"
                        className="sb-btn sb-btn--primary"
                        onClick={onNext}
                      >
                        {index < expectedCompanions - 1 ? (TXT as any)[lang].next : (TXT as any)[lang].saveAndClose}
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Confirmation email modal */}
      {confirmOpen && (
        <div role="dialog" aria-modal="true" onClick={()=>{ if (confirmStatus !== 'sending') setConfirmOpen(false); }}
          style={{
            position:'fixed',
            inset:0,
            zIndex: 300,
            background:'rgba(0,0,0,.55)',
            WebkitBackdropFilter:'blur(6px)',
            backdropFilter:'blur(6px)',
            display:'grid',
            placeItems:'center',
            padding:12
          }}>
          <div
            ref={confirmCardRef}
            tabIndex={-1}
            onClick={(e)=>e.stopPropagation()}
            className="sb-card"
            style={{ width:'min(540px, 100%)', padding:16 }}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <strong>{T('confirmEmailTitle')}</strong>
              {confirmStatus !== 'sending' && (
                <button className="sb-btn" onClick={()=>setConfirmOpen(false)}>Close</button>
              )}
            </div>
            {confirmStatus === 'sending' && (
              <div aria-live="polite" style={{ display:'grid', gap:10 }}>
                <div
                  style={{
                    display:'inline-flex',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:10,
                    padding:'10px 12px',
                    borderRadius: 999,
                    border:'1px solid var(--border)',
                    background:'rgba(255,255,255,0.68)',
                    WebkitBackdropFilter:'blur(10px) saturate(130%)',
                    backdropFilter:'blur(10px) saturate(130%)',
                    boxShadow:'0 10px 20px rgba(0,0,0,0.10)',
                    width:'fit-content',
                  }}
                >
                  <span className="p4h-dots" aria-hidden>
                    <span className="p4h-dot" />
                    <span className="p4h-dot" />
                    <span className="p4h-dot" />
                  </span>
                  <span style={{ fontWeight: 800 }}>
                    {lang === 'ro' ? 'Se trimite…' : 'Sending…'}
                  </span>
                </div>
                <small style={{ color:'var(--muted)' }}>{T('confirmEmailWait')}</small>
              </div>
            )}
            {confirmStatus === 'sent' && (
              <div style={{ display:'grid', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span className="sb-badge" style={{ background:'var(--primary)', color:'#0c111b', borderColor:'var(--primary)' }}>Sent</span>
                  <span>
                    {lang === 'ro'
                      ? 'Am trimis un email de confirmare la adresa ta.'
                      : 'We sent a confirmation email to your address.'}
                  </span>
                </div>
                {qrUrl && (
                  <div style={{ display:'grid', gap:6, justifyItems:'center', border:'1px solid var(--border)', borderRadius:12, padding:12 }}>
                    <div style={{ fontWeight:800 }}>{lang === 'ro' ? 'Codul tău QR' : 'Your QR code'}</div>
                    <QrWithLogo data={qrUrl} size={240} radius={16} logoSrc="/p4h_logo_round_QR.png" logoAlt="Plan4Host" />
                    <small style={{ color:'var(--muted)', wordBreak:'break-all' }}>{qrUrl}</small>
                  </div>
                )}
              </div>
            )}
            {confirmStatus === 'error' && (
              <div style={{ display:'grid', gap:8 }}>
                <div style={{ padding: 10, borderRadius: 10, background:'var(--danger)', color:'#0c111b', fontWeight:800 }}>
                  {lang === 'ro' ? 'Eroare la trimiterea emailului de confirmare.' : 'Error sending confirmation email.'}
                </div>
                <small style={{ color:'var(--muted)' }}>
                  {lang === 'ro'
                    ? 'Poți încerca din nou mai târziu sau poți contacta proprietatea direct.'
                    : 'You can try again later or contact the property directly.'}
                </small>
              </div>
            )}
            {confirmStatus !== 'sending' && (
              <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end' }}>
                <button className="sb-btn" onClick={()=>setConfirmOpen(false)}>OK</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Privacy Policy modal (first interaction gate) */}
      {privacyOpen && (
        <div role="dialog" aria-modal="true" onClick={()=>setPrivacyOpen(false)}
          style={{ position:'fixed', inset:0, zIndex: 320, background:'rgba(0,0,0,.55)', display:'grid', placeItems:'center', padding:12 }}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(560px, 100%)', padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <strong>{T('privacyTitle')}</strong>
              <button className="sb-btn" onClick={()=>setPrivacyOpen(false)}>Close</button>
            </div>
            <div style={{ display:'grid', gap:10 }}>
              <p style={{ margin:0, color:'var(--muted)' }}>
                {T('privacyPrompt').replace('Privacy Policy', '')}
                <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" onClick={()=>setPrivacyVisited(true)} style={{ color:'var(--primary)', fontWeight:800 }}>Privacy Policy</a>.
              </p>
              <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="checkbox" checked={privacyConfirm} onChange={(e)=>setPrivacyConfirm(e.currentTarget.checked)} />
                <span>{T('privacyAcknowledge')}</span>
              </label>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                <button className="sb-btn" onClick={()=>setPrivacyOpen(false)} disabled={privacySaving}>Cancel</button>
                <button className="sb-btn sb-btn--primary" disabled={!privacyConfirm || privacySaving} onClick={acceptPrivacyAck}>
                  {privacySaving ? 'Saving…' : T('privacyConfirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p style={{ color: "var(--muted)", textAlign: "center", fontSize: 12 }}>
        Powered by Plan4Host — secure check-in.
      </p>
    </div>
  );
}
