"use client";

import { useState } from "react";

import styles from "../home.module.css";

export default function ContactClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState<"Idle"|"Sending"|"Sent"|"Error">("Idle");
  const [err, setErr] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setStatus("Sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message: msg }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("Sent");
      setName(""); setEmail(""); setMsg("");
    } catch (e: any) {
      setStatus("Error");
      setErr("Could not send message. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="contact-form" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <label className={styles.cfLabel} htmlFor="cf-name">Name</label>
        <input
          id="cf-name"
          type="text"
          className={styles.cfInput}
          value={name}
          onChange={(e)=>setName(e.currentTarget.value)}
          placeholder="Your name"
          required
        />
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <label className={styles.cfLabel} htmlFor="cf-email">Email</label>
        <input
          id="cf-email"
          type="email"
          className={styles.cfInput}
          value={email}
          onChange={(e)=>setEmail(e.currentTarget.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <label className={styles.cfLabel} htmlFor="cf-msg">Message</label>
        <textarea
          id="cf-msg"
          className={styles.cfTextarea}
          value={msg}
          onChange={(e)=>setMsg(e.currentTarget.value)}
          placeholder="How can we help?"
          rows={6}
          required
        />
      </div>
      {err && <div style={{ color: "var(--danger)" }}>{err}</div>}
      <button type="submit" className={styles.cfSubmit} disabled={status==="Sending"}>
        {status === "Sending" ? "Sending…" : status === "Sent" ? "Sent ✓" : "Send message"}
      </button>
      <small style={{ color: "var(--muted)" }}>
        We’ll email back at <b>{email || "your address"}</b>.
      </small>
    </form>
  );
}
