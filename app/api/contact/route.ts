// app/api/contact/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs"; // ensure Node runtime (required for SMTP)
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();
    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email))) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const TO = process.env.CONTACT_TO || "office@plan4host.com";
    const CC = process.env.CONTACT_CC || ""; // only used if set in env
    const FROM = process.env.CONTACT_FROM || process.env.SMTP_FROM || "Plan4Host <office@plan4host.com>";

    // Prefer SMTP if configured (same ca la signup)
    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const SMTP_SECURE = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || SMTP_PORT === 465;

    if (SMTP_HOST) {
      const { default: nodemailer } = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      });

      // 1) Notificare către office
      await transporter.sendMail({
        from: FROM,
        to: TO,
        cc: CC || undefined,
        subject: `New contact from ${name}`,
        replyTo: email,
        text: `From: ${name} <${email}>\n\n${message}`,
      });

      // 2) Confirmare către expeditor
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://plan4host.com";
      await transporter.sendMail({
        from: FROM,
        to: email,
        subject: "We received your message",
        replyTo: TO,
        text: `Hi ${name},\n\nThank you for contacting Plan4Host — we’ve received your message and will get back to you as soon as possible.\n\nYour message:\n${message}\n\nThank you for your interest!\n— Plan4Host\n${appUrl}`,
      });

      return NextResponse.json({ ok: true });
    }

    // Fallback: Resend API dacă nu e configurat SMTP
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.warn("[contact] No SMTP/Resend configured. Simulating success.", { name, email });
      return NextResponse.json({ ok: true, simulated: true });
    }

    // 1) Notificare
    const notify = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [TO, CC].filter(Boolean), subject: `New contact from ${name}`, reply_to: email, text: `From: ${name} <${email}>\n\n${message}` }),
    });
    if (!notify.ok) {
      const txt = await notify.text();
      console.error("[contact] Resend notify error:", txt);
      return NextResponse.json({ error: "Email provider error" }, { status: 502 });
    }
    // 2) Confirmare către user
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://plan4host.com";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [email], subject: "We received your message", reply_to: TO, text: `Hi ${name},\n\nThank you for contacting Plan4Host — we’ve received your message and will get back to you as soon as possible.\n\nYour message:\n${message}\n\nThank you for your interest!\n— Plan4Host\n${appUrl}` }),
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[contact] Unexpected error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
    // Try to log the message to Supabase (best-effort)
    try {
      const supabase = createClient();
      await supabase.from("contact_messages").insert({
        name,
        email,
        message,
        user_agent: req.headers.get("user-agent"),
        ip: (req.headers.get("x-forwarded-for") || "").split(",")[0] || null,
      });
    } catch (e) {
      console.warn("[contact] Could not persist message to DB", e);
    }

}
