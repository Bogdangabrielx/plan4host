# Stripe Setup (Vercel + Supabase)

Subscriptions are managed with Stripe (RON, monthly). This guide targets Vercel deploys and Supabase DB.

## 1) Stripe Dashboard — Products & Prices
- Products: Basic, Standard, Premium
- Prices: monthly, currency RON, Tax behavior = Inclusive
- Emails: enable receipts and finalized invoices; set branding; dunning 0/3/7/14

## 2) Vercel Project — Environment Variables
Configure in Vercel → Project → Settings → Environment Variables, then redeploy:

- STRIPE_SECRET_KEY = sk_live_/sk_test_
- STRIPE_WEBHOOK_SECRET = whsec_… (from step 4)
- M = price_…
- STRIPE_PRICE_STANDARD_RON = price_…
- STRIPE_PRICE_PREMIUM_RON = price_…
- NEXT_PUBLIC_SUPABASE_URL = https://<your-project>.supabase.co
- SUPABASE_SERVICE_ROLE_KEY = <service role key> (webhook only)
- NEXT_PUBLIC_APP_URL = https://<your-vercel-domain>

Optional (only if using client SDK later):
- NEXT_PUBLIC_STRIPE_PK = pk_live_/pk_test_

## 3) Implemented Endpoints
- Helper: `lib/stripe/server.ts` (Stripe client + plan→price mapping)
- Checkout: `POST /api/billing/checkout` → creates Checkout Session for basic/standard/premium and returns `{ url }`
- Webhook: `POST /api/billing/webhook` (Node runtime)
  - Syncs `accounts`: `status`, `current_period_start/end`, `cancel_at_period_end`, `valid_until`, `plan` (on first checkout)
  - Applies `pending_plan` at boundary and clears `pending_*`
  - Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

## 4) Stripe Webhook — Configure
- Stripe → Developers → Webhooks → Add endpoint:
  - URL: `https://<your-vercel-domain>/api/billing/webhook`
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- Copy Signing secret → set as `STRIPE_WEBHOOK_SECRET` in Vercel → redeploy

## 5) Verify on Vercel
- Ensure env vars are set and DB migration is applied (billing profiles + pending plan RPCs)
- Trigger `POST /api/billing/checkout` from Subscription UI → redirect to Stripe
- After payment, verify in Supabase `accounts`: `stripe_customer_id`, `stripe_subscription_id`, `current_period_*`, `status`, `valid_until`

## Notes
- Prices are tax-inclusive; VAT can be absorbed later without changing UI prices
- Payment-method update endpoint is pending; use Checkout for the first payment, add `/api/billing/setup-method` later if needed
- Do not expose Stripe Customer Portal; billing data is edited in-app
