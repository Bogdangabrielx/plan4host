-- plan4host - Fix account_delete_self() for environments where properties uses admin_id (no owner_id)
-- Date: 2026-02-22
--
-- The original function version assumed public.properties.owner_id might exist.
-- Some environments use public.properties.admin_id instead. This migration updates
-- the RPC to detect admin_id/account_id/owner_id dynamically.

create or replace function public.account_delete_self()
returns void
language plpgsql
security definer
set search_path = public, auth
as $fn$
declare
  v_uid uuid := auth.uid();
  v_prop_ids uuid[] := '{}'::uuid[];
  v_has_account_id boolean := false;
  v_has_owner_id boolean := false;
  v_has_admin_id boolean := false;
  v_where text := '';
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if to_regclass('public.properties') is not null then
    select exists(
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'properties' and column_name = 'account_id'
    ) into v_has_account_id;
    select exists(
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'properties' and column_name = 'owner_id'
    ) into v_has_owner_id;
    select exists(
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'properties' and column_name = 'admin_id'
    ) into v_has_admin_id;

    if v_has_account_id then
      v_where := 'account_id = $1';
    end if;
    if v_has_admin_id then
      v_where := case when v_where = '' then 'admin_id = $1' else v_where || ' OR admin_id = $1' end;
    end if;
    if v_has_owner_id then
      v_where := case when v_where = '' then 'owner_id = $1' else v_where || ' OR owner_id = $1' end;
    end if;

    if v_where <> '' then
      execute 'select coalesce(array_agg(id), ''{}''::uuid[]) from public.properties where ' || v_where
        into v_prop_ids
        using v_uid;
    end if;
  end if;

  -- Property-scoped data first.
  if array_length(v_prop_ids, 1) is not null then
    if to_regclass('public.bookings') is not null then
      execute 'delete from public.bookings where property_id = any ($1)' using v_prop_ids;
    end if;
    if to_regclass('public.rooms') is not null then
      execute 'delete from public.rooms where property_id = any ($1)' using v_prop_ids;
    end if;
    if to_regclass('public.room_types') is not null then
      execute 'delete from public.room_types where property_id = any ($1)' using v_prop_ids;
    end if;
    if to_regclass('public.ical_type_integrations') is not null then
      execute 'delete from public.ical_type_integrations where property_id = any ($1)' using v_prop_ids;
    end if;
    if to_regclass('public.ical_room_integrations') is not null then
      execute 'delete from public.ical_room_integrations where property_id = any ($1)' using v_prop_ids;
    end if;
    if to_regclass('public.cleaning_marks') is not null then
      execute 'delete from public.cleaning_marks where property_id = any ($1)' using v_prop_ids;
    end if;
    if to_regclass('public.guest_checkin_forms') is not null then
      execute 'delete from public.guest_checkin_forms where property_id = any ($1)' using v_prop_ids;
    end if;
    if to_regclass('public.reservation_messages') is not null then
      execute 'delete from public.reservation_messages where property_id = any ($1)' using v_prop_ids;
    end if;
    if to_regclass('public.reservation_message_snapshots') is not null then
      execute 'delete from public.reservation_message_snapshots where property_id = any ($1)' using v_prop_ids;
    end if;
    if to_regclass('public.form_bookings') is not null then
      execute 'delete from public.form_bookings where property_id = any ($1)' using v_prop_ids;
    end if;
    if to_regclass('public.form_booking_documents') is not null then
      execute 'delete from public.form_booking_documents where property_id = any ($1)' using v_prop_ids;
    end if;
    if to_regclass('public.checkin_consents') is not null then
      execute 'delete from public.checkin_consents where property_id = any ($1)' using v_prop_ids;
    end if;

    if to_regclass('public.properties') is not null then
      execute 'delete from public.properties where id = any ($1)' using v_prop_ids;
    end if;
  end if;

  -- Account-scoped data.
  if to_regclass('public.billing_profiles') is not null then
    execute 'delete from public.billing_profiles where account_id = $1' using v_uid;
  end if;
  if to_regclass('public.billing_invoices') is not null then
    execute 'delete from public.billing_invoices where account_id = $1' using v_uid;
  end if;
  if to_regclass('public.account_onboarding') is not null then
    execute 'delete from public.account_onboarding where account_id = $1' using v_uid;
  end if;
  if to_regclass('public.account_onboarding_progress') is not null then
    execute 'delete from public.account_onboarding_progress where account_id = $1' using v_uid;
  end if;
  if to_regclass('public.account_onboarding_events') is not null then
    execute 'delete from public.account_onboarding_events where account_id = $1' using v_uid;
  end if;
  if to_regclass('public.push_subscriptions') is not null then
    execute 'delete from public.push_subscriptions where account_id = $1' using v_uid;
  end if;

  if to_regclass('public.account_users') is not null then
    execute 'delete from public.account_users where account_id = $1 or user_id = $1' using v_uid;
  end if;

  if to_regclass('public.accounts') is not null then
    execute 'delete from public.accounts where id = $1' using v_uid;
  end if;

  execute 'delete from auth.users where id = $1' using v_uid;
end;
$fn$;

revoke all on function public.account_delete_self() from public;
grant execute on function public.account_delete_self() to authenticated;

select pg_notify('pgrst', 'reload schema');

