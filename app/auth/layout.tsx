// app/auth/layout.tsx — scoped layout for auth pages (login/signup)
import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Use the same global background as the rest of the app (defined in app/layout.tsx).
  return <div style={{ minHeight: "100dvh", position: "relative" }}>{children}</div>;
}
