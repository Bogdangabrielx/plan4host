import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createTransport } from "nodemailer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET || "";
    const key = req.headers.get('x-cron-key') || new URL(req.url).searchParams.get('key') || '';
    const isVercelCron = !!req.headers.get('x-vercel-cron');
    if (!isVercelCron && (!secret || key !== secret)) return bad(401, { error: 'Unauthorized' });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, service, { auth: { persistSession: false } });

    // Load active reservation messages (tokens)
    const rMsgs = await admin.from('reservation_messages').select('id,property_id,booking_id,token,status').eq('status','active');
    if (rMsgs.error) return bad(400, { error: rMsgs.error.message });
    const messages = (rMsgs.data || []) as Array<{ id:string; property_id:string; booking_id:string; token:string; }>;

    // Preload templates per property
    const propIds = Array.from(new Set(messages.map(m => m.property_id)));
    const rTpls = await admin
      .from('reservation_templates')
      .select('id,property_id,title,status,schedule_kind,schedule_offset_hours')
      .in('property_id', propIds)
      .eq('status','published');
    if (rTpls.error) return bad(400, { error: rTpls.error.message });
    const byPropTpl = new Map<string, Array<any>>();
    for (const t of (rTpls.data || []) as any[]) {
      const arr = byPropTpl.get(t.property_id) || []; arr.push(t); byPropTpl.set(t.property_id, arr);
    }

    // SMTP
    const transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const fromEmail = process.env.FROM_EMAIL || 'office@plan4host.com';
    const fromName  = process.env.FROM_NAME  || 'Plan4Host';

    let sentCount = 0;

    for (const m of messages) {
      const tpls = byPropTpl.get(m.property_id) || [];
      if (tpls.length === 0) continue;

      // booking + property + contact
      const [rBk, rProp, rContact] = await Promise.all([
        admin.from('bookings').select('start_date,end_date,start_time,end_time,room_id').eq('id', m.booking_id).maybeSingle(),
        admin.from('properties').select('name,timezone,check_in_time,check_out_time').eq('id', m.property_id).maybeSingle(),
        admin.from('booking_contacts').select('email').eq('booking_id', m.booking_id).maybeSingle(),
      ]);
      if (rBk.error || !rBk.data) continue;
      if (rProp.error || !rProp.data) continue;
      const email = (rContact.data as any)?.email || null; if (!email) continue;

      const bk: any = rBk.data; const prop: any = rProp.data;
      const ciTime = bk.start_time || prop.check_in_time || '14:00';
      const coTime = bk.end_time || prop.check_out_time || '11:00';
      const now = new Date();
      function at(dateStr: string, timeStr: string){ return new Date(`${dateStr}T${timeStr}:00`); }

      for (const t of tpls) {
        const kind = (t.schedule_kind || 'none').toLowerCase();
        let due = true;
        if (kind === 'hour_before_checkin') due = now >= new Date(at(bk.start_date, ciTime).getTime() - 1*60*60*1000);
        else if (kind === 'hours_before_checkout') due = now >= new Date(at(bk.end_date, coTime).getTime() - 12*60*60*1000);
        else if (kind === 'on_arrival') due = now >= at(bk.start_date, ciTime);
        if (!due) continue;

        // Idempotency: skip if already sent for this template
        const subjTag = `[tpl:${t.id}]`;
        const rOut = await admin
          .from('email_outbox')
          .select('id')
          .eq('booking_id', m.booking_id)
          .ilike('subject', `%${subjTag}%`)
          .eq('status','sent')
          .limit(1);
        if (!rOut.error && (rOut.data?.length || 0) > 0) continue;

        const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://plan4host.com').toString().replace(/\/+$/, '');
        const link = `${base}/r/${m.token}`;
        const subject = `[Reservation messages] New message — ${t.title || 'Message'} ${subjTag}`;
        const html = `
          <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#0f172a; line-height:1.6;">
            <p>You have a new message from <strong>${(prop.name || '').toString()}</strong>.</p>
            <p><a href="${link}" target="_blank" style="display:inline-block; padding:10px 14px; background:#16b981; color:#0c111b; text-decoration:none; border-radius:10px; font-weight:800;">Open Reservation messages</a></p>
            <p style="color:#64748b; font-size:12px;">This link shows all messages for your reservation.</p>
          </div>
        `;

        // Send + outbox
        try {
          const info = await transporter.sendMail({ from: `${fromName} <${fromEmail}>`, to: email, subject, html });
          await admin.from('email_outbox').insert({ booking_id: m.booking_id, property_id: m.property_id, to_email: email, subject, html, status: 'sent', sent_at: new Date().toISOString(), provider_message_id: info?.messageId || null });
          sentCount++;
        } catch {}
      }
    }

    return NextResponse.json({ ok: true, sent: sentCount });
  } catch (e: any) {
    return bad(500, { error: e?.message || 'Unexpected error' });
  }
}
