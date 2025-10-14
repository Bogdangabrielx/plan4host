-- Add social links columns for properties
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='properties' and column_name='social_facebook'
  ) then
    alter table public.properties add column social_facebook text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='properties' and column_name='social_instagram'
  ) then
    alter table public.properties add column social_instagram text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='properties' and column_name='social_tiktok'
  ) then
    alter table public.properties add column social_tiktok text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='properties' and column_name='social_website'
  ) then
    alter table public.properties add column social_website text;
  end if;
end $$;

