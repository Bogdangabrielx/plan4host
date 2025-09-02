"use client";

import React, { createContext, useContext, useState } from "react";

type Ctx = {
  title: string;
  pill: React.ReactNode | null;
  right: React.ReactNode | null;
  setTitle: (t: string) => void;
  setPill: (p: React.ReactNode | null) => void;
  setRight: (r: React.ReactNode | null) => void;
};

const HeaderCtx = createContext<Ctx | null>(null);

export function HeaderProvider({
  children,
  initialTitle = "",
  initialPill = null,
  initialRight = null,
}: {
  children: React.ReactNode;
  initialTitle?: string;
  initialPill?: React.ReactNode | null;
  initialRight?: React.ReactNode | null;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [pill, setPill] = useState<React.ReactNode | null>(initialPill);
  const [right, setRight] = useState<React.ReactNode | null>(initialRight);

  return (
    <HeaderCtx.Provider value={{ title, pill, right, setTitle, setPill, setRight }}>
      {children}
    </HeaderCtx.Provider>
  );
}

export function useHeader() {
  const ctx = useContext(HeaderCtx);
  if (!ctx) throw new Error("useHeader must be used inside <HeaderProvider>");
  return ctx;
}
