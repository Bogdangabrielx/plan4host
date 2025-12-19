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

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          aria-label={playing ? "Pause video" : "Play video"}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
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
            opacity: !playing || hover ? 1 : 0,
            transition: "opacity .2s ease",
            pointerEvents: !playing || hover ? "auto" : "none",
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
      </div>
    </section>
  );
}
