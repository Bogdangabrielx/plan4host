-- plan4host — Tenant bootstrap, trial, and access mode
-- Date: 2025-09-13
-- Purpose:
--   - Normalize account_users (admin/editor/viewer + scopes + disabled)
--   - Ensure accounts has plan + valid_until
--   - Add functions:
--       account_current_plan(), account_access_mode(), account_grant_trial()
--   - Add onboarding trigger on auth.users → handle_new_user()
--   - Provide a backfill block for existing auth users
--   - Prepare Phase 2 RLS snippets for tenant isolation (commented section)
--
-- Notes:
--   - All statements are idempotent or guarded.
--   - SECURITY DEFINER functions set search_path = public.
--   - Team/plan gating details are handled in the application layer and in
--     separate triggers/policies tracked in other migrations.

/* =====================================================================
   1) SCHEMA NORMALIZATION
   --------------------------------------------------------------------- */

-- account_users: role/scopes/disabled
alter table if exists public.account_users
  add column if not exists role     text,
  add column if not exists scopes   text[] not null default '{}'::text[],
  add column if not exists disabled boolean not null default false;

-- Normalize legacy role values (best effort; safe if none exist)
update public.account_users set role = 'admin'  where role in ('owner','manager');
update public.account_users set role = 'editor' where role in ('member','staff');
update public.account_users set role = 'editor' where role is null or role = '';

-- Defaults + NOT NULL + clean constraint
do $$ begin
  begin alter table public.account_users alter column role set default 'editor'; exception when others then null; end;
  begin alter table public.account_users alter column role set not null;         exception when others then null; end;
  begin alter table public.account_users drop constraint if exists account_users_role_check; exception when others then null; end;
  begin alter table public.account_users drop constraint if exists account_users_role_check1; exception when others then null; end;
  begin alter table public.account_users add constraint account_users_role_check check (role in ('admin','editor','viewer')); exception when duplicate_object then null; end;
end $$;

-- accounts: plan + valid_until (trial/expiry)
alter table if exists public.accounts
  add column if not exists plan text,
  add column if not exists valid_until timestamptz;

/* =====================================================================
   2) FUNCTIONS: PLAN + ACCESS MODE
   --------------------------------------------------------------------- */

-- Current plan for the logged-in member
create or replace function public.account_current_plan()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(a.plan::text, 'basic'))::text
  from public.accounts a
  join public.account_users au
    on au.account_id = a.id
   and au.user_id = auth.uid()
   and coalesce(au.disabled,false) = false
  order by a.created_at asc
  limit 1
$$;

-- Access mode for the current member
-- - 'full'         → normal app access
-- - 'billing_only' → expired/needs payment; UI redirects admin to Subscription
-- - 'suspended'    → non-admin members on non-Premium plans (per product rules)
create or replace function public.account_access_mode()
returns text
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_acc uuid;
  v_role text;
  v_plan text;
  v_valid_until timestamptz;
begin
  if v_uid is null then
    return 'billing_only';
  end if;

  select a.id, au.role, lower(coalesce(a.plan::text,'basic')), a.valid_until
    into v_acc, v_role, v_plan, v_valid_until
  from public.accounts a
  join public.account_users au
    on au.account_id = a.id
   and au.user_id = v_uid
   and coalesce(au.disabled,false) = false
  order by a.created_at asc
  limit 1;

  if v_acc is null then
    return 'full';
  end if;

  if v_valid_until is not null and v_valid_until <= now() then
    return 'billing_only';
  end if;

  if v_role = 'admin' then
    return 'full';
  end if;

  if v_plan = 'premium' then
    return 'full';
  end if;

  return 'suspended';
end;
$fn$;

-- Trial helper: set Standard + extend valid_until by N days
create or replace function public.account_grant_trial(
  p_account_id uuid,
  p_days int default 7
)
returns void
language plpgsql
security definer
set search_path = public
as $func$
begin
  update public.accounts
     set plan = 'standard',
         valid_until = greatest(coalesce(valid_until, now()), now()) + make_interval(days => p_days)
   where id = p_account_id;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='accounts' and column_name='trial_used'
  ) then
    execute 'update public.accounts set trial_used = true where id = $1' using p_account_id;
  end if;
end;
$func$;

/* =====================================================================
   3) ONBOARDING TRIGGER (AUTH) → CREATE TENANT + ADMIN + TRIAL
   --------------------------------------------------------------------- */

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $tg$
begin
  begin
    insert into public.accounts(id) values (new.id) on conflict do nothing;
  exception when others then null; end;

  begin
    insert into public.account_users(account_id, user_id, role, scopes, disabled)
      values (new.id, new.id, 'admin', '{}'::text[], false)
    on conflict (account_id, user_id)
      do update set role = 'admin', disabled = false;
  exception when others then null; end;

  begin
    perform public.account_grant_trial(new.id, 7);
  exception when others then null; end;

  return new;
end;
$tg$;

-- Attach trigger to auth.users (requires sufficient privileges)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

/* =====================================================================
   4) BACKFILL FOR EXISTING AUTH USERS
   --------------------------------------------------------------------- */

