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
    if (!booking_id || !property_id) return bad(400, { error: 'booking_id and property_id required' });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, service, { auth: { persistSession: false } });

    // 1) Ensure there is a reservation_messages token (server-side, no external fetch)
    const rMsg = await admin
      .from('reservation_messages')
      .select('id, token, status')
      .eq('property_id', property_id)
      .eq('booking_id', booking_id)
      .maybeSingle();
    let token: string | null = (rMsg.data as any)?.token || null;

    // 2) Fetch booking + property + contact
    const [rBk, rProp, rContact] = await Promise.all([
      admin.from('bookings').select('start_date,end_date,start_time,end_time,guest_first_name,guest_last_name,guest_email,form_id,room_id').eq('id', booking_id).maybeSingle(),
      admin.from('properties').select('name').eq('id', property_id).maybeSingle(),
      admin.from('booking_contacts').select('email').eq('booking_id', booking_id).maybeSingle(),
    ]);
    if (rBk.error || !rBk.data) return bad(404, { error: 'Booking not found' });
    if (rProp.error || !rProp.data) return bad(404, { error: 'Property not found' });
    // Resolve recipient email with robust fallback
    let email: string | null = ((rContact.data as any)?.email || '').trim() || null;
    if (!email) {
      const bkAny: any = rBk.data;
      // try form_bookings via bookings.form_id
      const formId = (bkAny?.form_id || null) as string | null;
      if (formId) {
        try {
          const rF = await admin.from('form_bookings').select('guest_email').eq('id', formId).maybeSingle();
          if (!rF.error && rF.data) email = (((rF.data as any)?.guest_email || '') as string).trim() || null;
        } catch {}
      }
      // fallback to bookings.guest_email
      if (!email) email = (((bkAny?.guest_email || '') as string).trim() || null);
    }
    if (!email) return bad(400, { error: 'missing_email' });

    const bk: any = rBk.data;
    // If token is missing, create it now using service role
    if (!token) {
      // compute expiry: day after checkout
      const endDate: string | null = bk?.end_date || null;
      let expiresAt: string | null = null;
      if (endDate) {
        const ex = new Date(`${endDate}T00:00:00Z`);
        ex.setUTCDate(ex.getUTCDate() + 1);
        expiresAt = ex.toISOString();
      }
      const newToken = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
      const up = await admin
        .from('reservation_messages')
        .insert({ property_id, booking_id, token: newToken, status: 'active', expires_at: expiresAt, manual_values: {} })
        .select('token')
        .single();
      if (up.error || !up.data) return bad(500, { error: up.error?.message || 'Failed to create link' });
      token = (up.data as any).token as string;
    }
    const propName = (rProp.data as any)?.name || '';
    let roomName: string | null = null;
    if (bk.room_id) {
      const rRoom = await admin.from('rooms').select('name').eq('id', bk.room_id).maybeSingle();
      if (!rRoom.error && rRoom.data) roomName = (rRoom.data as any)?.name || null;
    }

    // 3) Build email (Reservation confirmation)
    const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://plan4host.com').toString().replace(/\/+$/, '');
    const iconRoom = `${base}/room_forlight.png`;
    const iconNight = `${base}/night_forlight.png`;
    const iconGuest = `${base}/logoguest_forlight.png`;
    const link = `${base}/r/${token}`;
    const subjectPlain = `Reservation confirmation — ${propName}`;
    const guestFull = [bk.guest_first_name||'', bk.guest_last_name||''].filter(Boolean).join(' ');
    const sd = String(bk.start_date || '');
    const st = String(bk.start_time || '14:00');
    const ed = String(bk.end_date || sd);
    const et = String(bk.end_time || '11:00');
    function toUtcGCal(ymd, hm){
      const m1 = (ymd||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); const m2 = (hm||'').match(/^(\d{2}):(\d{2})$/);
      if (!m1 || !m2) return '';
      const dt = new Date(Date.UTC(+m1[1], +m1[2]-1, +m1[3], +m2[1], +m2[2], 0));
      const yyyy = dt.getUTCFullYear(); const mm = String(dt.getUTCMonth()+1).padStart(2,'0'); const dd = String(dt.getUTCDate()).padStart(2,'0');
      const HH = String(dt.getUTCHours()).padStart(2,'0'); const MI = String(dt.getUTCMinutes()).padStart(2,'0');
      return `${yyyy}${mm}${dd}T${HH}${MI}00Z`;
    }
    const gStart = toUtcGCal(sd, st);
    const gEnd   = toUtcGCal(ed, et);
    const gcal = (gStart && gEnd)
      ? `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Reservation — ${propName}`)}&dates=${gStart}/${gEnd}&details=${encodeURIComponent(`Guest: ${guestFull}\nLink: ${link}`)}&location=${encodeURIComponent(propName)}`
      : '';
    const thankYou = 'Thank you for your patience — your reservation has been confirmed.';
    const inner = `
      <div style="margin:14px 0; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;">
        <p style="margin:0 0 10px;">${escapeHtml(thankYou)}</p>
        <h3 style="margin:8px 0 10px;">Reservation details</h3>
        <div style=\"display:grid; grid-template-columns:auto 1fr; row-gap:8px; column-gap:10px; align-items:center;\">
          <div aria-hidden style=\"width:18px\"><img src=\"${iconGuest}\" alt=\"guest\" width=\"16\" height=\"16\"/></div>
          <div><strong>Guest:</strong> <span>${escapeHtml(guestFull)}</span></div>
          <div aria-hidden style=\"width:18px\"><img src=\"${iconNight}\" alt=\"stay\" width=\"16\" height=\"16\"/></div>
          <div><strong>Stay:</strong> <span>${escapeHtml(sd)} → ${escapeHtml(ed)}</span></div>
          ${roomName ? `<div aria-hidden style=\\\"width:18px\\\"><img src=\\\"${iconRoom}\\\" alt=\\\"room\\\" width=\\\"16\\\" height=\\\"16\\\"/></div><div><strong>Room:</strong> <span>${escapeHtml(roomName)}</span></div>` : ''}
        </div>
        <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
          <a href="${link}" target="_blank" style="display:inline-block; padding:10px 14px; background:#16b981; color:#0c111b; text-decoration:none; border-radius:10px; font-weight:800;">Open Reservation messages</a>
          ${gcal ? `<a href=\"${gcal}\" target=\"_blank\" style=\"display:inline-block; padding:10px 14px; background:#0ea5e9; color:#0c111b; text-decoration:none; border-radius:10px; font-weight:800;\">Add to calendar</a>` : ''}
        </div>
        <p style="margin:10px 0 0; color:#64748b; font-size:12px;">An .ics file is attached for your calendar.</p>
      </div>
    `;
    const html = wrapEmailHtml(subjectPlain, inner);

    // 3b) ICS attachment
    function pad(n){ return String(n).padStart(2,'0'); }
    function toIcsUtc(ymd, hm){
      const m1 = (ymd||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); const m2 = (hm||'').match(/^(\d{2}):(\d{2})$/);
      if (!m1 || !m2) return '';
      const dt = new Date(Date.UTC(+m1[1], +m1[2]-1, +m1[3], +m2[1], +m2[2], 0));
      return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth()+1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`;
    }
    const icsStart = toIcsUtc(sd, st);
    const icsEnd   = toIcsUtc(ed, et);
    const now = new Date();
    const dtStamp  = `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
    const uidIcs = `${booking_id}@plan4host.com`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Plan4Host//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uidIcs}`,
      `DTSTAMP:${dtStamp}`,
      icsStart ? `DTSTART:${icsStart}` : '',
      icsEnd ? `DTEND:${icsEnd}` : '',
      `SUMMARY:Reservation — ${propName.replace(/[,;]/g,' ')}`,
      `LOCATION:${(propName||'').replace(/[,;\n]/g,' ')}`,
      `DESCRIPTION:${('Reservation details — ' + guestFull + ' / ' + (link||'')).replace(/[\n\r]/g,' ')}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    // 4) Outbox + send
    const transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const fromEmail = process.env.FROM_EMAIL || 'office@plan4host.com';
    const fromName  = process.env.FROM_NAME  || 'Plan4Host';

    const info = await transporter.sendMail({ from: `${fromName} <${fromEmail}>`, to: email, subject: subjectPlain, html, attachments: [ { filename: 'reservation.ics', content: ics, contentType: 'text/calendar; charset=utf-8' } ] });
    await admin.from('email_outbox').insert({ booking_id, property_id, to_email: email, subject: subjectPlain, html, status: 'sent', sent_at: new Date().toISOString(), provider_message_id: info?.messageId || null });
    return NextResponse.json({ ok: true, sent: true, url: link });
  } catch (e: any) {
    return bad(500, { error: e?.message || 'Unexpected error' });
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

function wrapEmailHtml(subjectPlain: string, innerHtml: string): string {
  const border = '#e2e8f0';
  const text = '#0f172a';
  const link = '#16b981';
  return `<!DOCTYPE html>
    <html lang="en"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(subjectPlain)}</title>
    <style>body{margin:0;padding:0;background:#ffffff;}img{border:0;outline:none;text-decoration:none;max-width:100%;height:auto;display:block;}a{color:${link};}</style>
    </head><body>
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff;"><tr><td align="center" style="padding:16px; background:#f5f8fb;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:640px; background:#ffffff; border:1px solid ${border}; border-radius:12px;">
    <tr><td style="padding:24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:${text}; font-size:16px; line-height:1.6;">${innerHtml}</td></tr>
    <tr><td style="padding:12px 24px; border-top:1px solid ${border};"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#64748b;font-size:12px;">Powered by Plan4Host</div></td></tr>
    </table></td></tr></table>
    </body></html>`;
}
