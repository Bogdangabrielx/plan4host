-- plan4host — throttle last activity to 60s
-- Date: 2026-01-08

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
  if to_regclass('public.account_users') is not null then
    select au.account_id
      into target_account_id
    from public.account_users au
    where au.user_id = auth.uid()
    order by au.created_at asc
    limit 1;
  end if;

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

