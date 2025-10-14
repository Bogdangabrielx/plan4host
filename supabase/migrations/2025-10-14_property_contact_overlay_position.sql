-- Add contact overlay position for property banner (top/center/down)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='properties' and column_name='contact_overlay_position'
  ) then
    alter table public.properties add column contact_overlay_position text check (contact_overlay_position in ('top','center','down'));
    -- optional default; leave null to force explicit selection in UI
  end if;
end $$;

