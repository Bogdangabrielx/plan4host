// app/app/guestOverview/ui/GuestOverviewClient.tsx
"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import QrWithLogo from "@/components/QrWithLogo";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "@/app/app/_components/HeaderContext";
import { usePersistentPropertyState } from "@/app/app/_components/PropertySelection";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import RoomDetailModal from "@/app/app/calendar/ui/RoomDetailModal";

/* ───────────────── Types ───────────────── */

type Property = {
  id: string;
  name: string;
  check_in_time: string | null;
  check_out_time: string | null;
  regulation_pdf_url?: string | null;
};
type Room = { id: string; name: string; property_id: string; room_type_id?: string | null };
type Lang = "en" | "ro";

type OverviewRow = {
  id: string | null;               // booking id
  property_id: string;
  room_id: string | null;
  start_date: string;
  end_date: string;
  status: "green" | "yellow" | "red";
  has_started?: boolean;
  _room_label?: string | null;
  _room_type_id?: string | null;
  _room_type_name?: string | null;
  _ota_provider?: string | null;
  _ota_color?: string | null;
  _ota_logo_url?: string | null;
  _reason?:
    | "waiting_form"
    | "waiting_ical"
    | "missing_form"
    | "no_ota_found"
    | "type_conflict"
    | "room_required_auto_failed"
    | null;
  _cutoff_ts?: string | null;
  _guest_first_name?: string | null;
  _guest_last_name?: string | null;
};

/* ───────────────── Helpers ───────────────── */

function fmtDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}
function formatRange(a: string, b: string) {
  return `${fmtDate(a)} → ${fmtDate(b)}`;
}
function fullName(item: OverviewRow): string {
  const f = (item._guest_first_name ?? "").trim();
  const l = (item._guest_last_name ?? "").trim();
  return [f, l].filter(Boolean).join(" ").trim() || "—";
}

function statusLabel(kind: OverviewRow["status"], lang: Lang): string {
  if (lang === "ro") {
    if (kind === "green") return "Rezervare confirmata";
    if (kind === "yellow") return "Asteapta camera";
    return "Rezervare necorelata";
  }
  if (kind === "green") return "Confirmed booking";
  if (kind === "yellow") return "Awaiting room";
  return "Mismatched booking";
}

/** Solid badge colors (same on light/dark) */
const STATUS_COLOR: Record<OverviewRow["status"], string> = {
  green: "#6CCC4C",
  yellow: "#F1D82C",
  red: "#ED4337",
};

function statusTooltip(row: OverviewRow, lang: Lang): string | undefined {
  const s = row.status === "green" && !row.room_id ? "yellow" : row.status;
  if (s === "yellow") return lang === "ro" ? "Selecteaza o camera pentru confirmare." : "Select a room to confirm.";
  return undefined;
}

function getCheckinBase(): string {
  const v1 = (process.env.NEXT_PUBLIC_CHECKIN_BASE || "").toString().trim();
  if (v1) return v1.replace(/\/+$/, "");
  const v2 = (process.env.NEXT_PUBLIC_APP_URL || "").toString().trim();
  if (v2) return v2.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return "";
}
function buildPropertyCheckinLink(propertyId: string): string {
  const base = getCheckinBase();
  try {
    const u = new URL(base);
    const normalized = u.pathname.replace(/\/+$/, "");
    u.pathname = `${normalized}/checkin`;
    u.search = new URLSearchParams({ property: propertyId }).toString();
    return u.toString();
  } catch {
    return `${base.replace(/\/+$/, "")}/checkin?property=${encodeURIComponent(propertyId)}`;
  }
}

// normalize pentru căutare (fără diacritice)
function norm(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const raw = text;
  const rx = new RegExp(escapeRegExp(query), "ig");
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(raw))) {
    const start = m.index;
    const end = m.index + m[0].length;
    if (start > last) parts.push(raw.slice(last, start));
    parts.push(
      <mark
        key={start}
        style={{ background: "color-mix(in srgb, var(--primary) 25%, transparent)", padding: "0 2px", borderRadius: 4 }}
      >
        {raw.slice(start, end)}
      </mark>
    );
    last = end;
  }
  if (last < raw.length) parts.push(raw.slice(last));
  return parts;
}

// Render {{token}} as chip HTML for titles (safe)
function rmTitleToChips(title: string): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] as string));
  const s = String(title || '');
  return s.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => `<span class=\"rm-token\" data-token=\"${esc(k)}\" contenteditable=\"false\">${esc(k)}</span>`);
}

/** Mobile-safe clipboard (desktop + iOS Safari fallback) */
async function copyTextMobileSafe(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (!ok) throw new Error("execCommand failed");
      return true;
    } catch {
      // Silent fallback (no prompt UI)
      return false;
    }
  }
}

/* ───────────────── Small/Mobile detection + tap helper ───────────────── */

function useIsSmall() {
  const [isSmall, setIsSmall] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(max-width: 560px), (pointer: coarse)")?.matches ?? false;
  });
  useEffect(() => {
    const mq = window.matchMedia?.("(max-width: 560px), (pointer: coarse)");
    const on = (e: MediaQueryListEvent) => setIsSmall(e.matches);
    try { mq?.addEventListener("change", on); } catch { mq?.addListener?.(on); }
    return () => {
      try { mq?.removeEventListener("change", on); } catch { mq?.removeListener?.(on); }
    };
  }, []);
  return isSmall;
}

function useTap(handler: () => void) {
  return {
    // Click handler (works for mouse, touch and keyboard)
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      handler();
    },
  };
}

/* ───────────────── Component ───────────────── */

