import type { Metadata } from "next";
import NotFoundImage from "./ui/NotFoundImage";
import s from "../legal/legal.module.css";

export const metadata: Metadata = {
  title: "404 Not Found — Plan4host",
  description: "The page you are looking for could not be found.",
};

export default function NotFoundLanding() {
  return (
    <main className={s.page}>
      <div className={s.container} style={{ textAlign: "center", maxWidth: 720 }}>
        <header
          style={{
            marginBottom: 20,
            display: "grid",
            gap: 10,
            placeItems: "center",
          }}
        >
          <img
            src="/p4h_logo_rotund.png"
            alt="Plan4Host"
            width={80}
            height={80}
            style={{
              borderRadius: 999,
              border: "2px solid var(--border)",
              background: "var(--card)",
            }}
          />
          <h1 style={{ margin: 0, marginBottom: 4 }}>Page not found</h1>
          <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 14 }}>
            The page you were looking for doesn’t exist or was moved.
          </p>
        </header>

        <div style={{ marginTop: 10 }}>
          <NotFoundImage />
        </div>
        <div style={{ marginTop: 16 }}>
          <a
            href="/"
            className={s.btn}
          >
            Take me home
          </a>
        </div>
      </div>
    </main>
  );
}
