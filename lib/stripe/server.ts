import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY env");
  if (!stripeSingleton) {
    // Rely on Stripe account API version; avoid hardcoding to keep types compatible
    stripeSingleton = new Stripe(key);
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

export function getPlanSlugForPriceId(priceId?: string | null): 'basic'|'standard'|'premium'|null {
  if (!priceId) return null;
  const basic = process.env.STRIPE_PRICE_BASIC_RON || '';
  const standard = process.env.STRIPE_PRICE_STANDARD_RON || '';
  const premium = process.env.STRIPE_PRICE_PREMIUM_RON || '';
  if (priceId === basic) return 'basic';
  if (priceId === standard) return 'standard';
  if (priceId === premium) return 'premium';
  return null;
}