export default function GuestOverviewClient({ initialProperties }: { initialProperties: Property[] }) {
  const supabase = createClient();
  const { setPill } = useHeader();
  const [lang, setLang] = useState<Lang>("en");

  // Theme-aware icons (for light/dark)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark") return true;
    if (attr === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
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
    const root = document.documentElement;
    const ob = new MutationObserver(() => {
      const t = root.getAttribute("data-theme");
      if (t === "dark") setIsDark(true);
      if (t === "light") setIsDark(false);
    });
    ob.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => ob.disconnect();
  }, []);
  const iconSrc = useCallback((base: "logoguest" | "room" | "night" | "copy") => {
    return isDark ? `/${base}_fordark.png` : `/${base}_forlight.png`;
  }, [isDark]);
  const iconStyle: React.CSSProperties = { width: 16, height: 16, flex: "0 0 auto", opacity: 0.95 };
  const lineWrap: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, minWidth: 0 };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const readLang = (): Lang => {
      try {
        const ls = localStorage.getItem("app_lang");
        if (ls === "ro" || ls === "en") return ls;
      } catch {}
      try {
        const ck = document.cookie
          .split("; ")
          .find((x) => x.startsWith("app_lang="))
          ?.split("=")[1];
        if (ck === "ro" || ck === "en") return ck;
      } catch {}
      return "en";
    };
    setLang(readLang());
    const onStorage = () => setLang(readLang());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const t = {
    title: lang === "ro" ? "Oaspeti" : "Guest Overview",
    iosHint:
      lang === "ro"
        ? "Pe iPhone, instaleaza aplicatia pentru notificari: Share → Add to Home Screen."
        : "On iPhone, install the app to enable notifications: Share → Add to Home Screen.",
    gotIt: lang === "ro" ? "Am inteles" : "Got it",
    searchPlaceholder: lang === "ro" ? "Cauta nume oaspete…" : "Search guest name…",
    searchAria: lang === "ro" ? "Cauta nume oaspete" : "Search guest name",
    clearSearch: lang === "ro" ? "Sterge cautarea" : "Clear search",
    showPast: lang === "ro" ? "Arata rezervari trecute" : "Show past reservations",
    hidePast: lang === "ro" ? "Ascunde rezervari trecute" : "Hide past reservations",
    showPastShort: lang === "ro" ? "Arata trecute" : "Show past",
    hidePastShort: lang === "ro" ? "Ascunde trecute" : "Hide past",
    room: lang === "ro" ? "Camera" : "Room",
    type: lang === "ro" ? "Tip" : "Type",
    unknownGuest: lang === "ro" ? "Oaspete necunoscut" : "Unknown guest",
    openReservation: lang === "ro" ? "Deschide rezervarea" : "Open reservation",
    noRoomAssigned: lang === "ro" ? "Nicio camera alocata" : "No room assigned yet",
    modifyBooking: lang === "ro" ? "Modifica rezervarea" : "Modify booking",
    confirmBooking: lang === "ro" ? "Confirma rezervarea" : "Confirm booking",
    seeQr: lang === "ro" ? "Vezi codul QR" : "See QR code",
    allowAccess: lang === "ro" ? "Permite accesul" : "Allow access",
    noGuestsMatch: lang === "ro" ? "Niciun oaspete nu corespunde cautarii." : "No guests match your search.",
    empty1: lang === "ro" ? "🟢 Nicio cazare inceputa inca." : "🟢 No check-ins yet.",
    empty2:
      lang === "ro"
        ? "Formularele completate de oaspeti vor aparea aici pentru confirmare."
        : "Guest submissions will appear here for confirmation.",
    emptyTip:
      lang === "ro"
        ? "Tip: Adauga linkul de check-in in mesajele automate de pe Airbnb, Booking sau alte platforme ca sa activezi fluxul complet."
        : "Tip: Add your check-in link to your automatic messages on Airbnb, Booking, or other platforms to activate the full flow.",
    qrCode: lang === "ro" ? "Cod QR" : "QR code",
    close: lang === "ro" ? "Inchide" : "Close",
    allowGuestAccess: lang === "ro" ? "Permite accesul oaspetelui" : "Allow guest access",
    allowGuestAccessText:
      lang === "ro"
        ? "Daca permiti accesul acum, rezervarea va fi marcata ca inceputa, iar oaspetele va vedea codurile si instructiunile programate in mesajele automate."
        : "If you allow access now, this booking will be treated as started and the guest will be able to see any access codes and instructions that you have scheduled in automatic messages.",
    allowAccessNow: lang === "ro" ? "Permite accesul acum" : "Allow access now",
    applying: lang === "ro" ? "Se aplica…" : "Applying…",
  } as const;

  // Responsive (small/mobile)
  const isSmall = useIsSmall();

  // Properties & selection
  const [properties, setProperties] = useState<Property[]>(initialProperties || []);
  const { propertyId: activePropertyId, setPropertyId: setActivePropertyId, ready: propertyReady } = usePersistentPropertyState(properties);
  const [openActions, setOpenActions] = useState<Set<string>>(() => new Set());
  // Cache property presentation images (for avatar in pill selector)
  const [propertyPhotos, setPropertyPhotos] = useState<Record<string, string | null>>({});
  const [accessPopup, setAccessPopup] = useState<{ formId: string; guestName: string } | null>(null);
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessFeedback, setAccessFeedback] = useState<string | null>(null);

  // Load presentation image for selected property (once per id)
  useEffect(() => {
    (async () => {
      if (!propertyReady || !activePropertyId) return;
      if (propertyPhotos[activePropertyId] !== undefined) return;
      try {
        const r = await supabase
          .from('properties')
          .select('presentation_image_url')
          .eq('id', activePropertyId)
          .maybeSingle();
        const url = (r.data as any)?.presentation_image_url || null;
        setPropertyPhotos(prev => ({ ...prev, [activePropertyId]: url }));
      } catch {
        setPropertyPhotos(prev => ({ ...prev, [activePropertyId]: null }));
      }
    })();
  }, [activePropertyId, supabase, propertyPhotos, propertyReady]);

  // Selection is restored by usePersistentPropertyState (URL + localStorage sync).

  // Data
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<OverviewRow[]>([]);
  const [loading, setLoading] = useState<"idle" | "loading" | "error">("idle");

  // Search (guest name)
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  // UX small bits (removed copy link UI)

  // Modals
  const [modal, setModal] = useState<
    | null
    | {
        propertyId: string;
        dateStr: string;
        room: Room;
        defaultStart?: { date: string; time: string | null };
        defaultEnd?: { date: string; time: string | null };
      }
  >(null);
  // Automatic messages UI removed per request
  const [editModal, setEditModal] = useState<null | { propertyId: string; bookingId: string; confirmOnSave?: boolean }>(null);
  const [qrModal, setQrModal] = useState<null | { bookingId: string; url: string }>(null);

  // Legend popovers
  const [legendInfo, setLegendInfo] = useState<null | "green" | "yellow" | "red">(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      let el = e.target as HTMLElement | null;
      while (el) {
        if ((el as HTMLElement).dataset?.legend === "keep") return;
        el = el.parentElement as HTMLElement | null;
      }
      setLegendInfo(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Permissions
  const [canEditGuest, setCanEditGuest] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        const me = j?.me as { role?: string; disabled?: boolean } | undefined;
        if (!me || me.disabled) { setCanEditGuest(false); return; }
        setCanEditGuest(me.role === "admin" || me.role === "editor");
      } catch { setCanEditGuest(false); }
    })();
  }, []);

  // Refresh client-side
  const refresh = useCallback(async () => {
    if (!activePropertyId) return;
    const pid = activePropertyId; // snapshot pentru a preveni race după schimbarea proprietății
    // secvență pentru ignorarea răspunsurilor vechi
    (refresh as any)._seq = ((refresh as any)._seq || 0) + 1;
    const seq: number = (refresh as any)._seq;
    setLoading("loading");
    setPill("Loading…");

    const [rRooms] = await Promise.all([
      supabase
        .from("rooms")
        .select("id,name,property_id,room_type_id")
        .eq("property_id", pid)
        .order("name", { ascending: true }),
    ]);

    // dacă între timp s-a schimbat proprietatea sau există un refresh mai nou, ignoră
    if (pid !== activePropertyId || seq !== (refresh as any)._seq) return;

    if (rRooms.error) {
      setLoading("error");
      setPill("Error");
      return;
    }
    setRooms((rRooms.data ?? []) as Room[]);

    try {
      const res = await fetch(`/api/guest-overview?property=${encodeURIComponent(pid)}`, { cache: "no-store", keepalive: true });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      const arr: OverviewRow[] = Array.isArray(j?.items) ? j.items : [];
      if (pid !== activePropertyId || seq !== (refresh as any)._seq) return;
      setItems(arr);
      setLoading("idle");
      setPill("Idle");
    } catch {
      if (pid !== activePropertyId || seq !== (refresh as any)._seq) return;
      setLoading("error");
      setPill("Error");
    }
  }, [activePropertyId, supabase, setPill]);

  useEffect(() => {
    setProperties(initialProperties || []);
  }, [initialProperties]);

  // Clear UI immediately when property changes to avoid showing previous property's data
  useEffect(() => {
    // close modals tied to previous property
    setModal(null);
    setEditModal(null);
    // clear lists
    setRooms([]);
    setItems([]);
    setLoading("loading");
    setPill("Loading…");
  }, [activePropertyId, setPill]);

  useEffect(() => { if (propertyReady) refresh(); }, [propertyReady, refresh]);

  // Maps & sorting
  const roomById = useMemo(() => {
    const m = new Map<string, Room>();
    rooms.forEach((r) => m.set(String(r.id), r));
    return m;
  }, [rooms]);

  const collator = useMemo(() => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }), []);
  const rows = useMemo(() => {
    return [...items].sort((a, b) => {
      const d = a.start_date.localeCompare(b.start_date);
      if (d !== 0) return d;
      return collator.compare(a._room_label ?? "", b._room_label ?? "");
    });
  }, [items, collator]);

  // Filter by name
  const [showPast, setShowPast] = useState(false);
  const todayYmd = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }, []);
  const visibleRows = useMemo(() => {
    let arr = rows;
    if (!showPast) {
      // keep only items whose checkout (end_date) is today or in the future
      arr = arr.filter((r) => (r.end_date || '') >= todayYmd);
    }
    const q = norm(query);
    if (q) arr = arr.filter((r) => norm(fullName(r)).includes(q));
    return arr;
  }, [rows, query, showPast, todayYmd]);

  // Styles
  const containerStyle: React.CSSProperties = {
    // Rely on AppShell for centering and maxWidth. Keep only inner padding.
    padding: isSmall ? "10px 12px 16px" : "16px",
  };
  // property selector inherits look from global .sb-select
  const badgeStyle = (kind: OverviewRow["status"]): React.CSSProperties => ({
    display: "inline-block",
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 999,
    border: "1px solid " + STATUS_COLOR[kind],
    background: STATUS_COLOR[kind],
    color: "#ffffff",
    letterSpacing: 0.0,
  });
  // OTA badge helpers
  function builtinLogo(provider?: string | null): string | null {
    const p = (provider || "").toLowerCase();
    if (p.includes("booking")) return "/booking.png";
    if (p.includes("airbnb")) return "/airbnb.png";
    if (p.includes("expedia")) return "/expedia.png";
    if (p.includes("trivago")) return "/trivago.png";
    if (p.includes("lastminute")) return "/lastminute.png";
    if (p.includes("travelminit")) return "/travelminit.png";
    if (p.includes("manual") || !p) return "/P4H_ota.png"; // Manual fallback logo
    return "/P4H_ota.png"; // unknown → manual logo as safe default
  }
  function defaultOtaColor(provider?: string | null): string {
    const s = (provider || "").toLowerCase();
    if (s.includes("airbnb")) return "rgba(255, 90, 96, 0.81)";
    if (s.includes("booking")) return "rgba(30, 143, 255, 0.90)";
    if (s.includes("expedia")) return "rgba(254,203,46,0.81)";
    if (s.includes("trivago")) return "linear-gradient(90deg, #ec7163ff 0%, #f2a553ff 50%, #3eadd7 100%)";
    if (s.includes("lastminute")) return "#d493baff";
    if (s.includes("travelminit")) return "#a4579f";
    if (s.includes("manual") || !s) return "#6CCC4C"; // Manual green
    return "#6CCC4C"; // unknown → manual green as safe default
  }
  function OtaBadge({ provider, color, logo, fullWidth }: { provider?: string | null; color?: string | null; logo?: string | null; fullWidth?: boolean }) {
    const show = !!(provider || logo);
    if (!show) return null;
    const bg = (color && color.trim()) || defaultOtaColor(provider || "");
    const src = (logo && logo.trim()) || builtinLogo(provider) || null;
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 21,
        background: bg,
        color: "#0c111b",
        border: "1px solid var(--border)",
        fontSize: 12,
        fontWeight: 400,
        width: fullWidth ? "100%" : undefined,
      }} title={provider || undefined}>
        {src ? <img src={src} alt="" width={16} height={16} style={{ borderRadius: 4 }} /> : <span style={{ width: 12, height: 12, borderRadius: 999, background: "#fff", display: "inline-block" }} />}
        <span>{provider || "OTA"}</span>
      </span>
    );
  }

  // Derive OTA badge meta (including temporary manual fallback for testing)
  function otaMetaForRow(it: OverviewRow, _kind: OverviewRow["status"]): { provider?: string | null; color?: string | null; logo?: string | null } | null {
    const hasOta = !!(it._ota_provider || it._ota_color || it._ota_logo_url);
    if (hasOta) return { provider: it._ota_provider, color: it._ota_color as any, logo: it._ota_logo_url as any };
    // Fallback: Manual (green) with Plan4Host OTA logo
    return { provider: 'Manual', color: '#6CCC4C', logo: '/P4H_ota.png' };
  }
  const BTN_TOUCH_STYLE: React.CSSProperties = {
    padding: "12px 14px",
    minHeight: 44,
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };

  // Actions (copy link removed)

  function resolveInCalendar(item: OverviewRow) {
    if (typeof window !== "undefined") window.location.href = `/app/calendar?date=${item.start_date}`;
  }
  function openReservation(item: OverviewRow, propertyId: string) {
    if (!item.room_id) { alert(lang === "ro" ? "Aceasta rezervare nu are camera alocata inca." : "This booking has no assigned room yet."); return; }
    const room = roomById.get(String(item.room_id));
    if (!room) { alert(lang === "ro" ? "Camera nu a fost gasita local. Incearca un refresh." : "Room not found locally. Try refreshing."); return; }
    setModal({
      propertyId,
      dateStr: item.start_date,
      room,
      defaultStart: { date: item.start_date, time: null },
      defaultEnd: { date: item.end_date, time: null },
    });
  }

  // Header pill
  useEffect(() => {
    if (loading === "loading") setPill("Loading…");
    else if (loading === "error") setPill("Error");
    else setPill("Idle");
  }, [loading, setPill]);

  // Auto-prompt for push notifications on first user gesture
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let asked = false;
    try { asked = localStorage.getItem('p4h:push:asked') === '1'; } catch {}
    if (asked) return;
    const handler = () => {
      try {
        if (!('Notification' in window)) return;
        // Ask permission first, synchronously in gesture
        Notification.requestPermission().then(async (perm) => {
          try {
            if (perm === 'granted') {
              // Then register SW and subscribe
              if (!('serviceWorker' in navigator)) return;
              const reg = await navigator.serviceWorker.register('/sw.js');
              const keyB64 = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || (window as any).NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').toString();
              const urlBase64ToUint8Array = (base64: string) => {
                const padding = '='.repeat((4 - (base64.length % 4)) % 4);
                const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
                const rawData = atob(base64Safe);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
                return outputArray;
              };
              const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(keyB64) });
              const ua = navigator.userAgent || '';
              const os = (document.documentElement.getAttribute('data-os') || '');
              await fetch('/api/push/subscribe', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: sub.toJSON(), property_id: activePropertyId, ua, os })
              });
            }
          } finally {
            // Mark asked only if user decided (granted/denied)
            if (perm !== 'default') { try { localStorage.setItem('p4h:push:asked', '1'); } catch {} }
          }
        });
      } catch { /* ignore */ }
    };
    window.addEventListener('pointerdown', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handler as any);
      window.removeEventListener('keydown', handler as any);
    };
  }, [activePropertyId]);

  // iOS hint: suggest installing PWA to enable notifications
  const [showIosHint, setShowIosHint] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const root = document.documentElement;
      const os = root.getAttribute('data-os');
      const standalone = root.getAttribute('data-standalone') === 'true';
      const perm = (window as any).Notification ? Notification.permission : 'default';
      const dismissed = localStorage.getItem('p4h:iosPwaHint:dismissed') === '1';
      if (os === 'ios' && !standalone && perm === 'default' && !dismissed) {
        setShowIosHint(true);
      }
    } catch {}
  }, []);

  return (
    <div style={{ fontFamily: "inherit", color: "var(--text)" }}>
      <PlanHeaderBadge title={t.title} slot="under-title" />

      <div style={containerStyle}>
        {/* Controls (sb-toolbar as in Calendar) */}
        <div className="sb-toolbar" style={{ gap: isSmall ? 12 : 20, flexWrap: 'wrap', marginBottom: 12 }}>
          <div
            className="modalCard Sb-cardglow"
            style={{
              position: 'relative',
              display: isSmall ? 'grid' : 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: isSmall ? '8px 10px 8px 56px' : '6px 10px 6px 56px',
              borderRadius: 999,
              minHeight: 56,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              width: isSmall ? '100%' : undefined,
              flexBasis: isSmall ? '100%' : 'auto',
              flex: isSmall ? '1 1 100%' : undefined,
            }}
          >
            {activePropertyId && propertyPhotos[activePropertyId] ? (
              <img
                src={propertyPhotos[activePropertyId] as string}
                alt=""
                width={40}
                height={40}
                style={{ position: 'absolute', left: 8, width: 40, height: 40, borderRadius: 999, objectFit: 'cover', border: '2px solid var(--card)' }}
              />
            ) : null}
            <select
              className="sb-select"
              value={activePropertyId}
              onChange={(e) => setActivePropertyId((e.target as HTMLSelectElement).value)}
              style={{
                background: 'transparent',
                border: '0',
                boxShadow: 'none',
                padding: '10px 12px',
                minHeight: 44,
                minWidth: isSmall ? '100%' : 220,
                maxWidth: isSmall ? '100%' : 380,
                width: isSmall ? '100%' : 'auto',
                fontWeight: 700,
                fontFamily: 'inherit',
              }}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {/* break after pill on phones */}
          {isSmall && <div style={{ flexBasis: '100%', height: 8 }} />}
          {false && (
            <button
              className="sb-btn"
              {...useTap(refresh)}
              style={{ ...BTN_TOUCH_STYLE, borderRadius: 10 }}
              title="Refresh"
              type="button"
            >
              Refresh
            </button>
          )}
        </div>

        {showIosHint && (
          <div className="sb-card" style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              {t.iosHint}
            </div>
            <button
              className="sb-btn sb-btn--small"
              onClick={() => { try { localStorage.setItem('p4h:iosPwaHint:dismissed', '1'); } catch {}; setShowIosHint(false); }}
            >
              {t.gotIt}
            </button>
          </div>
        )}

        {/* Search */}
        <div style={{ display: "flex", justifyContent: "stretch", marginBottom: 12 }}>
          <div style={{ position: "relative", width: "100%" }}>
            <svg viewBox="0 0 24 24" aria-hidden="true" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, opacity: 0.7 }}>
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 5 1.5-1.5-5-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              onFocus={() => { try { window.dispatchEvent(new Event('p4h:nav:hide')); } catch {} }}
              onBlur={() => { try { window.dispatchEvent(new Event('p4h:nav:show')); } catch {} }}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchAria}
              style={{
                width: "100%",
                padding: "10px 12px 10px 36px",
                background: "var(--card)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 29,
                fontWeight: 700,
                fontFamily: "inherit",
                outline: "none",
                minHeight: 44,
              }}
            />
            {query && (
              <button
                type="button"
                aria-label={t.clearSearch}
                {...useTap(() => { setQuery(""); searchRef.current?.focus(); })}
                style={{
                  position: "absolute",
                  right: 4,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--muted)",
                  cursor: "pointer",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Legend with popovers (legendInfo) */}
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap" }}>
          {(["green","yellow"] as const).map((k) => (
            <div key={k} style={{ position: "relative" }} data-legend="keep">
              <span style={badgeStyle(k)}>{statusLabel(k, lang)}</span>
              <button
                type="button"
                {...useTap(() => setLegendInfo(legendInfo === k ? null : k))}
                aria-label={`What is ${statusLabel(k, lang)}?`}
                style={{
                  marginLeft: 6, width: 24, height: 24, borderRadius: 50,
                  border: "1px solid var(--border)", background: "transparent",
                  color: "var(--muted)", lineHeight: 1, fontSize: 12, cursor: "pointer",
                  ...BTN_TOUCH_STYLE,
                  padding: 0, minHeight: 24,
                }}
              >
                i
              </button>

              {legendInfo === k && (
                isSmall ? (
                  <div data-legend="keep" style={{ marginTop: 6, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 8 }}>
                    {k === "green" && <div style={{ fontSize: 12, color: "var(--muted)" }}>{lang === "ro" ? "Rezervare confirmata — nu necesita actiune." : "Confirmed booking — no action required."}</div>}
                    {k === "yellow" && (
                      <div style={{ fontSize: 12, color: "var(--muted)", display: "grid", gap: 2 }}>
                        <strong>{statusLabel("yellow", lang)}</strong>
                        <span>{lang === "ro" ? "Selecteaza o camera pentru confirmare." : "Select a room to confirm."}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    data-legend="keep"
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "calc(100% + 8px)",
                      transform: "translateY(-50%)",
                      zIndex: 5,
                      background: "var(--panel)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: 8,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                      width: 260,
                      maxWidth: "min(320px, calc(100vw - 32px))",
                    }}
                  >
                    <div style={{ fontWeight: 800, marginBottom: 4 }}>{statusLabel(k, lang)}</div>
                    {k === "green" && <div style={{ fontSize: 12, color: "var(--muted)" }}>{lang === "ro" ? "Rezervare confirmata — nu necesita actiune." : "Confirmed booking — no action required."}</div>}
                    {k === "yellow" && (
                      <div style={{ fontSize: 12, color: "var(--muted)", display: "grid", gap: 2 }}>
                        <span>{lang === "ro" ? "Selecteaza o camera pentru confirmare." : "Select a room to confirm."}</span>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          ))}
          <button
            type="button"
            className="sb-btn sb-cardglow"
            onClick={() => setShowPast((v) => !v)}
            style={{
              marginLeft: isSmall ? undefined : 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: isSmall ? '6px 10px' : undefined,
            }}
            title={showPast ? t.hidePast : t.showPast}
            aria-label={showPast ? t.hidePast : t.showPast}
          >
            <svg aria-hidden width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ display:'block' }}>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {!isSmall && (showPast ? t.hidePastShort : t.showPastShort)}
          </button>
        </div>

        {/* Rows */}
        <div style={{ display: "grid", gap: 10 }}>
          {visibleRows.map((it) => {
            const rawName = fullName(it) || t.unknownGuest;
            const kind: OverviewRow["status"] = it.status === "green" && !it.room_id ? "yellow" : it.status;

            const roomLabel = it._room_label ?? "—";
            const typeName = it._room_type_name ?? "—";
            const propertyId = activePropertyId!;
            const key = `${it.id ?? "noid"}|${it.start_date}|${it.end_date}|${it._room_type_id ?? "null"}`;

            const showCopy = false;
            // Row-level actions allowed only for admin/editor (viewers are read-only)
            const canEditFormBooking = canEditGuest && !!it.id;

  return (
              <section
                key={key}
                className="sb-cardglow"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 12,
                  background: "var(--panel)",
                  display: "grid",
                  gap: 8,
                  overflow: "hidden",
                }}
                onPointerUp={(e) => {
                  // Viewers: no action toggling
                  if (!canEditGuest) return;
                  const target = e.target as HTMLElement;
                  if (target && target.closest('button')) return;
                  // toggle actions visibility for this card (one-at-a-time)
                  setOpenActions(prev => {
                    const s = new Set(prev);
                    if (s.has(key)) {
                      s.clear();
                    } else {
                      s.clear(); s.add(key);
                    }
                    return s;
                  });
                }}
              >
                {/* Header: Badge on small above name; on desktop on the right */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isSmall ? "1fr" : "1fr auto",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "grid", gap: 4, lineHeight: 1.25, minWidth: 0 }}>
                    {isSmall && (
                      <span
                        style={{ ...badgeStyle(kind), marginBottom: 2, justifySelf: "start", width: "max-content" }}
                        title={statusTooltip(it, lang)}
                      >
                        {statusLabel(kind, lang)}
                      </span>
                    )}
                    {/* OTA badge will be rendered under the dates (see below) */}

                    {/* 1) Guest name */}
                    <div style={lineWrap}>
                      <Image src={iconSrc("logoguest")} alt="" width={16} height={16} style={iconStyle} />
                      <div style={{ fontWeight: 700, wordBreak: "break-word", minWidth: 0 }}>
                        {highlight(rawName, query)}
                      </div>
                    </div>

                    {/* 2) Room + optional type */}
                    <div style={lineWrap}>
                      <Image src={iconSrc("room")} alt="" width={16} height={16} style={iconStyle} />
                      <div style={{ color: "var(--muted)", minWidth: 0, overflowWrap: "anywhere" }}>
                        {t.room}: {roomLabel}
                        {typeName && typeName !== "—" ? ` — ${t.type}: ${typeName}` : ""}
                      </div>
                    </div>

                    {/* 3) Dates */}
                    <div style={lineWrap}>
                      <Image src={iconSrc("night")} alt="" width={16} height={16} style={iconStyle} />
                      <div style={{ color: "var(--muted)" }}>
                        {formatRange(it.start_date, it.end_date)}
                      </div>
                    </div>
                  </div>

                  {!isSmall && (
                    <div style={{ justifySelf: "end", display: "grid", gap: 6, justifyItems: "end" }}>
                      <span style={badgeStyle(kind)} title={statusTooltip(it, lang)}>
                        {statusLabel(kind, lang)}
                      </span>
                      {(() => { const meta = otaMetaForRow(it, kind); return meta ? (
                        <OtaBadge provider={meta.provider} color={meta.color} logo={meta.logo} />
                      ) : null; })()}
                    </div>
                  )}
                </div>

                {/* OTA badge under the Dates row — mobile only (full width). */}
                {isSmall && (() => { const meta = otaMetaForRow(it, kind); return meta ? (
                  <div style={{ marginTop: 6 }}>
                    <OtaBadge provider={meta.provider} color={meta.color} logo={meta.logo} fullWidth={true} />
                  </div>
                ) : null; })()}

                {/* Actions */}
                <div
                  style={{
                    gridTemplateColumns: isSmall ? "1fr" : undefined,
                    alignItems: "center",
                    justifyContent: isSmall ? "stretch" : "flex-end",
                    gap: 8,
                    flexWrap: isSmall ? undefined : "wrap",
                    // hide by default; show when toggled (mobile + desktop)
                    display: (canEditGuest && openActions.has(key)) ? (isSmall ? 'grid' : 'flex') : 'none',
                  }}
                >
                  {/* Desktop: badge shown above (under status) */}
                  {kind === "green" && (
                    <>
                      {/* Automatic message button removed */}

                      <button
                        type="button"
                        {...useTap(() => openReservation(it, propertyId))}
                        disabled={!it.room_id || !roomById.has(String(it.room_id))}
                        aria-disabled={!it.room_id || !roomById.has(String(it.room_id))}
                        className={`sb-btn sb-btn--primary sb-cardglow sb-btn--p4h-copylink`}
                        style={{
                          ...BTN_TOUCH_STYLE,
                          width: isSmall ? "100%" : undefined,
                          opacity: it.room_id && roomById.has(String(it.room_id)) ? 1 : 0.6,
                          cursor: it.room_id && roomById.has(String(it.room_id)) ? "pointer" : "not-allowed",
                        }}
                        title={it.room_id ? t.openReservation : t.noRoomAssigned}
                      >
                        {t.openReservation}
                      </button>
                    </>
                  )}

                  {/* copy check-in link removed */}

                  {canEditFormBooking && (
                    <button
                      type="button"
                      {...useTap(() => setEditModal({ propertyId, bookingId: String(it.id), confirmOnSave: kind === 'green' }))}
                      className="sb-cardglow"
                      style={{
                        ...BTN_TOUCH_STYLE,
                        borderRadius: 21,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: "var(--text)",
                        fontWeight: 700,
                        cursor: "pointer",
                        width: isSmall ? "100%" : undefined,
                      }}
                      title={kind === 'green' ? t.modifyBooking : t.confirmBooking}
                    >
                      {kind === 'green' ? t.modifyBooking : t.confirmBooking}
                    </button>
                  )}

                  {/* See QR code (available for both statuses) */}
                  <button
                    type="button"
                    {...useTap(() =>
                      setQrModal({
                        bookingId: String(it.id),
                        url: `${window.location.origin}/r/ci/${encodeURIComponent(String(it.id || ""))}`,
                      }),
                    )}
                    className="sb-cardglow"
                    style={{
                      ...BTN_TOUCH_STYLE,
                      borderRadius: 21,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--text)",
                      fontWeight: 600,
                      cursor: "pointer",
                      width: isSmall ? "100%" : undefined,
                    }}
                    title={t.seeQr}
                  >
                    {t.seeQr}
                  </button>

                  {/* Allow access (info popup only, for now) */}
                  {kind === "green" && (
                    <button
                      type="button"
                      className="sb-cardglow"
                      style={{
                        ...BTN_TOUCH_STYLE,
                        borderRadius: 21,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: it.has_started ? "var(--muted)" : "var(--text)",
                        fontWeight: 700,
                        cursor: it.has_started ? "not-allowed" : "pointer",
                        opacity: it.has_started ? 0.6 : 1,
                        width: isSmall ? "100%" : undefined,
                      }}
                      disabled={!!it.has_started}
                      onClick={() => {
                        if (it.has_started) return;
                        setAccessPopup({ formId: String(it.id), guestName: rawName });
                      }}
                    >
                      {t.allowAccess}
                    </button>
                  )}
                </div>
              </section>
            );
          })}

          {visibleRows.length === 0 && (
            <div
              style={{
                border: "1px solid var(--border)",
                background: "var(--panel)",
                borderRadius: 12,
                padding: 16,
                color: "var(--muted)",
                textAlign: "center",
              }}
            >
              {query ? (
                t.noGuestsMatch
              ) : (
                <div>
                  <div>{t.empty1}</div>
                  <div>{t.empty2}</div>
                  <div style={{ fontSize: 12, fontStyle: "italic", marginTop: 6 }}>
                    {t.emptyTip}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {modal && (
          <RoomDetailModal
            dateStr={modal.dateStr}
            propertyId={modal.propertyId}
            room={modal.room}
            forceNew={false}
            defaultStart={modal.defaultStart}
            defaultEnd={modal.defaultEnd}
            onClose={() => setModal(null)}
            onChanged={() => { refresh(); }}
          />
        )}

        {/* Automatic messages UI removed */}

        {editModal && (
          <EditFormBookingModal 
            propertyId={editModal.propertyId}
            bookingId={editModal.bookingId}
            lang={lang}
            onClose={() => setEditModal(null)} 
            onSaved={() => { /* keep modal open after save */ refresh(); }}
            confirmOnSave={!!editModal.confirmOnSave}
          />
        )}
      </div>
      {qrModal && (
        <div role="dialog" aria-modal="true" onClick={()=>setQrModal(null)}
          className="sb-cardglow" style={{ position:'fixed', inset:0, zIndex: 230, background:'rgba(0,0,0,0.55)', display:'grid', placeItems:'center', padding:12,
                   paddingTop:'calc(var(--safe-top) + 12px)', paddingBottom:'calc(var(--safe-bottom) + 12px)'}}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-cardglow" style={{ width:'min(420px, 100%)', background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:16, display:'grid', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <strong>{t.qrCode}</strong>
              <button
                className="sb-btn sb-cardglow sb-btn--icon"
                type="button"
                aria-label={t.close}
                title={t.close}
                onClick={()=>setQrModal(null)}
                style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
            <div style={{ display:'grid', gap:8, justifyItems:'center' }}>
              <QrWithLogo data={qrModal.url} size={240} radius={16} logoSrc="/p4h_logo_round_QR.png" logoAlt="Plan4Host" />
              <small>
                <a
                  href={qrModal.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color:'var(--primary)', textDecoration:'none', wordBreak:'break-all' }}
                >
                  {qrModal.url}
                </a>
              </small>
            </div>
          </div>
        </div>
      )}
      {accessPopup && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setAccessPopup(null)}
          className="sb-cardglow"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 230,
            background: "rgba(0,0,0,0.55)",
            display: "grid",
            placeItems: "center",
            padding: 12,
            paddingTop: "calc(var(--safe-top) + 12px)",
            paddingBottom: "calc(var(--safe-bottom) + 12px)",
          }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
            className="sb-cardglow"
            style={{
              width: "min(420px, 100%)",
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong>{t.allowGuestAccess}</strong>
              <button
                className="sb-btn sb-cardglow sb-btn--icon"
                type="button"
                aria-label={t.close}
                title={t.close}
                onClick={() => setAccessPopup(null)}
                disabled={accessBusy}
                style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {t.allowGuestAccessText}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              <button
                type="button"
                className="sb-btn"
                onClick={() => {
                  if (!accessPopup || accessBusy) return;
                  const { formId, guestName } = accessPopup;
                  (async () => {
                    try {
                      setAccessBusy(true);
                      const res = await fetch("/api/bookings/start-now", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          form_id: formId,
                        }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok || !data?.ok) {
                        alert(data?.error || (lang === "ro" ? "Nu am putut seta ora de start pentru aceasta rezervare." : "Could not set the start time for this booking."));
                      } else {
                        setAccessFeedback(lang === "ro" ? `Rezervarea pentru ${guestName} este acum activa.` : `The reservation for ${guestName} is now active.`);
                        await refresh();
                      }
                    } catch {
                      alert(lang === "ro" ? "A aparut o eroare la setarea orei de start." : "An error occurred while setting the start time.");
                    } finally {
                      setAccessBusy(false);
                      setAccessPopup(null);
                    }
                  })();
                }}
                disabled={accessBusy}
              >
                {accessBusy ? t.applying : t.allowAccessNow}
              </button>
            </div>
          </div>
        </div>
      )}
      {accessFeedback && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setAccessFeedback(null)}
          className="sb-cardglow"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 240,
            background: "rgba(0,0,0,0.55)",
            display: "grid",
            placeItems: "center",
            padding: 12,
            paddingTop: "calc(var(--safe-top) + 12px)",
            paddingBottom: "calc(var(--safe-bottom) + 12px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="sb-cardglow"
            style={{
              width: "min(420px, 100%)",
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>{accessFeedback}</div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="sb-btn sb-cardglow"
                onClick={() => setAccessFeedback(null)}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────── EditFormBookingModal ───────────────── */

function EditFormBookingModal({
  propertyId,
  bookingId,
  lang = "en",
  onClose,
  onSaved,
  confirmOnSave,
}: {
  propertyId: string;
  bookingId: string;
  lang?: Lang;
  onClose: () => void;
  onSaved: () => void;
  confirmOnSave?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { pill, setPill } = useHeader();
  // Mark modal-open for PWA/iOS to disable global pull-to-refresh and background scroll
  useEffect(() => {
    try {
      // Prefer locking only the AppShell scroll container to avoid iOS viewport quirks
      const root = document.documentElement;
      root.setAttribute('data-modal-open', '1');
      const main = document.getElementById('app-main') as HTMLElement | null;
      const prevMainOverflow = main ? main.style.overflowY : '';
      if (main) main.style.overflowY = 'hidden';
      return () => {
        try { root.removeAttribute('data-modal-open'); } catch {}
        if (main) main.style.overflowY = prevMainOverflow;
      };
    } catch { /* noop */ }
  }, []);
  const isSmall = useIsSmall();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popupMsg, setPopupMsg] = useState<string | null>(null);
  const [popupTitle, setPopupTitle] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [docs, setDocs] = useState<Array<{ id:string; doc_type:string|null; mime_type:string|null; url:string|null }>>([]);
  // On mobile, collapse Documents by default to reduce modal height
  const [docsOpen, setDocsOpen] = useState<boolean>(() => !isSmall);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [confirmBusy, setConfirmBusy] = useState<boolean>(false);
  // Cancel booking dialog (for already-confirmed/linked forms)
  const [cancelOpen, setCancelOpen] = useState<boolean>(false);
  const [cancelBusy, setCancelBusy] = useState<boolean>(false);
  // Delete form dialog (custom confirm)
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [deleteBusy, setDeleteBusy] = useState<boolean>(false);
  // New gating before sending email
  const [sendMailOpen, setSendMailOpen] = useState<boolean>(false);
  const [sendMailBusy, setSendMailBusy] = useState<boolean>(false);
  const [sendMailError, setSendMailError] = useState<string | null>(null);
  const [emailBookingId, setEmailBookingId] = useState<string | null>(null);
  const prevPillRef = useRef<React.ReactNode>(pill);
  const overlayMessageNode = (text: string) => <span data-p4h-overlay="message">{text}</span>;
  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  // Baseline valori pentru detectarea modificărilor
  const baselineSetRef = useRef(false);
  const baselineRef = useRef<{ sd: string; ed: string; roomId: string; roomTypeId: string }>({ sd: '', ed: '', roomId: '', roomTypeId: '' });

  // booking fields
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [roomId, setRoomId] = useState<string | "">("");
  const [roomTypeId, setRoomTypeId] = useState<string | "">("");

  // readonly guest info
  const [guestFirst, setGuestFirst] = useState<string>("");
  const [guestLast, setGuestLast] = useState<string>("");
  const [guestEmail, setGuestEmail] = useState<string>("");
  const [guestPhone, setGuestPhone] = useState<string>("");

  // property shapes
  const [rooms, setRooms] = useState<Array<{ id: string; name: string; room_type_id: string | null }>>([]);
  const [formBusyRooms, setFormBusyRooms] = useState<Set<string>>(new Set());
  const [roomTypes, setRoomTypes] = useState<Array<{ id: string; name: string }>>([]);
  const hasRoomTypes = roomTypes.length > 0;
  // Camere eligibile: au un eveniment în bookings pentru intervalul formularului (fără form atașat)
  const [eligibleRooms, setEligibleRooms] = useState<Set<string>>(new Set());
  // Guest companions (read-only)
  const [companions, setCompanions] = useState<any[]>([]);
  const [companionsOpen, setCompanionsOpen] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [bRes, rRes, rtRes, cRes] = await Promise.all([
          supabase
            .from("form_bookings")
            .select("id,property_id,start_date,end_date,room_id,room_type_id,state,guest_first_name,guest_last_name,guest_email,guest_phone,guest_companions")
            .eq("id", bookingId)
            .maybeSingle(),
          supabase
            .from("rooms")
            .select("id,name,room_type_id")
            .eq("property_id", propertyId)
            .order("name", { ascending: true }),
          supabase
            .from("room_types")
            .select("id,name")
            .eq("property_id", propertyId)
            .order("name", { ascending: true }),
          supabase
            .from("booking_contacts")
            .select("email,phone")
            .eq("booking_id", bookingId)
            .maybeSingle(),
        ]);

        if (!alive) return;

        if (bRes.error) throw new Error(bRes.error.message);
        if (!bRes.data || String((bRes.data as any).property_id) !== String(propertyId)) {
          throw new Error(lang === "ro" ? "Rezervarea nu a fost gasita pentru aceasta proprietate." : "Booking not found for this property.");
        }

        const sd0 = bRes.data.start_date || "";
        const ed0 = bRes.data.end_date || "";
        const rid0 = String(bRes.data.room_id || "");
        const rtid0 = String(bRes.data.room_type_id || "");
        setStartDate(sd0);
        setEndDate(ed0);
        setRoomId(rid0);
        setRoomTypeId(rtid0);
        if (!baselineSetRef.current) {
          baselineRef.current = { sd: sd0, ed: ed0, roomId: rid0, roomTypeId: rtid0 };
          baselineSetRef.current = true;
        }
        setGuestFirst(bRes.data.guest_first_name || "");
        setGuestLast(bRes.data.guest_last_name || "");
        setGuestEmail((bRes.data.guest_email || cRes.data?.email || "") as string);
        setGuestPhone(((bRes.data as any).guest_phone || cRes.data?.phone || "") as string);
        const gc = (bRes.data as any).guest_companions;
        setCompanions(Array.isArray(gc) ? gc : []);

        if (rRes.error) throw new Error(rRes.error.message);
        setRooms((rRes.data || []) as any);

        if (rtRes.error) throw new Error(rtRes.error.message);
        setRoomTypes((rtRes.data || []) as any);

        // Documents (ID + signature)
        try {
          const d = await fetch(`/api/form-bookings/${bookingId}/documents`, { cache: 'no-store' });
          const j = await d.json().catch(()=>({}));
          const arr = Array.isArray(j?.documents) ? j.documents : [];
          setDocs(arr.map((x:any)=>({ id:String(x.id), doc_type: x.doc_type || null, mime_type: x.mime_type || null, url: x.url || null })));
        } catch { setDocs([]); }
      } catch (e: any) {
        setError(e?.message || (lang === "ro" ? "Nu am putut incarca rezervarea." : "Failed to load booking."));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [supabase, propertyId, bookingId, lang]);

  function valid(): boolean {
    if (!startDate || !endDate) return false;
    if (endDate < startDate) return false;
    // When property has room types → user may pick a type (optional).
    // When property has *no* room types → user may pick a room (optional).
    return true;
  }

  // Afișează butonul "Save changes" doar când există modificări; reține starea "Saved" până la închiderea modalului
  const hasChanges = useMemo(() => {
    const b = baselineRef.current;
    return (
      startDate !== b.sd ||
      endDate !== b.ed ||
      String(roomId || '') !== String(b.roomId || '') ||
      String(roomTypeId || '') !== String(b.roomTypeId || '')
    );
  }, [startDate, endDate, roomId, roomTypeId]);

  // Dacă apar noi schimbări după un save, ieșim din starea "Saved"
  useEffect(() => {
    if (hasChanges) setJustSaved(false);
  }, [hasChanges]);

  // Warn-only: compute rooms that already have another active form overlapping the selected dates
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!propertyId || !startDate || !endDate) { if (!cancelled) setFormBusyRooms(new Set()); return; }
        const r = await supabase
          .from('form_bookings')
          .select('room_id,id,state,start_date,end_date')
          .eq('property_id', propertyId)
          .neq('id', bookingId)
          .neq('state', 'cancelled')
          .lt('start_date', endDate)
          .gt('end_date', startDate);
        if (!r.error) {
          const set = new Set<string>();
          for (const row of (r.data || [])) {
            const rid = String((row as any).room_id || '');
            if (rid) set.add(rid);
          }
          if (!cancelled) setFormBusyRooms(set);
        }
      } catch {
        if (!cancelled) setFormBusyRooms(new Set());
      }
    })();
    return () => { cancelled = true; };
  }, [supabase, propertyId, startDate, endDate, bookingId]);

  // Compute eligible rooms (have an event for the exact form dates and no form attached)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!propertyId || !startDate || !endDate) return;
        const r = await supabase
          .from('bookings')
          .select('room_id,source,form_id,status')
          .eq('property_id', propertyId)
          .eq('start_date', startDate)
          .eq('end_date', endDate)
          .neq('status', 'cancelled')
          .is('form_id', null)
          .neq('source', 'form');
        if (!r.error) {
          const set = new Set<string>();
          for (const row of (r.data || [])) {
            const rid = String((row as any).room_id || '');
            if (rid) set.add(rid);
          }
          if (!cancelled) setEligibleRooms(set);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [supabase, propertyId, startDate, endDate]);

  async function performSave() {
    if (!valid() || saving) return;
    setSaving(true);
    setError(null);
    try {
      // Prevent overlap with another active form on the same room (partial or full)
      if (roomId) {
        const r = await supabase
          .from('form_bookings')
          .select('id')
          .eq('property_id', propertyId)
          .eq('room_id', roomId)
          .neq('id', bookingId)
          .neq('state', 'cancelled')
          .lt('start_date', endDate)
          .gt('end_date', startDate)
          .limit(1);
        if (!r.error && (r.data?.length || 0) > 0) {
          const roomName = rooms.find(rm => String(rm.id) === String(roomId))?.name || '#Room';
          const msg =
            lang === "ro"
              ? `Nu se poate salva: exista deja un alt formular care se suprapune pe camera ${roomName}.`
              : `Cannot save: another form overlaps on room ${roomName}.`;
          setError(msg);
          setPopupTitle(lang === "ro" ? 'Nu se poate salva' : 'Cannot save');
          setPopupMsg(msg);
          setSaving(false);
          return;
        }
      }

      const upd: any = {
        start_date: startDate,
        end_date: endDate,
      };
      upd.room_id = roomId || null;
      // keep room_type_id in sync for consistency
      if (roomId) {
        const rt = rooms.find(r => String(r.id) === String(roomId))?.room_type_id ?? null;
        upd.room_type_id = rt;
        // Selecting a room confirms the reservation
        upd.status = 'confirmed';
      } else {
        upd.room_type_id = null;
      }

      // Send to server API to enforce anti-overlap and include conflict source in 409
      const res = await fetch(`/form-bookings/${encodeURIComponent(bookingId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate, end_date: endDate, room_id: roomId || null, room_type_id: roomTypeId || null })
      });
      const jj = await res.json().catch(()=>({}));
      if (!res.ok) {
        const roomName = rooms.find(rm => String(rm.id) === String(roomId || ''))?.name || '#Room';
        let msg = jj?.error || (lang === "ro" ? 'Nu am putut salva.' : 'Failed to save.');
        if (res.status === 409) {
          const src = (jj?.conflict?.source || '').toString() || 'manual';
          const sd = jj?.conflict?.start_date || startDate;
          const ed = jj?.conflict?.end_date || endDate;
          msg =
            lang === "ro"
              ? `Nu se poate salva: camera ${roomName} are o suprapunere activa (sursa: ${src}) intre ${sd} si ${ed}.`
              : `Cannot save: target room ${roomName} has an active reservation overlap (source: ${src}) from ${sd} to ${ed}.`;
        }
        setError(msg);
        setPopupTitle(lang === "ro" ? 'Nu se poate salva' : 'Cannot save');
        setPopupMsg(msg);
        setSaving(false);
        return;
      }

      // Prepare email booking id (only open dialog if we have a concrete booking)
      setSendMailError(null);
      let linkedId: string | null = null;
      try { linkedId = jj?.booking_id ? String(jj.booking_id) : null; } catch { linkedId = null; }
      setEmailBookingId(linkedId);
      // Actualizează baseline (noua stare salvată) și marchează Saved până la închiderea modalului
      baselineRef.current = { sd: startDate, ed: endDate, roomId: String(roomId || ''), roomTypeId: String(roomTypeId || '') };
      setJustSaved(true);
      if (linkedId) {
        setSendMailOpen(true);
      } else {
        // Închide modalul și dă refresh dacă nu avem pasul de email
        try { onSaved(); } catch {}
        try { onClose(); } catch {}
      }
    } catch (e: any) {
      setError(e?.message || (lang === "ro" ? "Nu am putut salva modificarile." : "Failed to save changes."));
    } finally {
      setSaving(false);
    }
  }

  async function onSave() {
    if (confirmOnSave) {
      setConfirmOpen(true);
      return;
    }
    await performSave();
  }

  async function onDelete() {
    if (deleting) return;
    setDeleteOpen(true);
  }

  async function performCancelBooking() {
    if (cancelBusy) return;
    setCancelBusy(true);
    setError(null);
    try {
      // 1) Find linked booking by form_id
      const r = await supabase
        .from('bookings')
        .select('id,form_id')
        .eq('form_id', bookingId)
        .maybeSingle();
      if (r.error) throw new Error(r.error.message);
      const linked = r.data as { id?: string | null } | null;
      if (!linked || !linked.id) {
        throw new Error(lang === "ro" ? "Nu exista rezervare legata de acest formular." : 'No linked booking found for this form.');
      }

      // 2) Call server API to delete booking (handles children + iCal suppression)
      const res = await fetch(`/api/bookings/${encodeURIComponent(String(linked.id))}`, { method: 'DELETE' });
      if (!res.ok) {
        const jj = await res.json().catch(() => ({} as any));
        throw new Error(jj?.error || (lang === "ro" ? "Nu am putut anula rezervarea." : 'Failed to cancel booking.'));
      }

      // 3) Șterge formularul de check-in (va șterge și form_documents prin ON DELETE CASCADE)
      try {
        await supabase
          .from('form_bookings')
          .delete()
          .eq('id', bookingId);
      } catch { /* non-fatal */ }

      setCancelOpen(false);
      // Închide modalul după anulare și dă refresh listei
      onSaved();
      onClose();
    } catch (e: any) {
      setPopupTitle(lang === "ro" ? "Nu se poate anula" : 'Cannot cancel');
      setPopupMsg(e?.message || (lang === "ro" ? "Nu am putut anula rezervarea." : 'Failed to cancel booking.'));
    } finally {
      setCancelBusy(false);
    }
  }

  // Overlay above AppHeader (AppHeader overlays use z-index up to 121)
  const wrap: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 200,
    display: "grid",
    placeItems: "center",
    padding: 12,
    // Make overlay itself scrollable on iOS/PWA
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    overscrollBehavior: "contain",
    touchAction: "pan-y",
    height: '100dvh',
  };
  const card: React.CSSProperties = {
    width: "min(680px, 100%)",
    maxHeight: "calc(100dvh - 32px)",
    display: "grid",
    gridTemplateRows: "auto 1fr",
    overflow: "hidden",
    WebkitOverflowScrolling: "touch",
    overscrollBehavior: "contain",
    touchAction: "pan-y",
    padding: 16,
    borderRadius:16,
  };

  return (
    <div className="sb-cardglow" role="dialog" aria-modal="true" onClick={() => { if (!popupMsg) onClose(); }} style={wrap}>
      {popupMsg && (
        <div 
          role="dialog"
          aria-modal="true"
          onClick={(e)=>{ e.stopPropagation(); setPopupMsg(null); }}
          style={{ position:'fixed', inset:0, zIndex: 210, display:'grid', placeItems:'center', padding:12, background:'rgba(0,0,0,.55)' }}
        >
          <div 
            onClick={(e)=>e.stopPropagation()}
            className="sb-card"
            style={{ width: 'min(480px, 100%)', padding: 16, border:'1px solid var(--border)', background:'var(--panel)', borderRadius:12 }}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
              <strong>{popupTitle || (lang === "ro" ? "Notificare" : "Notice")}</strong>
            </div>
            <div style={{ color:'var(--text)', marginBottom: 12 }}>
              {popupMsg}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button className="sb-btn sb-btn--primary" onClick={() => setPopupMsg(null)}>OK</button>
            </div>
          </div>
        </div>
      )}
      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e)=>{ e.stopPropagation(); setConfirmOpen(false); }}
          style={{ position:'fixed', inset:0, zIndex: 220, display:'grid', placeItems:'center', padding:12, background:'rgba(0,0,0,.55)' }}
        >
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width: 'min(460px, 100%)', padding: 16, border:'1px solid var(--border)', background:'var(--panel)', borderRadius:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
              <strong>{lang === "ro" ? "Modifici rezervarea?" : "Modify reservation?"}</strong>
            </div>
            <div style={{ color:'var(--text)', marginBottom: 12 }}>
              {lang === "ro" ? "Urmeaza sa modifici o rezervare existenta." : "You are about to modify an existing reservation."}<br/>
              {lang === "ro" ? "Vrei sa continui?" : "Do you want to continue?"}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="sb-btn" onClick={()=>setConfirmOpen(false)} disabled={confirmBusy}>
                {lang === "ro" ? "Inchide" : "Close"}
              </button>
              <button className="sb-btn sb-btn--primary" onClick={async ()=>{ setConfirmBusy(true); try { await performSave(); setConfirmOpen(false);} finally { setConfirmBusy(false);} }} disabled={confirmBusy}>
                {confirmBusy ? (lang === "ro" ? "Se salveaza…" : 'Saving…') : (lang === "ro" ? "Da" : "Yes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e)=>{ e.stopPropagation(); setCancelOpen(false); }}
          style={{ position:'fixed', inset:0, zIndex: 225, display:'grid', placeItems:'center', padding:12, background:'rgba(0,0,0,.55)' }}
        >
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width: 'min(460px, 100%)', padding: 16, border:'1px solid var(--border)', background:'var(--panel)', borderRadius:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
              <strong>{lang === "ro" ? "Anulezi rezervarea?" : "Cancel booking?"}</strong>
            </div>
            <div style={{ color:'var(--text)', marginBottom: 12 }}>
              {lang === "ro" ? "Actiunea este ireversibila. Rezervarea si toate datele din formularul de check-in vor fi sterse." : "This action is irreversible. The reservation and all associated check-in form data will be deleted."}<br/>
              {lang === "ro" ? "Vrei sa continui?" : "Do you want to continue?"}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button
                className="sb-btn sb-cardglow sb-btn--icon"
                type="button"
                aria-label={lang === "ro" ? "Inchide" : "Close"}
                title={lang === "ro" ? "Inchide" : "Close"}
                onClick={()=>setCancelOpen(false)}
                disabled={cancelBusy}
                style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}
              >
                ✕
              </button>
              <button
                className="sb-btn"
                onClick={performCancelBooking}
                disabled={cancelBusy}
                style={{ borderColor:"var(--danger)", color:"var(--danger)" }}
              >
                {cancelBusy ? (lang === "ro" ? "Se anuleaza…" : 'Cancelling…') : (lang === "ro" ? "Anuleaza rezervarea" : "Cancel booking")}
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e)=>{ e.stopPropagation(); setDeleteOpen(false); /* close and refresh on choice handled by buttons */ }}
          style={{ position:'fixed', inset:0, zIndex: 225, display:'grid', placeItems:'center', padding:12, background:'rgba(0,0,0,.55)' }}
        >
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width: 'min(460px, 100%)', padding: 16, border:'1px solid var(--border)', background:'var(--panel)', borderRadius:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
              <strong>{lang === "ro" ? "Stergi formularul?" : "Delete form?"}</strong>
            </div>
            <div style={{ color:'var(--text)', marginBottom: 12 }}>
              {lang === "ro" ? "Stergi acest formular de rezervare? Actiunea nu poate fi anulata." : "Delete this form booking? This cannot be undone."}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button
                className="sb-btn"
                onClick={()=>{ if (deleteBusy) return; setDeleteOpen(false); try { onSaved(); } catch {} try { onClose(); } catch {} }}
                disabled={deleteBusy}
              >
                {lang === "ro" ? "Anuleaza" : "Cancel"}
              </button>
              <button
                className="sb-btn"
                onClick={async ()=>{
                  if (deleteBusy) return;
                  setDeleteBusy(true);
                  setError(null);
                  try {
                    const { error: e1 } = await supabase.from('form_bookings').delete().eq('id', bookingId);
                    if (e1) throw new Error(e1.message);
                    setDeleteOpen(false);
                    try { onSaved(); } catch {}
                    try { onClose(); } catch {}
                  } catch (e:any) {
                    setPopupTitle(lang === "ro" ? "Nu se poate sterge" : 'Cannot delete');
                    setPopupMsg(e?.message || (lang === "ro" ? "Nu am putut sterge." : 'Failed to delete.'));
                  } finally { setDeleteBusy(false); }
                }}
                disabled={deleteBusy}
                style={{ borderColor:'var(--danger)', color:'var(--danger)' }}
                title={lang === "ro" ? "Sterge acest formular de rezervare" : "Delete this form booking"}
              >
                {deleteBusy ? (lang === "ro" ? "Se sterge…" : 'Deleting…') : (lang === "ro" ? "Sterge" : "Please delete")}
              </button>
            </div>
          </div>
        </div>
      )}
      {sendMailOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e)=>{ e.stopPropagation(); if (!sendMailBusy) setSendMailOpen(false); }}
          style={{ position:'fixed', inset:0, zIndex: 225, display:'grid', placeItems:'center', padding:12, background:'rgba(0,0,0,.55)' }}
        >
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width: 'min(520px, 100%)', padding: 16, border:'1px solid var(--border)', background:'var(--panel)', borderRadius:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <strong>{lang === "ro" ? "Trimitem email informativ oaspetelui?" : "Send info email to guest?"}</strong>
            </div>
            <div style={{ color:'var(--text)', marginBottom: 12 }}>
              {lang === "ro" ? "Vom trimite un email informativ oaspetelui, inclusiv camera alocata." : "We will send an informational email including the assigned room to the guest."}<br/>
              {lang === "ro" ? "Vrei sa trimiti acest email?" : "Do you want to send this email to the guest?"}
              {sendMailError && (
                <div style={{ color:'var(--danger)', marginTop:8 }}>{sendMailError}</div>
              )}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="sb-btn" onClick={()=>{ if (sendMailBusy) return; setSendMailOpen(false); try { onSaved(); } catch {} try { onClose(); } catch {} }} disabled={sendMailBusy}>{lang === "ro" ? "Sari de data asta" : "Skip this time"}</button>
              <button
                className="sb-btn sb-btn--primary sb-cardglow sb-btn--p4h-copylink"
                disabled={sendMailBusy}
                onClick={async ()=>{
                setSendMailBusy(true);
                setSendMailError(null);
                prevPillRef.current = pill;
                setPill(lang === "ro" ? "Se trimite…" : "Sending…");
                try {
                  // Ensure public link exists
                  try {
                    const gen = await fetch('/api/reservation-message/generate', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ property_id: propertyId, booking_id: emailBookingId || bookingId })
                    });
                    await gen.json().catch(()=>({}));
                  } catch {}
                  // Send reservation confirmation (includes link)
                  const r = await fetch('/api/reservation-message/confirm-room', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ property_id: propertyId, booking_id: emailBookingId || bookingId })
                  });
                  const jj = await r.json().catch(()=>({}));
                  if (r.ok && (jj?.ok || jj?.sent)) {
                    setPill(overlayMessageNode(lang === "ro" ? "Trimis" : "Sent"));
                    await wait(1000);
                    setPill(prevPillRef.current);
                    setSendMailOpen(false);
                    try { onSaved(); } catch {}
                    try { onClose(); } catch {}
                  } else {
                    setSendMailError(lang === "ro" ? "Emailul nu a putut fi trimis. Incearca din nou peste 10 minute." : 'Email could not be sent. Please try again in 10 minutes.');
                  }
                } catch (er:any) {
                  setSendMailError(er?.message || (lang === "ro" ? "Nu am putut trimite." : 'Failed to send.'));
                } finally {
                  try { setPill(prevPillRef.current); } catch {}
                  setSendMailBusy(false);
                }
              }}
              >
                {sendMailBusy ? (lang === "ro" ? "Se trimite…" : 'Sending…') : (lang === "ro" ? "Trimite" : "Send")}
              </button>
            </div>
          </div>
        </div>
      )}
      <div onClick={(e)=>e.stopPropagation()} className="sb-cardglow" style={card}>
        {/* Fixed header inside modal card */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:8 }}>
          <strong>{confirmOnSave ? (lang === "ro" ? "Modifica rezervarea" : "Modify booking") : (lang === "ro" ? "Confirma rezervarea" : "Confirm booking")}</strong>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button
              className="sb-btn sb-cardglow sb-btn--icon"
              type="button"
              aria-label={lang === "ro" ? "Inchide" : "Close"}
              title={lang === "ro" ? "Inchide" : "Close"}
              onClick={onClose}
              disabled={saving || deleting}
              style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
          {loading ? (
            <div style={{ color:"var(--muted)" }}>{lang === "ro" ? "Se incarca…" : "Loading…"}</div>
          ) : error ? (
            <div style={{ color:"var(--danger)" }}>{error}</div>
          ) : (
            <div style={{ display:"grid", gap:12 }}>
            {/* Read-only guest details */}
            <div className="sb-card" style={{ padding:12, border:"1px solid var(--border)", borderRadius:10, background:"var(--panel)" }}>
              <div style={{ fontSize:12, color:"var(--muted)", fontWeight:800, marginBottom:6 }}>{lang === "ro" ? "Oaspete" : "Guest"}</div>
              <div style={{ display:"grid", gridTemplateColumns: isSmall ? "1fr" : "1fr 1fr", gap:8 }}>
                <div><strong>{lang === "ro" ? "Nume:" : "Name:"}</strong> {(guestFirst + " " + guestLast).trim() || "—"}</div>
                <div>
                  <strong>Email:</strong> {guestEmail ? (
                    <a href={`mailto:${guestEmail}`} style={{ color: 'var(--primary)', textDecoration: 'none', marginLeft: 6 }}>{guestEmail}</a>
                  ) : '—'}
                </div>
                <div>
                  <strong>{lang === "ro" ? "Telefon:" : "Phone:"}</strong> {guestPhone ? (()=>{
                    const digits = String(guestPhone).replace(/\D/g,'');
                    const waApp = digits ? `whatsapp://send?phone=${digits}` : '';
                    const waWeb = digits ? `https://wa.me/${digits}` : '';
                    const onTap = (e: React.MouseEvent<HTMLAnchorElement>) => {
                      try {
                        if (!digits) return;
                        e.preventDefault();
                        // Try to open the native app first
                        (window as any).location.href = waApp;
                        // Fallback to web after a tiny delay
                        setTimeout(() => {
                          try { window.open(waWeb, '_blank'); } catch {}
                        }, 150);
                      } catch {}
                    };
                    return (
                      <a href={waWeb} onClick={onTap} style={{ color: 'var(--primary)', textDecoration: 'none', marginLeft: 6 }}>
                        {guestPhone}
                      </a>
                    );
                  })() : '—'}
                </div>
              </div>
            </div>

            {/* Documents (collapsible on mobile) */}
            <div className="sb-card" style={{ padding:12, border:"1px solid var(--border)", borderRadius:10, background:"var(--panel)", display:"grid", gap:10 }}>
              <button
                type="button"
                onClick={() => setDocsOpen(v => !v)}
                aria-expanded={docsOpen}
                style={{
                  width:'100%', textAlign:'left', background:'transparent', border:'none', padding:0, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'space-between'
                }}
              >
                <span style={{ fontSize:12, color:"var(--muted)", fontWeight:800 }}>{lang === "ro" ? "Documente" : "Documents"}</span>
                <span aria-hidden style={{ color:'var(--muted)', fontWeight:800 }}>{docsOpen ? '▾' : '▸'}</span>
              </button>
              {docsOpen && (
                <div style={{ display:'grid', gridTemplateColumns: isSmall ? '1fr' : '1fr 1fr', gap:12 }}>
                  {(() => {
                    const idDoc = docs.find(d => (d.doc_type || '').toLowerCase() === 'id_card' || (d.doc_type || '').toLowerCase() === 'passport')
                      || docs.find(d => (d.mime_type || '').startsWith('image/')) || null;
                    const sigDoc = docs.find(d => (d.doc_type || '').toLowerCase() === 'signature')
                      || docs.find(d => (!d.doc_type || d.doc_type === null) && (d.mime_type || '').startsWith('image/') && d.id !== (idDoc?.id || '')) || null;
                    return (
                      <>
                        <div>
                          <div style={{ fontSize:12, color:'var(--muted)', fontWeight:800, marginBottom:6 }}>{lang === "ro" ? "Document ID" : "ID Document"}</div>
                          {idDoc && idDoc.url ? (
                            (idDoc.mime_type || '').startsWith('image/') ? (
                              <img src={idDoc.url} alt="ID" style={{ width:160, height:110, objectFit:'contain', objectPosition:'center', borderRadius:8, border:'1px solid var(--border)', background:'#fff' }} />
                            ) : (
                              <a href={idDoc.url} target="_blank" rel="noreferrer" className="sb-btn">{lang === "ro" ? "Vezi fisierul" : "View file"}</a>
                            )
                          ) : (
                            <div style={{ color:'var(--muted)' }}>{lang === "ro" ? "Fara fisier" : "No file"}</div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize:12, color:'var(--muted)', fontWeight:800, marginBottom:6 }}>{lang === "ro" ? "Semnatura" : "Signature"}</div>
                          {sigDoc && sigDoc.url ? (
                            (sigDoc.mime_type || '').startsWith('image/') ? (
                              <img src={sigDoc.url} alt="Signature" style={{ width:160, height:110, objectFit:'contain', objectPosition:'center', borderRadius:8, border:'1px solid var(--border)', background:'#fff' }} />
                            ) : (
                              <a href={sigDoc.url} target="_blank" rel="noreferrer" className="sb-btn">{lang === "ro" ? "Vezi fisierul" : "View file"}</a>
                            )
                          ) : (
                            <div style={{ color:'var(--muted)' }}>{lang === "ro" ? "Fara fisier" : "No file"}</div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Companions (collapsible) */}
            {companions.length > 0 && (
              <div className="sb-card" style={{ padding:12, border:"1px solid var(--border)", borderRadius:10, background:"var(--panel)", display:"grid", gap:10 }}>
                <button
                  type="button"
                  onClick={() => setCompanionsOpen(v => !v)}
                  aria-expanded={companionsOpen}
                  style={{
                    width:'100%', textAlign:'left', background:'transparent', border:'none', padding:0, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'space-between'
                  }}
                >
                  <span style={{ fontSize:12, color:"var(--muted)", fontWeight:800 }}>{lang === "ro" ? "Insotitori" : "Companions"}</span>
                  <span aria-hidden style={{ color:'var(--muted)', fontWeight:800 }}>{companionsOpen ? '▾' : '▸'}</span>
                </button>
                {companionsOpen && (
                  <div style={{ display:'grid', gap:8 }}>
                    {companions.map((c, idx) => {
                      const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || `${lang === "ro" ? "Oaspete" : "Guest"} ${idx+2}`;
                      return (
                        <div key={idx} style={{ border:'1px solid var(--border)', borderRadius:8, padding:8, display:'grid', gap:4, background:'var(--card)' }}>
                          <div style={{ fontWeight:800 }}>{name}</div>
                          {c.birth_date && (
                            <div style={{ fontSize:12, color:'var(--muted)' }}>
                              {lang === "ro" ? "Data nasterii" : "Birth date"}: <span style={{ color:'var(--text)' }}>{c.birth_date}</span>
                            </div>
                          )}
                          {(c.citizenship || c.residence_country) && (
                            <div style={{ fontSize:12, color:'var(--muted)' }}>
                              {c.citizenship && (
                                <>
                                  {lang === "ro" ? "Cetatenie" : "Citizenship"}: <span style={{ color:'var(--text)' }}>{c.citizenship}</span>
                                </>
                              )}
                              {c.citizenship && c.residence_country && <span> • </span>}
                              {c.residence_country && (
                                <>
                                  {lang === "ro" ? "Resedinta" : "Residence"}: <span style={{ color:'var(--text)' }}>{c.residence_country}</span>
                                </>
                              )}
                            </div>
                          )}
                          {c.is_minor ? (
                            <div style={{ fontSize:12, color:'var(--muted)' }}>
                              {lang === "ro" ? "Oaspete minor" : "Minor guest"}
                              {c.guardian_name && (
                                <>
                                  {' '}— {lang === "ro" ? "Tutore" : "Guardian"}:{' '}
                                  <span style={{ color:'var(--text)' }}>{c.guardian_name}</span>
                                </>
                              )}
                            </div>
                          ) : (
                            (c.doc_type || c.doc_number) && (
                              <div style={{ fontSize:12, color:'var(--muted)' }}>
                                {c.doc_type === 'id_card' && (lang === "ro" ? 'Carte de identitate' : 'ID card')}
                                {c.doc_type === 'passport' && (lang === "ro" ? 'Pasaport' : 'Passport')}
                                {(!c.doc_type || (c.doc_type !== 'id_card' && c.doc_type !== 'passport')) && (lang === "ro" ? 'Document' : 'Document')}
                                {c.doc_series && (
                                  <>
                                    {' '}{lang === "ro" ? "seria" : "series"} <span style={{ color:'var(--text)' }}>{c.doc_series}</span>
                                  </>
                                )}
                                {c.doc_number && (
                                  <>
                                    {c.doc_series ? (lang === "ro" ? ' • numar ' : ' • number ') : (lang === "ro" ? ' numar ' : ' number ')}
                                    <span style={{ color:'var(--text)' }}>{c.doc_number}</span>
                                  </>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Editable fields */}
            <div className="sb-card" style={{ padding:12, border:"1px solid var(--border)", borderRadius:10, background:"var(--panel)", display:"grid", gap:10 }}>
              <div style={{ display:"grid", gap:6 }}>
                <label style={{ fontSize:12, color:"var(--muted)", fontWeight:800 }}>{lang === "ro" ? "Data inceput" : "Start date"}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e)=>setStartDate((e.target as HTMLInputElement).value)}
                  style={{ padding:10, border:"1px solid var(--border)", borderRadius:8, background:"var(--card)", color:"var(--text)", minHeight:44 }}
                />
              </div>
              <div style={{ display:"grid", gap:6 }}>
                <label style={{ fontSize:12, color:"var(--muted)", fontWeight:800 }}>{lang === "ro" ? "Data sfarsit" : "End date"}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e)=>setEndDate((e.target as HTMLInputElement).value)}
                  style={{ padding:10, border:"1px solid var(--border)", borderRadius:8, background:"var(--card)", color:"var(--text)", minHeight:44 }}
                />
              </div>

              <div style={{ display:"grid", gap:6 }}>
                <label style={{ fontSize:12, color:"var(--muted)", fontWeight:800 }}>{lang === "ro" ? "Nume camera" : "Room name"}</label>
                <select
                  value={roomId || ""}
                  onChange={(e)=>{
                    const next = String((e.target as HTMLSelectElement).value || '');
                    // Gating doar pentru "Confirm booking" (nu și pentru "Modify booking")
                    if (!confirmOnSave && next && !eligibleRooms.has(next)) {
                      setPopupTitle(lang === "ro" ? 'Camera indisponibila' : 'Room not available');
                      setPopupMsg(lang === "ro" ? 'Nu exista inca un eveniment pentru camera si intervalul selectate.' : 'No event exists yet for the selected room and dates.');
                      return;
                    }
                    setRoomId(next);
                  }}
                  style={{ padding:10, border:"1px solid var(--border)", borderRadius:8, background:"var(--card)", color:"var(--text)", minHeight:44 }}
                >
                  <option value="">—</option>
                  {rooms.map(r => {
                    const busy = formBusyRooms.has(String(r.id));
                    return (
                      <option key={r.id} value={r.id}>
                        {r.name}{busy ? (lang === "ro" ? ' — ocupata' : ' — booked') : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {(hasChanges || justSaved || saving) && (
                  <button
                    type="button"
                    className="sb-btn sb-btn--primary sb-cardglow sb-btn--p4h-copylink"
                    disabled={!valid() || saving || deleting || (!hasChanges && justSaved)}
                    onClick={onSave}
                    style={{ minHeight:44 }}
                  >
                    {saving ? (lang === "ro" ? "Se salveaza…" : "Saving…") : (justSaved ? (lang === "ro" ? "Salvat" : "Saved") : (lang === "ro" ? "Salveaza modificarile" : "Save changes"))}
                  </button>
                )}
              </div>
              <div>
                {confirmOnSave ? (
                  <button
                    type="button"
                    className="sb-btn"
                    onClick={() => setCancelOpen(true)}
                    disabled={saving || deleting}
                    style={{ minHeight:44, borderColor:"var(--danger)", color:"var(--danger)" }}
                    title={lang === "ro" ? "Anuleaza aceasta rezervare" : "Cancel this booking"}
                  >
                    {lang === "ro" ? "Anuleaza rezervarea" : "Cancel booking"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="sb-btn"
                    onClick={onDelete}
                    disabled={saving || deleting}
                    style={{ minHeight:44, borderColor:"var(--danger)", color:"var(--danger)" }}
                    title={lang === "ro" ? "Sterge acest formular de rezervare" : "Delete this form booking"}
                  >
                    {deleting ? (lang === "ro" ? "Se sterge…" : "Deleting…") : (lang === "ro" ? "Sterge formularul" : "Delete form")}
                  </button>
                )}
              </div>
            </div>

            {(!valid() && startDate && endDate && endDate < startDate) && (
              <div style={{ color:"var(--danger)" }}>{lang === "ro" ? "Data de sfarsit nu poate fi inaintea datei de inceput." : "End date cannot be before start date."}</div>
            )}
            <div style={{ height: 64 }} aria-hidden />
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Reservation Message (unchanged) ───────────────── */
/* (kept as in your version; only context lines changed above) */

function RMContent({ propertyId, row, templateId }: { propertyId: string; row: any; templateId?: string }) {
  const supabase = useMemo(() => createClient(), []);
  const storageKey = `p4h:rm:template:${propertyId}`;

  const [tpl, setTpl] = useState<any>(null);
  // values: live edits bound to inputs
  const [values, setValues] = useState<Record<string,string>>({});
  // valuesPreview: committed values used to build the preview (updates on blur)
  const [valuesPreview, setValuesPreview] = useState<Record<string,string>>({});
  const [preview, setPreview] = useState<string>("");
  const [propertyName, setPropertyName] = useState<string>("");

  // timpi/interval actuali, LIVE din DB bookings
  const [ciTime, setCiTime] = useState<string | null>(null);
  const [coTime, setCoTime] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(row.start_date);
  const [endDate, setEndDate] = useState<string>(row.end_date);
  const [loadingTimes, setLoadingTimes] = useState<boolean>(false);

  useEffect(() => {
    // If a specific template is chosen, load it from server; else fallback to LS
    (async () => {
      if (templateId) {
        try {
          const res = await fetch(`/api/reservation-message/template?id=${encodeURIComponent(templateId)}`, { cache:'no-store' });
          const j = await res.json().catch(()=>({}));
          const t = j?.template;
          if (t) { setTpl(t); return; }
        } catch { /* ignore and fallback */ }
      }
      try {
        const raw = localStorage.getItem(storageKey);
        setTpl(raw ? JSON.parse(raw) : null);
      } catch { setTpl(null); }
    })();
  }, [storageKey, templateId]);

  // FETCH live start_time / end_time / dates
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!row?.id) return;
      setLoadingTimes(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time,end_time,start_date,end_date")
        .eq("id", row.id)
        .single();
      if (!alive) return;
      if (!error && data) {
        setCiTime(data.start_time ?? null);
        setCoTime(data.end_time ?? null);
        if (data.start_date) setStartDate(data.start_date);
        if (data.end_date) setEndDate(data.end_date);
      }
      setLoadingTimes(false);
    })();
    return () => { alive = false; };
  }, [supabase, row?.id]);

  // Fetch property name for preview variables
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("properties")
          .select("name")
          .eq("id", propertyId)
          .maybeSingle();
        if (!alive) return;
        if (!error && data) setPropertyName(String((data as any).name || ""));
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, [supabase, propertyId]);

  // escape helpers
  function _escapeHtml(s: string) { return (s||"").replace(/[&<>"']/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] as string)); }
  function _replaceVarsHtml(html: string, vars: Record<string,string>) {
    if (!html) return "";
    const withVars = html.replace(/\{\{\s*([a-zA-Z0-9_]+)\}\}/g, (_m, k) => {
      const v = vars?.[k];
      // Show value if present; otherwise empty string (no tokens)
      if (v !== undefined && v !== null) return _escapeHtml(String(v));
      return "";
    });
    return withVars.replace(/\r?\n/g, "<br/>");
  }
  function _renderHeadingSafe(src: string, vars: Record<string,string>) {
    const s = src || "";
    const re = /\{\{\s*([a-zA-Z0-9_]+)\}\}/g;
    let out: string[] = []; let last = 0; let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      out.push(_escapeHtml(s.slice(last, m.index)));
      const key = m[1];
      const val = vars?.[key];
      if (val !== undefined && val !== null) out.push(_escapeHtml(String(val)));
      last = m.index + m[0].length;
    }
    out.push(_escapeHtml(s.slice(last)));
    return out.join("");
  }
  function _renderRM(t: any, vars: Record<string,string>) {
    const out: string[] = [];
    for (const b of ((t?.blocks)||[])) {
      if (b.type === "divider") out.push('<hr style="border:1px solid var(--border); opacity:.6;"/>');
      else if (b.type === "heading") out.push(`<h3 style="margin:8px 0 6px;">${_renderHeadingSafe(b.text||"", vars)}</h3>`);
      else if (b.type === "paragraph") out.push(`<div style="margin:6px 0; line-height:1.5;">${_replaceVarsHtml(b.text||"", vars)}</div>`);
    }
    return out.join("\n");
  }

  // Compute which variables are actually used inside the template blocks (title/body)
  const usedFieldKeys = useMemo(() => {
    const set = new Set<string>();
    try {
      const blocks: Array<{ type:string; text?:string }> = Array.isArray((tpl as any)?.blocks) ? (tpl as any).blocks : [];
      const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
      for (const b of blocks) {
        const s = (b as any)?.text || "";
        let m: RegExpExecArray | null;
        while ((m = re.exec(s))) {
          const k = (m[1] || "").trim();
          if (k) set.add(k);
        }
      }
    } catch {}
    return set;
  }, [tpl]);

  // rebuild preview on tpl/valuesPreview/time/date change (only after commit on blur)
  useEffect(() => {
    if (!tpl) { setPreview(""); return; }

    const builtins: Record<string,string> = {
      guest_first_name: (row._guest_first_name || "").toString(),
      guest_last_name:  (row._guest_last_name  || "").toString(),

      check_in_date:  startDate,
      check_out_date: endDate,
      check_in_time:  ciTime || "",
      check_out_time: coTime || "",

      // aliasuri pentru șabloane mai vechi
      checkin_date:   startDate,
      checkout_date:  endDate,
      checkin_time:   ciTime || "",
      checkout_time:  coTime || "",

      room_name:      row._room_label || "",
      room_type:      row._room_type_name || "",
      property_name:  propertyName || "",
    };

    const merged = { ...builtins, ...valuesPreview };
    setPreview(_renderRM(tpl, merged));
  }, [tpl, valuesPreview, row, ciTime, coTime, startDate, endDate, propertyName]);

  const [copied, setCopied] = useState(false);
  async function onCopyPreview() {
    try {
      const text = preview.replace(/<br\/>/g, "\n").replace(/<[^>]+>/g, "");
      await copyTextMobileSafe(text);
      setCopied(true);
      setTimeout(()=>setCopied(false), 1500);
    } catch {}
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!tpl ? (
        <div style={{ color: "var(--muted)" }}>
          No template configured for this property. <a href="/app/reservationMessage" style={{ color: "var(--primary)" }}>Configure now</a>.
        </div>
      ) : (
        <>
          {(Array.isArray(tpl.fields) && tpl.fields.length > 0) && (() => {
            const fields = (tpl.fields as any[]).filter((f:any) => usedFieldKeys.has(String(f.key || '').trim()));
            if (fields.length === 0) return null;
            return (
            <div style={{ display: "grid", gap: 8 }}>
              {fields.map((f: any) => (
                <div key={f.key} style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>{f.label}</label>
                  <input
                    style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", color: "var(--text)", fontFamily: "inherit", minHeight: 44, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                    value={values[f.key] || ""}
                    onChange={(e)=>setValues(prev=>({ ...prev, [f.key]: e.currentTarget.value }))}
                    onBlur={() => setValuesPreview({ ...values })}
                    onPointerDown={(e) => { if (e.pointerType !== 'mouse') { try { (e.currentTarget as HTMLInputElement).focus(); } catch {} } }}
                    placeholder={f.label}
                  />
                </div>
              ))}
            </div>
            );
          })()}

          <div
            className="rm-email-preview"
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              background: "#ffffff",
              padding: 16,
              opacity: loadingTimes ? .7 : 1,
              color: "#0f172a",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
              lineHeight: 1.6,
            }}
            dangerouslySetInnerHTML={{ __html: preview || "" }}
          />
          {/* Chip + preview overrides (scoped) */}
          <style
            dangerouslySetInnerHTML={{ __html: `
              .rm-token{ display:inline-block; padding: 2px 6px; border:1px solid #e2e8f0; background: #f8fafc; color: #0f172a; border-radius: 8px; font-weight: 800; font-size: 12px; margin: 0 2px; }
              .rm-email-preview h1,.rm-email-preview h2,.rm-email-preview h3{ margin: 0 0 12px; line-height: 1.25; }
              .rm-email-preview hr{ border:0; border-top:1px solid #e2e8f0; margin: 14px 0; opacity: .9; }
              .rm-email-preview a{ color:#16b981; }
            `}}
          />

          <ActionsRow
            left={
              <LeftGroup
                propertyId={propertyId}
                bookingId={row.id}
                values={values}
                templateId={templateId}
              />
            }
            right={
              <RightGroup
                onCopyPreview={onCopyPreview}
                copied={copied}
                propertyId={propertyId}
                bookingId={row.id}
                values={values}
                templateId={templateId}
              />
            }
          />
        </>
      )}
    </div>
  );
}

function GenerateLinkButton({ propertyId, bookingId, values }:{
  propertyId: string;
  bookingId: string|null;
  values: Record<string,string>;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function onGenerateAndCopy() {
    if (!bookingId || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reservation-message/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: propertyId, booking_id: bookingId, values }),
        keepalive: true,
      });
      const j = await res.json().catch(()=>({}));
      if (!res.ok || !j?.url) {
        alert(j?.error || "Failed to generate link");
        return;
      }
      await copyTextMobileSafe(String(j.url));
      setCopied(true);
      setTimeout(()=>setCopied(false), 1500);
    } catch (e:any) {
      alert(e?.message || "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="sb-btn sb-btn--primary"
      {...useTap(onGenerateAndCopy)}
      disabled={busy || !bookingId}
      aria-busy={busy}
      title={bookingId ? "Copy generated link" : "No booking id"}
      style={{ padding: "12px 14px", minHeight: 44, touchAction: "manipulation", WebkitTapHighlightColor: "transparent", borderRadius: 10 }}
    >
      <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
        {(!busy && !copied) && (
          <picture>
            <source srcSet="/copy_fordark.png" media="(prefers-color-scheme: dark)" />
            <img src="/copy_forlight.png" alt="" width={14} height={14} style={{ opacity:.95 }} />
          </picture>
        )}
        {busy ? "Generating…" : (copied ? "Copied!" : "Copy link")}
      </span>
    </button>
  );
}

function SendEmailButton({ propertyId, bookingId, values, templateId, onSent }:{
  propertyId: string;
  bookingId: string|null;
  values: Record<string,string>;
  templateId?: string;
  onSent?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<null | { ok: boolean; reason?: string; missingFields?: string[] }>(null);
  const [popup, setPopup] = useState<null | { title: string; lines: string[] }>(null);

  async function precheck(): Promise<{ok:boolean;canSend?:boolean;reason?:string;missingFields?:string[]}> {
    const res = await fetch('/api/reservation-message/status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, property_id: propertyId, values, template_id: templateId }),
    });
    const j = await res.json().catch(()=>({}));
    return j;
  }

  function showPopup(reason: string, missing?: string[]) {
    if (reason === 'missing_email') setPopup({ title: 'Guest email missing', lines: ['This reservation has no guest email.'] });
    else if (reason === 'missing_fields') setPopup({ title: 'Missing values', lines: ['Please provide values for:', ...(missing||[]).map(k=>`• ${k}`)] });
    else if (reason === 'missing_subject') setPopup({ title: 'Missing subject', lines: ['Template has no title heading.'] });
    else if (reason === 'missing_body') setPopup({ title: 'Missing body', lines: ['Template has no content.'] });
    else setPopup({ title: 'Cannot send', lines: ['Unknown precheck failure.'] });
  }

  async function onSend() {
    if (!bookingId || busy) return;
    setBusy(true); setLast(null);
    try {
      const chk = await precheck();
      if (!(chk?.ok) || chk?.canSend === false) {
        showPopup(chk?.reason || 'unknown', chk?.missingFields);
        setLast({ ok:false, reason: chk?.reason, missingFields: chk?.missingFields });
        return;
      }
      const res = await fetch('/api/reservation-message/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, property_id: propertyId, values, template_id: templateId }),
      });
      const j = await res.json().catch(()=>({}));
      if (!res.ok || !j?.sent) {
        setPopup({ title: 'Send failed', lines: [j?.error || 'Unknown error'] });
        setLast({ ok:false });
        return;
      }
      setPopup({ title: 'Email sent', lines: ['The message was sent to the guest.'] });
      setLast({ ok:true });
      onSent && onSent();
    } catch (e:any) {
      setPopup({ title: 'Send failed', lines: [e?.message || 'Network error'] });
      setLast({ ok:false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="sb-btn sb-btn--primary"
        {...useTap(onSend)}
        disabled={busy || !bookingId}
        aria-busy={busy}
        title={bookingId ? 'Send email to guest' : 'No booking id'}
        style={{ padding: '12px 14px', minHeight: 44, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', borderRadius: 10 }}
      >
        {busy ? 'Sending…' : 'Send email'}
      </button>

      {popup && (
        <div role="dialog" aria-modal="true" onClick={()=>setPopup(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:70, display:'grid', placeItems:'center', padding:12 }}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(520px, 100%)', padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <strong>{popup.title}</strong>
              <button
                className="sb-btn"
                type="button"
                {...useTap(()=>setPopup(null))}
                style={{ minHeight: 44, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                Close
              </button>
            </div>
            <div style={{ display:'grid', gap:6, color:'var(--muted)' }}>
              {popup.lines.map((l, i)=>(<div key={i}>{l}</div>))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function ActionsRow({ left, right }:{ left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 8, flexWrap:'wrap' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>{left}</div>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>{right}</div>
    </div>
  );
}

function LeftGroup({ propertyId, bookingId, values, templateId }:{ propertyId:string; bookingId:string|null; values: Record<string,string>; templateId?: string; }) {
  const [last, setLast] = useState<null | { status: string; sent_at?: string | null; created_at?: string; error_message?: string | null }>(null);
  const [tz, setTz] = useState<string | null>(null);
  const supa = useMemo(() => createClient(), []);
  const isSmall = useIsSmall();

  async function refreshLast() {
    try {
      const res = await fetch(`/api/reservation-message/outbox?booking=${encodeURIComponent(bookingId || '')}`, { cache:'no-store' });
      const j = await res.json().catch(()=>({}));
      const l = j?.last as any;
      if (l) setLast({ status: l.status, sent_at: l.sent_at, created_at: l.created_at, error_message: l.error_message });
      else setLast(null);
    } catch { setLast(null); }
  }

  useEffect(() => { if (bookingId && !isSmall) refreshLast(); }, [bookingId, isSmall]);
  useEffect(() => {
    if (isSmall) return; // on mobile, status will be shown under Copy link in RightGroup
    let alive = true;
    (async () => {
      try {
        const { data } = await supa
          .from('properties')
          .select('timezone')
          .eq('id', propertyId)
          .maybeSingle();
        if (!alive) return;
        setTz(((data as any)?.timezone || null) as string | null);
      } catch { if (alive) setTz(null); }
    })();
    return () => { alive = false; };
  }, [supa, propertyId]);

  function fmtInTZ(iso?: string | null): string | null {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const opts: Intl.DateTimeFormatOptions = { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12: false, timeZone: tz || undefined };
      const s = new Intl.DateTimeFormat(undefined, opts).format(d);
      return tz ? `${s} (${tz})` : s;
    } catch { return iso as any; }
  }

  return (
    <>
      <SendEmailButton propertyId={propertyId} bookingId={bookingId} values={values} templateId={templateId} onSent={refreshLast} />
      {!isSmall && last && (
        <small style={{ color:'var(--muted)' }}>
          {last.status === 'sent' ? (
            <>Last sent: {fmtInTZ(last.sent_at || last.created_at) || (last.sent_at || last.created_at)}</>
          ) : last.status === 'error' ? (
            <>Last error: {last.error_message || 'failed'} ({fmtInTZ(last.created_at) || last.created_at})</>
          ) : (
            <>Last status: {last.status} ({fmtInTZ(last.created_at) || last.created_at})</>
          )}
        </small>
      )}
    </>
  );
}

function RightGroup({ onCopyPreview, copied, propertyId, bookingId, values, templateId }:{
  onCopyPreview: () => void;
  copied: boolean;
  propertyId: string;
  bookingId: string|null;
  values: Record<string,string>;
  templateId?: string;
}) {
  const isSmall = useIsSmall();
  // Theme-aware icon selection tied to app theme (data-theme)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark') return true; if (attr === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
  });
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    try { m?.addEventListener('change', onChange); } catch { m?.addListener?.(onChange); }
    const root = document.documentElement;
    const ob = new MutationObserver(() => {
      const t = root.getAttribute('data-theme');
      if (t === 'dark') setIsDark(true);
      if (t === 'light') setIsDark(false);
    });
    ob.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { try { m?.removeEventListener('change', onChange); } catch { m?.removeListener?.(onChange); } ob.disconnect(); };
  }, []);
  const [last, setLast] = useState<null | { status: string; sent_at?: string | null; created_at?: string; error_message?: string | null }>(null);
  const [tz, setTz] = useState<string | null>(null);
  const supa = useMemo(() => createClient(), []);

  async function refreshLast() {
    try {
      const res = await fetch(`/api/reservation-message/outbox?booking=${encodeURIComponent(bookingId || '')}`, { cache:'no-store' });
      const j = await res.json().catch(()=>({}));
      const l = j?.last as any;
      if (l) setLast({ status: l.status, sent_at: l.sent_at, created_at: l.created_at, error_message: l.error_message });
      else setLast(null);
    } catch { setLast(null); }
  }

  useEffect(() => { if (isSmall && bookingId) refreshLast(); }, [isSmall, bookingId]);
  useEffect(() => {
    if (!isSmall) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await supa.from('properties').select('timezone').eq('id', propertyId).maybeSingle();
        if (!alive) return;
        setTz(((data as any)?.timezone || null) as string | null);
      } catch { if (alive) setTz(null); }
    })();
    return () => { alive = false; };
  }, [supa, propertyId, isSmall]);

  function fmtInTZ(iso?: string | null): string | null {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const opts: Intl.DateTimeFormatOptions = { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12: false, timeZone: tz || undefined };
      const s = new Intl.DateTimeFormat(undefined, opts).format(d);
      return tz ? `${s} (${tz})` : s;
    } catch { return iso as any; }
  }
  return (
    <>
      <button
        type="button"
        className="sb-btn"
        {...useTap(onCopyPreview)}
        style={{ padding: "12px 14px", minHeight: 44, touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          {!copied && (
            <img src={isDark ? '/copy_fordark.png' : '/copy_forlight.png'} alt="" width={14} height={14} style={{ opacity:.95 }} />
          )}
          {copied ? "Copied!" : "Copy preview"}
        </span>
      </button>
      <GenerateLinkButton propertyId={propertyId} bookingId={bookingId} values={values} />
      {isSmall && last && (
        <div style={{ width:'100%' }}>
          <small style={{ color:'var(--muted)' }}>
            {last.status === 'sent' ? (
              <>Last sent: {fmtInTZ(last.sent_at || last.created_at) || (last.sent_at || last.created_at)}</>
            ) : last.status === 'error' ? (
              <>Last error: {last.error_message || 'failed'} ({fmtInTZ(last.created_at) || last.created_at})</>
            ) : (
              <>Last status: {last.status} ({fmtInTZ(last.created_at) || last.created_at})</>
            )}
          </small>
        </div>
      )}
    </>
  );
}

// setEligibleRooms is provided by React state above
