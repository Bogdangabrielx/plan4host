// /r/[token]/page.tsx — public reservation message page (no auth)
import { cookies } from "next/headers";
import LanguageViewer from "./LanguageViewer";
import MessagesView from "./MessagesView";

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
  const theme: 'light' = 'light'; // forțăm mereu tema light pentru această pagină
  const accent = cookieStore.get("app_accent")?.value ?? "base";

  return (
    <html lang="en" data-theme={theme} data-accent={accent}>
      <body style={{ margin: 0 }}>
        <div
          className="rm-page"
          style={{
            minHeight: "100dvh",
            display: "grid",
            placeItems: "start center",
            padding: "16px 16px calc(16px + env(safe-area-inset-bottom))",
            background:
              "radial-gradient(700px 500px at 10% 0%, rgba(16,185,129,0.10), transparent 55%), radial-gradient(700px 500px at 90% 100%, rgba(59,130,246,0.08), transparent 55%), var(--bg, #f6f7fb)",
          }}
        >
          {/* Minimal page styles to improve readability and separation */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
                .rm-page{ --rm-font-h:16px; --rm-font-b:14px; --rm-font-s:12px; --rm-weight-m:600; --rm-weight-b:800; font-size: var(--rm-font-b); font-weight: var(--rm-weight-m); }
                .rm-card{ background: var(--panel); border:1px solid var(--border); border-radius:14px; padding:18px; box-shadow: 0 10px 24px rgba(0,0,0,.12); }
                .rm-content{ color: var(--text); font-family: Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; white-space: pre-wrap; font-size: var(--rm-font-b); font-weight: var(--rm-weight-m); }
                .rm-content h1,.rm-content h2,.rm-content h3{ margin: 0 0 10px; line-height: 1.25; font-weight: var(--rm-weight-b); }
                .rm-content h3:first-of-type{ font-size: var(--rm-font-s); font-weight: var(--rm-weight-b); letter-spacing: .12em; text-transform: uppercase; border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 14px; }
                .rm-content p{ margin: 10px 0; line-height: 1.6; font-size: var(--rm-font-b); font-weight: var(--rm-weight-m); }
                .rm-content hr{ border: 0; border-top: 1px solid var(--border); margin: 14px 0; opacity: .75; }
                .rm-topbar{ position: sticky; top: 12px; z-index: 50; padding: 12px 14px; }
                .rm-topbarInner{ display:flex; align-items:center; justify-content:space-between; gap: 12px; }
                .rm-topbarLeft{ display:flex; align-items:center; gap: 10px; min-width: 0; }
                .rm-propAvatar{ width: 44px; height: 44px; border-radius: 999px; overflow: hidden; background: transparent; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border) 70%, transparent), 0 10px 18px rgba(0,0,0,0.10); flex: 0 0 auto; }
                .rm-propAvatar img{ width: 100%; height: 100%; border-radius: 999px; object-fit: cover; display: block; transform: scale(1.06); transform-origin: center; }
                .rm-topbarTitle{ font-weight: var(--rm-weight-b); color: var(--text); font-size: var(--rm-font-h); letter-spacing: .06em; text-transform: uppercase; line-height: 1.1; }
                .rm-topbarMeta{ margin-top: 2px; font-size: var(--rm-font-s); font-weight: var(--rm-weight-m); color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .rm-heroMedia{ position: relative; border-radius: 12px; overflow: hidden; aspect-ratio: 16 / 9; }
                .rm-heroMedia img{ width: 100%; height: 100%; object-fit: cover; display:block; }
                .rm-detailLine{ display:flex; align-items: center; gap: 8px; min-width: 0; }
                .rm-detailLabel{ font-size: var(--rm-font-s); font-weight: var(--rm-weight-m); letter-spacing: .10em; text-transform: uppercase; color: var(--muted); flex: 0 0 auto; }
                .rm-detailValue{ font-size: var(--rm-font-b); font-weight: var(--rm-weight-m); color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .rm-detailMeta{ font-size: var(--rm-font-s); font-weight: var(--rm-weight-m); color: var(--muted); }
                .rm-iconCell{ width: 18px; display:flex; align-items:center; justify-content:center; }
                .rm-footer{ color: var(--muted); text-align:center; font-size: var(--rm-font-s); font-weight: var(--rm-weight-m); margin-top: 12px; }
                @media (max-width: 520px){
                  .rm-topbarMeta{ max-width: 160px; }
                  .rm-heroMedia{ aspect-ratio: 4 / 3; }
                }
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
            <p className="rm-footer">Powered by Plan4Host.</p>
          </main>
        </div>
      </body>
    </html>
  );
}
