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
          <main style={{ width: 'min(860px, calc(100vw - 32px))' }}>
            {!ok ? (
              <div style={{
                background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 16,
              }}>
                <h3 style={{ marginTop: 0 }}>Link not available</h3>
                <p style={{ color: 'var(--muted)' }}>{(data?.error || 'The link is invalid or expired.') as string}</p>
              </div>
            ) : (
              <article style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                <div dangerouslySetInnerHTML={{ __html: (data?.html as string) || '' }} />
              </article>
            )}
            <p style={{ color: 'var(--muted)', textAlign: 'center', fontSize: 12, marginTop: 12 }}>
              Powered by Plan4Host.
            </p>
          </main>
        </div>
      </body>
    </html>
  );
}

