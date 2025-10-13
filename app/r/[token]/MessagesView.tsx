"use client";

import React, { useEffect, useState } from "react";
import LanguageViewer from "./LanguageViewer";

type Details = {
  property_name?: string;
  guest_first_name?: string;
  guest_last_name?: string;
  start_date?: string;
  end_date?: string;
  room_name?: string;
};

type Item = { id: string; title: string; html_ro: string; html_en: string; visible: boolean };

export default function MessagesView({ token, data }: { token: string; data: any }) {
  const items: Item[] = Array.isArray(data?.items) ? data.items : [];
  const details: Details = (data?.details || {}) as Details;

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [read, setRead] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const r: Record<string, boolean> = {};
      for (const it of items) {
        const k = `p4h:rm:read:${token}:${it.id}`;
        r[it.id] = localStorage.getItem(k) === '1';
      }
      setRead(r);
    } catch {}
  }, [token, items.map(it=>it.id).join('|')]);

  function toggle(id: string) {
    setOpen(prev => ({ ...prev, [id]: !prev[id] }));
    setRead(prev => {
      if (prev[id]) return prev;
      try { localStorage.setItem(`p4h:rm:read:${token}:${id}`, '1'); } catch {}
      return { ...prev, [id]: true };
    });
  }

  return (
    <>
      {/* Reservation details card */}
      <article className="rm-card" style={{ marginBottom: 12 }}>
        <div className="rm-content">
          <h3>Reservation details</h3>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', rowGap:8, columnGap:10, alignItems:'center' }}>
            <div aria-hidden style={{ width:18 }}><img src="/dashboard_forlight.png" alt="" width={16} height={16} /></div>
            <div><strong>Property</strong>: {details.property_name || '—'}</div>
            <div aria-hidden style={{ width:18 }}><img src="/logoguest_forlight.png" alt="" width={16} height={16} /></div>
            <div><strong>Guest</strong>: {[details.guest_first_name||'', details.guest_last_name||''].filter(Boolean).join(' ') || '—'}</div>
            <div aria-hidden style={{ width:18 }}><img src="/night_forlight.png" alt="" width={16} height={16} /></div>
            <div><strong>Stay</strong>: {details.start_date || '—'} → {details.end_date || '—'}</div>
            {details.room_name ? (
              <>
                <div aria-hidden style={{ width:18 }}><img src="/room_forlight.png" alt="" width={16} height={16} /></div>
                <div><strong>Room</strong>: {details.room_name}</div>
              </>
            ) : null}
          </div>
        </div>
      </article>

      {items.length === 0 ? (
        <article className="rm-card"><div className="rm-content">No messages available.</div></article>
      ) : (
        <div style={{ display:'grid', gap:12 }}>
          {items.map(it => (
            <article key={it.id} className="rm-card" style={{ padding:0 }}>
              <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:12, borderBottom:'1px solid var(--border)' }}>
                <strong>{it.title || 'Message'}</strong>
                <button className="sb-btn" onClick={()=>toggle(it.id)} style={{ position:'relative' }}>
                  {open[it.id] ? 'Hide' : 'Open'}
                  {it.visible && !read[it.id] && (
                    <span style={{ position:'absolute', top:-4, right:-4, width:10, height:10, borderRadius:999, background:'var(--primary)' }} />
                  )}
                </button>
              </header>
              {open[it.id] && (
                <div style={{ padding:12 }}>
                  <LanguageViewer htmlRo={it.html_ro} htmlEn={it.html_en} />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

