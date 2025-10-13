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

type PropInfo = {
  name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  presentation_image_url?: string | null;
  regulation_pdf_url?: string | null;
};

export default function MessagesView({ token, data }: { token: string; data: any }) {
  const itemsAll: Item[] = Array.isArray(data?.items) ? data.items : [];
  const items: Item[] = itemsAll.filter(it => !!it.visible);
  const details: Details = (data?.details || {}) as Details;
  const prop: PropInfo = (data?.property || {}) as PropInfo;

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
      {/* Property contact + image overlay card (glass) */}
      {(prop && (prop.presentation_image_url || prop.contact_email || prop.contact_phone || prop.contact_address)) && (
        <section className="rm-card" style={{ padding: 0, marginBottom: 12 }}>
          {prop.presentation_image_url ? (
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
              <img src={prop.presentation_image_url || ''} alt="Property" style={{ display:'block', width:'100%', height:260, objectFit:'cover' }} />
              {(prop.contact_email || prop.contact_phone || prop.contact_address) && (
                <div
                  style={{
                    position: 'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
                    width:'calc(100% - 24px)', maxWidth: 380,
                    background: 'rgba(23, 25, 36, 0.29)', color: '#fff',
                    WebkitBackdropFilter: 'blur(3px) saturate(140%)', backdropFilter: 'blur(3px) saturate(140%)',
                    border: '1px solid rgba(255,255,255,0.22)', borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.35)', padding:'12px 14px', display:'grid', gap:6,
                  }}
                >
                  {prop.contact_email && (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span aria-hidden>✉</span>
                      <a href={`mailto:${prop.contact_email}`} style={{ color:'#fff', textDecoration:'none' }}>{prop.contact_email}</a>
                    </div>
                  )}
                  {prop.contact_phone && (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span aria-hidden>☏</span>
                      <a href={`tel:${String(prop.contact_phone || '').replace(/\s+/g,'')}`} style={{ color:'#fff', textDecoration:'none' }}>{prop.contact_phone}</a>
                    </div>
                  )}
                  {prop.contact_address && (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span aria-hidden>⚐</span>
                      <span>{prop.contact_address}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 12 }}>
              {prop.contact_email && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span aria-hidden>✉</span>
                  <a href={`mailto:${prop.contact_email}`} style={{ color:'var(--primary)', textDecoration:'none' }}>{prop.contact_email}</a>
                </div>
              )}
              {prop.contact_phone && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span aria-hidden>☏</span>
                  <a href={`tel:${String(prop.contact_phone || '').replace(/\s+/g,'')}`} style={{ color:'var(--primary)', textDecoration:'none' }}>{prop.contact_phone}</a>
                </div>
              )}
              {prop.contact_address && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span aria-hidden>⚐</span>
                  <span>{prop.contact_address}</span>
                </div>
              )}
            </div>
          )}
        </section>
      )}
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
                <div>
                  <strong>Room</strong>: {details.room_name}
                  {prop?.regulation_pdf_url ? (
                    <div style={{ marginTop: 6 }}>
                      <a href={prop.regulation_pdf_url} target="_blank" rel="noreferrer" style={{ color:'var(--primary)', textDecoration:'none', fontWeight:800 }}>House Rules</a>
                    </div>
                  ) : null}
                </div>
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
