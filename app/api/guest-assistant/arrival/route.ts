import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

type ArrivalTopic = "parking" | "access_codes" | "access_instructions" | "arrival_time";

type ArrivalRequest = {
  language?: string;
  topic?: ArrivalTopic;
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
    const body = (await req.json().catch(() => null)) as ArrivalRequest | null;
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
      topic === "parking"
        ? "parking information (where to park, whether it is free or paid, and any important rules)"
        : topic === "access_codes"
        ? "access codes: the exact entry codes (door, gate, lockbox) and, if present, very short usage notes."
        : topic === "access_instructions"
        ? "full access instructions: how the guest should enter the property (where to find keys or lockbox, how to use codes, which entrance to use, and any important steps)."
        : "arrival time (the usual or specific check-in time for this reservation)";

    const prompt = `
You are a guest assistant for a property.

You will receive:
- Target answer language
- Reservation details
- Property info (including optional AI-configured house rules text)
- Reservation messages text (which may contain house rules and arrival instructions) in Romanian and/or English.

You must answer a single arrival-related question for the guest:
- Topic: ${topicLabel}

Rules:
- Use ONLY the information found in the messages, house rules text and details below.
- First look for the answer in the reservation messages. Only if it is not clearly present there, you may also use the AI-configured house rules text from Property info.
- NEVER invent or guess codes, phone numbers, addresses, parking locations, or times.
- If information is clearly present, answer briefly and clearly in the target language.
- If information is not present or is unclear, set status to "missing" and in the answer text politely say that it's not clear from the information available and that the guest should contact the host.
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
            "You return only valid JSON for UI consumption. Do not include explanations or extra text. Never make up or guess facts: do not fabricate codes, phone numbers, addresses, locations, or times. If unsure, respond with status \"missing\".",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 400,
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
    console.error("guest-assistant/arrival error", error);
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
