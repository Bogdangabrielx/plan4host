"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useHeader } from "./HeaderContext";
import styles from "./AppLoadingOverlay.module.css";
import LoadingPill from "./LoadingPill";

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

function hasOverlayMessage(node: ReactNode): boolean {
  if (node == null || typeof node === "boolean") return false;
  if (typeof node === "string" || typeof node === "number") return false;
  if (Array.isArray(node)) return node.some(hasOverlayMessage);
  if (typeof node === "object" && "props" in (node as any)) {
    const props = (node as any).props as Record<string, unknown> | undefined;
    if (props?.["data-p4h-overlay"] === "message") return true;
    return props?.children ? hasOverlayMessage(props.children as ReactNode) : false;
  }
  return false;
}

function isBusyPillText(text: string): boolean {
  // Accept the common variants used across pages (Syncing…, Saving…, Loading…)
  // and avoid relying on a word boundary for "sync" (it won't match "syncing").
  return /(sync(?:ing)?|sav(?:ing)?|load(?:ing)?)/i.test(text);
}

export default function AppLoadingOverlay() {
  const { pill } = useHeader();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pillText = useMemo(() => getNodeText(pill), [pill]);
  const isBusy = useMemo(() => isBusyPillText(pillText), [pillText]);
  const showMessage = useMemo(() => hasOverlayMessage(pill), [pill]);
  const open = useMemo(() => isBusy || showMessage, [isBusy, showMessage]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className={styles.overlay} role="status" aria-live="polite" aria-label={pillText || "Loading"}>
      {isBusy ? (
        <LoadingPill />
      ) : (
        <div className={styles.pillMessage} aria-hidden="true" title={pillText || "Done"}>
          <span className={styles.messageText}>{pillText || "Done"}</span>
        </div>
      )}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {pillText || "Loading"}
      </span>
    </div>,
    document.body
  );
}
