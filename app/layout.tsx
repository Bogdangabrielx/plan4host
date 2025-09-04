// /app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "plan4host",
  description: "Property ops",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const theme = (cookieStore.get("app_theme")?.value as "light" | "dark") ?? "light";
  // palete posibile: "base" | "blue" | "indigo" | "emerald" | "amber" (poți adăuga)
  const accent = cookieStore.get("app_accent")?.value ?? "base";

  return (
    <html lang="en" data-theme={theme} data-accent={accent}>
      <body style={{ margin: 0 }}>
        {/* ——— CSS global (teme + palete) ——— */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
/* ---------- THEME CORE ---------- */
:root[data-theme="dark"]{
  --bg:#0c111b; --text:#f8fafc; --muted:#9aa4af;
  --panel:#111827; --card:#0f172a; --border:#22304a;
  --primary:#60a5fa; --danger:#ef4444; --success:#22c55e;
}
:root[data-theme="light"]{
  --bg:#f8fafc; --text:#0c111b; --muted:#5b6470;
  --panel:#ffffff; --card:#ffffff; --border:#dbe2ea;
  --primary:#7086b7; --danger:#d15656; --success:#50bf79;
}

/* aplica pe toată aplicația */
html, body { background: var(--bg); color: var(--text); }

/* ---------- ACCENT PRESETS (override pentru --primary) ---------- */
/* nota: definim pe theme + accent, ca să poți avea nuanțe diferite în light/dark */

:root[data-theme="dark"][data-accent="base"]   { --primary:#60a5fa; } /* egal cu default dark */
:root[data-theme="dark"][data-accent="blue"]   { --primary:#60a5fa; }
:root[data-theme="dark"][data-accent="indigo"] { --primary:#818cf8; }
:root[data-theme="dark"][data-accent="emerald"]{ --primary:#34d399; }
:root[data-theme="dark"][data-accent="amber"]  { --primary:#f59e0b; }

:root[data-theme="light"][data-accent="base"]   { --primary:#7086b7; } /* egal cu default light */
:root[data-theme="light"][data-accent="blue"]   { --primary:#3b82f6; }
:root[data-theme="light"][data-accent="indigo"] { --primary:#6366f1; }
:root[data-theme="light"][data-accent="emerald"]{ --primary:#10b981; }
:root[data-theme="light"][data-accent="amber"]  { --primary:#f59e0b; }

/* opțional: micro-tranziții plăcute */
* { transition: background-color .15s ease, color .15s ease, border-color .15s ease; }

/* ---------- RESPONSIVE HELPERS (global) ---------- */
.config-grid { display:grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
@media (min-width: 1025px) { .config-grid { grid-template-columns: 280px 1fr; } }

.room-row { display: grid; gap: 10px; grid-template-columns: 1fr auto; grid-template-areas: "name name" "type actions"; align-items: center; }
@media (max-width: 480px) { .room-row { grid-template-columns: 1fr; grid-template-areas: "name" "type" "actions"; } }

.rd-row { display: grid; grid-template-columns: 1fr 160px 90px 90px; gap: 8px; align-items: center; }
@media (max-width: 480px) { .rd-row { grid-template-columns: 1fr; } }
`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
