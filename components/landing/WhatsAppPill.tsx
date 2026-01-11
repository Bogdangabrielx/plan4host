"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  lang: "en" | "ro";
};

const PHONE_DIGITS = "40721759329";

export default function WhatsAppPill({ lang }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const t = useMemo(() => {
    return lang === "ro"
      ? {
          pill: "Scrie-ne pe WhatsApp",
          hello: "Bună! Cu ce te putem ajuta?",
          placeholder: "Scrie un mesaj…",
          send: "Trimite",
          close: "Închide",
        }
      : {
          pill: "Chat on WhatsApp",
          hello: "Hi! How can we help you?",
          placeholder: "Type a message…",
          send: "Send",
          close: "Close",
        };
  }, [lang]);

  useEffect(() => {
    if (!open) return;
    try {
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch {}
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="p4h-waPill"
        aria-label={t.pill}
        title={t.pill}
        onClick={() => {
          setOpen(true);
        }}
      >
        <img src="/logo_whatsapp.png" alt="" aria-hidden="true" />
        <span>{t.pill}</span>
      </button>

      {open && (
        <div
          className="p4h-waOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="WhatsApp"
          onClick={() => setOpen(false)}
        >
          <div className="p4h-waChat" onClick={(e) => e.stopPropagation()}>
            <div className="p4h-waTop">
              <div className="p4h-waTopTitle">
                <img src="/logo_whatsapp.png" alt="" aria-hidden="true" />
                <div style={{ minWidth: 0 }}>
                  WhatsApp <small>+40 721 759 329</small>
                </div>
              </div>
              <button
                type="button"
                className="p4h-waClose"
                aria-label={t.close}
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="p4h-waMessages">
              <div className="p4h-waBubble p4h-waLeft">{t.hello}</div>
              {text.trim().length > 0 && (
                <div className="p4h-waBubble p4h-waRight">{text.trim()}</div>
              )}
            </div>

            <div className="p4h-waComposer">
              <textarea
                ref={inputRef}
                className="p4h-waInput"
                rows={2}
                value={text}
                onChange={(e) => setText(e.currentTarget.value)}
                placeholder={t.placeholder}
                aria-label={t.placeholder}
              />
              <button
                type="button"
                className="p4h-waSend"
                aria-label={t.send}
                title={t.send}
                disabled={text.trim().length === 0}
                onClick={() => {
                  const msg = text.trim();
                  if (!msg) return;
                  const url = `https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent(msg)}`;
                  try {
                    window.open(url, "_blank", "noopener,noreferrer");
                  } catch {
                    try {
                      window.location.assign(url);
                    } catch {}
                  }
                  setOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

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
          padding: 0 12px 0 0;
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
          width: 44px;
          height: 44px;
          display: block;
          box-shadow: none;
          filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.18));
          flex: 0 0 auto;
        }
        .p4h-waPill span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 13px;
        }

        .p4h-waOverlay {
          position: fixed;
          inset: 0;
          z-index: 990;
          background: rgba(2, 6, 23, 0.55);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          display: grid;
          place-items: end;
          padding: 16px;
        }
        .p4h-waChat {
          width: min(520px, 100%);
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #0b141a;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji",
            "Segoe UI Emoji";
          font-weight: 400;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.34);
          overflow: hidden;
          display: grid;
          grid-template-rows: auto 1fr auto;
          max-height: min(540px, calc(100vh - 32px - env(safe-area-inset-bottom)));
        }
        .p4h-waTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px;
          background: #128c7e;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        .p4h-waTopTitle {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          color: #fff;
          font-weight: 850;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .p4h-waTopTitle img {
          width: 22px;
          height: 22px;
          display: block;
          filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.16));
        }
        .p4h-waTopTitle small {
          font-weight: 650;
          letter-spacing: normal;
          text-transform: none;
          color: rgba(255, 255, 255, 0.88);
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .p4h-waClose {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(0, 0, 0, 0.1);
          color: #fff;
          font-weight: 900;
          cursor: pointer;
          display: grid;
          place-items: center;
          line-height: 1;
        }
        .p4h-waClose:hover {
          background: rgba(0, 0, 0, 0.14);
        }
        .p4h-waMessages {
          padding: 14px;
          display: grid;
          gap: 10px;
          overflow: auto;
          background-color: #0b141a;
          background-image: linear-gradient(rgba(11, 20, 26, 0.9), rgba(11, 20, 26, 0.9)),
            url(/whatsapp_background.jpg);
          background-repeat: repeat;
          background-position: top left;
          background-size: clamp(360px, 72vw, 520px);
        }
        .p4h-waBubble {
          max-width: 88%;
          padding: 10px 12px;
          border-radius: 14px;
          font-size: 14px;
          line-height: 1.45;
          color: #fff;
          font-weight: 400;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .p4h-waLeft {
          justify-self: start;
          background: #202c33;
          border-bottom-left-radius: 6px;
        }
        .p4h-waRight {
          justify-self: end;
          background: #005c4b;
          border-color: rgba(0, 168, 132, 0.2);
          border-bottom-right-radius: 6px;
        }
        .p4h-waComposer {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          padding: 12px;
          background: #111b21;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .p4h-waInput {
          width: 100%;
          resize: none;
          min-height: 38px;
          max-height: 92px;
          padding: 9px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: #202c33;
          color: #fff;
          outline: none;
          font-size: 14px;
          line-height: 1.25;
          font-family: inherit;
          font-weight: 400;
        }
        .p4h-waInput::placeholder {
          color: rgba(255, 255, 255, 0.65);
        }
        .p4h-waInput:focus {
          border-color: rgba(255, 255, 255, 0.14);
          box-shadow: 0 0 0 4px rgba(37, 211, 102, 0.1);
        }
        .p4h-waSend {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(0, 168, 132, 0.45);
          background: #00a884;
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: transform 0.05s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .p4h-waSend::before {
          content: "";
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
        .p4h-waSend:hover {
          background: #00b195;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
        }
        .p4h-waSend:active {
          transform: scale(0.99);
        }
        .p4h-waSend:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }

        @media (max-width: 560px) {
          .p4h-waOverlay {
            place-items: end center;
            padding: 12px 12px calc(12px + env(safe-area-inset-bottom) + 48px);
          }
          .p4h-waChat {
            width: 100%;
          }
          .p4h-waPill span {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
