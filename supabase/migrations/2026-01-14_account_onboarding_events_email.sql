-- Add account_email to onboarding events for easier admin analysis

alter table public.account_onboarding_events
  add column if not exists account_email text null;

create index if not exists aoe_account_email_idx
  on public.account_onboarding_events (lower(coalesce(account_email, '')));

-- Safe backfill from public.accounts.email when available
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'accounts'
      and column_name  = 'email'
  ) then
    update public.account_onboarding_events e
    set account_email = a.email
    from public.accounts a
    where a.id = e.account_id
      and e.account_email is null
      and a.email is not null;
  end if;
exception when others then
  null;
end
$$;

