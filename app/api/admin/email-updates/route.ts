// app/api/admin/email-updates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient as createRls } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createTransport } from "nodemailer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = "bogdangabriel94@gmail.com";

function bad(status: number, body: any) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  try {
    // Auth + admin email gate via RLS client
    const supa = createRls();
    const { data: auth } = await supa.auth.getUser();
    const user = auth.user;
    if (!user) return bad(401, { error: "Not authenticated" });
    const email = (user.email || "").toLowerCase();
    if (email !== ADMIN_EMAIL.toLowerCase()) {
      return bad(403, { error: "Not allowed" });
    }

    const body = await req.json().catch(() => ({}));
    const subject: string = (body?.subject || "").toString().trim();
    const htmlRaw: string = (body?.html || "").toString();
    const toOverrideRaw: string = (body?.to || "").toString().trim();

    if (!subject) return bad(400, { error: "Missing subject" });
    if (!htmlRaw.trim()) return bad(400, { error: "Missing HTML body" });

    if (!URL || !SERVICE) return bad(500, { error: "Missing service credentials" });
    const admin = createAdmin(URL, SERVICE, { auth: { persistSession: false } });

    let uniqueEmails: string[] = [];

    if (toOverrideRaw) {
      // Testing mode: send only to explicitly provided address
      uniqueEmails = [toOverrideRaw];
    } else {
      // Collect all unique, non-empty emails from auth.users
      const perPage = 1000;
      let page = 1;
      const emails = new Set<string>();

      for (;;) {
        const { data, error } = await (admin as any).auth.admin.listUsers({ page, perPage });
        if (error) return bad(500, { error: error.message || "Failed to list users" });
        const users = (data?.users ?? []) as Array<{ email?: string | null }>;
        for (const u of users) {
          const e = (u.email || "").toString().trim();
          if (!e) continue;
          emails.add(e.toLowerCase());
        }
        if (!users.length || users.length < perPage) break;
        page++;
      }

      uniqueEmails = Array.from(emails);
      if (!uniqueEmails.length) {
        return NextResponse.json({ ok: true, sent: 0, total: 0 });
      }
    }

    const transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const fromEmail = process.env.FROM_EMAIL || "office@plan4host.com";
    const fromName = process.env.FROM_NAME || "Plan4Host";

    let sent = 0;
    for (const to of uniqueEmails) {
      try {
        await transporter.sendMail({
          from: `${fromName} <${fromEmail}>`,
          to,
          subject,
          html: htmlRaw,
        });
        sent++;
      } catch {
        // best-effort: skip failing address, continue with others
      }
    }

    return NextResponse.json({ ok: true, sent, total: uniqueEmails.length });
  } catch (e: any) {
    return bad(500, { error: e?.message || "Unexpected error" });
  }
}
