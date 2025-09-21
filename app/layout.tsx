// /app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "plan4host",
  description: "Property ops",
  applicationName: "plan4host",

  // PWA
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192" },
      { url: "/icons/icon-512.png", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: {
    capable: true,
    title: "plan4host",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)",  color: "#0c111b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const theme = (cookieStore.get("app_theme")?.value as "light" | "dark") ?? "light";
  const accent = cookieStore.get("app_accent")?.value ?? "base";

  return (
    <html lang="en" data-theme={theme} data-accent={accent}>
      <body style={{ margin: 0 }}>
        {/* ——— CSS global (teme + palete) ——— */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
:root[data-theme="dark"]{
  --bg:#0c111b; 
  --text:#f8fafc; 
  --muted:#9aa4af;
  --panel:#111827; 
  --card:#0f172a; 
  --border:#13770a;
  --primary:#13770a; 
  --danger:#ef4444; 
  --success:#22c55e;
}
:root[data-theme="light"]{
  --bg:#f8fafc; 
  --text:#0c111b; 
  --muted:#5b6470;
  --panel:#ffffff; 
  --card:#ffffff; 
  --border:#dbe2ea;
  --primary:#7086b7; 
  --danger:#d15656; 
  --success:#50bf79;
}
html, body { background: var(--bg); color: var(--text); }

/* accents */
:root[data-theme="dark"][data-accent="base"]   { --primary:#60a5fa; }
:root[data-theme="dark"][data-accent="blue"]   { --primary:#60a5fa; }
:root[data-theme="dark"][data-accent="indigo"] { --primary:#818cf8; }
:root[data-theme="dark"][data-accent="emerald"]{ --primary:#34d399; }
:root[data-theme="dark"][data-accent="amber"]  { --primary:#f59e0b; }
:root[data-theme="light"][data-accent="base"]   { --primary:#7086b7; }
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

/* ---------- iOS notch safe-area ---------- */
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
/* utilitare pe care le poți folosi oriunde */
.safe-top-pad{ padding-top: calc(var(--safe-top) + 8px); }
.safe-bottom-pad{ padding-bottom: var(--safe-bottom); }
.safe-top-sticky{ position: sticky; top: 0; }
.safe-top-fixed{ position: fixed; top: var(--safe-top); }
`,
          }}
        />
        {/* Wrapper global: împinge conținutul sub notch & deasupra home-indicatorului */}
        <div style={{ paddingTop: "var(--safe-top)", paddingBottom: "var(--safe-bottom)" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
