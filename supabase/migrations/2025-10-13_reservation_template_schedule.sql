-- Scheduler for reservation templates
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='reservation_templates' and column_name='schedule_kind'
  ) then
    alter table public.reservation_templates add column schedule_kind text null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='reservation_templates' and column_name='schedule_offset_hours'
  ) then
    alter table public.reservation_templates add column schedule_offset_hours integer null;
  end if;
end $$;

