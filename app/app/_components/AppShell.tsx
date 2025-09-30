"use client";
import React from "react";
import AppHeader from "../ui/AppHeader";
import { HeaderProvider } from "./HeaderContext";

type Props = {
  title?: React.ReactNode;
  currentPath?: string;
  children: React.ReactNode;
};

export default function AppShell({ title, currentPath, children }: Props) {
  const useBodyGradient = currentPath === "/app/calendar";
  return (
    <HeaderProvider initialTitle={title ?? ""}>
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          background: useBodyGradient ? "transparent" : "var(--bg)",
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
