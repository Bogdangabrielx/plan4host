create table if not exists public.account_login_activity (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  email text null,

  event_type text not null default 'login',
  occurred_at timestamptz not null default now(),

  app_mode text not null,
  display_mode text null,

  device_type text null,
  os_name text null,
  browser_name text null,
  user_agent text null,
  path text null,
  metadata jsonb not null default '{}'::jsonb,

  constraint account_login_activity_event_type_check
    check (event_type in ('login', 'signup')),
  constraint account_login_activity_app_mode_check
    check (app_mode in ('pwa', 'browser', 'unknown')),
  constraint account_login_activity_device_type_check
    check (device_type is null or device_type in ('mobile', 'tablet', 'desktop', 'unknown'))
);

create index if not exists account_login_activity_account_time_idx
  on public.account_login_activity (account_id, occurred_at desc);

create index if not exists account_login_activity_user_time_idx
  on public.account_login_activity (user_id, occurred_at desc);

create index if not exists account_login_activity_mode_time_idx
  on public.account_login_activity (app_mode, occurred_at desc);

create index if not exists account_login_activity_os_mode_time_idx
  on public.account_login_activity (os_name, app_mode, occurred_at desc);

alter table public.account_login_activity enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'account_login_activity'
      and policyname = 'ala_insert_own_account'
  ) then
    execute $policy$
      create policy ala_insert_own_account
      on public.account_login_activity
      for insert
      to authenticated
      with check (
        user_id = auth.uid()
        and exists (
          select 1
          from public.account_users au
          where au.account_id = account_login_activity.account_id
            and au.user_id = auth.uid()
            and coalesce(au.disabled, false) = false
        )
      )
    $policy$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'account_login_activity'
      and policyname = 'ala_select_own_account'
  ) then
    execute $policy$
      create policy ala_select_own_account
      on public.account_login_activity
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.account_users au
          where au.account_id = account_login_activity.account_id
            and au.user_id = auth.uid()
            and coalesce(au.disabled, false) = false
        )
      )
    $policy$;
  end if;
end
$$;
