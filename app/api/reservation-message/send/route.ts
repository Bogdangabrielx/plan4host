// app/api/reservation-message/send/route.ts
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createTransport } from "nodemailer";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

function escapeHtml(s: string) { return (s || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] as string)); }
function replaceVarsInHtml(html: string, vars: Record<string,string>) {
  if (!html) return "";
  const withVars = html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => escapeHtml(vars?.[k] ?? `{{${k}}}`));
  return withVars.replace(/\r?\n/g, '<br/>' );
}
function renderHeadingSafe(src: string, vars: Record<string,string>) {
  const s = src || "";
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let out: string[] = []; let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    out.push(escapeHtml(s.slice(last, m.index)));
    const key = m[1];
    out.push(escapeHtml(vars?.[key] ?? `{{${key}}}`));
    last = m.index + m[0].length;
  }
  out.push(escapeHtml(s.slice(last)));
  return out.join("");
}

export async function POST(req: Request) {
  try {
    const supa = createServerClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user; if (!user) return bad(401, { error: "Not authenticated" });

    const body = await req.json().catch(() => ({}) as any);
    const booking_id: string | undefined  = body?.booking_id;
    const property_id: string | undefined = body?.property_id;
    const values: Record<string,string> = (body?.values || {}) as any;
    if (!booking_id) return bad(400, { error: "booking_id required" });

    // Booking + property
    const rBk = await supa
      .from("bookings")
      .select("id, property_id, status, guest_first_name, guest_last_name, start_date, end_date, start_time, end_time, room_id, room_type_id")
      .eq("id", booking_id)
      .maybeSingle();
    if (rBk.error || !rBk.data) return bad(404, { error: "Booking not found" });
    const bk: any = rBk.data;
    const propId = property_id || bk.property_id;

    // Contact email
    const rContact = await supa
      .from("booking_contacts")
      .select("email")
      .eq("booking_id", booking_id)
      .maybeSingle();
    const toEmail: string | null = (rContact.data as any)?.email ?? null;
    if (!toEmail) return bad(400, { error: "missing_email" });

    // Template
    const rTpl = await supa
      .from("reservation_templates")
      .select("id,status")
      .eq("property_id", propId)
      .maybeSingle();
    if (rTpl.error || !rTpl.data) return bad(400, { error: "missing_template" });
    const tplId = (rTpl.data as any).id as string;

    const [rBlocks, rFields] = await Promise.all([
      supa.from("reservation_template_blocks").select("type,text,sort_index").eq("template_id", tplId).order("sort_index", { ascending: true }),
      supa.from("reservation_template_fields").select("key").eq("template_id", tplId),
    ]);
    if (rBlocks.error) return bad(400, { error: rBlocks.error.message });
    if (rFields.error) return bad(400, { error: rFields.error.message });
    const blocks = (rBlocks.data || []) as Array<{ type: string; text?: string }>;
    const manualKeys = (rFields.data || []).map((x: any) => String(x.key));

    // manual_values saved
    const rMsg = await supa
      .from("reservation_messages")
      .select("id, manual_values")
      .eq("property_id", propId)
      .eq("booking_id", booking_id)
      .maybeSingle();
    const saved: Record<string,string> = (rMsg.data as any)?.manual_values || {};
    const merged: Record<string,string> = { ...(saved || {}), ...(values || {}) };
    const missingFields: string[] = manualKeys.filter(k => !merged[k] || merged[k].trim() === "");
    if (missingFields.length > 0) return bad(422, { error: "missing_fields", missingFields });

    // Prepare vars
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, service, { auth: { persistSession: false } });

    const builtins: Record<string,string> = {
      guest_first_name: (bk.guest_first_name || '').toString(),
      guest_last_name: (bk.guest_last_name || '').toString(),
      check_in_date: bk.start_date,
      check_in_time: bk.start_time || '14:00',
      check_out_date: bk.end_date,
      check_out_time: bk.end_time || '11:00',
      room_name: '',
      room_type: '',
      property_name: '',
    };
    // property name
    try {
      const rProp = await admin.from('properties').select('name').eq('id', propId).maybeSingle();
      if (!rProp.error && rProp.data) builtins.property_name = (rProp.data as any).name || '';
    } catch {}
    // room name/type
    if (bk.room_id) {
      try {
        const rRoom = await admin.from('rooms').select('name, room_type_id').eq('id', bk.room_id).maybeSingle();
        if (!rRoom.error && rRoom.data) {
          builtins.room_name = (rRoom.data as any).name || '';
          const rtId = (rRoom.data as any).room_type_id as string | null;
          if (rtId) {
            try {
              const rType = await admin.from('room_types').select('name').eq('id', rtId).maybeSingle();
              if (!rType.error && rType.data) builtins.room_type = (rType.data as any).name || '';
            } catch {}
          }
        }
      } catch {}
    } else if ((bk as any).room_type_id) {
      try {
        const rType = await admin.from('room_types').select('name').eq('id', (bk as any).room_type_id).maybeSingle();
        if (!rType.error && rType.data) builtins.room_type = (rType.data as any).name || '';
      } catch {}
    }
    const vars = { ...builtins, ...(merged || {}) };

    // Subject (first heading) and body (paragraphs)
    const heading = blocks.find(b => b.type === 'heading');
    const subject = heading ? renderHeadingSafe(heading.text || '', vars) : '';
    if (!subject.trim()) return bad(400, { error: 'missing_subject' });

    const bodyParts: string[] = [];
    for (const b of blocks) {
      if (b.type === 'divider') bodyParts.push('<hr style="border:1px solid var(--border); opacity:.6;"/>');
      if (b.type === 'paragraph') bodyParts.push(`<div style=\"margin:6px 0; line-height:1.5;\">${replaceVarsInHtml(b.text || '', vars)}</div>`);
    }
    const html = bodyParts.join('\n');
    if (!html.trim()) return bad(400, { error: 'missing_body' });

    // Insert outbox pending (service role to bypass RLS)
    const outboxInsert = await admin
      .from('email_outbox')
      .insert({ booking_id, property_id: propId, to_email: toEmail, subject, html, status: 'pending' })
      .select('id')
      .single();
    const outboxId = (outboxInsert.data as any)?.id as string | undefined;

    // Send email via SMTP
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
      subject: subject.replace(/<[^>]+>/g, ''), // safety
      html,
    });

    // Update outbox sent
    await admin
      .from('email_outbox')
      .update({ status: 'sent', sent_at: new Date().toISOString(), provider_message_id: info?.messageId || null })
      .eq('id', outboxId || '');

    return NextResponse.json({ sent: true, outbox_id: outboxId || null });
  } catch (e: any) {
    // Best-effort: log error to outbox if we have one in body
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const admin = createClient(url, service, { auth: { persistSession: false } });
      const b = await req.json().catch(() => ({}));
      if (b?.booking_id) {
        await admin
          .from('email_outbox')
          .insert({ booking_id: b.booking_id, property_id: b.property_id || null, to_email: null, subject: null, html: null, status: 'error', error_message: e?.message || String(e) });
      }
    } catch {}
    return bad(500, { error: 'send_failed', message: e?.message || String(e) });
  }
}
