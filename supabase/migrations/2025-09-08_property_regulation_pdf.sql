-- Add per-property regulation PDF fields and create a public storage bucket for uploads

-- 1) Extend properties table with optional regulation PDF fields (idempotent)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='properties' and column_name='regulation_pdf_path'
  ) then
    alter table public.properties add column regulation_pdf_path text null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='properties' and column_name='regulation_pdf_url'
  ) then
    alter table public.properties add column regulation_pdf_url text null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='properties' and column_name='regulation_pdf_uploaded_at'
  ) then
    alter table public.properties add column regulation_pdf_uploaded_at timestamptz null;
  end if;
end $$;

-- 2) Ensure a public storage bucket exists for property docs
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'property-docs') then
    perform storage.create_bucket('property-docs', public => true);
  end if;
end $$;

