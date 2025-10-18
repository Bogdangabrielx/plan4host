-- Re-apply assign_room_for_type logic (safe redefinition)
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
    -- skip rooms already occupied (any non-cancelled booking that overlaps range)
    if exists (
      select 1
      from public.bookings b
      where b.property_id = p_property_id
        and b.room_id = cand
        and b.id <> p_booking_id
        and (b.status IS DISTINCT FROM 'cancelled'::booking_status)
        and b.start_date < p_end_date
        and b.end_date   > p_start_date
    ) then
      continue;
    end if;

    begin
      update public.bookings
         set room_id = cand
       where id = p_booking_id;
      if found then
        return cand;
      end if;
    exception when exclusion_violation then
      continue;
    end;
  end loop;

  return null;
end;
$$;
