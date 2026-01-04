import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTransport } from "nodemailer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = (body?.name ?? "").toString().trim();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const country_code = (body?.country_code ?? "").toString().trim() || null;
  const timezone = (body?.timezone ?? "").toString().trim() || null;
  const check_in_time = (body?.check_in_time ?? "").toString().trim() || null;
  const check_out_time = (body?.check_out_time ?? "").toString().trim() || null;

  const insertRow: any = {
    name,
    account_id: user.id,
    admin_id: user.id,
    country_code,
    timezone,
    check_in_time,
    check_out_time,
    // Seed a default presentation image so selectors show a photo immediately
    presentation_image_url: "/hotel_room_1456x816.jpg",
    presentation_image_uploaded_at: new Date().toISOString(),
  };

  // Count existing properties to detect "first property"
  const existing = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("account_id", user.id) as any;
  const hadCount = (existing?.count ?? 0) as number;

  const { error, data } = await supabase
    .from("properties")
    .insert(insertRow)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // If this is the user's first property, send a welcome email
  try {
    if (hadCount === 0) {
      const toEmail = String(user.email || "").trim();
      if (toEmail) {
        const propName = String((data as any)?.name || "").trim();
        const isRo = String(country_code || "").toUpperCase() === "RO";
        const tutorialUrl = "https://plan4host.com/Simulate%20guest%20flow.MP4";
        const subject = isRo ? "Bun venit în Plan4Host 🎉" : "Welcome to Plan4Host 🎉";
        const bodyHtml = isRo ? `
          <div class="p4h-content" style="font-family:-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#0f172a;">
            <h2 style="margin:0 0 10px;">Bună,</h2>
            <p style="margin:0 0 10px;">Îți mulțumim că ți-ai creat cont în Plan4Host! 🙌</p>
            <p style="margin:0 0 10px;">Ai adăugat cu succes prima proprietate: <strong>${escapeHtml(propName)}</strong>.</p>
            <p style="margin:0 0 10px;">Dacă ai orice întrebare legată de configurarea proprietății sau vrei să te ajutăm să setezi rapid totul, ne poți contacta oricând la:</p>
            <div style="margin:10px 0; padding:10px; border:1px solid #e2e8f0; border-radius:8px;">
              <div><strong>WhatsApp:</strong> +40 721 759 329</div>
              <div><strong>Email:</strong> <a href="mailto:office@plan4host.com">office@plan4host.com</a></div>
            </div>
            <div style="margin:14px 0; padding:12px; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc;">
              <p style="margin:0 0 10px;">
                După ce finalizezi cei <strong>7 pași</strong> din onboarding, îți recomandăm să <strong>simulezi o rezervare</strong> ca să experimentezi exact ce primește oaspetele (de la check‑in până la check‑out).
              </p>
              <p style="margin:0;">
                <a href="${tutorialUrl}" target="_blank" rel="noopener"
                   style="display:inline-block; padding:10px 14px; border-radius:10px; background:#16b981; color:#0c111b; font-weight:800; text-decoration:none; border:1px solid #16b981;">
                  Vezi tutorialul
                </a>
              </p>
            </div>
            <p style="margin:0 0 6px;">Suntem la un mesaj distanță, pe email sau WhatsApp.</p>
            <p style="margin:0;">Suntem aici să te ajutăm să pornești cât mai ușor.</p>
            <p style="margin:12px 0 0;">Cu drag,<br/>Echipa Plan4Host</p>
          </div>
        ` : `
          <div class="p4h-content" style="font-family:-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#0f172a;">
            <h2 style="margin:0 0 10px;">Hello,</h2>
            <p style="margin:0 0 10px;">Thank you for creating your Plan4Host account! 🙌</p>
            <p style="margin:0 0 10px;">You’ve successfully added your first property: <strong>${escapeHtml(propName)}</strong>.</p>
            <p style="margin:0 0 10px;">If you have any questions about setup or want us to help you get started quickly, you can reach us anytime at:</p>
            <div style="margin:10px 0; padding:10px; border:1px solid #e2e8f0; border-radius:8px;">
              <div><strong>WhatsApp:</strong> +40 721 759 329</div>
              <div><strong>Email:</strong> <a href="mailto:office@plan4host.com">office@plan4host.com</a></div>
            </div>
            <div style="margin:14px 0; padding:12px; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc;">
              <p style="margin:0 0 10px;">
                After completing the <strong>7 onboarding steps</strong>, we recommend <strong>simulating a booking</strong> to experience exactly what your guest receives (from check‑in to check‑out).
              </p>
              <p style="margin:0;">
                <a href="${tutorialUrl}" target="_blank" rel="noopener"
                   style="display:inline-block; padding:10px 14px; border-radius:10px; background:#16b981; color:#0c111b; font-weight:800; text-decoration:none; border:1px solid #16b981;">
                  See tutorial
                </a>
              </p>
            </div>
            <p style="margin:0 0 6px;">We’re one message away — by email or WhatsApp.</p>
            <p style="margin:0;">We’re here to help you get started smoothly.</p>
            <p style="margin:12px 0 0;">Warmly,<br/>The Plan4Host Team</p>
          </div>
        `;

        const html = wrapSimple(subject, bodyHtml);
        const transporter = createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: String(process.env.SMTP_SECURE || 'false') === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        const fromEmail = process.env.FROM_EMAIL || 'office@plan4host.com';
        const fromName  = process.env.FROM_NAME  || 'Plan4Host';
        // Best-effort: don't block the property creation response on SMTP latency.
        void transporter
          .sendMail({ from: `${fromName} <${fromEmail}>`, to: toEmail, subject, html })
          .catch(() => {});
      }
    }
  } catch {
    // best effort; ignore email errors
  }

  return NextResponse.json({ ok: true, property: data });
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function wrapSimple(subject: string, innerHtml: string): string {
  const border = '#e2e8f0';
  const text = '#0f172a';
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject || 'Welcome')}</title>
    <style>
      body { margin:0; padding:0; background:#ffffff; }
      a { color:#16b981; }
      .card { max-width:600px; margin:0 auto; background:#ffffff; border:1px solid ${border}; border-radius:14px; padding:20px; }
    </style>
  </head>
  <body>
    <div class="card">
      ${innerHtml}
    </div>
  </body>
  </html>`;
}
