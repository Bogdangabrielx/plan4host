-- plan4host — accounts: add stripe_schedule_id
-- Date: 2025-11-05

alter table if exists public.accounts
  add column if not exists stripe_schedule_id text;

create index if not exists accounts_stripe_schedule_idx
  on public.accounts (stripe_schedule_id);

