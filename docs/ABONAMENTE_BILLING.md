# Planuri, Billing și Fluxuri — Implementare actuală

Documentul descrie comportamentul complet pentru planurile Basic / Standard / Premium, cu trial Standard 7 zile, integrarea Stripe (Checkout, Portal, Webhooks), programarea schimbărilor de plan la reînnoire și garanții de consistență.

## Model și Gating în App

- Planuri: Basic / Standard / Premium. Trial Standard 7 zile la onboarding (`account_grant_trial`).
- Accesul real în aplicație este determinat exclusiv de `accounts.plan` (DB = source of truth).
- Redirecționare când expiră: `account_access_mode()` întoarce `billing_only` → redirect către pagina `Subscription`.

## UI Subscription (rezumat)

- „I want {Plan}”: colectează profil de facturare (B2B/B2C), apoi Stripe Checkout (sau branching upgrade/downgrade dacă există abonament activ).
- Upgrade cu abonament activ:
  - „Pay now” → `POST /api/billing/upgrade-now` (încearcă upgrade imediat fără proration credit; dacă e nevoie de acțiune, cade pe Checkout).
  - „Upgrade at renewal” → deschide Stripe Portal (utilizatorul poate seta acolo; în app programăm `pending_*`).
- Downgrade → programare la reînnoire (`pending_*`) sau prin Portal (subscription schedule).
- Header/UI: afișează badge „Upcoming plan: {Plan} starting {date}” când `pending_*` există.

## Stripe — Config

- Produse: Basic / Standard / Premium. Prețuri lunare în RON (tax‑inclusive).
- Customer Portal: „Customers can switch plans” = ON, „No charges or credits” = ON.
- ENV necesare:
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_BASIC_RON`, `STRIPE_PRICE_STANDARD_RON`, `STRIPE_PRICE_PREMIUM_RON`
  - `NEXT_PUBLIC_APP_URL`

## DB și Migrations

- `supabase/migrations/2025-09-13_tenant_bootstrap_and_access.sql` — bootstrap cont + trial + funcții `account_current_plan()`/`account_access_mode()`.
- `supabase/migrations/2025-11-01_billing_profiles_and_pending_plan.sql` — extinde `accounts` cu:
  - `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `pending_plan`, `pending_effective_at`, `stripe_customer_id`, `stripe_subscription_id`.
  - `account_billing_profiles` (PF/PJ) + RLS + RPC‑uri: `_account_self_with_boundary`, `account_schedule_plan_self`, `account_clear_scheduled_plan_self`, `account_cancel_at_period_end_self`.
- `supabase/migrations/2025-11-02_billing_invoices.sql` — `billing_invoices` (snapshot facturi din webhook).
- Nou: `supabase/migrations/2025-11-05_stripe_event_guards.sql` — `stripe_events_processed` (idempotency webhook).
- Nou: `supabase/migrations/2025-11-05_accounts_add_stripe_schedule.sql` — `accounts.stripe_schedule_id` (+ index) pentru subscription schedules (downgrade programat din Portal).

## API — Endpoints relevante

- `POST /api/billing/checkout` — creează Checkout Session (mode=subscription), asociază/actualizează Customer.
- `POST /api/billing/portal` — deschide Customer Portal (downgrade/cancel/payment method).
- `POST /api/billing/upgrade-now` — upgrade imediat al subscription‑ului (fără proration credit); dacă eșuează (SCA/off-session), fallback: Checkout.
- `GET/POST /api/billing/profile` — profil de facturare (PF/PJ). Buyer type nu se schimbă ulterior.
- `POST /api/billing/schedule` — programare schimbare plan (umple `pending_*`).
- `POST /api/billing/schedule/clear` — curăță `pending_*`.
- `GET /api/billing/payment-method` — card curent (brand, last4, expirare) din Stripe.
- `GET /api/billing/status` — snapshot: plan, valid_until/current_period, pending, cancel flag, buyer_type.
- Nou: `POST /api/billing/reconcile` — reconciliere (cron, cu `Authorization: Bearer ${BILLING_CRON_SECRET}`) aplică `pending_plan` dacă factura de ciclu e plătită și `pending_effective_at` a trecut.

