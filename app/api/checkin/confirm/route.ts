// app/api/checkin/confirm/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createTransport } from "nodemailer";
import { getCheckinTokenFromRequest, verifyCheckinPublicToken } from "@/lib/checkin/public-token";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function bad(status: number, body: any) { return NextResponse.json(body, { status }); }

type GuestEmailLang = "en" | "ro" | "es" | "it" | "el" | "fr" | "pt" | "de";

function normalizeGuestEmailLang(raw: unknown): GuestEmailLang {
  const value = String(raw || "").toLowerCase();
  return (["en", "ro", "es", "it", "el", "fr", "pt", "de"] as GuestEmailLang[]).includes(value as GuestEmailLang)
    ? (value as GuestEmailLang)
    : "en";
}

const GUEST_CONFIRM_EMAIL_COPY: Record<GuestEmailLang, {
  title: string;
  thanks: string;
  guestLabel: string;
  stayLabel: string;
  reservationLine: string;
  inboxHtml: string;
  inboxText: string;
  changes: string;
  qrTitle: string;
  validFor: (until: string) => string;
}> = {
  en: {
    title: "Check-in received",
    thanks: "Thank you for submitting your check-in details. We’ve forwarded your information to the property.",
    guestLabel: "Guest:",
    stayLabel: "Stay:",
    reservationLine: "Once your reservation is confirmed, you’ll receive an email with your accommodation details, arrival information, and a private link where you’ll receive messages from the property.",
    inboxHtml: "Please check your inbox — <strong>and spam or junk folder</strong> — so you don’t miss important updates.",
    inboxText: "Please check your inbox — and spam or junk folder — so you don’t miss important updates.",
    changes: "If you need to make changes, please contact the property directly.",
    qrTitle: "Your QR code",
    validFor: (until) => `Valid for 30 days (until ${until}).`,
  },
  ro: {
    title: "Formular de check-in primit",
    thanks: "Iti multumim ca ai completat formularul de check-in. Am trimis informatiile tale catre proprietate.",
    guestLabel: "Oaspete:",
    stayLabel: "Sejur:",
    reservationLine: "Dupa confirmarea rezervarii, vei primi un email cu detaliile cazarii, informatii de sosire si un link privat unde vei primi mesajele de la proprietate.",
    inboxHtml: "Te rugam sa verifici inbox-ul — <strong>si folderul spam sau junk</strong> — ca sa nu ratezi actualizarile importante.",
    inboxText: "Te rugam sa verifici inbox-ul — si folderul spam sau junk — ca sa nu ratezi actualizarile importante.",
    changes: "Daca ai nevoie de modificari, te rugam sa contactezi direct proprietatea.",
    qrTitle: "Codul tau QR",
    validFor: (until) => `Valabil 30 de zile (pana la ${until}).`,
  },
  es: {
    title: "Check-in recibido",
    thanks: "Gracias por completar tu formulario de check-in. Hemos enviado tu informacion a la propiedad.",
    guestLabel: "Huesped:",
    stayLabel: "Estancia:",
    reservationLine: "Una vez confirmada tu reserva, recibiras un email con los detalles del alojamiento, la informacion de llegada y un enlace privado donde recibiras mensajes de la propiedad.",
    inboxHtml: "Revisa tu bandeja de entrada — <strong>y tambien spam o correo no deseado</strong> — para no perder actualizaciones importantes.",
    inboxText: "Revisa tu bandeja de entrada — y tambien spam o correo no deseado — para no perder actualizaciones importantes.",
    changes: "Si necesitas hacer cambios, contacta directamente con la propiedad.",
    qrTitle: "Tu codigo QR",
    validFor: (until) => `Valido durante 30 dias (hasta ${until}).`,
  },
  it: {
    title: "Check-in ricevuto",
    thanks: "Grazie per aver completato il modulo di check-in. Abbiamo inoltrato le tue informazioni alla struttura.",
    guestLabel: "Ospite:",
    stayLabel: "Soggiorno:",
    reservationLine: "Una volta confermata la prenotazione, riceverai un'email con i dettagli dell'alloggio, le informazioni di arrivo e un link privato dove riceverai i messaggi della struttura.",
    inboxHtml: "Controlla la tua casella email — <strong>anche la cartella spam o posta indesiderata</strong> — per non perdere aggiornamenti importanti.",
    inboxText: "Controlla la tua casella email — anche la cartella spam o posta indesiderata — per non perdere aggiornamenti importanti.",
    changes: "Se hai bisogno di apportare modifiche, contatta direttamente la struttura.",
    qrTitle: "Il tuo codice QR",
    validFor: (until) => `Valido per 30 giorni (fino al ${until}).`,
  },
  el: {
    title: "Η φόρμα check-in παραλήφθηκε",
    thanks: "Σε ευχαριστούμε που συμπλήρωσες τη φόρμα check-in. Προωθήσαμε τα στοιχεία σου στο κατάλυμα.",
    guestLabel: "Επισκέπτης:",
    stayLabel: "Διαμονή:",
    reservationLine: "Μόλις επιβεβαιωθεί η κράτησή σου, θα λάβεις email με τα στοιχεία του καταλύματος, πληροφορίες άφιξης και έναν ιδιωτικό σύνδεσμο όπου θα λαμβάνεις μηνύματα από το κατάλυμα.",
    inboxHtml: "Έλεγξε τα εισερχόμενά σου — <strong>καθώς και τον φάκελο spam ή ανεπιθύμητων</strong> — για να μην χάσεις σημαντικές ενημερώσεις.",
    inboxText: "Έλεγξε τα εισερχόμενά σου — καθώς και τον φάκελο spam ή ανεπιθύμητων — για να μην χάσεις σημαντικές ενημερώσεις.",
    changes: "Αν χρειάζεσαι αλλαγές, επικοινώνησε απευθείας με το κατάλυμα.",
    qrTitle: "Ο κωδικός QR σου",
    validFor: (until) => `Ισχύει για 30 ημέρες (έως ${until}).`,
  },
  fr: {
    title: "Check-in recu",
    thanks: "Merci d'avoir complete votre formulaire de check-in. Nous avons transmis vos informations a l'hebergement.",
    guestLabel: "Voyageur :",
    stayLabel: "Sejour :",
    reservationLine: "Une fois votre reservation confirmee, vous recevrez un email avec les details de l'hebergement, les informations d'arrivee et un lien prive ou vous recevrez les messages de la propriete.",
    inboxHtml: "Veuillez verifier votre boite mail — <strong>ainsi que le dossier spam ou courrier indesirable</strong> — afin de ne manquer aucune information importante.",
    inboxText: "Veuillez verifier votre boite mail — ainsi que le dossier spam ou courrier indesirable — afin de ne manquer aucune information importante.",
    changes: "Si vous devez faire des modifications, veuillez contacter directement l'hebergement.",
    qrTitle: "Votre code QR",
    validFor: (until) => `Valable 30 jours (jusqu'au ${until}).`,
  },
  pt: {
    title: "Check-in recebido",
    thanks: "Obrigado por preencheres o teu formulario de check-in. Enviamos as tuas informacoes para a propriedade.",
    guestLabel: "Hospede:",
    stayLabel: "Estadia:",
    reservationLine: "Assim que a tua reserva for confirmada, receberas um email com os detalhes do alojamento, informacoes de chegada e um link privado onde receberas mensagens da propriedade.",
    inboxHtml: "Verifica a tua caixa de entrada — <strong>e tambem a pasta de spam ou lixo eletronico</strong> — para nao perderes atualizacoes importantes.",
    inboxText: "Verifica a tua caixa de entrada — e tambem a pasta de spam ou lixo eletronico — para nao perderes atualizacoes importantes.",
    changes: "Se precisares de fazer alteracoes, contacta diretamente a propriedade.",
    qrTitle: "O teu codigo QR",
    validFor: (until) => `Valido durante 30 dias (ate ${until}).`,
  },
  de: {
    title: "Check-in erhalten",
    thanks: "Vielen Dank fur das Ausfullen deines Check-in-Formulars. Wir haben deine Angaben an die Unterkunft weitergeleitet.",
    guestLabel: "Gast:",
    stayLabel: "Aufenthalt:",
    reservationLine: "Sobald deine Reservierung bestatigt ist, erhaltst du eine E-Mail mit den Unterkunftsdaten, Anreiseinformationen und einem privaten Link, uber den du Nachrichten von der Unterkunft bekommst.",
    inboxHtml: "Bitte prufe deinen Posteingang — <strong>einschliesslich Spam- oder Junk-Ordner</strong> — damit du keine wichtigen Updates verpasst.",
    inboxText: "Bitte prufe deinen Posteingang — einschliesslich Spam- oder Junk-Ordner — damit du keine wichtigen Updates verpasst.",
    changes: "Wenn du Anderungen vornehmen musst, kontaktiere bitte direkt die Unterkunft.",
    qrTitle: "Dein QR-Code",
    validFor: (until) => `30 Tage gultig (bis ${until}).`,
  },
};

