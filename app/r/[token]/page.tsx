// /r/[token]/page.tsx — public reservation message page (no auth)
import { cookies } from "next/headers";

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
              <LanguageViewer htmlRo={(data?.html_ro as string) || ''} htmlEn={(data?.html_en as string) || ''} />
            )}
            <p className="rm-note">Powered by Plan4Host.</p>
          </main>
        </div>
      </body>
    </html>
  );
}

// Client component to toggle RO/EN without reloading
function LanguageViewer({ htmlRo, htmlEn }: { htmlRo: string; htmlEn: string }) {
  'use client';
  const [lang, setLang] = React.useState<'ro'|'en'>(() => (htmlRo ? 'ro' : 'en'));
  const ro = (htmlRo || '').trim();
  const en = (htmlEn || '').trim();
  return (
    <article className="rm-card">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <strong>Message</strong>
        <div style={{ display:'inline-flex', gap:8 }}>
          <button onClick={()=>setLang('ro')} className="sb-btn" style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', background: lang==='ro' ? 'var(--primary)' : 'var(--card)', color: lang==='ro' ? '#0c111b' : 'var(--text)', display:'inline-flex', alignItems:'center', gap:6 }}>
            <img src="/ro.png" alt="RO" width={16} height={16} />
            <span>Română</span>
          </button>
          <button onClick={()=>setLang('en')} className="sb-btn" style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', background: lang==='en' ? 'var(--primary)' : 'var(--card)', color: lang==='en' ? '#0c111b' : 'var(--text)', display:'inline-flex', alignItems:'center', gap:6 }}>
            <img src="/eng.png" alt="EN" width={16} height={16} />
            <span>English</span>
          </button>
        </div>
      </div>
      <div className="rm-content" dangerouslySetInnerHTML={{ __html: (lang==='ro' ? (ro || en) : (en || ro)) }} />
    </article>
  );
}
