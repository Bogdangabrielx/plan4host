import { NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";

type ExtrasTopic = "eat_drink" | "visit";

type ExtrasRequest = {
  language?: string;
  topic?: ExtrasTopic;
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
    const body = (await req.json().catch(() => null)) as ExtrasRequest | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const language = (body.language || "English").toString();
    const topic = body.topic;
    if (!topic) {
      return NextResponse.json({ error: "Missing topic" }, { status: 400 });
    }

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

    const topicLabel =
      topic === "eat_drink"
        ? "places to eat or have a coffee (restaurants, cafes, breakfast spots) that are explicitly mentioned as recommendations for guests"
        : "places to visit nearby (tourist attractions, landmarks, parks, museums, viewpoints) that are explicitly mentioned as recommendations for guests";

    const prompt = `
You are a guest assistant for a property.

You will receive:
- Target answer language
- Reservation details
- Property info (including optional AI-configured house rules text)
- Reservation messages text in Romanian and/or English (which may mention recommendations).

You must answer a single extras-related question for the guest:
- Topic: ${topicLabel}

Rules:
- Use ONLY the information found in the messages, house rules text and details below.
- First look for the answer in the reservation messages. Then also check the AI-configured house rules text from Property info; you may combine information from both sources in a single answer (for example, a place name in one text and a short description or category in another) as long as everything you mention is explicitly written.
- You MUST NOT invent or guess new places, locations, restaurants, cafes, or attractions. Only mention places and ideas that are explicitly present in the text.
- If there are one or more clear recommendations, summarize them briefly in the target language (for example: type of place and its name, or very short description).
- Format the answer as one or more lines, each line starting with a bullet like "• " and, when useful, a short UPPERCASE label (for example "RESTAURANT:", "COFFEE:", "TO VISIT:") so it is easy to scan. Use line breaks between bullets.
- If there is no clear information for this topic, set status to "missing" and in the answer text politely say that it's not clear from the information available and that the guest should ask the host for suggestions.
- If you are not 100% sure, treat it as missing – do NOT infer or approximate.
- Keep the answer short (1–3 bullet-style lines).

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

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You return only valid JSON for UI consumption. Do not include explanations or extra text. Never make up or guess facts: do not fabricate new places, locations, restaurants, cafes, attractions, codes, phone numbers, addresses, or times. If unsure, respond with status \"missing\".",
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
            ? "Nu există informații clare în acest moment. Te rugăm să soliciți detalii de la gazdă."
            : "There is no clear information available right now. Please ask the host for more details.",
      });
    }

    return NextResponse.json({
      status: parsed.status as "found" | "missing",
      answer: parsed.answer as string,
    });
  } catch (error: any) {
    console.error("guest-assistant/extras error", error);
    return NextResponse.json(
      {
        status: "missing",
        answer:
          "There is no clear information available right now. Please ask the host for more details.",
      },
      { status: 500 },
    );
  }
}
