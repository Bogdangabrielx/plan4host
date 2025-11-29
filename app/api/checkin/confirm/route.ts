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

    // 1) Resolve destination email (prefer client-provided, else booking_contacts.email, else form_bookings.guest_email, else bookings.guest_email)
    let toEmail: string | null = (emailFromClient || "").trim() || null;
    if (!toEmail) {
      try {
        const r = await admin.from('booking_contacts').select('email').eq('booking_id', booking_id).maybeSingle();
        if (!r.error && r.data) toEmail = ((r.data as any).email || '').trim() || null;
      } catch {}
    }
    if (!toEmail) {
      // try form_bookings
      try {
        const r = await admin.from('form_bookings').select('guest_email').eq('id', booking_id).maybeSingle();
        if (!r.error && r.data) toEmail = ((r.data as any).guest_email || '').trim() || null;
      } catch {}
    }
    if (!toEmail) {
      try {
        const r = await admin.from('bookings').select('guest_email').eq('id', booking_id).maybeSingle();
        if (!r.error && r.data) toEmail = ((r.data as any).guest_email || '').trim() || null;
      } catch {}
    }
    if (!toEmail) return bad(400, { error: 'missing_email' });

    // Resolve property name for nicer subject/body
    let propName: string | null = null;
    try {
      const rP = await admin.from('properties').select('name').eq('id', property_id).maybeSingle();
      if (!rP.error && rP.data) propName = ((rP.data as any).name || null) as string | null;
    } catch {}

    const subject = `Check-in received${propName ? ' — ' + propName : ''}`;

    // 2) Idempotency: if a confirmation mail already SENT for this booking, don't resend
    try {
      const r = await admin
        .from('email_outbox')
        .select('id,status,created_at,subject')
        .eq('booking_id', booking_id)
        .ilike('subject', 'Check-in received%')
        .eq('status', 'sent')
        .order('created_at', { ascending: false })
        .limit(1);
      if (!r.error && (r.data?.length || 0) > 0) {
        return NextResponse.json({ sent: true, duplicate: true });
      }
    } catch { /* ignore */ }
    // Enrich email with details (prefer form_bookings; fallback to bookings)
    let roomTypeName: string | null = null;
    let roomName: string | null = null;
    let startYMD: string | null = null;
    let endYMD: string | null = null;
    let guestFirst: string | null = null;
    let guestLast: string | null = null;
    let validUntil: string | null = null;
    let guestCompanions: any[] | null = null;
    try {
      // Try form_bookings first
      const rF = await admin
        .from('form_bookings')
        .select('room_id, room_type_id, start_date, end_date, guest_first_name, guest_last_name, submitted_at, created_at')
        .eq('id', booking_id)
        .maybeSingle();
      if (!rF.error && rF.data) {
        const b: any = rF.data;
        startYMD = b.start_date || null;
        endYMD = b.end_date || null;
        guestFirst = (b.guest_first_name || null);
        guestLast = (b.guest_last_name || null);
        if (startYMD && /^\d{4}-\d{2}-\d{2}$/.test(startYMD)) {
          try {
            const base = new Date(`${startYMD}T00:00:00Z`);
            const until = new Date(base.getTime());
            until.setUTCDate(until.getUTCDate() + 30);
            validUntil = `${String(until.getUTCDate()).padStart(2,'0')}.${String(until.getUTCMonth()+1).padStart(2,'0')}.${until.getUTCFullYear()}`;
          } catch {}
        }
        const rtId = b.room_type_id || null;
        const rId = b.room_id || null;
        if (Array.isArray((b as any).guest_companions)) {
          guestCompanions = (b as any).guest_companions as any[];
        }
        if (rtId) {
          try {
            const rT = await admin.from('room_types').select('name').eq('id', rtId).maybeSingle();
            if (!rT.error && rT.data) roomTypeName = ((rT.data as any).name || null) as string | null;
          } catch {}
        }
        if (rId) {
          try {
            const rR = await admin.from('rooms').select('name,room_type_id').eq('id', rId).maybeSingle();
            if (!rR.error && rR.data) {
              roomName = ((rR.data as any).name || null) as string | null;
              if (!roomTypeName && (rR.data as any).room_type_id) {
                const rT2 = await admin.from('room_types').select('name').eq('id', (rR.data as any).room_type_id).maybeSingle();
                if (!rT2.error && rT2.data) roomTypeName = ((rT2.data as any).name || null) as string | null;
              }
            }
          } catch {}
        }
      } else {
        // fallback: bookings
        const rB = await admin
          .from('bookings')
          .select('room_id, room_type_id, start_date, end_date, guest_first_name, guest_last_name, form_submitted_at, created_at')
          .eq('id', booking_id)
          .maybeSingle();
        if (!rB.error && rB.data) {
        const b: any = rB.data;
          startYMD = b.start_date || null;
          endYMD = b.end_date || null;
          guestFirst = (b.guest_first_name || null);
          guestLast = (b.guest_last_name || null);
          if (startYMD && /^\d{4}-\d{2}-\d{2}$/.test(startYMD)) {
            try {
              const base = new Date(`${startYMD}T00:00:00Z`);
              const until = new Date(base.getTime());
              until.setUTCDate(until.getUTCDate() + 30);
              validUntil = `${String(until.getUTCDate()).padStart(2,'0')}.${String(until.getUTCMonth()+1).padStart(2,'0')}.${until.getUTCFullYear()}`;
            } catch {}
          }
          if (Array.isArray((b as any).guest_companions) && !guestCompanions) {
            guestCompanions = (b as any).guest_companions as any[];
          }
          const rtId = b.room_type_id || null;
          const rId = b.room_id || null;
          if (rtId) {
            try {
              const rT = await admin.from('room_types').select('name').eq('id', rtId).maybeSingle();
              if (!rT.error && rT.data) roomTypeName = ((rT.data as any).name || null) as string | null;
            } catch {}
          }
          if (rId) {
            try {
              const rR = await admin.from('rooms').select('name,room_type_id').eq('id', rId).maybeSingle();
              if (!rR.error && rR.data) {
                roomName = ((rR.data as any).name || null) as string | null;
                if (!roomTypeName && (rR.data as any).room_type_id) {
                  const rT2 = await admin.from('room_types').select('name').eq('id', (rR.data as any).room_type_id).maybeSingle();
                  if (!rT2.error && rT2.data) roomTypeName = ((rT2.data as any).name || null) as string | null;
                }
              }
            } catch {}
          }
        }
      }
    } catch {}

    const displayRoom = null; // Do not include room info in the acknowledgement email
    function fmt(ymd: string | null): string | null {
      if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
      const [y, m, d] = ymd.split('-');
      return `${d}.${m}.${y}`;
    }
    const arrival = fmt(startYMD);
    const depart = fmt(endYMD);
    const guestFull = [guestFirst, guestLast].filter(Boolean).join(' ').trim() || null;
    const companionsCount = Array.isArray(guestCompanions) ? guestCompanions.length : 0;
    const totalGuestsText = companionsCount > 0 && guestFull
      ? `${guestFull} + ${companionsCount} guest${companionsCount > 1 ? 's' : ''}`
      : guestFull;
    // validUntil already computed above when we loaded booking (based on start_date)

    const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://plan4host.com').toString().replace(/\/+$/, '');
    const iconRoom = `${base}/room_forlight.png`;
    const iconNight = `${base}/night_forlight.png`;
    const iconGuest = `${base}/logoguest_forlight.png`;

    const qrLink = `${base}/r/ci/${booking_id}`;
    const qrImg  = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&ecc=H&data=${encodeURIComponent(qrLink)}`;

    const html = `
      <div style="background:#ffffff; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#0c111b; line-height:1.5; padding:16px;">
        <h2 style="margin:0 0 12px;">Check-in received${propName ? ` for <span style=\"color:#3ECF8E\">${escapeHtml(propName)}</span>` : ''}</h2>
        <p style="margin:8px 0;">Thank you for submitting your check-in details${propName ? ` for <strong>${escapeHtml(propName)}</strong>` : ''}. We’ve forwarded your information to the property.</p>
        <div style="margin:14px 0; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; display:grid; gap:10px;">
          ${totalGuestsText ? `<div style=\"display:flex; align-items:center; gap:8px;\"><img src=\"${iconGuest}\" alt=\"guest\" width=\"16\" height=\"16\"/><strong style=\"margin-right:6px;\">Guest:</strong> <span>${escapeHtml(totalGuestsText)}</span></div>` : ''}
          ${(arrival && depart) ? `<div style=\"display:flex; align-items:center; gap:8px;\"><img src=\"${iconNight}\" alt=\"stay\" width=\"16\" height=\"16\"/><strong style=\"margin-right:6px;\">Stay:</strong> <span>${arrival} → ${depart}</span></div>` : ''}
        </div>
        <p style="margin:8px 0; color:#475569;">Once your reservation is confirmed, we’ll inform you which room you’ll be staying in and share any arrival details you’ll need.</p>
        <p style="margin:8px 0; color:#475569;">If you need to make changes, please contact the property directly.</p>
              <div style=\"margin:14px 0; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; text-align:center;\">
          <div style=\"font-weight:800; margin-bottom:8px;\">Your QR code</div>
          <div style=\"display:block; margin:0 auto; width:240px;\">
            <div style=\"position:relative; width:240px; height:240px; border-radius:16px; overflow:hidden; margin:0 auto;\">
              <img src=\"${qrImg}\" alt=\"QR code\" width=\"240\" height=\"240\" style=\"display:block;\"/>
              <img src=\"${base}/p4h_logo_round_QR.png\" alt=\"Logo\" width=\"72\" height=\"72\" style=\"position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); border-radius:9999px; background:#ffffff; border:4px solid #ffffff;\"/>
            </div>
          </div>
          <div style=\"font-size:12px; color:#475569; margin-top:8px; word-break:break-all;\">${escapeHtml(qrLink)}</div>
          ${validUntil ? `<div style=\"font-size:12px; color:#475569; margin-top:6px;\">Valid for 30 days (until ${validUntil}).</div>` : ''}
        </div>
</div>
    `;
    const lines: string[] = [];
    lines.push(`Check-in received${propName ? ` for ${propName}` : ''}`);
    if (arrival && depart) lines.push(`Stay: ${arrival} -> ${depart}`);
    if (totalGuestsText) lines.push(`Guest: ${totalGuestsText}`);
    lines.push('');
    lines.push('We’ve received your details and forwarded them to the property.\nQR: ${qrLink}');
    lines.push('Once your reservation is confirmed, we will inform you about your room and arrival details.');
    const text = lines.join('\n');

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
      text,
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

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
