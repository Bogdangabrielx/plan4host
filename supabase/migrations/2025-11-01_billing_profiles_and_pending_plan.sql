-- plan4host — Billing profiles + pending plan scheduling
-- Date: 2025-11-01

/* =============================================================
   1) accounts — extend with subscription state + pending change
   ============================================================= */

alter table if exists public.accounts
  add column if not exists status text,                                            -- 'trialing'|'active'|'past_due'|'canceled'
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end   timestamptz,
  add column if not exists cancel_at_period_end boolean default false,
  add column if not exists pending_plan text,
  add column if not exists pending_effective_at timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

-- Keep plan slugs constrained informally (UI/logic); optional CHECK for safety
do $$ begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_schema='public' and table_name='accounts' and constraint_name='accounts_pending_plan_check'
  ) then
    alter table public.accounts
      add constraint accounts_pending_plan_check
      check (pending_plan is null or lower(pending_plan) in ('basic','standard','premium'));
  end if;
exception when others then null; end $$;

create index if not exists accounts_pending_effective_idx
  on public.accounts (pending_effective_at);

/* =============================================================
   2) account_billing_profiles — PF/PJ billing data (1:1 with account)
   ============================================================= */

create table if not exists public.account_billing_profiles (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  buyer_type text check (buyer_type in ('b2b','b2c')),

  -- B2C
  full_name text,
  cnp text,

  -- B2B
  legal_name text,
  tax_id text,
  vat_registered boolean default false,
  reg_no text,
  iban text,

  -- Common
  email text,
  phone text,
  street text,
  city text,
  county text,
  postal_code text,
  country text default 'RO',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists abp_email_idx on public.account_billing_profiles (lower(coalesce(email,'')));
create index if not exists abp_tax_id_idx on public.account_billing_profiles (coalesce(tax_id,''));

-- simple trigger to maintain updated_at
create or replace function public.trg_touch_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

drop trigger if exists trg_abp_touch on public.account_billing_profiles;
create trigger trg_abp_touch
  before update on public.account_billing_profiles
  for each row execute function public.trg_touch_updated_at();

-- RLS: allow each authenticated user to manage their own profile
alter table public.account_billing_profiles enable row level security;

do $$ begin
  create policy abp_select_self on public.account_billing_profiles
    for select to authenticated
    using (account_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy abp_insert_self on public.account_billing_profiles
    for insert to authenticated
    with check (account_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy abp_update_self on public.account_billing_profiles
    for update to authenticated
    using (account_id = auth.uid())
    with check (account_id = auth.uid());
exception when duplicate_object then null; end $$;

/* =============================================================
   3) RPCs — schedule/clear pending plan, cancel at period end
   ============================================================= */

-- Helper to resolve the caller's account id and current boundary
create or replace function public._account_self_with_boundary()
returns table(account_id uuid, current_boundary timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select a.id,
         coalesce(a.current_period_end, a.valid_until) as current_boundary
  from public.accounts a
  join public.account_users au
    on au.account_id = a.id
   and au.user_id = auth.uid()
   and coalesce(au.disabled,false) = false
  order by a.created_at asc
  limit 1
$$;

-- Schedule a plan change for the next period boundary (typically a downgrade)
create or replace function public.account_schedule_plan_self(
  p_plan_slug text
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_acc uuid;
  v_boundary timestamptz;
  v_plan text := lower(coalesce(p_plan_slug,'basic'));
begin
  if v_plan not in ('basic','standard','premium') then
    raise exception 'Invalid plan slug';
  end if;

  select account_id, current_boundary into v_acc, v_boundary
  from public._account_self_with_boundary();

  if v_acc is null then
    raise exception 'No account for current user';
  end if;

  update public.accounts
     set pending_plan = v_plan,
         pending_effective_at = v_boundary
   where id = v_acc;
end;
$fn$;

-- Clear any scheduled plan change
create or replace function public.account_clear_scheduled_plan_self()
returns void
language sql
security definer
set search_path = public
as $$
  update public.accounts
     set pending_plan = null,
         pending_effective_at = null
   where id in (select account_id from public._account_self_with_boundary());
$$;

-- Toggle cancel at period end
create or replace function public.account_cancel_at_period_end_self(
  p_cancel boolean default true
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.accounts
     set cancel_at_period_end = coalesce(p_cancel, true)
   where id in (select account_id from public._account_self_with_boundary());
$$;

-- End of migration
