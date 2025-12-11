"use client";

import { useMemo, useState } from "react";
import QrWithLogo from "../../../QrWithLogo";

const QR_SIZE = 320;

export default function QrGeneratorClient() {
  const [rawValue, setRawValue] = useState("");
  const [data, setData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalized = (input: string): string | null => {
    const v = input.trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    return `https://${v}`;
  };

  const qrDownloadUrl = useMemo(() => {
    if (!data) return null;
    const base = "https://api.qrserver.com/v1/create-qr-code/";
    const params = new URLSearchParams({
      ecc: "H",
      size: `${QR_SIZE}x${QR_SIZE}`,
      data,
    });
    return `${base}?${params.toString()}`;
  }, [data]);

  const handleGenerate: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const v = normalized(rawValue);
    if (!v) {
      setError("Te rog inserează un link.");
      setData(null);
      return;
    }
    setError(null);
    setData(v);
  };

  const handleDownload = () => {
    if (!qrDownloadUrl) return;
    try {
      const a = document.createElement("a");
      a.href = qrDownloadUrl;
      a.download = "qr-code.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        alignItems: "start",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <section
        className="sb-cardglow"
        style={{
          padding: 16,
          borderRadius: 12,
          display: "grid",
          gap: 12,
          background: "var(--panel)",
        }}
      >
        <h2 style={{ margin: 0 }}>QR generator</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
          Inserează un link, generezi un QR cu colțuri rotunjite și îl poți descărca ca imagine PNG.
        </p>

        <form
          onSubmit={handleGenerate}
          style={{ display: "grid", gap: 10, alignItems: "start" }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Link pentru QR
            </label>
            <input
              type="text"
              value={rawValue}
              onChange={(e) => setRawValue(e.currentTarget.value)}
              placeholder="https://exemplu.ro/pagina-sau-formular"
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                fontSize: 14,
                width: "100%",
              }}
            />
            {error && (
              <p style={{ margin: 0, fontSize: 12, color: "var(--danger)" }}>
                {error}
              </p>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 4,
            }}
          >
            <button
              type="submit"
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--primary)",
                color: "#0c111b",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Generează QR
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!qrDownloadUrl}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text)",
                fontWeight: 600,
                fontSize: 13,
                cursor: qrDownloadUrl ? "pointer" : "not-allowed",
                opacity: qrDownloadUrl ? 1 : 0.5,
              }}
            >
              Descarcă PNG
            </button>
          </div>
        </form>
      </section>

      {data && (
        <section
          className="sb-cardglow"
          style={{
            padding: 16,
            borderRadius: 12,
            display: "grid",
            gap: 12,
            alignItems: "center",
            justifyItems: "center",
            background: "var(--panel)",
          }}
        >
          <QrWithLogo
            data={data}
            size={QR_SIZE}
            radius={24}
            logoSrc=""
            logoRingPx={0}
          />
          <small
            style={{
              maxWidth: "100%",
              wordBreak: "break-all",
              color: "var(--muted)",
              textAlign: "center",
              fontSize: 12,
            }}
          >
            {data}
          </small>
        </section>
      )}
    </div>
  );
}
