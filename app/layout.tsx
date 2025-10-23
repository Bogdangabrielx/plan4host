// /app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import Script from "next/script";
import ConsentOverlayHost from "@/components/consent/ConsentOverlayHost";
import VisibilityManager from "@/components/system/VisibilityManager";



const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.plan4host.com";



export const metadata: Metadata = {
  title: "Plan4Host",
  description: "Stay Smart, Host Better",
  applicationName: "Plan4Host",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(siteUrl),
  alternates: {
    languages: {
      en: "/",
      ro: "/ro",
    },
  },


  
  openGraph: {
    siteName: "Plan4Host",
    type: "website",
    title: "Plan4Host",
    description: "Stay Smart, Host Better",
    images: [
      { url: "/og-default.png", width: 1200, height: 630, alt: "Plan4Host — Stay Smart, Host Better" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Plan4Host",
    description: "Stay Smart, Host Better",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192" },
      { url: "/icons/icon-512.png", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: { capable: true, title: "Plan4Host", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0c111b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const langCookie = cookieStore.get("site_lang")?.value;
  const lang = langCookie === "ro" ? "ro" : "en";
  const theme = (cookieStore.get("app_theme")?.value as "light" | "dark") ?? "light";
  const accent = cookieStore.get("app_accent")?.value ?? "base";

  return (
    <html lang={lang} data-theme={theme} data-accent={accent}>
      <body style={{ margin: 0 }}>
        {/* Global page visibility manager (safe, no visual side effects) */}
        <VisibilityManager />
        {/* UA flags -> <html data-browser|data-os|data-standalone> */}
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

              // PWA/Standalone detect (pentru a ascunde Skip to content în aplicația instalată)
              var isStandalone = false;
              if (window.matchMedia) {
                isStandalone =
                  window.matchMedia('(display-mode: standalone)').matches ||
                  window.matchMedia('(display-mode: fullscreen)').matches;
              }
              // iOS legacy
              if (!isStandalone && 'standalone' in navigator && (navigator as any).standalone) {
                isStandalone = true;
              }
              if (isStandalone) {
                el.setAttribute('data-standalone', 'true');
              }
            }catch(e){}
          })();`}
        </Script>

        {/* ——— Palete + gradient global ——— */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
/* =============================
   Theming via HSL + OKLCH tokens
   ============================= */

/* Accent hue (only hue changes per accent) */
:root { --accent-h: 160; }
:root[data-accent="blue"]   { --accent-h: 220; }
:root[data-accent="indigo"] { --accent-h: 255; }
:root[data-accent="emerald"]{ --accent-h: 160; }
:root[data-accent="amber"]  { --accent-h: 38; }
:root[data-accent="base"]   { --accent-h: 160; }

/* HSL component tokens per theme */
:root[data-theme="light"]{
  /* HSL components */
  --bg-h: 205; --bg-s: 30%; --bg-l: 97%;
  --text-h: 210; --text-s: 22%; --text-l: 14%;
  --muted-h: 215; --muted-s: 20%; --muted-l: 56%;
  --panel-h: 0; --panel-s: 0%; --panel-l: 100%;
  --card-h: 0; --card-s: 0%; --card-l: 100%;
  --border-h: 210; --border-s: 32%; --border-l: 90%;

  /* Primary derived from accent-h (keep S/L stable across accents) */
  --primary-h: var(--accent-h); --primary-s: 90%; --primary-l: 58%;
  --danger-h: 15; --danger-s: 80%; --danger-l: 52%;
  --success-h: 140; --success-s: 60%; --success-l: 52%;

  /* OKLCH components (approximate perceptual matches) */
  --bg-L: 0.97; --bg-C: 0.02; --bg-h-ok: 210;
  --text-L: 0.15; --text-C: 0.03; --text-h-ok: 250;
  --muted-L: 0.62; --muted-C: 0.04; --muted-h-ok: 230;
  --panel-L: 1.00; --panel-C: 0.00; --panel-h-ok: 0;
  --card-L: 1.00; --card-C: 0.00; --card-h-ok: 0;
  --border-L: 0.90; --border-C: 0.01; --border-h-ok: 230;
  --primary-L: 0.72; --primary-C: 0.14; --primary-h-ok: var(--accent-h);
  --danger-L: 0.66; --danger-C: 0.16; --danger-h-ok: 25;
  --success-L: 0.68; --success-C: 0.12; --success-h-ok: 145;
}

:root[data-theme="dark"]{
  /* HSL components */
  --bg-h: 215; --bg-s: 32%; --bg-l: 8%;
  --text-h: 210; --text-s: 20%; --text-l: 92%;
  --muted-h: 215; --muted-s: 12%; --muted-l: 64%;
  --panel-h: 220; --panel-s: 36%; --panel-l: 12%;
  --card-h: 220; --card-s: 36%; --card-l: 9%;
  --border-h: 220; --border-s: 22%; --border-l: 22%;

  /* Primary derived from accent-h */
  --primary-h: var(--accent-h); --primary-s: 85%; --primary-l: 55%;
  --danger-h: 6; --danger-s: 78%; --danger-l: 56%;
  --success-h: 135; --success-s: 58%; --success-l: 58%;

  /* OKLCH components */
  --bg-L: 0.16; --bg-C: 0.03; --bg-h-ok: 260;
  --text-L: 0.94; --text-C: 0.02; --text-h-ok: 250;
  --muted-L: 0.72; --muted-C: 0.04; --muted-h-ok: 240;
  --panel-L: 0.19; --panel-C: 0.03; --panel-h-ok: 260;
  --card-L: 0.17; --card-C: 0.03; --card-h-ok: 260;
  --border-L: 0.32; --border-C: 0.02; --border-h-ok: 260;
  --primary-L: 0.70; --primary-C: 0.13; --primary-h-ok: var(--accent-h);
  --danger-L: 0.63; --danger-C: 0.16; --danger-h-ok: 25;
  --success-L: 0.66; --success-C: 0.12; --success-h-ok: 145;
}

/* Materialize palette (HSL as baseline) */
:root{
  --bg: hsl(var(--bg-h) var(--bg-s) var(--bg-l));
  --text: hsl(var(--text-h) var(--text-s) var(--text-l));
  --muted: hsl(var(--muted-h) var(--muted-s) var(--muted-l));
  --panel: hsl(var(--panel-h) var(--panel-s) var(--panel-l));
  --card: hsl(var(--card-h) var(--card-s) var(--card-l));
  --border: hsl(var(--border-h) var(--border-s) var(--border-l));
  --primary: hsl(var(--primary-h) var(--primary-s) var(--primary-l));
  --danger: hsl(var(--danger-h) var(--danger-s) var(--danger-l));
  --success: hsl(var(--success-h) var(--success-s) var(--success-l));

  /* secondary/tertiary accents (HSL fallback) */
  --accent1: hsl(var(--primary-h) var(--primary-s) calc((var(--primary-l) + 6%)));
  --accent2: hsl(var(--primary-h) calc((var(--primary-s) - 30%)) calc((var(--primary-l) - 22%)));
}

/* Prefer OKLCH when supported */
@supports (color: oklch(0.6 0.1 240)){
  :root{
    --bg: oklch(var(--bg-L) var(--bg-C) var(--bg-h-ok));
    --text: oklch(var(--text-L) var(--text-C) var(--text-h-ok));
    --muted: oklch(var(--muted-L) var(--muted-C) var(--muted-h-ok));
    --panel: oklch(var(--panel-L) var(--panel-C) var(--panel-h-ok));
    --card: oklch(var(--card-L) var(--card-C) var(--card-h-ok));
    --border: oklch(var(--border-L) var(--border-C) var(--border-h-ok));
    --primary: oklch(var(--primary-L) var(--primary-C) var(--primary-h-ok));
    --danger: oklch(var(--danger-L) var(--danger-C) var(--danger-h-ok));
    --success: oklch(var(--success-L) var(--success-C) var(--success-h-ok));

    /* derived accents via relative color */
    --accent1: oklch(from var(--primary) calc(min(1, var(--primary-L) + 0.06)) calc(max(0, var(--primary-C) - 0.04)) var(--primary-h-ok));
    --accent2: oklch(from var(--bg)      calc(max(0, var(--bg-L) - 0.06))        calc(var(--bg-C))                  var(--bg-h-ok));
  }
}

html, body { background: var(--bg); color: var(--text); }

  /* Ambient background bubbles — OKLCH first, HSL fallback */
  @supports (color: oklch(0.6 0.1 240)){
    :root[data-theme="dark"] body{
    background:
      radial-gradient(60rem 60rem at 10% 0%,
        oklch(calc(var(--bg-L) + 0.06) calc(max(0, var(--bg-C) - 0.01)) var(--bg-h-ok)),
        transparent 60%),
      radial-gradient(50rem 50rem at 92% 10%,
        oklch(calc(var(--primary-L) - 0.22) calc(max(0, var(--primary-C) - 0.08)) var(--primary-h-ok)),
        transparent 62%),
      radial-gradient(70rem 60rem at 30% 100%,
        oklch(calc(var(--primary-L) - 0.10) calc(max(0, var(--primary-C) - 0.06)) var(--primary-h-ok)),
        transparent 60%),
      var(--bg);
    background-attachment: fixed;
  }
  :root[data-theme="light"] body{
    background:
      radial-gradient(60rem 60rem at 10% -5%,
        oklch(calc(var(--primary-L) + 0.10) calc(max(0, var(--primary-C) - 0.06)) var(--primary-h-ok)),
        transparent 72%),
      radial-gradient(56rem 56rem at 100% 0%,
        oklch(calc(var(--primary-L) + 0.06) calc(max(0, var(--primary-C) - 0.08)) var(--primary-h-ok)),
        transparent 65%),
      radial-gradient(68rem 58rem at 30% 100%,
        oklch(calc(var(--primary-L) + 0.08) calc(max(0, var(--primary-C) - 0.08)) var(--primary-h-ok)),
        transparent 62%),
      var(--bg);
    background-attachment: fixed;
  }
  }

  @supports not (color: oklch(0.6 0.1 240)){
    :root[data-theme="dark"] body{
    background:
      radial-gradient(60rem 60rem at 10% 0%,
        hsl(var(--bg-h) var(--bg-s) calc((var(--bg-l) + 4%))), transparent 60%),
      radial-gradient(50rem 50rem at 92% 10%,
        hsl(var(--primary-h) var(--primary-s) calc((var(--primary-l) - 22%))), transparent 62%),
      radial-gradient(70rem 60rem at 30% 100%,
        hsl(var(--primary-h) var(--primary-s) calc((var(--primary-l) - 10%))), transparent 60%),
      var(--bg);
    }
    :root[data-theme="light"] body{
      background:
        radial-gradient(60rem 60rem at 10% -5%,
          hsl(var(--primary-h) var(--primary-s) calc((var(--primary-l) + 10%))), transparent 72%),
        radial-gradient(56rem 56rem at 100% 0%,
          hsl(var(--primary-h) var(--primary-s) calc((var(--primary-l) + 6%))), transparent 65%),
        radial-gradient(68rem 58rem at 30% 100%,
          hsl(var(--primary-h) var(--primary-s) calc((var(--primary-l) + 8%))), transparent 62%),
        var(--bg);
    }
  }

  /* iOS: avoid fixed attachment */
  :root[data-os="ios"][data-theme="dark"] body{ background-attachment: scroll; }
  :root[data-os="ios"][data-theme="light"] body{ background-attachment: scroll; }

* { transition: background-color .15s ease, color .15s ease, border-color .15s ease; }

/* Pause CSS animations in background tabs */
html[data-page-visible="false"] * { animation-play-state: paused !important; }

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

        <div style={{ paddingTop: "var(--safe-top)", position: "relative", zIndex: 1 }}>
        {children}
        </div>

        {/* Host global pentru modalul “emoji” (deschis din OpenCookieSettingsButton / AutoOpenOnLanding) */}
        <ConsentOverlayHost />
      </body>
    </html>
  );
}
