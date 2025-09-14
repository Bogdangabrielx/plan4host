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
  return (
    <HeaderProvider initialTitle={title ?? ""}>
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          background: "var(--bg)",
          color: "var(--text)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            width: "100%",
            paddingLeft: "calc(16px + var(--safe-left))",
            paddingRight: "calc(16px + var(--safe-right))",
          }}
        >
          <AppHeader currentPath={currentPath} />
        </div>
        <main
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            width: "100%",
            paddingTop: 16,
            paddingBottom: 16,
            paddingLeft: "calc(16px + var(--safe-left))",
            paddingRight: "calc(16px + var(--safe-right))",
          }}
        >
          {children}
        </main>
      </div>
    </HeaderProvider>
  );
}
