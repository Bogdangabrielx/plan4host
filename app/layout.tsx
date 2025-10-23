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
  alternates: { languages: { en: "/", ro: "/ro" } },
  openGraph: {
    siteName: "Plan4Host",
    type: "website",
    title: "Plan4Host",
    description: "Stay Smart, Host Better",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Plan4Host — Stay Smart, Host Better" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Plan4Host",
    description: "Stay Smart, Host Better",
    images: ["/og-default.png"],
  },
  robots: { index: true, follow: true },
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
        <VisibilityManager />

        {/* UA / PWA flags */}
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

              var isStandalone = false;
              if (window.matchMedia) {
                isStandalone =
                  window.matchMedia('(display-mode: standalone)').matches ||
                  window.matchMedia('(display-mode: fullscreen)').matches;
              }
              if (!isStandalone && 'standalone' in navigator && (navigator).standalone) {
                isStandalone = true;
              }
              if (isStandalone) el.setAttribute('data-standalone', 'true');
            }catch(e){}
          })();`}
        </Script>

        {/* —— Palete + gradient global (OKLCH-first) —— */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
/* =============================
   Accent selector (doar HUE)
   ============================= */
:root{ --accent-h: 160; }
:root[data-accent="blue"]   { --accent-h: 220; }
:root[data-accent="indigo"] { --accent-h: 255; }
:root[data-accent="emerald"]{ --accent-h: 160; }
:root[data-accent="amber"]  { --accent-h: 38; }
:root[data-accent="base"]   { --accent-h: 160; }

/* ---------- LIGHT (tokens + OKLCH approx) ---------- */
:root[data-theme="light"]{
  --bg-h: 0; --bg-s: 0%; --bg-l: 94%;
  --text-h: 210; --text-s: 22%; --text-l: 14%;
  --muted-h: 215; --muted-s: 20%; --muted-l: 56%;
  --panel-h: 0; --panel-s: 0%; --panel-l: 96%;
  --card-h: 0; --card-s: 0%; --card-l: 98%;
  --border-h: 210; --border-s: 32%; --border-l: 82%;

  --primary-h: var(--accent-h); --primary-s: 95%; --primary-l: 56%;
  --danger-h: 15; --danger-s: 80%; --danger-l: 52%;
  --success-h: 140; --success-s: 60%; --success-l: 52%;

  /* OKLCH (approx) */
  --bg-L: 0.94; --bg-C: 0.00; --bg-h-ok: 0;
  --text-L: 0.15; --text-C: 0.03; --text-h-ok: 250;
  --muted-L: 0.62; --muted-C: 0.04; --muted-h-ok: 230;
  --panel-L: 0.965; --panel-C: 0.00; --panel-h-ok: 0;
  --card-L: 0.985; --card-C: 0.00; --card-h-ok: 0;
  --border-L: 0.84; --border-C: 0.01; --border-h-ok: 230;
  --primary-L: 0.70; --primary-C: 0.20; --primary-h-ok: var(--accent-h);
  --danger-L: 0.66; --danger-C: 0.16; --danger-h-ok: 25;
  --success-L: 0.68; --success-C: 0.12; --success-h-ok: 145;
}

/* ---------- DARK (OKLCH neutrals = blue-tinted) ---------- */
/* Păstrăm PRIMARY EXACT (0.70 / 0.18 / var(--accent-h)) */
:root[data-theme="dark"]{
  /* HSL fallback (nu folosit când OKLCH disponibil) */
  --bg-h: 220; --bg-s: 3%; --bg-l: 10%;
  --text-h: 0;  --text-s: 0%; --text-l: 92%;
  --muted-h: 220; --muted-s: 3%; --muted-l: 68%;
  --panel-h: 220; --panel-s: 3%; --panel-l: 15%;
  --card-h: 220;  --card-s: 3%; --card-l: 18%;
  --border-h: 220; --border-s: 4%; --border-l: 28%;

  --primary-h: var(--accent-h); --primary-s: 92%; --primary-l: 58%;
  --danger-h: 6; --danger-s: 78%; --danger-l: 56%;
  --success-h: 135; --success-s: 58%; --success-l: 58%;

  /* OKLCH neutre albăstrui (NU schimbăm primary) */
  /* Canvas navy rece + suprafețe ușor mai luminoase */
  --bg-L:     0.19; --bg-C: 0.03; --bg-h-ok: 255;  /* ~#0c111b → albastru foarte închis */
  --text-L:   0.94; --text-C: 0.01; --text-h-ok: 255;
  --muted-L:  0.77; --muted-C: 0.03; --muted-h-ok: 255; /* gri rece → albastru-gri */
  --panel-L:  0.22; --panel-C: 0.03; --panel-h-ok: 255;
  --card-L:   0.26; --card-C: 0.03; --card-h-ok: 255;
  --border-L: 0.37; --border-C: 0.04; --border-h-ok: 255;

  /* BRAND PRIMARY — lăsat neschimbat conform cerinței */
  --primary-L: 0.70; --primary-C: 0.18; --primary-h-ok: var(--accent-h);

  --danger-L:  0.63; --danger-C: 0.16; --danger-h-ok: 25;
  --success-L: 0.66; --success-C: 0.12; --success-h-ok: 145;
}

/* ===== Materializare (fallback HSL) ===== */
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

  --accent1: hsl(var(--primary-h) var(--primary-s) calc((var(--primary-l) + 10%)));
  --accent2: hsl(var(--primary-h) calc((var(--primary-s) - 25%)) calc((var(--primary-l) - 16%)));
  --primary-weak:  hsl(var(--primary-h) var(--primary-s) calc((var(--primary-l) + 12%)));
  --primary-strong:hsl(var(--primary-h) var(--primary-s) calc((var(--primary-l) - 8%)));
  --field: hsl(var(--card-h) var(--card-s) calc((var(--card-l) + 2%)));
}

/* ===== Preferăm OKLCH când e disponibil ===== */
@supports (color: oklch(0.6 0.1 240)){
  :root{
    --bg: oklch(var(--bg-L) var(--bg-C) var(--bg-h-ok));
    --text: oklch(var(--text-L) var(--text-C) var(--text-h-ok));
    --muted: oklch(var(--muted-L) var(--muted-C) var(--muted-h-ok));
    --panel: oklch(var(--panel-L) var(--panel-C) var(--panel-h-ok));
    --card: oklch(var(--card-L) var(--card-C) var(--card-h-ok));
    --border: oklch(var(--border-L) var(--border-C) var(--border-h-ok));
    --primary: oklch(var(--primary-L) var(--primary-C) var(--primary-h-ok)); /* BRAND – neschimbat */
    --danger: oklch(var(--danger-L) var(--danger-C) var(--danger-h-ok));
    --success: oklch(var(--success-L) var(--success-C) var(--success-h-ok));

    --accent1: oklch(from var(--primary) calc(min(1, var(--primary-L) + 0.10)) calc(max(0, var(--primary-C) - 0.05)) var(--primary-h-ok));
    --accent2: oklch(from var(--bg)      calc(max(0, var(--bg-L) - 0.04))        var(--bg-C)                  var(--bg-h-ok));
    --primary-weak:   oklch(from var(--primary) calc(min(1, var(--primary-L) + 0.12)) var(--primary-C) var(--primary-h-ok));
    --primary-strong: oklch(from var(--primary) calc(max(0, var(--primary-L) - 0.08)) calc(min(1, var(--primary-C) + 0.02)) var(--primary-h-ok));
    --field: oklch(from var(--card) calc(min(1, var(--card-L) + 0.02)) var(--card-C) var(--card-h-ok));
  }
}

html, body { background: var(--bg); color: var(--text); }

/* ===== Ambient blue bubbles (OKLCH) ===== */
@supports (color: oklch(0.6 0.1 240)){
  :root[data-theme="dark"] body{
    background:
      radial-gradient(60rem 60rem at 10% 0%,
        oklch(calc(var(--bg-L) + 0.06) calc(max(0, var(--bg-C) - 0.01)) var(--bg-h-ok)), transparent 60%),
      radial-gradient(50rem 50rem at 92% 10%,
        oklch(calc(var(--primary-L) - 0.22) calc(max(0, var(--primary-C) - 0.08)) var(--primary-h-ok)), transparent 62%),
      radial-gradient(70rem 60rem at 30% 100%,
        oklch(calc(var(--primary-L) - 0.10) calc(max(0, var(--primary-C) - 0.06)) var(--primary-h-ok)), transparent 60%),
      var(--bg);
    background-attachment: fixed;
  }
}
@supports not (color: oklch(0.6 0.1 240)){
  :root[data-theme="dark"] body{
    background: var(--bg);
  }
}

/* iOS: attachments */
:root[data-os="ios"][data-theme="dark"] body{ background-attachment: scroll; }

* { transition: background-color .15s ease, color .15s ease, border-color .15s ease; }
html[data-page-visible="false"] * { animation-play-state: paused !important; }

/* Utilities */
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

        <ConsentOverlayHost />
      </body>
    </html>
  );
}