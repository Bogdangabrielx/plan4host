// app/auth/layout.tsx — scoped layout for auth pages (login/signup)
import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="authAmbient" style={{ minHeight: "100dvh", position: "relative" }}>
      {/* Scoped ambient background only for /auth/* pages */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* sRGB gradients, Safari-safe; no fixed attachment to avoid iOS issues */
            :root[data-theme="dark"] .authAmbient{
              background:
                radial-gradient(60rem 60rem at 10% 0%,
                  color-mix(in srgb, #22d3ee 22%, transparent),
                  transparent 60%),
                radial-gradient(50rem 50rem at 95% 10%,
                  color-mix(in srgb, #0d1323 22%, transparent),
                  transparent 60%),
                radial-gradient(70rem 60rem at 30% 100%,
                  color-mix(in srgb, var(--primary) 14%, transparent),
                  transparent 60%),
                var(--bg);
              background-attachment: scroll;
            }
            :root[data-theme="light"] .authAmbient{
              background:
                radial-gradient(60rem 60rem at 10% -5%,
                  color-mix(in srgb, var(--accent1) 14%, transparent),
                  transparent 72%),
                radial-gradient(56rem 56rem at 100% 0%,
                  color-mix(in srgb, var(--primary) 10%, transparent),
                  transparent 65%),
                radial-gradient(68rem 58rem at 30% 100%,
                  color-mix(in srgb, var(--accent1) 8%, transparent),
                  transparent 62%),
                var(--bg);
              background-attachment: scroll;
            }
          `,
        }}
      />

      {children}
    </div>
  );
}

