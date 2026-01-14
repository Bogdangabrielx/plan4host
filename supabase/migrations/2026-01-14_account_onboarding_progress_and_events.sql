-- Per-account onboarding progress + event log (admin can query via SQL / service role)

-- 1) Extend account_onboarding_state with structured progress + last seen
alter table public.account_onboarding_state
  add column if not exists steps jsonb not null default '{}'::jsonb,
  add column if not exists last_seen_at timestamptz null;

-- 2) Ensure every new account gets a row in account_onboarding_state
create or replace function public.trg_accounts_create_onboarding_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.account_onboarding_state(account_id)
  values (new.id)
  on conflict (account_id) do nothing;
  return new;
end;
$fn$;

drop trigger if exists trg_accounts_create_onboarding_state on public.accounts;
create trigger trg_accounts_create_onboarding_state
  after insert on public.accounts
  for each row execute function public.trg_accounts_create_onboarding_state();

-- Backfill (safe): ensure all existing accounts have a row
insert into public.account_onboarding_state(account_id)
select a.id
from public.accounts a
on conflict (account_id) do nothing;

-- 3) Event log: how onboarding is used (per account)
create table if not exists public.account_onboarding_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  event text not null,
  step_id text null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists aoe_account_created_at_idx
  on public.account_onboarding_events(account_id, created_at desc);

create index if not exists aoe_event_idx
  on public.account_onboarding_events(event);

alter table public.account_onboarding_events enable row level security;

do $$
begin
  create policy aoe_self_select on public.account_onboarding_events
    for select to authenticated
    using (account_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$
begin
  create policy aoe_self_insert on public.account_onboarding_events
    for insert to authenticated
    with check (account_id = auth.uid());
exception when duplicate_object then null; end $$;
