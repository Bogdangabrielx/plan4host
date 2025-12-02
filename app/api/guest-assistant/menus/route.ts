import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

type ChatTopicId = "arrival" | "amenities" | "extras" | "contact_host";

type ChatLabelKey =
  | ChatTopicId
  | "back"
  | "arrival_parking"
  | "arrival_access_codes"
  | "arrival_time"
  | "contact_cta"
  | "tap_call"
  | "tap_email";

const BASE_LABELS: Record<ChatLabelKey, string> = {
  arrival: "Arrival details",
  amenities: "Amenities",
  extras: "Extras",
  contact_host: "Contact the host",
  back: "Back",
  arrival_parking: "Parking information",
  arrival_access_codes: "Access codes",
  arrival_time: "Arrival time",
  contact_cta: "If you still have questions, contact the host",
  tap_call: "Tap to call",
  tap_email: "Tap to email",
};

type RequestBody = {
  language?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as RequestBody | null;
  const language = (body?.language || "").toString().trim();

    // If no language or English, just return base labels (no need to call GPT)
    if (!language || language.toLowerCase() === "english") {
      return NextResponse.json({ labels: BASE_LABELS });
    }

    const prompt = `
You translate short UI menu labels for a guest assistant for a property.

Translate the following labels from English into the target language.

Target language: ${language}

Return ONLY a minified JSON object with exactly these keys:

{"arrival":"...","amenities":"...","extras":"...","contact_host":"...","back":"...","arrival_parking":"...","arrival_access_codes":"...","arrival_time":"...","contact_cta":"...","tap_call":"...","tap_email":"..."}

Use natural, concise wording and keep the meaning of each label.

Source labels:
arrival: "${BASE_LABELS.arrival}"
amenities: "${BASE_LABELS.amenities}"
extras: "${BASE_LABELS.extras}"
contact_host: "${BASE_LABELS.contact_host}"
back: "${BASE_LABELS.back}"
arrival_parking: "${BASE_LABELS.arrival_parking}"
arrival_access_codes: "${BASE_LABELS.arrival_access_codes}"
arrival_time: "${BASE_LABELS.arrival_time}"
contact_cta: "${BASE_LABELS.contact_cta}"
tap_call: "${BASE_LABELS.tap_call}"
tap_email: "${BASE_LABELS.tap_email}"
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You return only valid JSON with translated labels, no explanations or extra text.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 300,
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

    const labels: Partial<Record<ChatLabelKey, string>> = {};
    (
      [
        "arrival",
        "amenities",
        "extras",
        "contact_host",
        "back",
        "arrival_parking",
        "arrival_access_codes",
        "arrival_time",
        "contact_cta",
        "tap_call",
        "tap_email",
      ] as ChatLabelKey[]
    ).forEach((key) => {
      const v = parsed?.[key];
      if (typeof v === "string" && v.trim()) {
        labels[key] = v.trim();
      }
    });

    if (Object.keys(labels).length === 0) {
      return NextResponse.json({ labels: BASE_LABELS });
    }

    return NextResponse.json({
      labels: { ...BASE_LABELS, ...labels },
    });
  } catch (error) {
    console.error("guest-assistant/menus error", error);
    return NextResponse.json({ labels: BASE_LABELS });
  }
}
