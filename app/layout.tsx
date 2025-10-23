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

  // prefer cookie theme; default light
  const theme = (cookieStore.get("app_theme")?.value as "light" | "dark") ?? "light";
  const accent = cookieStore.get("app_accent")?.value ?? "base";

  return (
    <html lang={lang} data-theme={theme} data-accent={accent}>
      <body style={{ margin: 0 }}>
        {/* Visibility flags (no visual output) */}
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

        {/* ===== THEME TOKENS + DARK BLUE BACKDROP ===== */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
/* ---------- Global theme variables (light/dark) ---------- */
:root[data-theme="light"]{
  --bg:#f8fafc;
  --text:#0c111b;
  --muted:#5b6470;
  --panel:#ffffff;
  --card:#ffffff;
  --border:#dbe2ea;
  --primary:#7086b7;   /* cooler blue for light */
  --danger:#d15656;
  --success:#50bf79;
}
:root[data-theme="dark"]{
  /* your requested blue-ish dark palette */
  --bg:#0c111b;       /* deep navy */
  --text:#f8fafc;     /* near-white */
  --muted:#9aa4af;    /* cool grey */
  --panel:#111827;    /* slate */
  --card:#0f172a;     /* indigo-slate */
  --border:#22304a;   /* steel blue */
  --primary:#60a5fa;  /* vivid blue accent */
  --danger:#ef4444;
  --success:#22c55e;
}

/* apply base */
html, body { background: var(--bg); color: var(--text); }

/* ---------- Dark ambient "blue" gradients like the mock ---------- */
:root[data-theme="dark"] body{
  background:
    radial-gradient(60rem 60rem at 12% 0%,
      color-mix(in oklab, var(--bg), white 6%),
      transparent 60%),
    radial-gradient(46rem 46rem at 92% 12%,
      color-mix(in oklab, var(--primary), black 35%),
      transparent 62%),
    radial-gradient(64rem 56rem at 30% 100%,
      color-mix(in oklab, var(--primary), black 20%),
      transparent 58%),
    var(--bg);
  background-attachment: fixed;
}

/* Fallback when color-mix/oklab unsupported */
@supports not (background: color-mix(in oklab, black, white)){
  :root[data-theme="dark"] body{
    background:
      radial-gradient(60rem 60rem at 12% 0%,
        #0f1625, transparent 60%),
      radial-gradient(46rem 46rem at 92% 12%,
        #1b2a48, transparent 62%),
      radial-gradient(64rem 56rem at 30% 100%,
        #173059, transparent 58%),
      var(--bg);
  }
}

/* iOS Safari: avoid fixed attachment banding */
:root[data-os="ios"][data-theme="dark"] body{ background-attachment: scroll; }

/* Smooth theme transitions */
*{ transition: background-color .15s ease, color .15s ease, border-color .15s ease; }

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

/* pause animations when tab hidden */
html[data-page-visible="false"] *{ animation-play-state: paused !important; }
`,
          }}
        />

        {/* page content */}
        <div style={{ paddingTop: "var(--safe-top)", position: "relative", zIndex: 1 }}>
          {children}
        </div>

        <ConsentOverlayHost />
      </body>
    </html>
  );
}