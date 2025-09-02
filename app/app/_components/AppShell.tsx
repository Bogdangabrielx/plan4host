// /app/app/_components/AppShell.tsx
import React from "react";
import AppHeader from "../ui/AppHeader";
import { HeaderProvider } from "./HeaderContext";

type Props = {
  /** Nou: titlul inițial preferat */
  initialTitle?: string;
  /** Compatibilitate veche: alias pentru initialTitle */
  title?: string;
  currentPath?: string;
  children: React.ReactNode;
};

export default function AppShell({ initialTitle, title, currentPath, children }: Props) {
  const initTitle = (typeof initialTitle === "string" ? initialTitle : title) ?? "";

  return (
    <HeaderProvider initialTitle={initTitle}>
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          background: "var(--bg)",
          color: "var(--text)",
        }}
      >
        <AppHeader currentPath={currentPath} />
        <main style={{ padding: 16, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          {children}
        </main>
      </div>
    </HeaderProvider>
  );
}