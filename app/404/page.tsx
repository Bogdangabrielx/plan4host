import type { Metadata } from "next";
import NotFoundImage from "./ui/NotFoundImage";
import ForceDark from "@/components/theme/ForceDark";

export const metadata: Metadata = {
  title: "404 Not Found — Plan4host",
  description: "The page you are looking for could not be found.",
};

export default function NotFoundLanding() {
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
      <ForceDark />
      <div style={{ textAlign: "center", maxWidth: 720 }}>
        <h1 style={{ margin: 0, marginBottom: 8 }}>Page not found</h1>
        <p style={{ marginTop: 0, color: "var(--muted)" }}>
          The page you were looking for doesn’t exist or was moved.
        </p>
        <div style={{ marginTop: 10 }}>
          <NotFoundImage />
        </div>
        <div style={{ marginTop: 16 }}>
          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "#ffffff",
              color: "#020202ff",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            Take me home
          </a>
        </div>
      </div>
    </main>
  );
}
