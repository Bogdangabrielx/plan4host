"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "./HeaderContext";

type Plan = "basic" | "standard" | "premium" | null;
type Lang = "en" | "ro";

function planLabel(plan: Plan) {
  if (!plan) return "—";
  return plan[0].toUpperCase() + plan.slice(1);
}
function planBadgeStyle(plan: Plan): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    // Always white background, no border, dark gray text in both themes
    background: "transparent",
    color: "var(--text)", // dark gray for readability on white
    border: "1px solid var(--border)",
    fontSize: "var(--fs-s)",
    fontWeight: "var(--fw-bold)",
    letterSpacing: 0.2,
  };
  return base;
}

export default function PlanHeaderBadge({ title, slot = "below" }: { title: string; slot?: "below" | "header-right" | "under-title" }) {
  const supabase = useMemo(() => createClient(), []);
  const { setTitle, setRight } = useHeader();
  const [plan, setPlan] = useState<Plan>(null);
  const [isTiny, setIsTiny] = useState(false);
  const [lang, setLang] = useState<Lang>("en");

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

  const translatedTitle = useMemo(() => {
    if (lang !== "ro") return title;
    const key = title.trim().toLowerCase();
    const map: Record<string, string> = {
      "dashboard": "Control",
      "calendar": "Calendar",
      "property setup": "Setari proprietate",
      "check-in editor": "Editor check-in",
      "cleaning board": "Curatenie",
      "sync calendars": "Sincronizare calendare",
      "channels & ical": "Canale si iCal",
      "automatic messages": "Mesaje automate",
      "guest overview": "Oaspeti",
      "notifications": "Notificari",
      "subscription": "Abonament",
      "team": "Echipa",
      "qr generator": "Generator QR",
    };
    return map[key] || title;
  }, [title, lang]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(max-width: 360px)");
    if (!mq) return;
    const update = () => setIsTiny(!!mq.matches);
    update();
    try {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    } catch {
      // Safari fallback
      // @ts-ignore
      mq.addListener(update);
      return () => {
        // @ts-ignore
        mq.removeListener(update);
      };
    }
  }, []);

  // Setează titlul la mount și când se schimbă titlul
  useEffect(() => {
    if (slot !== 'under-title') {
      setTitle(translatedTitle);
    }
  }, [setTitle, translatedTitle, slot]);

  // Citește planul activ din RPC (derivat din account_plan.plan_slug)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await supabase.rpc("account_current_plan");
        const p = (r.data as string | null)?.toLowerCase?.() as Plan | null;
        if (mounted) setPlan((p ?? "basic") as Plan);
      } catch {
        if (mounted) setPlan("basic");
      }
    })();
    return () => { mounted = false; };
  }, [supabase]);

  // Compose badge element
  const badge = plan ? <span className="sb-cardglow" style={planBadgeStyle(plan)}>{planLabel(plan)}</span> : null;

  // Slot behaviors
  useEffect(() => {
    if (slot === "header-right") {
      setRight(badge);
      return () => { setRight(null); };
    }
    if (slot === 'under-title') {
      // Ensure header-right is cleared on pages that render badge under title
      setRight(null);
      const isAutomaticMessages = /automatic\s+messages|mesaje\s+automate/i.test(translatedTitle);
      // Mută badge-ul sub titlu, în zona titlului din header
      const composed = (
        <span style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
          <span
            style={{
              maxWidth: "min(66vw, 520px)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: isAutomaticMessages ? "clip" : "ellipsis",
              // For long titles like "Automatic Messages", shrink instead of ellipsis.
              fontSize: isAutomaticMessages
                ? (isTiny ? "clamp(11px, 3.2vw, 15px)" : "clamp(13px, 3.6vw, 18px)")
                : undefined,
              letterSpacing: isAutomaticMessages ? "0.06em" : undefined,
            }}
          >
            {translatedTitle}
          </span>
          {badge}
        </span>
      );
      setTitle(composed);
    }
  }, [badge, isTiny, setRight, setTitle, slot, translatedTitle]);

  if (slot === "header-right" || slot === 'under-title') return null;
  if (!plan) return null;
  return <div  style={{ margin: "6px 0 12px" }}>{badge}</div>;
}
