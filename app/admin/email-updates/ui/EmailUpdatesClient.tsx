"use client";

import React, { useState } from "react";

type Props = {
  adminEmail: string;
};

export default function EmailUpdatesClient({ adminEmail }: Props) {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const subj = subject.trim();
    const body = html.trim();
    if (!subj || !body) {
      setError("Please provide both subject and HTML body.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/email-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subj, html: body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to send emails.");
      } else {
        const sent = typeof data?.sent === "number" ? data.sent : 0;
        const total = typeof data?.total === "number" ? data.total : sent;
        setResult(`Emails sent to ${sent} recipients (from ${total} unique addresses).`);
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error while sending.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 16px",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "grid",
          gap: 16,
        }}
      >
        <header>
          <h1 style={{ margin: 0, fontSize: 24 }}>Admin — Email updates</h1>
          <p style={{ marginTop: 4, fontSize: 13, color: "var(--muted)" }}>
            Logged in as <strong>{adminEmail}</strong>. This tool sends a custom HTML email to all users
            in <code>auth.users</code>, one email per address (no BCC).
          </p>
          <div
            style={{
              marginTop: 8,
              padding: 10,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--card)",
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            Use this only for legal / product updates (e.g. Terms, Privacy, DPA). It will send an email to
            every active user with a non‑empty, unique email address.
          </div>
        </header>

        <form onSubmit={onSend} style={{ display: "grid", gap: 16 }}>
          <div>
            <label
              htmlFor="email-updates-subject"
              style={{ display: "block", fontSize: 13, fontWeight: 800, marginBottom: 4 }}
            >
              Subject
            </label>
            <input
              id="email-updates-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.currentTarget.value)}
              placeholder="e.g. Important update to our Terms and Privacy Policy"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                fontSize: 14,
                fontWeight: 500,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="email-updates-html"
              style={{ display: "block", fontSize: 13, fontWeight: 800, marginBottom: 4 }}
            >
              HTML body
            </label>
            <textarea
              id="email-updates-html"
              value={html}
              onChange={(e) => setHtml(e.currentTarget.value)}
              placeholder="Paste full HTML body here…"
              rows={18}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                fontSize: 13,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
            <p style={{ marginTop: 4, fontSize: 11, color: "var(--muted)" }}>
              You can paste a full HTML email template (including inline styles). Plain text will also work.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="submit"
              disabled={sending}
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "1px solid var(--primary)",
                background: "var(--primary)",
                color: "#0c111b",
                fontWeight: 800,
                cursor: sending ? "wait" : "pointer",
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? "Sending…" : "Send to all users"}
            </button>
          </div>
        </form>

        {(error || result) && (
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              border: `1px solid ${error ? "var(--danger)" : "var(--primary)"}`,
              background: "var(--panel)",
              fontSize: 13,
            }}
          >
            {error && <div style={{ color: "var(--danger)", fontWeight: 700 }}>{error}</div>}
            {result && <div style={{ color: "var(--muted)" }}>{result}</div>}
          </div>
        )}

        <section>
          <h2 style={{ margin: "12px 0 6px", fontSize: 16 }}>Preview</h2>
          <div
            style={{
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "#ffffff",
              color: "#0c111b",
              padding: 16,
              minHeight: 120,
              overflow: "auto",
            }}
          >
            {html.trim() ? (
              <div
                style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                Paste HTML above to see a quick preview here. Email clients may render it slightly differently.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

