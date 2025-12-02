import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

type CheckoutRequest = {
  language?: string;
  details?: {
    property_name?: string;
    guest_first_name?: string;
    guest_last_name?: string;
    start_date?: string;
    end_date?: string;
    check_out_time?: string;
  };
  property?: {
    name?: string | null;
    regulation_pdf_url?: string | null;
    ai_house_rules_text?: string | null;
    check_out_time?: string | null;
  };
  messages?: Array<{
    title?: string;
    html_ro?: string;
    html_en?: string;
  }>;
};

function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as CheckoutRequest | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const language = (body.language || "English").toString();
    const details = body.details || {};
    const property = body.property || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const messagesPlain = messages
      .map((m, idx) => {
        const title = (m.title || `Message ${idx + 1}`).toString();
        const ro = stripHtml(m.html_ro);
        const en = stripHtml(m.html_en);
        return `TITLE: ${title}\nRO: ${ro}\nEN: ${en}`;
      })
      .join("\n\n---\n\n");

    const prompt = `
You are a guest assistant for a property.

You will receive:
- Target answer language
- Reservation details (including end date and optional check-out time)
- Property info (including optional AI-configured house rules text and optional check-out time)
- Reservation messages text in Romanian and/or English (which may mention check-out instructions).

You must provide a short check-out summary for the guest.

What to include:
- State clearly the check-out DATE using the reservation end_date if present.
- State clearly the check-out TIME using check_out_time if present (from details or property). Do NOT invent or change this time.
- If no check-out time is available, say that the check-out time is not configured and that the guest should contact the host to confirm it.
- Look in the reservation messages first, and then in the AI-configured house rules text, for any instructions that apply at check-out (for example: turn off lights, close windows, lock the door, return keys, take trash, wash dishes, leave access cards, etc.). If such instructions exist, summarize them briefly.

Rules:
- Use ONLY the information found in the reservation details, messages, and house rules text below.
- NEVER invent or guess codes, phone numbers, addresses, Wi‑Fi credentials, or new rules that are not explicitly present in the text.
- If you have at least a clear date or time, you may treat the information as found and give a short answer.
- If almost nothing is clear (no date and no time and no clear instructions), set status to "missing" and in the answer text politely say that it's not clear from the information available and that the guest should contact the host.
- If you are not 100% sure, treat it as missing – do NOT infer or approximate.
- Keep the answer short (1–3 sentences).

Return ONLY a minified JSON object with this shape:
{"status":"found"|"missing","answer":"..."}

Target language: ${language}

Reservation details (JSON):
${JSON.stringify(
  {
    property_name: details.property_name || property.name || null,
    guest_first_name: details.guest_first_name || null,
    guest_last_name: details.guest_last_name || null,
    start_date: details.start_date || null,
    end_date: details.end_date || null,
    check_out_time: details.check_out_time || property.check_out_time || null,
  },
  null,
  2,
)}

Property info (JSON):
${JSON.stringify(
  {
    name: property.name || null,
    regulation_pdf_url: property.regulation_pdf_url || null,
    ai_house_rules_text: property.ai_house_rules_text || null,
    check_out_time: property.check_out_time || null,
  },
  null,
  2,
)}

Reservation messages (plain text):
${messagesPlain || "(none)"}
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You return only valid JSON for UI consumption. Do not include explanations or extra text. Never make up or guess facts: do not fabricate codes, phone numbers, addresses, Wi‑Fi credentials, or rules that are not clearly written. If unsure, respond with status \"missing\".",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          parsed = null;
        }
      }
    }

    if (
      !parsed ||
      (parsed.status !== "found" && parsed.status !== "missing") ||
      typeof parsed.answer !== "string"
    ) {
      return NextResponse.json({
        status: "missing",
        answer:
          language.toLowerCase().startsWith("ro")
            ? "Nu este clar din informațiile disponibile. Te rugăm să contactezi gazda pentru detalii exacte."
            : "It is not clear from the available information. Please contact the host for precise details.",
      });
    }

    return NextResponse.json({
      status: parsed.status as "found" | "missing",
      answer: parsed.answer as string,
    });
  } catch (error: any) {
    console.error("guest-assistant/checkout error", error);
    return NextResponse.json(
      {
        status: "missing",
        answer:
          "It is not clear from the available information. Please contact the host for precise details.",
      },
      { status: 500 },
    );
  }
}

