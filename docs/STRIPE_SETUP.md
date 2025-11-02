# Stripe Setup — Plan4Host

This project integrates Stripe for subscriptions (RON, monthly). Follow these steps before enabling Checkout:

## 1) Create products and prices (Stripe Dashboard)
- Products: Basic, Standard, Premium
- Prices: Monthly, currency RON, Tax behavior = Inclusive
- Emails: enable receipts + finalized invoices; set branding; dunning 0/3/7/14

## 2) Environment variables
Add these to your local environment (e.g., `.env.local`):

- STRIPE_SECRET_KEY=sk_test_...
- STRIPE_WEBHOOK_SECRET=whsec_...
- STRIPE_PRICE_BASIC_RON=price_...
- STRIPE_PRICE_STANDARD_RON=price_...
- STRIPE_PRICE_PREMIUM_RON=price_...
- NEXT_PUBLIC_STRIPE_PK=pk_test_... (if using client SDK later)

Optional base URL for redirects:
- NEXT_PUBLIC_APP_URL=https://localhost:3000

## 3) Install the SDK
- Add dependency: `stripe` (already added to package.json). Run `npm install`.

## 4) Next steps (implementation)
- POST /api/billing/checkout → create Checkout Session (mode=subscription)
- POST /api/billing/setup-method → update payment method
- POST /api/billing/webhook → sync subscription (current_period_*, status, cancel flag, apply pending_plan)

Refer to `lib/stripe/server.ts` for the server-side client and plan→price mapping helper.
