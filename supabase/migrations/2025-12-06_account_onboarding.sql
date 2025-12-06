-- Account onboarding checklist state

create table if not exists public.account_onboarding_state (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  dismissed_steps text[] not null default '{}'::text[],
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Simple trigger to keep updated_at fresh
create or replace function public.trg_account_onboarding_touch()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists trg_account_onboarding_touch on public.account_onboarding_state;
create trigger trg_account_onboarding_touch
  before update on public.account_onboarding_state
  for each row execute function public.trg_account_onboarding_touch();

alter table public.account_onboarding_state enable row level security;

do $$
begin
  create policy aos_self_select on public.account_onboarding_state
    for select to authenticated
    using (account_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$
begin
  create policy aos_self_insert on public.account_onboarding_state
    for insert to authenticated
    with check (account_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$
begin
  create policy aos_self_update on public.account_onboarding_state
    for update to authenticated
    using (account_id = auth.uid())
    with check (account_id = auth.uid());
exception when duplicate_object then null; end $$;

