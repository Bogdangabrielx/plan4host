// app/api/contact/route.ts
import { NextResponse } from "next/server";

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

    // Prefer RESEND (simple HTTP API). Configure in environment: RESEND_API_KEY
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const TO = process.env.CONTACT_TO || "office@plan4host.com";
    const FROM = process.env.CONTACT_FROM || "Plan4Host <office@plan4host.com>";

    if (!RESEND_API_KEY) {
      // In dev, don't fail hard. Log and accept.
      console.warn("[contact] RESEND_API_KEY missing. Message not actually sent.", { name, email, message });
      return NextResponse.json({ ok: true, simulated: true });
    }

    // 1) Notify team (to office@plan4host.com)
    const notify = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        subject: `New contact from ${name}`,
        reply_to: email,
        text: `From: ${name} <${email}>\n\n${message}`,
      }),
    });
    if (!notify.ok) {
      const txt = await notify.text();
      console.error("[contact] Resend notify error:", txt);
      return NextResponse.json({ error: "Email provider error" }, { status: 502 });
    }

    // 2) Auto-reply to sender
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://plan4host.com";
    const ack = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: "We received your message",
        reply_to: TO,
        text: `Hi ${name},\n\nThanks for reaching out to Plan4Host. We received your message and will get back to you as soon as possible.\n\nYour message:\n${message}\n\n— Plan4Host\n${appUrl}`,
      }),
    });
    if (!ack.ok) {
      const txt = await ack.text();
      console.error("[contact] Resend ack error:", txt);
      // don't fail the entire request if ack fails; you still got the notify
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[contact] Unexpected error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
