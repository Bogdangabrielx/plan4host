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
    begin
      -- Try to assign and confirm in one shot so the exclusion constraint arbiters conflicts
      update public.bookings
         set room_id = cand,
             status  = case when status = 'checked_in' then status else 'confirmed' end
       where id = p_booking_id;

      -- If exclusion violation occurs (another booking already blocks this room),
      -- control jumps to the EXCEPTION block and we try the next candidate.
      return cand;

    exception when exclusion_violation then
      -- pick next candidate
      continue;
    when others then
      -- best-effort: try next as well
      continue;
    end;
  end loop;

  return null;
end;
$$;

