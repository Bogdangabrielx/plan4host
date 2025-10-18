-- Robust re-creation of the overlap guard that adapts to your booking_status values
create extension if not exists btree_gist;

do $$
declare
  v_has_enum       boolean := false;
  v_has_checked_in boolean := false;
  v_has_arrived    boolean := false;
  v_labels         text    := '''confirmed'''; -- always block confirmed
  v_sql            text;
begin
  -- detect enum type 'booking_status'
  select exists (
    select 1 from pg_type t where t.typname = 'booking_status'
  ) into v_has_enum;

  if v_has_enum then
    select exists (
      select 1
      from pg_enum e join pg_type t on t.oid = e.enumtypid
      where t.typname = 'booking_status' and e.enumlabel = 'checked_in'
    ) into v_has_checked_in;

    select exists (
      select 1
      from pg_enum e join pg_type t on t.oid = e.enumtypid
      where t.typname = 'booking_status' and e.enumlabel = 'arrived'
    ) into v_has_arrived;
  end if;

  if v_has_checked_in then
    v_labels := v_labels || ', ''checked_in''';
  end if;
  if v_has_arrived then
    v_labels := v_labels || ', ''arrived''';
  end if;

  -- drop old constraint if exists, then add adaptive one
  if exists (
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    where rel.relname = 'bookings' and c.conname = 'bookings_no_overlap'
  ) then
    alter table public.bookings drop constraint bookings_no_overlap;
  end if;

  v_sql := 'alter table public.bookings
              add constraint bookings_no_overlap
              exclude using gist (
                room_id with =,
                daterange(start_date, end_date, ''[)'' ) with &&
              )
              where (status in (' || v_labels || '))';

  execute v_sql;
end $$;

-- Recreate assign_room_for_type without referencing a specific enum label
create or replace function public.assign_room_for_type(
  p_property_id uuid,
  p_room_type_id uuid,
  p_start_date date,
  p_end_date   date,
  p_booking_id uuid
) returns uuid
language plpgsql
as $$
declare
  cand uuid;
begin
  if p_room_type_id is null then
    return null;
  end if;

  for cand in (
    select id
    from public.rooms
    where property_id = p_property_id
      and room_type_id = p_room_type_id
    order by name asc, id asc
  ) loop
    -- skip if another booking (any non-cancelled status) overlaps on this room
    if exists (
      select 1
      from public.bookings b
      where b.property_id = p_property_id
        and b.room_id = cand
        and b.id <> p_booking_id
        and coalesce(b.status, '') <> 'cancelled'
        and b.start_date < p_end_date
        and b.end_date   > p_start_date
    ) then
      continue;
    end if;

    begin
      update public.bookings
         set room_id = cand
       where id = p_booking_id;
      return cand;
    exception when others then
      continue;
    end;
  end loop;

  return null;
end;
$$;