## Webhook — Comportament detaliat

- Idempotency garantat:
  - Tabel `stripe_events_processed(event_id PK, type, status, payload, processed_at)`; evenimente duplicate sunt ignorate.

- `checkout.session.completed`
  - Capturează `stripe_customer_id` / `stripe_subscription_id` pe cont, setează `status`, perioade (`current_period_*`) și `valid_until`.
  - Curăță eventualele subscription‑uri anterioare (cancel imediat, fără proration).

- `customer.subscription.updated`
  - Sincronizează perioade/status.
  - Mapare price → plan și programare DOAR pentru upgrade (Basic<Standard<Premium).
  - Guard: dacă există deja `pending_plan`, NU mai rescrie `pending_*` (evită să împingă încă un ciclu la graniță).

- `subscription_schedule.created | updated`
  - Pentru downgrade programat din Portal: stabilește `pending_plan` și `pending_effective_at` din „next phase start” + `stripe_schedule_id`.

- `subscription_schedule.canceled | released`
  - Curăță `pending_plan`, `pending_effective_at`, `stripe_schedule_id`.

- `invoice.paid` / `invoice.payment_succeeded`
  - Aplica switch‑ul efectiv DOAR pentru reînnoirile de ciclu: `billing_reason = 'subscription_cycle'`.
  - Garduri de siguranță:
    - `invoice.subscription == accounts.stripe_subscription_id`.
    - Toleranță la graniță: ACCEPTĂM fie
      - `lines[0].period.start >= pending_effective_at - 5m`, fie
      - `lines[0].period.end ≈ pending_effective_at ± 5m`.
  - Dacă trece gardurile: `plan = pending_plan`, golește `pending_*`, actualizează perioade și `valid_until`, setează `cancel_at_period_end=false` (reînnoit cu succes).
  - Fallback: dacă nu există `pending_plan`, mapează planul din price (subscription sau invoice line) și aliniază `plan`.

- `invoice.payment_failed`
  - Nu schimbă `plan`; setează `status='past_due'` și persistă invoice în `billing_invoices`.

## Reguli de business (anti‑confuzii)

- Niciodată nu acordăm acces după `customer.subscription.updated`. Accesul real vine după `invoice.paid` (subscription_cycle) + garduri OK.
- Nu ne bazăm pe `subscription.items` pentru entitlement; DB e autoritativ.
- Prima plată (subscription_create) este ignorată pentru switch‑ul programat; doar aliniază perioade/valid_until.

## Testare rapidă (dev / Test Clock)

- Upgrade în Portal (Standard → Premium), apoi înainte de reînnoire verifică:
  - `accounts.pending_plan='premium'`, `pending_effective_at = current_period_end`.
  - UI arată badge „Upcoming plan: Premium starting …”.
- Avansează Test Clock peste `pending_effective_at`; pe `invoice.paid`:
  - `accounts.plan` devine `pending_plan` și `pending_*` se golesc.
- Caz critic (ordinea evenimentelor): dacă vine `customer.subscription.updated` puțin înainte de `invoice.paid`, pending NU mai este rescris (guard), iar switch‑ul are loc corect pe factura ciclului.

## Mentenanță/Operare

- Reconciliere periodică: rulează `POST /api/billing/reconcile` (cron cu `BILLING_CRON_SECRET`) pentru conturi cu `pending_plan` depășit și factură de ciclu „paid”.
- Debug rapid:
  - Stripe Dashboard → Developers → Events (filtre pe `invoice.paid`, `customer.subscription.updated`, `subscription_schedule.*`).
  - DB → `stripe_events_processed` (vezi tip, payload, status) și `accounts` (plan/pending/perioade).

## Referințe fișiere

- UI: `app/app/subscription/ui/SubscriptionClient.tsx`, `app/app/subscription/subscription.module.css`
- Webhook: `app/api/billing/webhook/route.ts`
- API: `app/api/billing/*` (checkout, portal, status, schedule, payment‑method, reconcile)
- DB: migrațiile din `supabase/migrations` listate mai sus
