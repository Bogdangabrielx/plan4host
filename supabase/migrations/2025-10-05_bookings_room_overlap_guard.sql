-- Ensure GiST support for equality on UUID/text (btree_gist)
create extension if not exists btree_gist;

-- Add exclusion constraint to prevent overlapping reservations on the same room
do $$
begin
  if not exists (
    select 1
    from   pg_constraint c
    join   pg_class rel on rel.oid = c.conrelid
    where  rel.relname = 'bookings' and c.conname = 'bookings_no_overlap'
  ) then
    alter table public.bookings
      add constraint bookings_no_overlap
      exclude using gist (
        room_id with =,
        daterange(start_date, end_date, '[)') with &&
      )
      where (status in ('confirmed','checked_in'));
  end if;
end $$;

-- Atomic room assignment for a given type (tries each candidate, returns assigned room_id or null)
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
    -- skip candidate if another non-cancelled booking overlaps this range
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
         set room_id = cand,
             status  = case when status = 'checked_in' then status else 'confirmed' end
       where id = p_booking_id;
      if found then
        return cand;
      end if;
    exception when exclusion_violation then
      continue;
    when others then
      continue;
    end;
  end loop;

  return null;
end;
$$;
