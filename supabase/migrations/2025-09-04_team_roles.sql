-- Team management: roles, scopes, disabled + helper

-- 1) Extend account_users with role/scopes/disabled (idempotent)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='account_users' and column_name='role'
  ) then
    alter table public.account_users add column role text not null default 'member' check (role in ('owner','manager','member','viewer'));
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='account_users' and column_name='scopes'
  ) then
    alter table public.account_users add column scopes text[] not null default '{}'::text[];
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='account_users' and column_name='disabled'
  ) then
    alter table public.account_users add column disabled boolean not null default false;
  end if;
end $$;

-- 2) Helper: does user have scope/role on account?
create or replace function public.account_has_scope(
  p_user_id uuid,
  p_account_id uuid,
  p_scope text
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.account_users au
    where au.account_id = p_account_id
      and au.user_id = p_user_id
      and au.disabled = false
      and (au.role in ('owner','manager') or p_scope = any(au.scopes))
  );
$$;

-- 3) Optional RLS examples (guarded) for cleaning/bookings (no-op if tables are absent)
do $$
begin
  if to_regclass('public.cleaning_task_defs') is not null then
    begin
      alter table public.cleaning_task_defs enable row level security;
    exception when others then null; end;
    -- Allow only members with scope 'cleaning' (or owner/manager) on the property's account
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='cleaning_task_defs' and policyname='p_cleaning_task_defs_access'
    ) then
      execute $POLICY$
        create policy p_cleaning_task_defs_access on public.cleaning_task_defs
        using (
          exists (
            select 1
            from public.properties p
            join public.account_users au on au.account_id = p.owner_id and au.user_id = auth.uid()
            where p.id = cleaning_task_defs.property_id and au.disabled = false and (au.role in ('owner','manager') or 'cleaning' = any(au.scopes))
          )
        )
        with check (
          exists (
            select 1
            from public.properties p
            join public.account_users au on au.account_id = p.owner_id and au.user_id = auth.uid()
            where p.id = cleaning_task_defs.property_id and au.disabled = false and (au.role in ('owner','manager') or 'cleaning' = any(au.scopes))
          )
        )
      $POLICY$;
    end if;
  end if;

  if to_regclass('public.bookings') is not null then
    begin
      alter table public.bookings enable row level security;
    exception when others then null; end;
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='bookings' and policyname='p_bookings_reservations_access'
    ) then
      execute $POLICY2$
        create policy p_bookings_reservations_access on public.bookings
        using (
          exists (
            select 1
            from public.properties p
            join public.account_users au on au.account_id = p.owner_id and au.user_id = auth.uid()
            where p.id = bookings.property_id and au.disabled = false and (au.role in ('owner','manager') or 'reservations' = any(au.scopes))
          )
        )
        with check (
          exists (
            select 1
            from public.properties p
            join public.account_users au on au.account_id = p.owner_id and au.user_id = auth.uid()
            where p.id = bookings.property_id and au.disabled = false and (au.role in ('owner','manager') or 'reservations' = any(au.scopes))
          )
        )
      $POLICY2$;
    end if;
  end if;
end $$;
