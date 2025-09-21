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
                .rm-content{ color: var(--text); font-family: Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
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
              <article className="rm-card">
                <div className="rm-content" dangerouslySetInnerHTML={{ __html: (data?.html as string) || '' }} />
              </article>
            )}
            <p className="rm-note">Powered by Plan4Host.</p>
          </main>
        </div>
      </body>
    </html>
  );
}
