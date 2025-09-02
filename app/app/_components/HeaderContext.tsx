// app/app/_components/HeaderContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type HeaderCtx = {
  /** Main title area in the header (text or JSX) */
  title: ReactNode;
  setTitle: (v: ReactNode) => void;

  /** Small status pill next to the title (text or JSX) */
  pill: ReactNode;
  setPill: (v: ReactNode) => void;

  /** Right-side header content (filters, selects, buttons, etc.) */
  right: ReactNode;
  setRight: (v: ReactNode) => void;
};

const Ctx = createContext<HeaderCtx | null>(null);

export function HeaderProvider({
  initialTitle,
  initialPill,
  initialRight,
  children,
}: {
  initialTitle?: ReactNode;
  initialPill?: ReactNode;
  initialRight?: ReactNode;
  children: ReactNode;
}) {
  const [title, setTitle] = useState<ReactNode>(initialTitle ?? "");
  const [pill, setPill] = useState<ReactNode>(initialPill ?? null);
  const [right, setRight] = useState<ReactNode>(initialRight ?? null);

  const value = useMemo(
    () => ({ title, setTitle, pill, setPill, right, setRight }),
    [title, pill, right]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHeader(): HeaderCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHeader must be used within a HeaderProvider");
  return ctx;
}