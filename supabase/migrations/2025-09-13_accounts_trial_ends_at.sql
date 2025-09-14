-- plan4host — Accounts: add trial_ends_at and ensure it is set on trial grant

-- 1) Add column accounts.trial_ends_at (nullable)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='accounts' and column_name='trial_ends_at'
  ) then
    alter table public.accounts add column trial_ends_at timestamptz null;
  end if;
end $$;

-- 2) Ensure account_grant_trial sets both valid_until and trial_ends_at
create or replace function public.account_grant_trial(
  p_account_id uuid,
  p_days int default 7
)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_until timestamptz;
begin
  v_until := greatest(coalesce((select valid_until from public.accounts where id = p_account_id), now()), now())
             + make_interval(days => p_days);

  update public.accounts
     set plan = 'standard',
         valid_until = v_until,
         trial_ends_at = v_until
   where id = p_account_id;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='accounts' and column_name='trial_used'
  ) then
    execute 'update public.accounts set trial_used = true where id = $1' using p_account_id;
  end if;
end;
$func$;

-- 3) Backfill: set trial_ends_at where missing but valid_until exists
update public.accounts
   set trial_ends_at = valid_until
 where trial_ends_at is null
   and valid_until is not null;