export async function POST(req: Request) {
  try {
    const tokenRes = verifyCheckinPublicToken(getCheckinTokenFromRequest(req));
    if (!tokenRes.ok) return bad(401, { error: tokenRes.error });

    const body = await req.json().catch(() => ({}));
    const booking_id: string | undefined = body?.booking_id;
    const property_id: string | undefined = body?.property_id;
    const emailFromClient: string | undefined = body?.email;
    const guestLang = normalizeGuestEmailLang(body?.lang);

    if (!booking_id || !property_id) return bad(400, { error: "booking_id and property_id required" });
    if (String(tokenRes.payload.property_id) !== String(property_id)) {
      return bad(403, { error: "Invalid property access" });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, service, { auth: { persistSession: false } });

    // 1) Resolve destination email (prefer client-provided, else booking_contacts.email, else form_bookings.guest_email, else bookings.guest_email)
    let toEmail: string | null = (emailFromClient || "").trim() || null;
    if (!toEmail) {
      try {
        const r = await admin.from('booking_contacts').select('email').eq('booking_id', booking_id).maybeSingle();
        if (!r.error && r.data) toEmail = ((r.data as any).email || '').trim() || null;
      } catch {}
    }
    if (!toEmail) {
      // try form_bookings
      try {
        const r = await admin.from('form_bookings').select('guest_email').eq('id', booking_id).maybeSingle();
        if (!r.error && r.data) toEmail = ((r.data as any).guest_email || '').trim() || null;
      } catch {}
    }
    if (!toEmail) {
      try {
        const r = await admin.from('bookings').select('guest_email').eq('id', booking_id).maybeSingle();
        if (!r.error && r.data) toEmail = ((r.data as any).guest_email || '').trim() || null;
      } catch {}
    }
    if (!toEmail) return bad(400, { error: 'missing_email' });
    const mailCopy = GUEST_CONFIRM_EMAIL_COPY[guestLang];

    // Resolve property name for nicer subject/body
    let propName: string | null = null;
    try {
      const rP = await admin.from('properties').select('name').eq('id', property_id).maybeSingle();
      if (!rP.error && rP.data) propName = ((rP.data as any).name || null) as string | null;
    } catch {}

    const subject = `Check-in received${propName ? ' — ' + propName : ''}`;

    // 2) Idempotency: if a confirmation mail already SENT for this booking, don't resend
    try {
      const r = await admin
        .from('email_outbox')
        .select('id,status,created_at,subject')
        .eq('booking_id', booking_id)
        .ilike('subject', 'Check-in received%')
        .eq('status', 'sent')
        .order('created_at', { ascending: false })
        .limit(1);
      if (!r.error && (r.data?.length || 0) > 0) {
        return NextResponse.json({ sent: true, duplicate: true });
      }
    } catch { /* ignore */ }
    // Enrich email with details (prefer form_bookings; fallback to bookings)
    let roomTypeName: string | null = null;
    let roomName: string | null = null;
    let startYMD: string | null = null;
    let endYMD: string | null = null;
    let guestFirst: string | null = null;
    let guestLast: string | null = null;
    let validUntil: string | null = null;
    let guestCompanions: any[] | null = null;
  try {
    // Try form_bookings first
    const rF = await admin
      .from('form_bookings')
      .select('room_id, room_type_id, start_date, end_date, guest_first_name, guest_last_name, submitted_at, created_at, guest_companions')
      .eq('id', booking_id)
      .maybeSingle();
      if (!rF.error && rF.data) {
        const b: any = rF.data;
        startYMD = b.start_date || null;
        endYMD = b.end_date || null;
        guestFirst = (b.guest_first_name || null);
        guestLast = (b.guest_last_name || null);
        if (startYMD && /^\d{4}-\d{2}-\d{2}$/.test(startYMD)) {
          try {
            const base = new Date(`${startYMD}T00:00:00Z`);
            const until = new Date(base.getTime());
            until.setUTCDate(until.getUTCDate() + 30);
            validUntil = `${String(until.getUTCDate()).padStart(2,'0')}.${String(until.getUTCMonth()+1).padStart(2,'0')}.${until.getUTCFullYear()}`;
          } catch {}
        }
        const rtId = b.room_type_id || null;
        const rId = b.room_id || null;
        if (Array.isArray((b as any).guest_companions)) {
          guestCompanions = (b as any).guest_companions as any[];
        }
        if (rtId) {
          try {
            const rT = await admin.from('room_types').select('name').eq('id', rtId).maybeSingle();
            if (!rT.error && rT.data) roomTypeName = ((rT.data as any).name || null) as string | null;
          } catch {}
        }
        if (rId) {
          try {
            const rR = await admin.from('rooms').select('name,room_type_id').eq('id', rId).maybeSingle();
            if (!rR.error && rR.data) {
              roomName = ((rR.data as any).name || null) as string | null;
              if (!roomTypeName && (rR.data as any).room_type_id) {
                const rT2 = await admin.from('room_types').select('name').eq('id', (rR.data as any).room_type_id).maybeSingle();
                if (!rT2.error && rT2.data) roomTypeName = ((rT2.data as any).name || null) as string | null;
              }
            }
          } catch {}
        }
      } else {
        // fallback: bookings
        const rB = await admin
          .from('bookings')
          .select('room_id, room_type_id, start_date, end_date, guest_first_name, guest_last_name, form_submitted_at, created_at, guest_companions')
          .eq('id', booking_id)
          .maybeSingle();
        if (!rB.error && rB.data) {
        const b: any = rB.data;
          startYMD = b.start_date || null;
          endYMD = b.end_date || null;
          guestFirst = (b.guest_first_name || null);
          guestLast = (b.guest_last_name || null);
          if (startYMD && /^\d{4}-\d{2}-\d{2}$/.test(startYMD)) {
            try {
              const base = new Date(`${startYMD}T00:00:00Z`);
              const until = new Date(base.getTime());
              until.setUTCDate(until.getUTCDate() + 30);
              validUntil = `${String(until.getUTCDate()).padStart(2,'0')}.${String(until.getUTCMonth()+1).padStart(2,'0')}.${until.getUTCFullYear()}`;
            } catch {}
          }
          if (Array.isArray((b as any).guest_companions) && !guestCompanions) {
            guestCompanions = (b as any).guest_companions as any[];
          }
          const rtId = b.room_type_id || null;
          const rId = b.room_id || null;
          if (rtId) {
            try {
              const rT = await admin.from('room_types').select('name').eq('id', rtId).maybeSingle();
              if (!rT.error && rT.data) roomTypeName = ((rT.data as any).name || null) as string | null;
            } catch {}
          }
          if (rId) {
            try {
              const rR = await admin.from('rooms').select('name,room_type_id').eq('id', rId).maybeSingle();
              if (!rR.error && rR.data) {
                roomName = ((rR.data as any).name || null) as string | null;
                if (!roomTypeName && (rR.data as any).room_type_id) {
                  const rT2 = await admin.from('room_types').select('name').eq('id', (rR.data as any).room_type_id).maybeSingle();
                  if (!rT2.error && rT2.data) roomTypeName = ((rT2.data as any).name || null) as string | null;
                }
              }
            } catch {}
          }
        }
      }
    } catch {}

    const displayRoom = null; // Do not include room info in the acknowledgement email
    function fmt(ymd: string | null): string | null {
      if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
      const [y, m, d] = ymd.split('-');
      return `${d}.${m}.${y}`;
    }
    const arrival = fmt(startYMD);
    const depart = fmt(endYMD);
    const guestFull = [guestFirst, guestLast].filter(Boolean).join(' ').trim() || null;
    const companionsCount = Array.isArray(guestCompanions) ? guestCompanions.length : 0;
    const totalGuestsText = companionsCount > 0 && guestFull
      ? `${guestFull} + ${companionsCount} guest${companionsCount > 1 ? 's' : ''}`
      : guestFull;
    // validUntil already computed above when we loaded booking (based on start_date)

    const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://plan4host.com').toString().replace(/\/+$/, '');
    const iconRoom = `${base}/room_forlight.png`;
    const iconNight = `${base}/night_forlight.png`;
    const iconGuest = `${base}/logoguest_forlight.png`;

    const qrLink = `${base}/r/ci/${booking_id}`;
    const qrImg  = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&ecc=H&data=${encodeURIComponent(qrLink)}`;

    const html = `<!doctype html>
      <html lang="en">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin:0;padding:0;background:#f8fafc;color:#0c111b;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;">
          <tr>
            <td align="center" style="padding:16px;">
              <div style="max-width:680px;margin:0 auto;">
                <div style="background:#ffffff; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#0c111b; line-height:1.5; padding:16px; border:1px solid #e2e8f0; border-radius:14px;">
                  <h2 style="margin:0 0 12px;">${escapeHtml(mailCopy.title)}${propName ? ` ${guestLang === "en" ? "for" : ""} <span style=\"color:#3ECF8E\">${escapeHtml(propName)}</span>` : ''}</h2>
                  <p style="margin:8px 0;">${escapeHtml(mailCopy.thanks)}${propName ? ` <strong>${escapeHtml(propName)}</strong>.` : ''}</p>
                  <div style="margin:14px 0; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; display:grid; gap:10px;">
                    ${totalGuestsText ? `<div style=\"display:flex; align-items:center; gap:8px;\"><img src=\"${iconGuest}\" alt=\"guest\" width=\"16\" height=\"16\"/><strong style=\"margin-right:6px;\">${escapeHtml(mailCopy.guestLabel)}</strong> <span>${escapeHtml(totalGuestsText)}</span></div>` : ''}
                    ${(arrival && depart) ? `<div style=\"display:flex; align-items:center; gap:8px;\"><img src=\"${iconNight}\" alt=\"stay\" width=\"16\" height=\"16\"/><strong style=\"margin-right:6px;\">${escapeHtml(mailCopy.stayLabel)}</strong> <span>${arrival} → ${depart}</span></div>` : ''}
                  </div>
                  <p style="margin:8px 0; color:#475569;">
                    ${escapeHtml(mailCopy.reservationLine)}
                  </p>
                  <p style="margin:8px 0; color:#475569;">
                    ${mailCopy.inboxHtml}
                  </p>
                  <p style="margin:8px 0; color:#475569;">${escapeHtml(mailCopy.changes)}</p>
                  <div style=\"margin:14px 0 0; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; text-align:center;\">
                    <div style=\"font-weight:800; margin-bottom:8px;\">${escapeHtml(mailCopy.qrTitle)}</div>
                    <div style=\"display:block; margin:0 auto; width:240px;\">
                      <div style=\"position:relative; width:240px; height:240px; border-radius:16px; overflow:hidden; margin:0 auto;\">
                        <img src=\"${qrImg}\" alt=\"QR code\" width=\"240\" height=\"240\" style=\"display:block;\"/>
                        <img src=\"${base}/p4h_logo_round_QR.png\" alt=\"Logo\" width=\"72\" height=\"72\" style=\"position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); border-radius:9999px; background:#ffffff; border:4px solid #ffffff;\"/>
                      </div>
                    </div>
                    <div style=\"font-size:12px; color:#475569; margin-top:8px; word-break:break-all;\">${escapeHtml(qrLink)}</div>
                    ${validUntil ? `<div style=\"font-size:12px; color:#475569; margin-top:6px;\">${escapeHtml(mailCopy.validFor(validUntil))}</div>` : ''}
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>`;
    const lines: string[] = [];
    lines.push(`${mailCopy.title}${propName ? ` — ${propName}` : ''}`);
    if (arrival && depart) lines.push(`${mailCopy.stayLabel} ${arrival} -> ${depart}`);
    if (totalGuestsText) lines.push(`${mailCopy.guestLabel} ${totalGuestsText}`);
    lines.push('');
    lines.push(`${mailCopy.thanks}${propName ? ` ${propName}.` : ''}`);
    lines.push(`QR: ${qrLink}`);
    lines.push(mailCopy.reservationLine);
    lines.push(mailCopy.inboxText);
    lines.push(mailCopy.changes);
    const text = lines.join('\n');

    // 3) Insert outbox pending
    const outboxIns = await admin
      .from('email_outbox')
      .insert({ booking_id, property_id, to_email: toEmail, subject, html, status: 'pending' })
      .select('id')
      .single();
    const outboxId = (outboxIns.data as any)?.id as string | undefined;

    // 4) Send via SMTP
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
      subject,
      html,
      text,
    });

    await admin
      .from('email_outbox')
      .update({ status: 'sent', sent_at: new Date().toISOString(), provider_message_id: info?.messageId || null })
      .eq('id', outboxId || '');

    return NextResponse.json({ sent: true, outbox_id: outboxId || null });
  } catch (e: any) {
    // On error, best-effort to log
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const admin = createClient(url, service, { auth: { persistSession: false } });
      const b = await req.json().catch(() => ({}));
      if (b?.booking_id) {
        await admin
          .from('email_outbox')
          .insert({ booking_id: b.booking_id, property_id: b.property_id || null, to_email: b?.email || null, subject: 'Check-in Confirmation', html: null, status: 'error', error_message: e?.message || String(e) });
      }
    } catch {}
    return bad(500, { error: 'send_failed', message: e?.message || String(e) });
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
