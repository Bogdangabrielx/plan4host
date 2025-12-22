"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_SRC = "/Simulate%20guest%20flow.MP4";

export default function SimulateGuestFlowCard() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState(false);
  const tapTimerRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) {
        try {
          clearTimeout(tapTimerRef.current as any);
        } catch {}
      }
    };
  }, []);

  const toggle = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      try {
        await v.play();
      } catch {}
      setPlaying(true);
    } else {
      try {
        v.pause();
      } catch {}
      setPlaying(false);
    }
  };

  const seekBy = (deltaSeconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    const cur = Number.isFinite(v.currentTime) ? v.currentTime : 0;
    const dur = Number.isFinite(v.duration) ? v.duration : 0;
    const next = Math.max(0, Math.min(dur || Number.POSITIVE_INFINITY, cur + deltaSeconds));
    try {
      v.currentTime = next;
    } catch {}
  };

  const onPointerDown = () => {
    let coarse = false;
    try {
      coarse = window.matchMedia?.("(hover: none), (pointer: coarse)")?.matches ?? false;
    } catch {}

    if (!coarse) {
      setHover(true);
      return;
    }

    toggle();
    setHover(true);
    if (tapTimerRef.current) {
      try {
        clearTimeout(tapTimerRef.current as any);
      } catch {}
    }
    tapTimerRef.current = window.setTimeout(() => {
      setHover(false);
      tapTimerRef.current = null;
    }, 1500);
  };

  return (
    <section
      id="simulateguestflow"
      className="sb-cardglow"
      style={{
        width: "min(900px, 100%)",
        margin: "0 auto",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--panel)",
        padding: 16,
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Simulate guest flow</h2>
      </div>

      <div
        className="sb-cardglow"
        style={{
          width: "min(820px, 100%)",
          margin: "0 auto",
          borderRadius: 12,
          overflow: "hidden",
          position: "relative",
          background: "color-mix(in srgb, var(--card) 80%, transparent)",
        }}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onPointerDown={onPointerDown}
      >
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          style={{
            width: "100%",
            height: "auto",
            maxHeight: 420,
            display: "block",
            objectFit: "contain",
          }}
        />

        <div
          role="group"
          aria-label="Video controls"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            opacity: !playing || hover ? 1 : 0,
            transition: "opacity .2s ease",
            pointerEvents: !playing || hover ? "auto" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHover(true);
                seekBy(-10);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Back 10 seconds"
              style={{
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "color-mix(in srgb, var(--card) 18%, transparent)",
                backdropFilter: "blur(3px)",
                WebkitBackdropFilter: "blur(3px)",
                color: "var(--text)",
                width: 58,
                height: 58,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden>
                <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.95" />
                <g transform="translate(0,-1)">
                  <path d="M11.1 6.9l-3 3 3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 9.9h4.1c2.4 0 4.3 1.6 4.3 4.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </g>
                <text x="12" y="19.1" textAnchor="middle" fontSize="5.4" fontWeight="700" fill="currentColor">
                  10s
                </text>
              </svg>
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggle(); }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={playing ? "Pause video" : "Play video"}
              style={{
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "color-mix(in srgb, var(--card) 18%, transparent)",
                backdropFilter: "blur(3px)",
                WebkitBackdropFilter: "blur(3px)",
                color: "var(--text)",
                width: 72,
                height: 72,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden>
                  <rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
                  <rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden>
                  <path d="M8 5l12 7-12 7V5z" fill="currentColor" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHover(true);
                seekBy(10);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Forward 10 seconds"
              style={{
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "color-mix(in srgb, var(--card) 18%, transparent)",
                backdropFilter: "blur(3px)",
                WebkitBackdropFilter: "blur(3px)",
                color: "var(--text)",
                width: 58,
                height: 58,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden>
                <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.95" />
                <g transform="translate(0,-1)">
                  <path d="M12.9 6.9l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 9.9h-4.1c-2.4 0-4.3 1.6-4.3 4.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </g>
                <text x="12" y="19.1" textAnchor="middle" fontSize="5.4" fontWeight="700" fill="currentColor">
                  10s
                </text>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
