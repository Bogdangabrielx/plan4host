import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY env");
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: "2024-06-20",
      typescript: true,
    });
  }
  return stripeSingleton;
}

export function getPriceIdForPlan(slug: string): string | null {
  const s = String(slug || "").toLowerCase();
  if (s === "basic") return process.env.STRIPE_PRICE_BASIC_RON || null;
  if (s === "standard") return process.env.STRIPE_PRICE_STANDARD_RON || null;
  if (s === "premium") return process.env.STRIPE_PRICE_PREMIUM_RON || null;
  return null;
}
