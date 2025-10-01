// app/api/checkin/confirm/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createTransport } from "nodemailer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const booking_id: string | undefined = body?.booking_id;
    const property_id: string | undefined = body?.property_id;
    const emailFromClient: string | undefined = body?.email;

    if (!booking_id || !property_id) return bad(400, { error: "booking_id and property_id required" });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, service, { auth: { persistSession: false } });

    // 1) Resolve destination email (prefer client-provided, else booking_contacts.email, else bookings.guest_email)
    let toEmail: string | null = (emailFromClient || "").trim() || null;
    if (!toEmail) {
      try {
        const r = await admin.from('booking_contacts').select('email').eq('booking_id', booking_id).maybeSingle();
        if (!r.error && r.data) toEmail = ((r.data as any).email || '').trim() || null;
      } catch {}
    }
    if (!toEmail) {
      try {
        const r = await admin.from('bookings').select('guest_email').eq('id', booking_id).maybeSingle();
        if (!r.error && r.data) toEmail = ((r.data as any).guest_email || '').trim() || null;
      } catch {}
    }
    if (!toEmail) return bad(400, { error: 'missing_email' });

    // 2) Idempotency: if a confirmation mail already SENT for this booking, don't resend
    try {
      const r = await admin
        .from('email_outbox')
        .select('id,status,created_at')
        .eq('booking_id', booking_id)
        .eq('subject', 'Check-in Confirmation')
        .eq('status', 'sent')
        .order('created_at', { ascending: false })
        .limit(1);
      if (!r.error && (r.data?.length || 0) > 0) {
        return NextResponse.json({ sent: true, duplicate: true });
      }
    } catch { /* ignore */ }

    const subject = 'Check-in Confirmation';
    const html = '<div style="margin:6px 0; line-height:1.5;">This email is a confirmation of completing the check-in form.</div>';

    // 3) Insert outbox pending
    const outboxIns = await admin
      .from('email_outbox')
      .insert({ booking_id, property_id, to_email: toEmail, subject, html, status: 'pending' })
      .select('id')
      .single();
    const outboxId = (outboxIns.data as any)?.id as string | undefined;

    // 4) Send via SMTP
    const transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const fromEmail = process.env.FROM_EMAIL || 'office@plan4host.com';
    const fromName  = process.env.FROM_NAME  || 'Plan4Host';

    const info = await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: toEmail,
      subject,
      html,
    });

    await admin
      .from('email_outbox')
      .update({ status: 'sent', sent_at: new Date().toISOString(), provider_message_id: info?.messageId || null })
      .eq('id', outboxId || '');

    return NextResponse.json({ sent: true, outbox_id: outboxId || null });
  } catch (e: any) {
    // On error, best-effort to log
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const admin = createClient(url, service, { auth: { persistSession: false } });
      const b = await req.json().catch(() => ({}));
      if (b?.booking_id) {
        await admin
          .from('email_outbox')
          .insert({ booking_id: b.booking_id, property_id: b.property_id || null, to_email: b?.email || null, subject: 'Check-in Confirmation', html: null, status: 'error', error_message: e?.message || String(e) });
      }
    } catch {}
    return bad(500, { error: 'send_failed', message: e?.message || String(e) });
  }
}

