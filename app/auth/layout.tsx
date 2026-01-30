// app/auth/layout.tsx — scoped layout for auth pages (login/signup)
import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="authAmbient" style={{ minHeight: "100dvh", position: "relative" }}>
      {/* Use the same neutral app background gradient (no primary “aurora”) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root[data-theme="dark"] .authAmbient,
            :root[data-theme="light"] .authAmbient{
              background: var(--bground);
              background-attachment: scroll;
            }
          `,
        }}
      />

      {children}
    </div>
  );
}
