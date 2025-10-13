// /r/[token]/page.tsx — public reservation message page (no auth)
import { cookies } from "next/headers";
import LanguageViewer from "./LanguageViewer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function load(token: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').toString().replace(/\/+$/, '');
  try {
    const res = await fetch(`${base}/api/reservation-message/public/${encodeURIComponent(token)}`, { cache: 'no-store' });
    const j = await res.json();
    return { ok: res.ok, data: j };
  } catch (e: any) {
    return { ok: false, data: { error: e?.message || 'Network error' } };
  }
}

export default async function ReservationPublicPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const { ok, data } = await load(token);
  const cookieStore = cookies();
  const theme = (cookieStore.get("app_theme")?.value as "light" | "dark") ?? "light";
  const accent = cookieStore.get("app_accent")?.value ?? "base";

  return (
    <html lang="en" data-theme={theme} data-accent={accent}>
      <body style={{ margin: 0 }}>
        <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'start center', padding: 16 }}>
          {/* Minimal page styles to improve readability and separation */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
                .rm-card{ background: var(--panel); border:1px solid var(--border); border-radius:14px; padding:18px; box-shadow: 0 10px 30px rgba(0,0,0,.20); }
                .rm-content{ color: var(--text); font-family: Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; white-space: pre-wrap; }
                .rm-content h1,.rm-content h2,.rm-content h3{ margin: 0 0 10px; line-height: 1.25; }
                .rm-content h3:first-of-type{ font-size: 20px; font-weight: 900; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 12px; }
                .rm-content p{ margin: 10px 0; line-height: 1.6; }
                .rm-content hr{ border: 0; border-top: 1px solid var(--border); margin: 14px 0; opacity: .75; }
                .rm-note{ color: var(--muted); text-align:center; font-size:12px; margin-top: 12px; }
              `,
            }}
          />
          <main style={{ width: 'min(860px, calc(100vw - 32px))' }}>
            {!ok ? (
              <div style={{
                background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 16,
              }}>
                <h3 style={{ marginTop: 0 }}>Link not available</h3>
                <p style={{ color: 'var(--muted)' }}>{(data?.error || 'The link is invalid or expired.') as string}</p>
              </div>
            ) : (
              <MessagesView token={token} data={data} />
            )}
            <p className="rm-note">Powered by Plan4Host.</p>
          </main>
        </div>
      </body>
    </html>
  );
}

// Client component to render details + cards with badges
function MessagesView({ token, data }: { token: string; data: any }) {
  'use client';
  const items: Array<{ id:string; title:string; html_ro:string; html_en:string; visible:boolean }> = Array.isArray(data?.items) ? data.items : [];
  const details = (data?.details || {}) as { property_name?:string; guest_first_name?:string; guest_last_name?:string; start_date?:string; end_date?:string; room_name?:string };
  // read state in localStorage per item
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const [read, setRead] = React.useState<Record<string, boolean>>({});
  React.useEffect(() => {
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
