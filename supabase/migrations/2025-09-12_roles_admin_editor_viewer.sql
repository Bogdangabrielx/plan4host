-- Migrate roles to admin/editor/viewer and update policies/triggers

-- 1) Remap existing roles to the new model
do $$
begin
  -- Map legacy roles
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='account_users' and column_name='role') then
    update public.account_users set role='admin'  where role in ('owner','manager');
    update public.account_users set role='editor' where role in ('member','staff');
  end if;
end $$;

-- 2) Relax/replace check constraint and defaults on role
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='account_users' and column_name='role') then
    begin
      alter table public.account_users drop constraint if exists account_users_role_check;
    exception when others then null; end;
    begin
      alter table public.account_users drop constraint if exists account_users_role_check1;
    exception when others then null; end;
    begin
      alter table public.account_users add constraint account_users_role_check check (role in ('admin','editor','viewer'));
    exception when duplicate_object then null; end;
    begin
      alter table public.account_users alter column role set default 'editor';
    exception when others then null; end;
  end if;
end $$;

-- 3) account_has_scope helper: admin has full access; editors/viewers via scopes
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
      and (au.role = 'admin' or p_scope = any(au.scopes))
  );
$$;

-- 4) Update example RLS policies (if present) to use 'admin'
do $$
begin
  if to_regclass('public.cleaning_task_defs') is not null then
    begin execute $$drop policy if exists p_cleaning_task_defs_access on public.cleaning_task_defs$$; exception when others then null; end;
    execute $$
      create policy p_cleaning_task_defs_access on public.cleaning_task_defs
      using (
        exists (
          select 1
          from public.properties p
          join public.account_users au on au.account_id = p.owner_id and au.user_id = auth.uid()
          where p.id = cleaning_task_defs.property_id and au.disabled = false and (au.role = 'admin' or 'cleaning' = any(au.scopes))
        )
      )
      with check (
        exists (
          select 1
          from public.properties p
          join public.account_users au on au.account_id = p.owner_id and au.user_id = auth.uid()
          where p.id = cleaning_task_defs.property_id and au.disabled = false and (au.role = 'admin' or 'cleaning' = any(au.scopes))
        )
      )
    $$;
  end if;

  if to_regclass('public.bookings') is not null then
    begin execute $$drop policy if exists p_bookings_reservations_access on public.bookings$$; exception when others then null; end;
    execute $$
      create policy p_bookings_reservations_access on public.bookings
      using (
        exists (
          select 1
          from public.properties p
          join public.account_users au on au.account_id = p.owner_id and au.user_id = auth.uid()
          where p.id = bookings.property_id and au.disabled = false and (au.role = 'admin' or 'reservations' = any(au.scopes))
        )
      )
      with check (
        exists (
          select 1
          from public.properties p
          join public.account_users au on au.account_id = p.owner_id and au.user_id = auth.uid()
          where p.id = bookings.property_id and au.disabled = false and (au.role = 'admin' or 'reservations' = any(au.scopes))
        )
      )
    $$;
  end if;
end $$;

-- 5) Enforce Premium plan for team management (writes to account_users)
create or replace function public.enforce_team_plan()
returns trigger
language plpgsql
as $$
declare
  v_plan text;
  v_account uuid;
  v_is_admin boolean;
begin
  v_account := coalesce(new.account_id, old.account_id);
  select plan into v_plan from public.accounts where id = v_account;
  v_is_admin := (tg_op = 'INSERT' and new.role = 'admin')
             or (tg_op in ('UPDATE','DELETE') and old.role = 'admin');

  if not v_is_admin and lower(coalesce(v_plan, 'basic')) <> 'premium' then
    raise exception 'Team management allowed on Premium plan only';
  end if;

  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.account_users') is not null then
    begin
      create trigger trg_enforce_team_plan
      before insert or update or delete on public.account_users
      for each row execute function public.enforce_team_plan();
    exception when duplicate_object then null; end;
  end if;
end $$;

