do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'checkin_document_upload_mode'
  ) then
    alter table public.properties
      add column checkin_document_upload_mode text not null default 'required';
  end if;
end
$$;

update public.properties
set checkin_document_upload_mode = 'required'
where checkin_document_upload_mode is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'properties_checkin_document_upload_mode_check'
      and conrelid = 'public.properties'::regclass
  ) then
    alter table public.properties
      add constraint properties_checkin_document_upload_mode_check
      check (checkin_document_upload_mode in ('required', 'optional', 'disabled'));
  end if;
end
$$;
