import OpenAI from "openai";

let cachedOpenAI: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (cachedOpenAI) return cachedOpenAI;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.");
  }
  cachedOpenAI = new OpenAI({ apiKey });
  return cachedOpenAI;
}