do $$
begin
  insert into public.accounts(id)
  select u.id from auth.users u
  left join public.accounts a on a.id = u.id
  where a.id is null;

  insert into public.account_users(account_id, user_id, role, scopes, disabled)
  select u.id, u.id, 'admin', '{}'::text[], false
  from auth.users u
  left join public.account_users au on au.account_id = u.id and au.user_id = u.id
  where au.user_id is null;

  perform public.account_grant_trial(id, 7)
    from public.accounts
   where valid_until is null or valid_until <= now();
end $$;

/* =====================================================================
   5) OPTIONAL HELPER (used by RLS in Phase 2)
   --------------------------------------------------------------------- */

create or replace function public.is_account_member(p_account_id uuid)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from public.account_users au
    where au.account_id = p_account_id
      and au.user_id = auth.uid()
      and coalesce(au.disabled,false) = false
  );
$$;

/* =====================================================================
   6) PHASE 2 — RLS (TENANT ISOLATION) [apply after verifying onboarding]
   ---------------------------------------------------------------------
   The following snippets enable RLS and add membership-based policies to
   core tables. Uncomment and run once you confirm onboarding works.

   -- properties
   -- alter table public.properties enable row level security;
   -- create policy if not exists p_properties_select_own on public.properties
   --   for select to authenticated using (public.is_account_member(owner_id));
   -- create policy if not exists p_properties_write_own on public.properties
   --   for all to authenticated
   --   using (public.is_account_member(owner_id))
   --   with check (public.is_account_member(owner_id));

   -- rooms
   -- alter table public.rooms enable row level security;
   -- create policy if not exists p_rooms_select_own on public.rooms
   --   for select to authenticated using (exists (
   --     select 1 from public.properties p
   --     where p.id = rooms.property_id and public.is_account_member(p.owner_id)));
   -- create policy if not exists p_rooms_write_own on public.rooms
   --   for all to authenticated using (exists (
   --     select 1 from public.properties p
   --     where p.id = rooms.property_id and public.is_account_member(p.owner_id)))
   --   with check (exists (
   --     select 1 from public.properties p
   --     where p.id = rooms.property_id and public.is_account_member(p.owner_id)));

   -- room_types
   -- alter table public.room_types enable row level security;
   -- create policy if not exists p_roomtypes_select_own on public.room_types
   --   for select to authenticated using (exists (
   --     select 1 from public.properties p
   --     where p.id = room_types.property_id and public.is_account_member(p.owner_id)));
   -- create policy if not exists p_roomtypes_write_own on public.room_types
   --   for all to authenticated using (exists (
   --     select 1 from public.properties p
   --     where p.id = room_types.property_id and public.is_account_member(p.owner_id)))
   --   with check (exists (
   --     select 1 from public.properties p
   --     where p.id = room_types.property_id and public.is_account_member(p.owner_id)));

   -- bookings
   -- alter table public.bookings enable row level security;
   -- create policy if not exists p_bookings_select_own on public.bookings
   --   for select to authenticated using (exists (
   --     select 1 from public.properties p
   --     where p.id = bookings.property_id and public.is_account_member(p.owner_id)));
   -- create policy if not exists p_bookings_write_own on public.bookings
   --   for all to authenticated using (exists (
   --     select 1 from public.properties p
   --     where p.id = bookings.property_id and public.is_account_member(p.owner_id)))
   --   with check (exists (
   --     select 1 from public.properties p
   --     where p.id = bookings.property_id and public.is_account_member(p.owner_id)));

   -- booking_check_values
   -- alter table public.booking_check_values enable row level security;
   -- create policy if not exists p_bcv_select_own on public.booking_check_values
   --   for select to authenticated using (exists (
   --     select 1 from public.bookings b join public.properties p on p.id = b.property_id
   --     where b.id = booking_check_values.booking_id and public.is_account_member(p.owner_id)));
   -- create policy if not exists p_bcv_write_own on public.booking_check_values
   --   for all to authenticated using (exists (
   --     select 1 from public.bookings b join public.properties p on p.id = b.property_id
   --     where b.id = booking_check_values.booking_id and public.is_account_member(p.owner_id)))
   --   with check (exists (
   --     select 1 from public.bookings b join public.properties p on p.id = b.property_id
   --     where b.id = booking_check_values.booking_id and public.is_account_member(p.owner_id)));

   -- booking_text_values
   -- alter table public.booking_text_values enable row level security;
   -- create policy if not exists p_btv_select_own on public.booking_text_values
   --   for select to authenticated using (exists (
   --     select 1 from public.bookings b join public.properties p on p.id = b.property_id
   --     where b.id = booking_text_values.booking_id and public.is_account_member(p.owner_id)));
   -- create policy if not exists p_btv_write_own on public.booking_text_values
   --   for all to authenticated using (exists (
   --     select 1 from public.bookings b join public.properties p on p.id = b.property_id
   --     where b.id = booking_text_values.booking_id and public.is_account_member(p.owner_id)))
   --   with check (exists (
   --     select 1 from public.bookings b join public.properties p on p.id = b.property_id
   --     where b.id = booking_text_values.booking_id and public.is_account_member(p.owner_id)));
*/

-- End of migration

