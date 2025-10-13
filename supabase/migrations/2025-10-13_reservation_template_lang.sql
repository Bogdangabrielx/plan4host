-- Add language column to reservation template blocks (ro/en), default 'ro'
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='reservation_template_blocks' and column_name='lang'
  ) then
    alter table public.reservation_template_blocks add column lang text not null default 'ro';
  end if;
end $$;

