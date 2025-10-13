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
      admin.from('bookings').select('start_date,end_date,start_time,end_time,guest_first_name,guest_last_name,room_id').eq('id', booking_id).maybeSingle(),
      admin.from('properties').select('name').eq('id', property_id).maybeSingle(),
      admin.from('booking_contacts').select('email').eq('booking_id', booking_id).maybeSingle(),
    ]);
    if (rBk.error || !rBk.data) return bad(404, { error: 'Booking not found' });
    if (rProp.error || !rProp.data) return bad(404, { error: 'Property not found' });
    const email = (rContact.data as any)?.email || null;
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
    const inner = `
      <h3>Reservation details</h3>
      <div style="display:flex; align-items:center; gap:8px;"><img src="${iconGuest}" alt="guest" width="16" height="16" /><strong style="margin-right:6px;">Guest:</strong> <span>${escapeHtml([bk.guest_first_name||'', bk.guest_last_name||''].filter(Boolean).join(' ')||'')}</span></div>
      <div style="display:flex; align-items:center; gap:8px;"><img src="${iconNight}" alt="stay" width="16" height="16" /><strong style="margin-right:6px;">Stay:</strong> <span>${escapeHtml(bk.start_date)} → ${escapeHtml(bk.end_date)}</span></div>
      ${roomName ? `<div style="display:flex; align-items:center; gap:8px;"><img src="${iconRoom}" alt="room" width="16" height="16" /><strong style="margin-right:6px;">Room:</strong> <span>${escapeHtml(roomName)}</span></div>` : ''}
      <div style="margin-top:12px;"><a href="${link}" target="_blank" style="display:inline-block; padding:10px 14px; background:#16b981; color:#0c111b; text-decoration:none; border-radius:10px; font-weight:800;">Open Reservation messages</a></div>
    `;
    const html = wrapEmailHtml(subjectPlain, inner);

    // 4) Outbox + send
    const transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const fromEmail = process.env.FROM_EMAIL || 'office@plan4host.com';
    const fromName  = process.env.FROM_NAME  || 'Plan4Host';

    const info = await transporter.sendMail({ from: `${fromName} <${fromEmail}>`, to: email, subject: subjectPlain, html });
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
