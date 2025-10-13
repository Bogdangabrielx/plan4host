-- Property profile: contact details + presentation image

-- 1) Extend properties with optional contact + image fields (idempotent)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='properties' and column_name='contact_email'
  ) then
    alter table public.properties add column contact_email text null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='properties' and column_name='contact_phone'
  ) then
    alter table public.properties add column contact_phone text null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='properties' and column_name='contact_address'
  ) then
    alter table public.properties add column contact_address text null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='properties' and column_name='presentation_image_url'
  ) then
    alter table public.properties add column presentation_image_url text null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='properties' and column_name='presentation_image_uploaded_at'
  ) then
    alter table public.properties add column presentation_image_uploaded_at timestamptz null;
  end if;
end $$;

-- 2) Ensure a public storage bucket for property images exists
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'property-media') then
    perform storage.create_bucket('property-media', public => true);
  end if;
end $$;
