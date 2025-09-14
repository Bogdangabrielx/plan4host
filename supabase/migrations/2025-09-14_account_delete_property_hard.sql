-- plan4host — RPC: account_delete_property_hard(p_property_id uuid)
-- Purpose: Delete a property and all dependent data explicitly (hard delete),
--          without relying on ON DELETE CASCADE, while still honoring RLS.
-- Notes:
--  - SECURITY INVOKER: caller must have RLS permissions to delete each row.
--    Admin (and editor with proper scopes) should pass; viewer will be blocked.
--  - If some tables are missing in a given environment, guarded EXECUTE blocks ignore them.

create or replace function public.account_delete_property_hard(
  p_property_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $BODY$
declare
  v_pid uuid := p_property_id;
begin
  -- Existence check
  if not exists (select 1 from public.properties where id = v_pid) then
    raise exception 'property_not_found' using errcode = 'P0001';
  end if;

  -- iCal related
  delete from public.ical_type_sync_logs
   where integration_id in (select id from public.ical_type_integrations where property_id = v_pid);

  delete from public.ical_unassigned_events where property_id = v_pid;
  delete from public.ical_uid_map            where property_id = v_pid;
  delete from public.ical_type_integrations  where property_id = v_pid;

  -- Booking attachments (values/contacts/docs) then bookings
  delete from public.booking_check_values where booking_id in (select id from public.bookings where property_id = v_pid);
  delete from public.booking_text_values  where booking_id in (select id from public.bookings where property_id = v_pid);
  delete from public.booking_contacts     where booking_id in (select id from public.bookings where property_id = v_pid);
  delete from public.booking_documents    where booking_id in (select id from public.bookings where property_id = v_pid);
  delete from public.bookings             where property_id = v_pid;

  -- Cleaning
  delete from public.cleaning_progress    where property_id = v_pid;
  delete from public.cleaning_task_defs   where property_id = v_pid;

  -- Room detail definitions
  delete from public.room_detail_checks       where property_id = v_pid;
  delete from public.room_detail_text_fields  where property_id = v_pid;

  -- Calendar settings
  delete from public.calendar_settings    where property_id = v_pid;

  -- Public check-in forms for this property (if any)
  delete from public.checkin_forms        where property_id = v_pid;

  -- Rooms and types
  delete from public.rooms                where property_id = v_pid;
  delete from public.room_types           where property_id = v_pid;
  delete from public.roomtype_soft_holds  where property_id = v_pid;

  -- Optional tables (if present; ignore if absent)
  begin
    execute 'delete from public.ical_suppressions where property_id = $1' using v_pid;
  exception when undefined_table then null; end;

  -- Finally, delete the property itself
  delete from public.properties where id = v_pid;
end;
$BODY$;

do $$ begin
  grant execute on function public.account_delete_property_hard(uuid) to authenticated;
exception when others then null; end $$;

