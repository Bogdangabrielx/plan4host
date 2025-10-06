// app/api/reservation-message/test-send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { createTransport } from "nodemailer";

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

function wrapEmailHtml(subjectPlain: string, innerHtml: string): string {
  const border = '#e2e8f0';
  const text = '#0f172a';
  const muted = '#64748b';
  const link = '#16b981';
  return (
    `<!DOCTYPE html><html lang="en"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subjectPlain || 'Message')}</title>
    <style>body{margin:0;padding:0;background:#ffffff}img{border:0;outline:none;text-decoration:none;max-width:100%;height:auto;display:block}a{color:${link}}
    .p4h-content h1,.p4h-content h2,.p4h-content h3{margin:0 0 12px;line-height:1.25}.p4h-content p,.p4h-content div{line-height:1.6}
    .p4h-content ul,.p4h-content ol{margin:10px 0 10px 20px}.p4h-content hr{border:0;border-top:1px solid ${border};margin:14px 0;opacity:.9}
    .p4h-muted{color:${muted};font-size:12px}@media (prefers-color-scheme: dark){body{background:#ffffff!important}}</style></head>
    <body><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff"><tr>
    <td align="center" style="padding:16px;background:#f5f8fb"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid ${border};border-radius:12px"><tr>
    <td style="padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${text};font-size:16px;line-height:1.6"><div class="p4h-content">${innerHtml}</div></td>
    </tr><tr><td style="padding:12px 24px;border-top:1px solid ${border}"><div class="p4h-muted" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">Powered by Plan4Host</div></td></tr>
    </table></td></tr></table></body></html>`
  );
}

export async function POST(req: NextRequest) {
  try {
    const supa = createServerClient();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user; if (!user) return bad(401, { error: "Not authenticated" });

    const body = await req.json().catch(()=>({}));
    const template_id: string | undefined = body?.template_id;
    const property_id: string | undefined = body?.property_id;
    const to_email: string | undefined = body?.to_email;
    if (!template_id || !property_id || !to_email) return bad(400, { error: 'template_id, property_id and to_email required' });

    // Admin client (service role) to fetch template and property name
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, service, { auth: { persistSession: false } });

    const rHead = await admin
      .from('reservation_templates')
      .select('id,property_id,title,status')
      .eq('id', template_id)
      .maybeSingle();
    if (rHead.error || !rHead.data) return bad(404, { error: 'Template not found' });

    const [rBlocks, rProp] = await Promise.all([
      admin.from('reservation_template_blocks').select('type,text,sort_index').eq('template_id', template_id).order('sort_index', { ascending: true }),
      admin.from('properties').select('name').eq('id', property_id).maybeSingle(),
    ]);
    if (rBlocks.error) return bad(400, { error: rBlocks.error.message });
    const propName = (rProp.data as any)?.name || '';

    // Placeholder vars for test: use “First Name Last Name” as requested
    const vars: Record<string,string> = {
      guest_first_name: 'First Name',
      guest_last_name: 'Last Name',
      check_in_date: '2025-01-01',
      check_in_time: '14:00',
      check_out_date: '2025-01-03',
      check_out_time: '11:00',
      room_name: 'Sample Room',
      property_name: propName,
    };

    // Build subject/body
    let subject = '';
    const parts: string[] = [];
    for (const b of (rBlocks.data || []) as Array<{type:string;text?:string|null}>) {
      if (b.type === 'heading' && !subject) subject = renderHeadingSafe(b.text || '', vars);
      else if (b.type === 'divider') parts.push('<hr style="border:0;border-top:1px solid #e2e8f0; opacity:.9;"/>');
      else if (b.type === 'paragraph') parts.push(`<div style=\"margin:6px 0; line-height:1.6;\">${replaceVarsInHtml(b.text || '', vars)}</div>`);
    }
    const bodyHtml = parts.join('\n');
    const subjectPlain = subject.replace(/<[^>]+>/g, '');
    const html = wrapEmailHtml(subjectPlain, bodyHtml);

    // SMTP
    const transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const fromEmail = process.env.FROM_EMAIL || 'office@plan4host.com';
    const fromName  = process.env.FROM_NAME  || 'Plan4Host';

    await transporter.sendMail({ from: `${fromName} <${fromEmail}>`, to: to_email, subject: subjectPlain || 'Test message', html });
    return NextResponse.json({ ok: true, sent: true });
  } catch (e:any) {
    return bad(500, { error: e?.message || 'send_failed' });
  }
}

