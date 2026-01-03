"use client";

import styles from "./AppLoadingOverlay.module.css";

export default function LoadingPill({
  variant = "default",
  title = "Loading",
}: {
  variant?: "default" | "compact";
  title?: string;
}) {
  const pillClass = variant === "compact" ? styles.pillCompact : styles.pill;
  const dotsClass = variant === "compact" ? styles.dotsCompact : styles.dots;
  const dotClass = variant === "compact" ? styles.dotCompact : styles.dot;

  return (
    <div className={pillClass} aria-hidden="true" title={title}>
      <div className={dotsClass}>
        <span className={dotClass} />
        <span className={dotClass} />
        <span className={dotClass} />
      </div>
    </div>
  );
}

