"use client";

import React from "react";

export default function CookieFab({ lang }: { lang: "en" | "ro" }) {
  const label = lang === "ro" ? "Setări cookie" : "Cookie settings";

  return (
    <>
      <button
        type="button"
        className="p4h-cookieFab"
        aria-label={label}
        title={label}
        onClick={() => {
          try {
            window.dispatchEvent(new CustomEvent("p4h:cookie:open"));
          } catch {}
        }}
      >
        <span aria-hidden>🍪</span>
      </button>

      <style jsx>{`
        .p4h-cookieFab {
          position: fixed;
          left: 16px;
          bottom: calc(16px + env(safe-area-inset-bottom));
          /* Keep visible even above the cookie modal overlay */
          z-index: 2147483647;
          width: 50px;
          height: 50px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          background: color-mix(in srgb, var(--card) 85%, transparent);
          -webkit-backdrop-filter: blur(12px) saturate(130%);
          backdrop-filter: blur(12px) saturate(130%);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.16);
          cursor: pointer;
          transition: transform 0.05s ease, box-shadow 0.2s ease, border-color 0.2s ease,
            background 0.2s ease;
        }
        .p4h-cookieFab:hover {
          border-color: color-mix(in srgb, var(--muted) 65%, var(--border));
          box-shadow: 0 22px 58px rgba(0, 0, 0, 0.18);
        }
        .p4h-cookieFab:active {
          transform: scale(0.99);
        }
        .p4h-cookieFab:focus-visible {
          outline: none;
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 14%, transparent), 0 22px 58px rgba(0, 0, 0, 0.18);
        }
        .p4h-cookieFab span {
          font-size: 22px;
          line-height: 1;
        }
      `}</style>
    </>
  );
}
