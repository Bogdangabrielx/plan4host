-- plan4host — Stripe webhook safeguards & idempotency
-- Date: 2025-11-05

-- Track processed Stripe webhook events to guarantee idempotency.
create table if not exists public.stripe_events_processed (
  event_id text primary key,
  type text,
  status text check (status in ('processed','failed')),
  processed_at timestamptz default now(),
  error_message text,
  payload jsonb
);

create index if not exists sep_status_idx on public.stripe_events_processed(status);

-- No RLS (service-role only). If needed later, add policies similar to other audit tables.
