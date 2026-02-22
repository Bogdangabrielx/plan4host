// app/api/account/delete/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTransport } from "nodemailer";

export const runtime = "nodejs";

// Email clients don't support CSS vars; use the same success hex used elsewhere.
const EMAIL_SUCCESS = "#66ac69";

function escapeHtml(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function wrapSimple(subject: string, innerHtml: string): string {
  const border = "#e2e8f0";
  const text = "#0f172a";
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject || "Account closed")}</title>
    <style>
      body { margin:0; padding:0; background:#ffffff; }
      a { color:${EMAIL_SUCCESS}; }
      .card { max-width:600px; margin:0 auto; background:#ffffff; border:1px solid ${border}; border-radius:14px; padding:20px; font-family:-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:${text}; line-height:1.6; }
    </style>
  </head>
  <body>
    <div class="card">
      ${innerHtml}
    </div>
  </body>
  </html>`;
}

export async function POST() {
  const supabase = createClient();
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    const toEmail = String(auth?.user?.email || "").trim();
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Preferred: call a server-side RPC that performs a cascading delete for the account
    try {
      const { error } = await supabase.rpc("account_delete_self");
      if (!error) {
        // Best-effort: send a confirmation email (same style as the first-property email).
        try {
          if (toEmail) {
            const subject = "Your Plan4Host account has been closed";
            const bodyHtml = `
              <div>
                <p style="margin:0 0 14px;">Hello,</p>
                <p style="margin:0 0 14px;">
                  We’re sorry to see you go. This email confirms that your Plan4Host account has been closed and your data has been removed.
                </p>
                <p style="margin:0 0 14px; color:#334155;">
                  If you did not request this, please contact us as soon as possible at <a href="mailto:office@plan4host.com">office@plan4host.com</a>.
                </p>
                <p style="margin:0; color:#334155;">—<br/>The Plan4Host team</p>
              </div>
            `;
            const html = wrapSimple(subject, bodyHtml);
            const transporter = createTransport({
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT || 587),
              secure: String(process.env.SMTP_SECURE || "false") === "true",
              auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });
            const fromEmail = process.env.FROM_EMAIL || "office@plan4host.com";
            const fromName = process.env.FROM_NAME || "Plan4Host";
            void transporter
              .sendMail({ from: `${fromName} <${fromEmail}>`, to: toEmail, subject, html })
              .catch(() => {});
          }
        } catch {
          // ignore email errors
        }
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ error: error.message || "Delete failed" }, { status: 400 });
    } catch (e:any) {
      return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
