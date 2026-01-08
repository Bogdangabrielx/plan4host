-- plan4host — last activity tracking for accounts
-- Date: 2026-01-08

/* =============================================================
   1) accounts — last activity timestamp
   ============================================================= */

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'accounts'
      and column_name  = 'last_activity_at'
  ) then
    alter table public.accounts
      add column last_activity_at timestamptz null;
  end if;
exception when others then
  null;
end
$$;

create index if not exists accounts_last_activity_at_idx
  on public.accounts (last_activity_at desc nulls last);

/* =============================================================
   2) RPC — touch last activity (throttled)
   ============================================================= */

create or replace function public.touch_account_activity()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  target_account_id uuid;
begin
  -- If the caller is a member user, update the parent account; otherwise update own account.
  select au.account_id
    into target_account_id
  from public.account_users au
  where au.user_id = auth.uid()
  order by au.created_at asc
  limit 1;

  if target_account_id is null then
    target_account_id := auth.uid();
  end if;

  -- Throttle to at most once per 60 seconds per account.
  update public.accounts a
  set last_activity_at = now()
  where a.id = target_account_id
    and (a.last_activity_at is null or a.last_activity_at < now() - interval '60 seconds');
end;
$fn$;

revoke all on function public.touch_account_activity() from public;
grant execute on function public.touch_account_activity() to authenticated;

