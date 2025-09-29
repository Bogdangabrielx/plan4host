"use client";

import type { Metadata } from "next";
import { useState } from "react";

export const metadata: Metadata = {
  title: "404 Not Found — Plan4host",
  description: "The page you are looking for could not be found.",
};

export default function NotFoundLanding() {
  const [src, setSrc] = useState<string>("/404.gif"); // Place your GIF at public/404.gif
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
        fontFamily:
          "Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        color: "var(--text)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 720 }}>
        <h1 style={{ margin: 0, marginBottom: 8 }}>Page not found</h1>
        <p style={{ marginTop: 0, color: "var(--muted)" }}>
          The page you were looking for doesn’t exist or was moved.
        </p>
        <div style={{ marginTop: 10 }}>
          <img
            src={src}
            alt="404 — Not found"
            onError={() => setSrc("/status.png")}
            style={{ maxWidth: "100%", height: "auto", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,.15)" }}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--primary)",
              color: "#0c111b",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            Go to homepage
          </a>
        </div>
      </div>
    </main>
  );
}

