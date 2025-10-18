"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function PullToRefresh() {
  const router = useRouter();
  const [dragPx, setDragPx] = useState(0);
  const [active, setActive] = useState(false);
  const startY = useRef(0);
  const startAt = useRef(0);     // timestamp when potential pull started
  const crossedAt = useRef(0);   // timestamp when threshold was first crossed
  const arming = useRef(false);   // potential pull (at top), not yet dragging
  const dragging = useRef(false); // true only when pulling down beyond threshold
  const dragRef = useRef(0);
  useEffect(()=>{ dragRef.current = dragPx; }, [dragPx]);

  const THRESHOLD = 70; // px to trigger refresh
  const MIN_HOLD_MS = 1500; // must hold above threshold for at least 1.5s

  useEffect(() => {
    // Only enable on small/mobile viewports
    const isTouchCapable = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    if (!isTouchCapable) return;

    function getY(ev: TouchEvent | PointerEvent): number {
      // @ts-ignore
      if (typeof TouchEvent !== 'undefined' && ev instanceof TouchEvent) {
        const t = ev.touches?.[0] || (ev as any).changedTouches?.[0];
        return t ? t.clientY : 0;
      }
      const pe = ev as PointerEvent;
      return pe.clientY || 0;
    }

    function modalOpen(): boolean {
      try { return document.documentElement.getAttribute('data-modal-open') === '1'; } catch { return false; }
    }

    function onDown(ev: TouchEvent | PointerEvent) {
      try {
        if (modalOpen()) { arming.current = false; dragging.current = false; return; }
        if (window.scrollY > 0) { arming.current = false; dragging.current = false; return; } // must be at top
        const y = getY(ev);
        if (!y) return;
        arming.current = true; // wait to see direction
        dragging.current = false;
        startY.current = y;
        startAt.current = Date.now();
        crossedAt.current = 0;
        setActive(false);
        setDragPx(0);
      } catch {}
    }
    function onMove(ev: TouchEvent | PointerEvent) {
      if (modalOpen()) { return; }
      const y = getY(ev);
      if (!y) return;
      if (!arming.current && !dragging.current) return;
      const dyRaw = y - startY.current;
      if (!dragging.current) {
        // decide direction
        if (dyRaw > 8 && window.scrollY === 0) {
          dragging.current = true;
          setActive(true);
        } else if (dyRaw < 0) {
          // user is scrolling up → cancel arming to allow normal scroll
          arming.current = false;
          dragging.current = false;
          startAt.current = 0;
          return;
        } else {
          return;
        }
      }
      // dragging: only when pulling down
      const dy = Math.max(0, dyRaw);
      setDragPx(Math.min(140, dy));
      // track when threshold is crossed and held
      if (dy >= THRESHOLD) {
        if (!crossedAt.current) crossedAt.current = Date.now();
      } else {
        crossedAt.current = 0; // reset if user dips below threshold
      }
    }
    function onUp() {
      if (modalOpen()) { arming.current = false; dragging.current = false; setActive(false); setDragPx(0); return; }
      if (!dragging.current) { arming.current = false; return; }
      const final = dragRef.current;
      dragging.current = false;
      arming.current = false;
      setActive(false);
      setDragPx(0);
      const heldMs = crossedAt.current ? (Date.now() - crossedAt.current) : 0;
      startAt.current = 0;
      const ok = final >= THRESHOLD && heldMs >= MIN_HOLD_MS;
      crossedAt.current = 0;
      if (ok) {
        try { (router as any)?.refresh?.(); } catch {}
        setTimeout(() => { try { window.location.reload(); } catch {} }, 50);
      }
    }

    // Attach listeners (touch + pointer for broader support)
    const optsMove: AddEventListenerOptions = { passive: true } as any;
    window.addEventListener('touchstart', onDown as any, { passive: true } as any);
    window.addEventListener('touchmove', onMove as any, optsMove);
    window.addEventListener('touchend', onUp as any, { passive: true } as any);
    window.addEventListener('pointerdown', onDown as any, false);
    window.addEventListener('pointermove', onMove as any, optsMove);
    window.addEventListener('pointerup', onUp as any, false);

    return () => {
      window.removeEventListener('touchstart', onDown as any);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onUp as any);
      window.removeEventListener('pointerdown', onDown as any);
      window.removeEventListener('pointermove', onMove as any);
      window.removeEventListener('pointerup', onUp as any);
    };
  }, [router]);

  // Visual indicator (small bar at top)
  const show = active || dragPx > 0;
  const translate = Math.min(60, dragPx * 0.45);
  const progress = Math.max(0, Math.min(1, dragPx / THRESHOLD));

  if (!show) return null;
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        transform: `translateY(${translate}px)`, transition: active ? 'none' : 'transform .18s ease',
        zIndex: 110,
        display: 'grid', placeItems: 'center', pointerEvents:'none'
      }}
    >
      <div
        style={{
          background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)',
          borderRadius: 999, padding: '6px 10px', fontSize: 12, display:'inline-flex', alignItems:'center', gap:8,
          boxShadow: '0 6px 24px rgba(0,0,0,.20)'
        }}
      >
        <span style={{ width: 14, height: 14, borderRadius: 999, border: '2px solid var(--border)', borderTopColor: 'var(--primary)', display: 'inline-block', animation: progress >= 1 ? 'p4h-spin .9s linear infinite' : 'none' }} />
        <span>{progress < 1 ? 'Pull to refresh' : 'Release to refresh'}</span>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes p4h-spin{ from{ transform: rotate(0deg);} to{ transform: rotate(360deg);} }` }} />
    </div>
  );
}
