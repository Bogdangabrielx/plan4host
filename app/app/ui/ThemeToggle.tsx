"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";
type Size = "sm" | "md";

interface Props {
  theme?: Theme;
  onChange?: (t: Theme) => void;
  size?: Size;
}

export default function ThemeToggle({ theme, onChange, size = "md" }: Props) {
  const controlled = typeof theme !== "undefined";
  const [inner, setInner] = useState<Theme>("dark");
  const t = controlled ? (theme as Theme) : inner;

  // dimensiuni auto din înălțime
  const H   = size === "sm" ? 28 : 32;     // înălțimea track-ului
  const W   = size === "sm" ? 46 : 56;     // lățimea track-ului
  const PAD = size === "sm" ? 3  : 4;      // padding interior
  const KNOB  = H - PAD * 2;               // diametrul knob-ului
  const BADGE = KNOB - 4;                  // puțin mai mic ca să nu rămână inelul
  const ICON  = size === "sm" ? 14 : 16;

  const knobLeft = t === "light" ? PAD : W - KNOB - PAD;

  useEffect(() => {
    if (controlled) return;
    const readTheme = (): Theme => {
      const fromHtml = document.documentElement.getAttribute("data-theme") as Theme | null;
      const fromLS = localStorage.getItem("theme_v1") as Theme | null;
      return (fromHtml ?? fromLS ?? "dark") as Theme;
    };

    // Initial sync (also ensures html+storage are aligned like before)
    apply(readTheme(), false);

    function onThemeChange(e: Event) {
      const detail = (e as CustomEvent).detail as { theme?: Theme } | undefined;
      const next = detail?.theme ?? readTheme();
      setInner(next);
    }

    window.addEventListener("themechange" as any, onThemeChange);

    // Fallback: if some code updates data-theme without dispatching the event
    const mo = new MutationObserver(() => {
      try {
        setInner(readTheme());
      } catch {}
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      window.removeEventListener("themechange" as any, onThemeChange);
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlled]);

  function apply(next: Theme, notify = true) {
    if (!controlled) setInner(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme_v1", next);
      document.cookie = `app_theme=${next}; path=/; max-age=${60*60*24*365}`;
    } catch {}
    if (notify) window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
    onChange?.(next);
  }

  function toggle() { apply(t === "light" ? "dark" : "light"); }

  const trackOn  = "transparent";
  const trackOff = "var(--card)";
  const border   = "1px solid var(--border)";
  const knobBg   = "var(--text)";
  const badgeBg  = "var(--bg)";
  const badgeBrd = "1px solid var(--border)";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      aria-pressed={t === "dark"}
      style={{
        width: W, height: H, borderRadius: 999, border,
        background: t === "dark" ? trackOn : trackOff,
        position: "relative", cursor: "pointer", padding: 0,
        transition: "background .25s ease", boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* soare stânga */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: PAD + 1,
          top: "50%", transform: "translateY(-50%)",
          width: BADGE, height: BADGE, borderRadius: "50%",
          background: badgeBg, border: badgeBrd,
          opacity: t === "light" ? 0 : 0.95,     // ascuns complet sub knob în light
          transition: "opacity .2s ease",
          pointerEvents: "none",
        }}
      />
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: PAD + 1 + (BADGE - ICON) / 2,
          top: "50%", transform: "translateY(-50%)",
          fontSize: ICON, opacity: t === "light" ? 0 : 1,
          transition: "opacity .2s ease", userSelect: "none", pointerEvents: "none",
          filter: "drop-shadow(0 0 1px rgba(0,0,0,.35))",
        }}
      >☀️</span>

      {/* lună dreapta */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: PAD + 1,
          top: "50%", transform: "translateY(-50%)",
          width: BADGE, height: BADGE, borderRadius: "50%",
          background: badgeBg, border: badgeBrd,
          opacity: t === "dark" ? 0 : 0.95,      // ascuns complet sub knob în dark
          transition: "opacity .2s ease",
          pointerEvents: "none",
        }}
      />
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: PAD + 1 + (BADGE - ICON) / 2,
          top: "50%", transform: "translateY(-50%)",
          fontSize: ICON, opacity: t === "dark" ? 0 : 1,
          transition: "opacity .2s ease", userSelect: "none", pointerEvents: "none",
          filter: "drop-shadow(0 0 1px rgba(0,0,0,.35))",
        }}
      >🌙</span>

      {/* knob — centrat perfect și peste tot (zIndex) */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: "50%", left: knobLeft, transform: "translateY(-50%)",
          width: KNOB, height: KNOB, borderRadius: "50%",
          background: knobBg, boxShadow: "0 1px 2px rgba(0,0,0,.25)",
          transition: "left .25s ease", boxSizing: "border-box",
          zIndex: 2,
        }}
      />
    </button>
  );
}
