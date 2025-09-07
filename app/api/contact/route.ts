// app/api/contact/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();
    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Prefer RESEND (simple HTTP API). Configure in environment: RESEND_API_KEY
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const TO = "office@plan4host.com";
    const FROM = process.env.CONTACT_FROM || "Plan4Host <noreply@plan4host.com>";

    if (!RESEND_API_KEY) {
      // In dev, don't fail hard. Log and accept.
      console.warn("[contact] RESEND_API_KEY missing. Message not actually sent.", { name, email, message });
      return NextResponse.json({ ok: true, simulated: true });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
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

    if (!res.ok) {
      const txt = await res.text();
      console.error("[contact] Resend error:", txt);
      return NextResponse.json({ error: "Email provider error" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[contact] Unexpected error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

