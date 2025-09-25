// /app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import Script from "next/script";
import ConsentOverlayHost from "@/components/consent/ConsentOverlayHost";

export const metadata: Metadata = {
  title: "plan4host",
  description: "Property ops",
  applicationName: "plan4host",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192" },
      { url: "/icons/icon-512.png", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: { capable: true, title: "plan4host", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0c111b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const theme = (cookieStore.get("app_theme")?.value as "light" | "dark") ?? "light";
  const accent = cookieStore.get("app_accent")?.value ?? "base";

  return (
    <html lang="en" data-theme={theme} data-accent={accent}>
      <body style={{ margin: 0 }}>
        {/* UA flags -> <html data-browser|data-os> */}
        <Script id="ua-flags" strategy="beforeInteractive">
          {`(function(){
            try{
              var ua = navigator.userAgent;
              var isIOS = /iP(hone|ad|od)/.test(ua);
              var isAndroid = /Android/i.test(ua);
              var isMac = !isIOS && /Mac OS X/.test(ua);
              var isSafari = /Safari/i.test(ua) && !/(Chrome|Chromium|CriOS|Edg|OPR)/i.test(ua);
              var isChrome = /Chrome|Chromium|CriOS/i.test(ua) && !/Edg|OPR/i.test(ua);
              var os = isIOS ? 'ios' : (isAndroid ? 'android' : (isMac ? 'mac' : 'other'));
              var br = isSafari ? 'safari' : (isChrome ? 'chrome' : 'other');
              var el = document.documentElement;
              el.setAttribute('data-os', os);
              el.setAttribute('data-browser', br);
            }catch(e){}
          })();`}
        </Script>

        {/* ——— Palete + gradient global ——— */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
:root[data-theme="dark"]{
  --bg:#0b1117; --text:#e6edf3; --muted:#9aa4af;
  --panel:#0f1623; --card:#0d1320; --border:#1f2937;
  --primary:#3ECF8E; --danger:#ef4444; --success:#22c55e;
  --accent1:#22d3ee; --accent2:#0d1323;
}
:root[data-theme="light"]{
  --bg:#f7faf9; --text:#0f172a; --muted:#64748b;
  --panel:#ffffff; --card:#ffffff; --border:#e2e8f0;
  --primary:#16b981; --danger:#dc2626; --success:#16a34a;
  --accent1:#22d3ee; --accent2:#0d1323;
}
html, body { background: var(--bg); color: var(--text); }
:root[data-theme="dark"] body{
  background:
    radial-gradient(60rem 60rem at 10% 0%,
      color-mix(in oklab, var(--accent1) 22%, transparent), transparent 60%),
    radial-gradient(50rem 50rem at 95% 10%,
      color-mix(in oklab, var(--accent2) 22%, transparent), transparent 60%),
    radial-gradient(70rem 60rem at 30% 100%,
      color-mix(in oklab, var(--primary) 14%, transparent), transparent 60%),
    var(--bg);
  background-attachment: fixed, fixed, fixed, fixed;
}
:root[data-os="ios"][data-theme="dark"] body{ background-attachment: scroll, scroll, scroll, scroll; }

:root[data-theme="dark"][data-accent="base"]   { --primary:#3ECF8E; }
:root[data-theme="dark"][data-accent="blue"]   { --primary:#3b82f6; }
:root[data-theme="dark"][data-accent="indigo"] { --primary:#6366f1; }
:root[data-theme="dark"][data-accent="emerald"]{ --primary:#34d399; }
:root[data-theme="dark"][data-accent="amber"]  { --primary:#f59e0b; }
:root[data-theme="light"][data-accent="base"]   { --primary:#16b981; }
:root[data-theme="light"][data-accent="blue"]   { --primary:#3b82f6; }
:root[data-theme="light"][data-accent="indigo"] { --primary:#6366f1; }
:root[data-theme="light"][data-accent="emerald"]{ --primary:#10b981; }
:root[data-theme="light"][data-accent="amber"]  { --primary:#f59e0b; }

* { transition: background-color .15s ease, color .15s ease, border-color .15s ease; }

.config-grid { display:grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
@media (min-width: 1025px) { .config-grid { grid-template-columns: 280px 1fr; } }
.room-row { display: grid; gap: 10px; grid-template-columns: 1fr auto; grid-template-areas: "name name" "type actions"; align-items: center; }
@media (max-width: 480px) { .room-row { grid-template-columns: 1fr; grid-template-areas: "name" "type" "actions"; } }
.rd-row { display: grid; grid-template-columns: 1fr 160px 90px 90px; gap: 8px; align-items: center; }
@media (max-width: 480px) { .rd-row { grid-template-columns: 1fr; } }

/* Safe areas */
:root{
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}
@supports (padding-top: constant(safe-area-inset-top)){
  :root{
    --safe-top: constant(safe-area-inset-top);
    --safe-bottom: constant(safe-area-inset-bottom);
    --safe-left: constant(safe-area-inset-left);
    --safe-right: constant(safe-area-inset-right);
  }
}
.safe-top-pad{ padding-top: calc(var(--safe-top) + 8px); }
.safe-bottom-pad{ padding-bottom: var(--safe-bottom); }
.safe-top-sticky{ position: sticky; top: 0; }
.safe-top-fixed{ position: fixed; top: var(--safe-top); }
`,
          }}
        />

        <div style={{ paddingTop: "var(--safe-top)", paddingBottom: "var(--safe-bottom)" }}>
          {children}
        </div>

        {/* Host global pentru modalul “emoji” (nu afișează nimic până nu-l chemăm) */}
        <ConsentOverlayHost />
      </body>
    </html>
  );
}