-- plan4host — accounts: add stripe_schedule_id for plan scheduling mirrors
-- Date: 2025-11-03

alter table if exists public.accounts
  add column if not exists stripe_schedule_id text;

create index if not exists accounts_schedule_idx on public.accounts(stripe_schedule_id);

