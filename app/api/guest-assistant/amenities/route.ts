import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

type AmenitiesTopic =
  | "wifi"
  | "iron"
  | "minibar"
  | "coffee_machine"
  | "ac"
  | "washing_machine"
  | "dishwasher";

type AmenitiesRequest = {
  language?: string;
  topic?: AmenitiesTopic;
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
    const body = (await req.json().catch(() => null)) as AmenitiesRequest | null;
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
      topic === "wifi"
        ? "Wi‑Fi access: whether Wi‑Fi is available, the exact network name (SSID) and password, any connection instructions, and whether there are usage limits or extra fees if clearly mentioned."
        : topic === "iron"
        ? "Iron / ironing: whether there is an iron or ironing board available, where the guest can find it or request it, and whether using it is free or requires an extra fee if clearly mentioned."
        : topic === "minibar"
        ? "Minibar: whether there is a minibar, where it is, whether items inside are complimentary or paid extra, and, if prices are explicitly listed, the exact price for each item in the same currency and format written by the host."
        : topic === "coffee_machine"
        ? "Coffee machine: whether there is a coffee machine, how to use it (capsules, filter, buttons, etc.), and whether coffee/capsules are free or paid extra if clearly mentioned."
        : topic === "ac"
        ? "Air conditioning / climate control: whether there is AC or climate control, how to operate it, and whether using it is free or subject to extra charges if clearly mentioned."
        : topic === "washing_machine"
        ? "Washing machine: whether there is a washing machine, how to use it (programs, detergents, location), and whether using it is free or paid extra if clearly mentioned."
        : "Dishwasher: whether there is a dishwasher, how to use it (programs, detergents, location), and whether using it is free or paid extra if clearly mentioned.";

    const prompt = `
You are a guest assistant for a property.

You will receive:
- Target answer language
- Reservation details
- Property info (including optional AI-configured house rules text)
- Reservation messages text in Romanian and/or English (which may mention amenities and how to use them).

You must answer a single amenities-related question for the guest:
- Topic: ${topicLabel}

Rules:
- Use ONLY the information found in the messages, house rules text and details below.
- First look for the answer in the reservation messages. Then also check the AI-configured house rules text from Property info; you may combine information from both sources in a single answer if each piece you mention (for example Wi‑Fi network name vs password, or whether something is free or paid) is clearly written somewhere in the text.
- NEVER invent or guess equipment that is not clearly mentioned, and NEVER invent or guess Wi‑Fi network names, passwords, codes, phone numbers, or addresses.
- For Wi‑Fi, only output the network name (SSID) and password if they are explicitly present in the text; do not create or modify them. You may take the SSID from one place (for example house rules) and the password from another (for example a reservation message) as long as both values appear explicitly. When you mention them, format them in Markdown bold: **SSID** for the network name value and **PASSWORD** for the password value (for example: WIFI: Network **MyWifi** – Password **1234abcd**).
- For minibar, if the text lists concrete products with prices, mention each product together with its exact price and currency exactly as written (for example "5 EUR", "10 lei", "$3"), without converting or changing any numbers or currency symbols. If only a generic statement like "paid extra" is present but no exact prices, mention that it is paid extra but do NOT invent prices.
- If information is clearly present, answer briefly and clearly in the target language. If the text explicitly states that the amenity is free, included, paid extra, coin‑operated or requires a deposit, mention this clearly in the answer.
- Format the answer as one or more lines, each line starting with a bullet like "• " and, when useful, a short UPPERCASE label (for example "WIFI:", "COFFEE MACHINE:", "AC:") so it is easy to scan. Use line breaks between bullets.
- If information is not present or is unclear, set status to "missing" and in the answer text politely say that it's not clear from the information available and that the guest should contact the host.
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You return only valid JSON for UI consumption. Do not include explanations or extra text. Never make up or guess facts: do not fabricate Wi‑Fi network names or passwords, equipment that is not clearly mentioned, codes, phone numbers, addresses, locations, or times. If unsure, respond with status \"missing\".",
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
    console.error("guest-assistant/amenities error", error);
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
