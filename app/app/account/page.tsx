"use client";

import { useEffect } from "react";
import { useHeader } from "@/app/ui/_components/HeaderContext";

export default function AccountPage() {
  const { setTitle } = useHeader();

  useEffect(() => {
    setTitle("My Account");
  }, [setTitle]);

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto", display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>My Account</h1>
      <p style={{ margin: 0, color: "var(--muted)" }}>
        This is your account page. You can place user-specific settings here later.
      </p>
    </div>
  );
}
