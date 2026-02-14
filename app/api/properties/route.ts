import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTransport } from "nodemailer";

export const runtime = "nodejs";

// Email clients don't support CSS vars/OKLCH reliably; use a hex that matches the app's `--success`.
const EMAIL_SUCCESS = "#66ac69";

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

  // Onboarding tracking: record "first property created" even if the user never opens the checklist UI.
  // Best-effort: if migrations weren't applied yet, these writes will fail silently.
  try {
    if (hadCount === 0) {
      const nowIso = new Date().toISOString();
      const email = String(user.email || "").trim() || null;
      await supabase
        .from("account_onboarding_state")
        .upsert(
          {
            account_id: user.id,
            last_seen_at: nowIso,
            steps: { property: { done: true, at: nowIso } },
          } as any,
          { onConflict: "account_id" },
        );
      await supabase.from("account_onboarding_events").insert({
        account_id: user.id,
        account_email: email,
        event: "first_property_created",
        step_id: "property",
        meta: { property_id: (data as any)?.id ?? null },
      } as any);
    }
  } catch {
    // ignore telemetry errors
  }

  // If this is the user's first property, send a welcome email
  try {
    if (hadCount === 0) {
      const toEmail = String(user.email || "").trim();
	      if (toEmail) {
	        const propName = String((data as any)?.name || "").trim();
	        const isRo = String(country_code || "").toUpperCase() === "RO";
	        const appBase =
	          (process.env.NEXT_PUBLIC_APP_URL as string | undefined) ||
	          (process.env.NEXT_PUBLIC_SITE_URL as string | undefined) ||
	          "https://plan4host.com";
	        const base = appBase.replace(/\/+$/, "");
	        const propertyId = String((data as any)?.id || "").trim();
	        const guestCheckinUrl = `${base}/checkin?property=${encodeURIComponent(propertyId)}`;
        const subject = isRo
          ? `Proprietatea "${propName}" este gata de următorul pas ✅`
          : `Property "${propName}" is ready for the next step ✅`;
        const bodyHtml = isRo
          ? `
          <div style="font-family:-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#0f172a;">
            <p style="margin:0 0 14px;">Salut,</p>
            <p style="margin:0 0 14px;">
              Ai adăugat proprietatea <strong>${escapeHtml(propName)}</strong> în Plan4Host — primul pas dintr-un sistem mai organizat.
            </p>
            <p style="margin:0 0 14px; color:#334155;">
              Linkul tău de check-in este deja generat — primul pas către un flux în care informațiile nu se mai pierd în mesaje pe <strong>WhatsApp</strong>.
            </p>
            <p style="margin:0 0 14px;">
              Pe măsură ce continui configurarea (camere, regulament intern, mesaje), fiecare rezervare va urma un flux clar — fără improvizații sau mesaje repetitive.
            </p>
            <p style="margin:0 0 16px;">
              Vrei să vezi cum prinde contur pagina prin care îți întâmpini oaspeții?
            </p>
            <p style="margin:0 0 16px;">
              <a href="${guestCheckinUrl}" target="_blank" rel="noopener"
                 style="display:inline-block; padding:10px 14px; border-radius:999px; background:${EMAIL_SUCCESS}; color:#ffffff; font-weight:800; text-decoration:none; border:1px solid ${EMAIL_SUCCESS};">
                Vezi pagina prin care îți întâmpini oaspeții
              </a>
            </p>
            <p style="margin:0 0 10px;">Dacă ai întrebări sau vrei ajutor:</p>
            <ul style="margin:0 0 18px; padding-left:18px; color:#0f172a;">
              <li style="margin:0 0 6px;">WhatsApp: <a href="https://wa.me/40721759329" target="_blank" rel="noopener">+40 721 759 329</a></li>
              <li style="margin:0;">Email: <a href="mailto:office@plan4host.com">office@plan4host.com</a></li>
            </ul>
            <p style="margin:0; color:#334155;">—<br/>Echipa Plan4Host</p>
          </div>
        `
          : `
          <div style="font-family:-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#0f172a;">
            <p style="margin:0 0 14px;">Hi,</p>
            <p style="margin:0 0 14px;">
              You’ve just added <strong>${escapeHtml(propName)}</strong> to Plan4Host — the first step toward a more organized flow.
            </p>
            <p style="margin:0 0 14px; color:#334155;">
              Your check-in link is already live — the first step toward a flow where guest details stop getting lost in WhatsApp.
            </p>
            <p style="margin:0 0 14px;">
              As you keep configuring rooms, your regulations, and your messages, each reservation will follow a clear path — no improvisations, no repeated chats.
            </p>
            <p style="margin:0 0 16px;">
              Want to see how the guest-facing page is shaping up?
            </p>
            <p style="margin:0 0 16px;">
              <a href="${guestCheckinUrl}" target="_blank" rel="noopener"
                 style="display:inline-block; padding:10px 14px; border-radius:999px; background:${EMAIL_SUCCESS}; color:#ffffff; font-weight:800; text-decoration:none; border:1px solid ${EMAIL_SUCCESS};">
                View the page where you welcome guests
              </a>
            </p>
            <p style="margin:0 0 10px;">If you have questions or need help:</p>
            <ul style="margin:0 0 18px; padding-left:18px; color:#0f172a;">
              <li style="margin:0 0 6px;">WhatsApp: <a href="https://wa.me/40721759329" target="_blank" rel="noopener">+40 721 759 329</a></li>
              <li style="margin:0;">Email: <a href="mailto:office@plan4host.com">office@plan4host.com</a></li>
            </ul>
            <p style="margin:0; color:#334155;">—<br/>The Plan4Host team</p>
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
      a { color:${EMAIL_SUCCESS}; }
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
