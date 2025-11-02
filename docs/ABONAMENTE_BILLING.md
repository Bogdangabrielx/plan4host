# Planuri, Billing și Fluxuri — Implementare curentă și TODO

Acest document sumarizează ce este implementat (UI + DB + API) și ce urmează, pentru planurile Basic/Standard/Premium cu trial Standard 7 zile. Basic este plan plătit (RON).

## Ce este implementat acum

- Model planuri (existent în proiect)
  - Planuri: Basic / Standard / Premium (gating în app cu `account_access_mode()`); trial Standard 7 zile la onboarding (`account_grant_trial`).
  - Redirect când expiră: mod acces `billing_only` → ești dus la Subscription (deja activ în proiect).

- UI Subscription (nou/actualizat)
  - “I want {Plan}” → verifică profilul de facturare:
    - Fără profil → „Billing Type” (B2B/B2C) → formular PF/PJ → Save & Continue → DIRECT Stripe Checkout (salvare card) pentru activare.
    - Cu profil:
      - Dacă abonamentul este inactiv (Last active) → DIRECT Stripe Checkout.
      - Dacă este activ: Upgrade (modal “Ready to upgrade your experience?”) cu “Pay now” / “Upgrade at renewal”; Downgrade în 2 pași și programare la finalul perioadei.
  - Formulare Billing (B2B/B2C): confirm email (fără paste) la creare; la editare emailul este read‑only (“managed by Stripe”). Buyer type nu se schimbă.
  - Manage Account: “See payment method” (modal cu card preview — brand, •••• last4, expirare) + “Change payment method”/“Manage in Stripe (cancel)” → Stripe Billing Portal.
  - Flow downgrade (fără Stripe):
    - Pas 1: „Plan change – You are about to downgrade to …” (Cancel/Downgrade).
    - Pas 2: „The new plan will start on …” (Back/Confirm) → programează schimbarea la sfârșitul perioadei curente.
  - Header status: badge „New plan: {Plan} starting on {date}” când există programare (`pending_*`).

- DB (migrație nouă: `supabase/migrations/2025-11-01_billing_profiles_and_pending_plan.sql`)
  - `accounts` (extins):
    - `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`
    - `pending_plan`, `pending_effective_at` (+ index)
    - `stripe_customer_id`, `stripe_subscription_id`
  - `account_billing_profiles` (nou):
    - `buyer_type` ('b2b'|'b2c'), câmpuri PF (B2C) și PJ (B2B) + adresă/e-mail/telefon; `country` default RO.
    - RLS: SELECT/INSERT/UPDATE doar pentru `auth.uid()`; trigger `updated_at`.
  - RPC-uri self:
    - `_account_self_with_boundary()` → ID cont + boundary (prioritizează `current_period_end`, fallback `valid_until`).
    - `account_schedule_plan_self(p_plan_slug)` → setează `pending_plan` + `pending_effective_at`.
    - `account_clear_scheduled_plan_self()` → curăță programarea.
    - `account_cancel_at_period_end_self(p_cancel)` → setează/șterge cancel la period end.

- API (implementate)
  - `GET/POST /api/billing/profile` — citește/salvează profilul; blochează schimbarea buyer_type dacă există deja.
  - `POST /api/billing/schedule` — programează plan (folosește RPC); `GET` expune `pending_*`.
  - `POST /api/billing/schedule/clear` — curăță programarea.
  - `POST /api/billing/checkout` — Stripe Checkout pentru activare/upgrade imediat.
  - `POST /api/billing/portal` — Stripe Billing Portal (anulare și schimbare metodă plată).
  - `GET /api/billing/payment-method` — cardul curent (brand, last4, expirare) din Stripe.
  - `GET /api/billing/status` — status cont (plan, valid_until/current_period, pending, cancel flag) + buyer_type.

## Ce urmează (fără Stripe încă)

- UI
  - Buton „Clear scheduled change” în Manage Account → `POST /api/billing/schedule/clear`.
  - Afișare clară „Cancels on {date}” când `cancel_at_period_end=true` (din `/api/billing/status`).
  - (Opțional) Mesaje de confirmare localizate (EN/RO) și afișare coerentă a datei.

- DB/API
  - Audit: tabel opțional `account_plan_change_log` (from_plan, to_plan, effective_at, reason, created_at).
  - Harden RPC: validări suplimentare (ex: nu programa dacă deja există `cancel_at_period_end` fără a confirma cu utilizatorul).

## Stripe — de făcut (faza următoare)

- Config Stripe
  - Produse: Basic / Standard / Premium; prețuri lunare RON (tax-inclusive); branding + emailuri (receipts, finalized invoices), dunning 0/3/7/14.
  - ENV: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC_RON`, `STRIPE_PRICE_STANDARD_RON`, `STRIPE_PRICE_PREMIUM_RON`.

- API Stripe
  - `POST /api/billing/checkout` — Checkout Session (mode=subscription), cu `customer` creat/actualizat din profil; `client_reference_id=account_id`.
  - `POST /api/billing/webhook` —
    - `checkout.session.completed`: setează `stripe_customer_id/subscription_id`, sincronizează `current_period_start/end`, `status`, `valid_until = current_period_end`, curăță `pending_*` la upgrade “now”.
    - `customer.subscription.updated/created`: sincronizează `status` și perioade; mapează price→plan; `valid_until = current_period_end` (compat cu “clover” via items[0].current_period_end).
    - `invoice.payment_succeeded/paid`: marchează `active`, recuperează subscription și setează `valid_until = current_period_end`; `invoice.payment_failed` → `past_due`.
    - Aplică `pending_plan` la boundary: dacă `now >= pending_effective_at`, `plan = pending_plan` și curăță `pending_*`.

- UX decizii Stripe
  - Upgrade: „Start now” (Checkout imediat) vs. „Start at period end” (programare — deja implementată).
  - Downgrade: doar la finalul perioadei (deja implementat ca programare).
  - Nu expunem Customer Portal; datele de facturare se editează în app.

## Testare rapidă (dev)

- Profil PF/PJ
  - În Subscription → „I want …” fără profil → selectează B2B/B2C → completează → Save & Continue → verifică în DB `account_billing_profiles`.
  - Manage Account → „Edit billing details” → prefill + Save changes.

- Programare plan
  - Alege un plan mai mic → dialog în 2 pași → Confirm → verifică `accounts.pending_plan/pending_effective_at` + badge „New plan: … starting on …”.
  - `POST /api/billing/schedule/clear` → badge dispare, `pending_*` devin NULL.

- Cancel
  - Manage Account → „Cancel subscription” → verifică `cancel_at_period_end=true` (în `/api/billing/status`).

## Observații/Limitări actuale

- Upgrade “Pay now” este activ (Checkout + webhook). “Upgrade at renewal” programează schimbarea la finalul perioadei curente.
- `SubscriptionClient` încă folosește PLANS hardcodate pentru listă/imagini (nu citim din `billing_plans.features` pentru UI).
- `account_set_plan_self` este referit în componentă pentru scenariul legacy; noul flux cu Stripe va înlocui setarea directă a planului din client.

## Referințe fișiere

- UI: `app/app/subscription/ui/SubscriptionClient.tsx`, `app/app/subscription/subscription.module.css`
- DB: `supabase/migrations/2025-11-01_billing_profiles_and_pending_plan.sql`
- API: `app/api/billing/*`

---

Dacă dorești, pot adăuga imediat rutarea „Clear scheduled change” în Manage Account și afișaj „Cancels on …”, sau trecem direct la integrarea Stripe (Checkout + Webhook) în faza următoare.
