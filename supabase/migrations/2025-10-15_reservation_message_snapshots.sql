-- Snapshot rendered template content per reservation_message
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='reservation_messages' and column_name='snapshot_items'
  ) then
    alter table public.reservation_messages add column snapshot_items jsonb null;
  end if;
end $$;

