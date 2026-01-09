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
        const appBase =
          (process.env.NEXT_PUBLIC_APP_URL as string | undefined) ||
          (process.env.NEXT_PUBLIC_SITE_URL as string | undefined) ||
          "https://plan4host.com";
        const continueSetupUrl = `${appBase.replace(/\/+$/, "")}/app/propertySetup`;
        const subject = isRo ? "Bun venit în Plan4Host 🎉" : "Welcome to Plan4Host 🎉";
        const bodyHtml = isRo ? `
          <div class="p4h-content" style="font-family:-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#0f172a;">
            <h2 style="margin:0 0 10px;">Bună,</h2>
            <p style="margin:0 0 10px;">Îți mulțumim că ți-ai creat cont în Plan4Host! 🙌</p>
            <p style="margin:0 0 12px;">
              Ai adăugat cu succes prima proprietate: <strong>${escapeHtml(propName)}</strong>.
            </p>

            <div style="margin:14px 0 10px; padding:14px; border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc;">
              <div style="font-weight:800; letter-spacing:0.10em; text-transform:uppercase; font-size:12px; color:#334155; margin:0 0 10px;">
                Următorii pași (recomandat)
              </div>
              <ol style="margin:0; padding-left:18px; color:#0f172a;">
                <li style="margin:0 0 6px;">Adaugă camere + tipuri de camere</li>
                <li style="margin:0 0 6px;">Completează detaliile rezervării (câmpuri + reguli)</li>
                <li style="margin:0 0 6px;">Configurează check‑in / check‑out</li>
                <li style="margin:0 0 6px;">Setează mesajele automate (confirmare, reminder, etc.)</li>
                <li style="margin:0;">Activează sincronizarea calendarelor (iCal) ca să eviți overbooking</li>
              </ol>
              <p style="margin:12px 0 0; color:#0f172a;">
                După ce finalizezi configurarea, poți trimite <strong>linkul de check-in</strong> către oaspeți sau îl poți seta ca <strong>răspuns automat</strong> pe platformele de booking, ca să beneficieze de experiența Plan4Host (check-in online + mesaje programate + check-out).
              </p>
              <div style="margin:12px 0 0;">
                <a href="${continueSetupUrl}" target="_blank" rel="noopener"
                   style="display:inline-block; padding:10px 14px; border-radius:10px; background:#16b981; color:#0c111b; font-weight:800; text-decoration:none; border:1px solid #16b981;">
                  Continuă configurarea
                </a>
              </div>
            </div>

            <div style="margin:0 0 12px; padding:12px; border:1px dashed #e2e8f0; border-radius:12px; background:#ffffff;">
              <div style="font-weight:800; letter-spacing:0.10em; text-transform:uppercase; font-size:12px; color:#334155; margin:0 0 8px;">
                Opțional: Simulare oaspete
              </div>
              <p style="margin:0; color:#0f172a;">
                Vrei să vezi exact ce primește oaspetele? Urmărește un tutorial scurt (check-in → check-out).
              </p>
              <p style="margin:10px 0 0;">
                <a href="${tutorialUrl}" target="_blank" rel="noopener"
                   style="display:inline-block; padding:10px 14px; border-radius:10px; background:#ffffff; color:#16b981; font-weight:800; text-decoration:none; border:1px solid #16b981;">
                  Vezi tutorialul
                </a>
              </p>
            </div>

            <p style="margin:0 0 10px;">Dacă ai întrebări sau vrei ajutor la configurare, ne găsești aici:</p>
            <div style="margin:10px 0 0; padding:10px; border:1px solid #e2e8f0; border-radius:10px; background:#ffffff;">
              <div><strong>WhatsApp:</strong> +40 721 759 329</div>
              <div><strong>Email:</strong> <a href="mailto:office@plan4host.com">office@plan4host.com</a></div>
            </div>
            <p style="margin:12px 0 0;">Cu drag,<br/>Echipa Plan4Host</p>
          </div>
        ` : `
          <div class="p4h-content" style="font-family:-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#0f172a;">
            <h2 style="margin:0 0 10px;">Hello,</h2>
            <p style="margin:0 0 10px;">Thank you for creating your Plan4Host account! 🙌</p>
            <p style="margin:0 0 12px;">
              You’ve successfully added your first property: <strong>${escapeHtml(propName)}</strong>.
            </p>

            <div style="margin:14px 0 10px; padding:14px; border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc;">
              <div style="font-weight:800; letter-spacing:0.10em; text-transform:uppercase; font-size:12px; color:#334155; margin:0 0 10px;">
                Next steps (recommended)
              </div>
              <ol style="margin:0; padding-left:18px; color:#0f172a;">
                <li style="margin:0 0 6px;">Add rooms + room types</li>
                <li style="margin:0 0 6px;">Review booking details (fields + rules)</li>
                <li style="margin:0 0 6px;">Set check‑in / check‑out times</li>
                <li style="margin:0 0 6px;">Set up automatic messages (confirmation, reminders, etc.)</li>
                <li style="margin:0;">Enable calendar sync (iCal) to avoid overbooking</li>
              </ol>
              <p style="margin:12px 0 0; color:#0f172a;">
                After setup is complete, you can share your <strong>check-in link</strong> with guests or set it as an <strong>automatic reply</strong> on booking platforms, so they get the experience Plan4Host provides (online check-in + scheduled messages + check-out).
              </p>
              <div style="margin:12px 0 0;">
                <a href="${continueSetupUrl}" target="_blank" rel="noopener"
                   style="display:inline-block; padding:10px 14px; border-radius:10px; background:#16b981; color:#0c111b; font-weight:800; text-decoration:none; border:1px solid #16b981;">
                  Continue setup
                </a>
              </div>
            </div>

            <div style="margin:0 0 12px; padding:12px; border:1px dashed #e2e8f0; border-radius:12px; background:#ffffff;">
              <div style="font-weight:800; letter-spacing:0.10em; text-transform:uppercase; font-size:12px; color:#334155; margin:0 0 8px;">
                Optional: Guest flow simulation
              </div>
              <p style="margin:0; color:#0f172a;">
                Want to see what the guest receives? Watch a short tutorial (check-in → check-out).
              </p>
              <p style="margin:10px 0 0;">
                <a href="${tutorialUrl}" target="_blank" rel="noopener"
                   style="display:inline-block; padding:10px 14px; border-radius:10px; background:#ffffff; color:#16b981; font-weight:800; text-decoration:none; border:1px solid #16b981;">
                  See tutorial
                </a>
              </p>
            </div>

            <p style="margin:0 0 10px;">Questions or want help with setup? Reach us here:</p>
            <div style="margin:10px 0 0; padding:10px; border:1px solid #e2e8f0; border-radius:10px; background:#ffffff;">
              <div><strong>WhatsApp:</strong> +40 721 759 329</div>
              <div><strong>Email:</strong> <a href="mailto:office@plan4host.com">office@plan4host.com</a></div>
            </div>
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
