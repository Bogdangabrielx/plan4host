"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useHeader } from "./HeaderContext";
import styles from "./AppLoadingOverlay.module.css";

function getNodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join("");
  if (typeof node === "object" && "props" in (node as any)) {
    const props = (node as any).props as { children?: ReactNode } | undefined;
    return props?.children ? getNodeText(props.children) : "";
  }
  return "";
}

function isBusyPillText(text: string): boolean {
  return /(sync|saving|loading)\b/i.test(text);
}

export default function AppLoadingOverlay() {
  const { pill } = useHeader();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pillText = useMemo(() => getNodeText(pill), [pill]);
  const open = useMemo(() => isBusyPillText(pillText), [pillText]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className={styles.overlay} role="status" aria-live="polite" aria-label={pillText || "Loading"}>
      <div className={styles.pill} aria-hidden="true">
        <div className={styles.track}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
      </div>
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {pillText || "Loading"}
      </span>
    </div>,
    document.body
  );
}

