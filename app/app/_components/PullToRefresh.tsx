"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function PullToRefresh() {
  const router = useRouter();
  const [dragPx, setDragPx] = useState(0);
  const [active, setActive] = useState(false);
  const startY = useRef(0);
  const dragging = useRef(false);

  const THRESHOLD = 70; // px to trigger refresh

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

    function onDown(ev: TouchEvent | PointerEvent) {
      try {
        if (window.scrollY > 0) return; // must be at top
        const y = getY(ev);
        if (!y) return;
        dragging.current = true;
        startY.current = y;
        setActive(true);
        setDragPx(0);
      } catch {}
    }
    function onMove(ev: TouchEvent | PointerEvent) {
      if (!dragging.current) return;
      const y = getY(ev);
      if (!y) return;
      const dy = Math.max(0, y - startY.current);
      // Reduce scroll while pulling
      try { (ev as any).preventDefault?.(); } catch {}
      setDragPx(Math.min(140, dy));
    }
    function onUp() {
      if (!dragging.current) return;
      const final = dragPx;
      dragging.current = false;
      setActive(false);
      setDragPx(0);
      if (final >= THRESHOLD) {
        try { (router as any)?.refresh?.(); } catch {}
        setTimeout(() => { try { window.location.reload(); } catch {} }, 50);
      }
    }

    // Attach listeners (touch + pointer for broader support)
    const optsMove: AddEventListenerOptions = { passive: false } as any;
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
  }, [router, dragPx]);

  // Visual indicator (small bar at top)
  const show = active || dragPx > 0;
  const translate = Math.min(60, dragPx * 0.45);
  const progress = Math.max(0, Math.min(1, dragPx / THRESHOLD));

  return (
    <div aria-hidden style={{ pointerEvents: 'none' }}>
      {show && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            transform: `translateY(${translate}px)`, transition: active ? 'none' : 'transform .18s ease',
            zIndex: 110,
            display: 'grid', placeItems: 'center',
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
      )}
    </div>
  );
}

