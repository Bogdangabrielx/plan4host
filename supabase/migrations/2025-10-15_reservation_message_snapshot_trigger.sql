-- Create function + trigger to snapshot reservation templates for a booking
-- when a booking becomes confirmed and has a room assigned

do $do$
begin
  -- helper function
  if not exists (
    select 1 from pg_proc where proname = 'snapshot_rm_for_booking'
  ) then
    create or replace function public.snapshot_rm_for_booking(b_id uuid)
    returns void
    language plpgsql
    security definer
    as $fn$
    declare
      v_msg_id uuid;
      v_prop_id uuid;
      v_has_snapshot boolean;
      v_snap jsonb;
    begin
      -- find reservation_message for this booking
      select id, property_id, snapshot_items is not null
      into v_msg_id, v_prop_id, v_has_snapshot
      from public.reservation_messages
      where booking_id = b_id
      limit 1;

      if v_msg_id is null then
        -- no token/message for this booking; nothing to snapshot
        return;
      end if;

      if v_has_snapshot then
        -- already snapshotted; do not override
        return;
      end if;

      -- build snapshot from published templates at this moment
      select coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', t.id::text,
              'title', t.title,
              'schedule_kind', t.schedule_kind,
              'schedule_offset_hours', t.schedule_offset_hours,
              'blocks', (
                select coalesce(jsonb_agg(
                  jsonb_build_object(
                    'sort_index', b.sort_index,
                    'type', b.type,
                    'lang', coalesce(b.lang, 'ro'),
                    'text', b.text
                  ) order by b.sort_index), '[]'::jsonb)
                from public.reservation_template_blocks b
                where b.template_id = t.id
              )
            )
            order by t.updated_at desc
          )
          from public.reservation_templates t
          where t.property_id = v_prop_id and t.status = 'published'
        ), '[]'::jsonb)
      into v_snap;

      update public.reservation_messages
      set snapshot_items = v_snap,
          updated_at = now()
      where id = v_msg_id;
    end;
    $fn$;
  end if;

  -- wrapper trigger function (row-level) that calls the helper with NEW.id
  if not exists (
    select 1 from pg_proc where proname = 'trg_snapshot_rm_for_booking'
  ) then
    create or replace function public.trg_snapshot_rm_for_booking()
    returns trigger
    language plpgsql
    security definer
    as $tg$
    begin
      perform public.snapshot_rm_for_booking(NEW.id);
      return NEW;
    end;
    $tg$;
  end if;

  -- trigger
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_snapshot_rm_on_booking_confirm'
  ) then
    create trigger trg_snapshot_rm_on_booking_confirm
    after insert or update on public.bookings
    for each row
    when (new.status = 'confirmed' and new.room_id is not null)
    execute function public.trg_snapshot_rm_for_booking();
  end if;
end $do$;
