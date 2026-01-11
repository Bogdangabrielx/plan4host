"use client";

import React from "react";

type Props = {
  lang: "en" | "ro";
};

const PHONE_DIGITS = "40721759329";

export default function WhatsAppPill({ lang }: Props) {
  const label = lang === "ro" ? "Scrie-ne pe WhatsApp" : "Chat on WhatsApp";
  const text =
    lang === "ro"
      ? "Bună! Aș dori mai multe detalii despre Plan4Host."
      : "Hi! I’d like to learn more about Plan4Host.";

  return (
    <>
      <button
        type="button"
        className="p4h-waPill"
        aria-label={label}
        title={label}
        onClick={() => {
          const url = `https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent(text)}`;
          try {
            window.open(url, "_blank", "noopener,noreferrer");
          } catch {
            try {
              window.location.assign(url);
            } catch {}
          }
        }}
      >
        <img src="/logo_whatsapp.png" alt="" aria-hidden="true" />
        <span>{label}</span>
      </button>

      <style jsx>{`
        .p4h-waPill {
          position: fixed;
          right: 16px;
          bottom: calc(16px + env(safe-area-inset-bottom));
          z-index: 900;
          height: 44px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 0 12px;
          max-width: min(320px, calc(100vw - 32px));
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: linear-gradient(135deg, #25d366, #128c7e);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.26);
          color: #fff;
          font-weight: 650;
          cursor: pointer;
          user-select: none;
          transition: transform 0.05s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          pointer-events: auto;
        }
        .p4h-waPill:hover {
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: 0 22px 58px rgba(0, 0, 0, 0.32);
        }
        .p4h-waPill:active {
          transform: scale(0.99);
        }
        .p4h-waPill:focus-visible {
          outline: none;
          box-shadow: 0 0 0 4px rgba(37, 211, 102, 0.18), 0 22px 58px rgba(0, 0, 0, 0.32);
        }
        .p4h-waPill img {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: block;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
          flex: 0 0 auto;
        }
        .p4h-waPill span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 13px;
        }
        @media (max-width: 560px) {
          .p4h-waPill span {
            display: none;
          }
        }
      `}</style>
    </>
  );
}

