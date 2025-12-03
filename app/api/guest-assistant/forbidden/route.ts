import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

type ForbiddenRequest = {
  language?: string;
  details?: {
    property_name?: string;
    guest_first_name?: string;
    guest_last_name?: string;
    start_date?: string;
    end_date?: string;
  };
  property?: {
    name?: string | null;
    regulation_pdf_url?: string | null;
    ai_house_rules_text?: string | null;
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
    const body = (await req.json().catch(() => null)) as ForbiddenRequest | null;
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
- Reservation details
- Property info (including optional AI-configured house rules text)
- Reservation messages text in Romanian and/or English (which may contain rules).

Your task:
- Identify what is explicitly FORBIDDEN / NOT ALLOWED for guests at this property.
- Look for phrases like "it is forbidden", "is not allowed", "please do not", "no smoking", "do not", "prohibited", etc.
- Use ONLY rules that are clearly written in the reservation messages or in the AI-configured house rules text.

Rules:
- Use ONLY the information found in the messages, house rules text and details below.
- You may combine forbidden items from different sources (for example, one rule in a reservation message and another in the AI-configured house rules text) into a single list, as long as each forbidden action you include is clearly written somewhere in the text.
- Do NOT invent or guess new rules.
- If there are clear forbidden actions, summarise them briefly in the target language as a short list (1–5 bullet-style sentences).
- If there is no clear information about forbidden actions, set status to "missing" and in the answer text politely say that the rules are not clearly listed and that the guest should check the House Rules or contact the host.
- If you are not 100% sure that something is forbidden, do NOT include it.
- Keep the answer short.

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
            'You return only valid JSON for UI consumption. Do not include explanations or extra text. Never make up or guess rules: do not invent new "forbidden" items beyond what is clearly written. If unsure, respond with status "missing".',
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
            ? "Din informațiile disponibile nu rezultă o listă clară de lucruri interzise. Te rugăm să consulți Regulamentul casei sau să contactezi gazda pentru detalii."
            : "From the available information there is no clear list of forbidden actions. Please check the House Rules or contact the host for details.",
      });
    }

    return NextResponse.json({
      status: parsed.status as "found" | "missing",
      answer: parsed.answer as string,
    });
  } catch (error: any) {
    console.error("guest-assistant/forbidden error", error);
    return NextResponse.json(
      {
        status: "missing",
        answer:
          "From the available information there is no clear list of forbidden actions. Please check the House Rules or contact the host for details.",
      },
      { status: 500 },
    );
  }
}
