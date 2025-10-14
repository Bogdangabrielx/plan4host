"use client";

import React, { useEffect, useMemo, useState } from "react";

export default function BottomNav() {
  const [isSmall, setIsSmall] = useState(false);
  const [theme, setTheme] = useState<'light'|'dark'>('light');
  const [path, setPath] = useState<string>('');

  useEffect(() => {
    const detect = () => setIsSmall(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
    detect();
    window.addEventListener('resize', detect);
    return () => window.removeEventListener('resize', detect);
  }, []);

  useEffect(() => {
    try { setTheme((document.documentElement.getAttribute('data-theme') as any) || 'light'); } catch {}
    const onTheme = (e: any) => { if (e?.detail?.theme) setTheme(e.detail.theme); };
    window.addEventListener('themechange' as any, onTheme);
    setPath(window.location.pathname);
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('themechange' as any, onTheme); window.removeEventListener('popstate', onPop); };
  }, []);

  const items = useMemo(() => ([
    { href: '/app/calendar', label: 'Calendar', icon: theme==='light' ? '/calendar_forlight.png' : '/calendar_fordark.png' },
    { href: '/app/cleaning', label: 'Cleaning Board', icon: theme==='light' ? '/cleaning_forlight.png' : '/cleaning_fordark.png' },
    { href: '/app/guest', label: 'Guest Overview', icon: theme==='light' ? '/guest_forlight.png' : '/guest_fordark.png' },
  ]), [theme]);

  if (!isSmall) return null;

  return (
    <nav
      aria-label="Bottom navigation"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        background: 'var(--panel)', borderTop: '1px solid var(--border)',
        padding: '8px 10px', paddingBottom: `calc(8px + env(safe-area-inset-bottom, 0px))`,
        zIndex: 90,
      }}
    >
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 6 }}>
        {items.map((it) => {
          const active = path === it.href || path.startsWith(it.href + '/');
          return (
            <a key={it.href} href={it.href} style={{ textDecoration:'none', color: active ? 'var(--primary)' : 'var(--muted)', display:'grid', placeItems:'center', gap:4 }}>
              <img src={it.icon} alt="" width={22} height={22} style={{ display:'block', opacity: active ? 1 : 0.9 }} />
              <small style={{ fontSize:10, fontWeight:800, letterSpacing:.2 }}>{it.label}</small>
            </a>
          );
        })}
        <button
          type="button"
          onClick={() => { try { window.dispatchEvent(new CustomEvent('p4h:openManagement')); } catch {} }}
          style={{ border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', borderRadius:10, display:'grid', placeItems:'center', gap:4, padding:'6px 4px' }}
          aria-label="Open management"
        >
          <img src={theme==='light' ? '/configurator_forlight.png' : '/configurator_fordark.png'} alt="" width={22} height={22} style={{ display:'block' }} />
          <small style={{ fontSize:10, fontWeight:800, letterSpacing:.2 }}>Management</small>
        </button>
      </div>
    </nav>
  );
}
