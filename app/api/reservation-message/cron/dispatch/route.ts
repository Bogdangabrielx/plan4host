import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createTransport } from "nodemailer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

function wrapEmailHtml(subjectPlain: string, innerHtml: string): string {
  const border = '#e2e8f0';
  const text = '#0f172a';
  const muted = '#64748b';
  const primary = '#16b981';
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subjectPlain || 'New message'}</title>
    <style>
      body { margin:0; padding:0; background:#ffffff; }
      img { border:0; outline:none; text-decoration:none; max-width:100%; height:auto; display:block; }
      a { color:${primary}; text-decoration:none; }
      .p4h h1,.p4h h2,.p4h h3{ margin:0 0 12px; line-height:1.25; }
      .p4h p, .p4h div { line-height:1.6; }
      .p4h hr { border:0; border-top:1px solid ${border}; margin:14px 0; opacity:.9; }
      .p4h-muted { color:${muted}; font-size:12px; }
      @media (prefers-color-scheme: dark) { body { background:#ffffff !important; } }
    </style>
  </head>
  <body>
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:16px; background:#f5f8fb;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:640px; background:#ffffff; border:1px solid ${border}; border-radius:12px;">
            <tr>
              <td style="padding:24px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:${text}; font-size:16px; line-height:1.6;">
                <div class="p4h">${innerHtml}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 24px; border-top:1px solid ${border};">
                <div class="p4h-muted" style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Powered by Plan4Host</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET || "";
    const key = req.headers.get('x-cron-key') || new URL(req.url).searchParams.get('key') || '';
    const ua = (req.headers.get('user-agent') || '').toLowerCase();
    const isVercelCron = !!req.headers.get('x-vercel-cron') || !!req.headers.get('x-vercel-id') || (ua.includes('vercel') && ua.includes('cron'));
    if (!isVercelCron && (!secret || key !== secret)) return bad(401, { error: 'Unauthorized' });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, service, { auth: { persistSession: false } });

    // Load active reservation messages (tokens) — include snapshot_items for freeze
    const rMsgs = await admin.from('reservation_messages').select('id,property_id,booking_id,token,status,snapshot_items').eq('status','active');
    if (rMsgs.error) return bad(400, { error: rMsgs.error.message });
    const messages = (rMsgs.data || []) as Array<{ id:string; property_id:string; booking_id:string; token:string; snapshot_items?: any }>; 

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
      // Use snapshot templates for this message if present; otherwise published templates
      const snap = (m as any).snapshot_items as Array<{ id:string; schedule_kind?: string|null; schedule_offset_hours?: number|null }> | null | undefined;
      const tpls = (snap && Array.isArray(snap) && snap.length > 0)
        ? snap
        : (byPropTpl.get(m.property_id) || []);
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
      const tz = prop.timezone || 'Europe/Bucharest';
      const ciTimeRaw = bk.start_time || prop.check_in_time || '14:00';
      const coTimeRaw = bk.end_time || prop.check_out_time || '11:00';
      function parseTime(t: string){
        const s = (t || '').trim();
        const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (!m) return { h: 0, m: 0, s: 0 };
        return { h: Math.min(23, Math.max(0, Number(m[1])||0)), m: Math.min(59, Math.max(0, Number(m[2])||0)), s: Math.min(59, Math.max(0, Number(m[3]||'0')||0)) };
      }
      function parseDate(d: string){ const m = (d||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); return { y: Number(m?.[1]||1970), m: Number(m?.[2]||1), d: Number(m?.[3]||1) }; }
      function toKey(y:number,m:number,d:number,h:number,mi:number,s:number){ const p=(n:number,w=2)=>String(n).padStart(w,'0'); return `${p(y,4)}${p(m)}${p(d)}${p(h)}${p(mi)}${p(s)}`; }
      function addHoursLocal(parts: { y:number;m:number;d:number;h:number;mi:number;s:number }, hours: number){ const dt = new Date(Date.UTC(parts.y, parts.m-1, parts.d, parts.h, parts.mi, parts.s)); dt.setUTCHours(dt.getUTCHours() + hours); return { y: dt.getUTCFullYear(), m: dt.getUTCMonth()+1, d: dt.getUTCDate(), h: dt.getUTCHours(), mi: dt.getUTCMinutes(), s: dt.getUTCSeconds() }; }
      function nowLocalParts(timeZone: string){ const dtf = new Intl.DateTimeFormat('en-CA', { timeZone, hour12:false, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' }); const parts = dtf.formatToParts(new Date()); const map=Object.fromEntries(parts.map(p=>[p.type,p.value])); return { y:Number(map.year), m:Number(map.month), d:Number(map.day), h:Number(map.hour), mi:Number(map.minute), s:Number(map.second) }; }
      const nowL = nowLocalParts(tz);
      const nowKey = toKey(nowL.y, nowL.m, nowL.d, nowL.h, nowL.mi, nowL.s);
      const ciD = parseDate(bk.start_date); const coD = parseDate(bk.end_date);
      const ciT = parseTime(ciTimeRaw); const coT = parseTime(coTimeRaw);
      const ciLocal = { y: ciD.y, m: ciD.m, d: ciD.d, h: ciT.h, mi: ciT.m, s: ciT.s };
      const coLocal = { y: coD.y, m: coD.m, d: coD.d, h: coT.h, mi: coT.m, s: coT.s };

      for (const t of tpls) {
        const kind = (String((t as any).schedule_kind || 'none')).toLowerCase();
        const offRaw: any = (t as any).schedule_offset_hours;
        const off = (typeof offRaw === 'number' && !isNaN(offRaw)) ? Number(offRaw) : null;
        let due = false;
        if (kind === 'hour_before_checkin') { const h = (off ?? 1); const dueLocal = addHoursLocal(ciLocal, -h); const dueKey = toKey(dueLocal.y, dueLocal.m, dueLocal.d, dueLocal.h, dueLocal.mi, dueLocal.s); due = nowKey >= dueKey; }
        else if (kind === 'hours_before_checkout') { const h = (off ?? 12); const dueLocal = addHoursLocal(coLocal, -h); const dueKey = toKey(dueLocal.y, dueLocal.m, dueLocal.d, dueLocal.h, dueLocal.mi, dueLocal.s); due = nowKey >= dueKey; }
        else if (kind === 'on_arrival') { const dueKey = toKey(ciLocal.y, ciLocal.m, ciLocal.d, ciLocal.h, ciLocal.mi, ciLocal.s); due = nowKey >= dueKey; }
        else { due = false; }
        if (!due) continue;

        // Idempotency: skip if already sent for this template
        const subjTag = `[tpl:${(t as any).id}]`;
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
        const propName = (prop?.name || '').toString().trim() || 'Your property';
        const subject = `[Reservation messages] New message — ${propName} ${subjTag}`;
        const htmlInner = `
          <h2 style="margin:0 0 12px;">New message from <span style=\"color:#16b981;\">${(prop.name || '').toString()}</span></h2>
          <p>You have a new message regarding your reservation.</p>
          <p><a href="${link}" target="_blank" style="display:inline-block; padding:10px 14px; background:#16b981; color:#0c111b; text-decoration:none; border-radius:10px; font-weight:800;">Open reservation messages</a></p>
          <p style="color:#64748b; font-size:12px;">This link shows all messages for your reservation.</p>
        `;
        const html = wrapEmailHtml(subject.replace(/\s*\[tpl:[^\]]+\]\s*$/, ''), htmlInner);

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
